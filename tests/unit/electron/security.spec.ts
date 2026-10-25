// @vitest-environment node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

async function launchMain() {
  const handlers = new Map<string, (...args: any[]) => any>();
  const events = new Map<string, (...args: any[]) => any>();
  const page = pathToFileURL(path.resolve('dist/index.html')).href;
  const mainFrame = { url: page };
  let openWindow!: (details: { url: string }) => { action: string };
  const session = {
    setPermissionRequestHandler: vi.fn(),
    setPermissionCheckHandler: vi.fn()
  };
  const webContents = {
    mainFrame, isDestroyed: () => false,
    on: (name: string, handler: (...args: any[]) => any) => events.set(name, handler),
    setWindowOpenHandler: (handler: typeof openWindow) => { openWindow = handler; },
    send: vi.fn()
  };
  const window = {
    webContents, loadFile: vi.fn().mockResolvedValue(undefined),
    once: vi.fn(), on: vi.fn(), show: vi.fn(),
    minimize: vi.fn(), maximize: vi.fn(), unmaximize: vi.fn(),
    close: vi.fn(), isMaximized: () => true
  };
  const BrowserWindow = Object.assign(vi.fn(function () { return window; }), {
    fromWebContents: (sender: unknown) => sender === webContents ? window : null,
    getAllWindows: () => [window]
  });
  const openExternal = vi.fn().mockResolvedValue(undefined);
  const electron = {
    BrowserWindow,
    app: { commandLine: { appendSwitch: vi.fn() }, setAppUserModelId: vi.fn(), requestSingleInstanceLock: () => true,
      whenReady: () => Promise.resolve(), on: vi.fn(), quit: vi.fn() },
    Menu: { setApplicationMenu: vi.fn() },
    shell: { openExternal }, session: { defaultSession: session },
    ipcMain: {
      on: (name: string, handler: (...args: any[]) => any) => handlers.set(name, handler),
      handle: (name: string, handler: (...args: any[]) => any) => handlers.set(name, handler)
    }
  };
  runInNewContext(readFileSync('electron/main.cjs', 'utf8'), {
    require: (id: string) => {
      if (id === 'electron') return electron;
      if (id === 'path') return path;
      if (id === 'url') return { pathToFileURL, fileURLToPath };
      throw new Error(`Unexpected module: ${id}`);
    },
    __dirname: path.resolve('electron'), URL, process: { platform: 'win32' }, console
  });
  await Promise.resolve();
  return { handlers, events, page, mainFrame, webContents, window, BrowserWindow, openExternal, session,
    openWindow: (url: string) => openWindow({ url }) };
}

describe('Desktop security boundaries', () => {
  it('keeps the renderer sandboxed and denies device permissions', async () => {
    const main = await launchMain();
    expect(main.BrowserWindow).toHaveBeenCalledWith(expect.objectContaining({
      webPreferences: expect.objectContaining({ sandbox: true, nodeIntegration: false, contextIsolation: true })
    }));
    const callback = vi.fn();
    main.session.setPermissionRequestHandler.mock.calls[0][0](main.webContents, 'media', callback);
    expect(callback).toHaveBeenCalledWith(false);
    expect(main.session.setPermissionCheckHandler.mock.calls[0][0]()).toBe(false);
  });

  it('accepts window IPC only from the trusted local main frame', async () => {
    const main = await launchMain();
    const close = main.handlers.get('window-close')!;
    close({ sender: main.webContents, senderFrame: { url: main.page } });
    main.mainFrame.url = 'https://untrusted.example/';
    close({ sender: main.webContents, senderFrame: main.mainFrame });
    expect(main.window.close).not.toHaveBeenCalled();
    main.mainFrame.url = `${main.page}#settings`;
    close({ sender: main.webContents, senderFrame: main.mainFrame });
    expect(main.window.close).toHaveBeenCalledOnce();

    // Verify case-insensitivity (e.g. drive letter C: vs c: on Windows packaged apps)
    const toggledCaseUrl = main.page.startsWith('file:///')
      ? 'file:///' + (main.page[8] === main.page[8].toLowerCase() ? main.page[8].toUpperCase() : main.page[8].toLowerCase()) + main.page.slice(9)
      : main.page;
    main.mainFrame.url = toggledCaseUrl;
    close({ sender: main.webContents, senderFrame: main.mainFrame });
    expect(main.window.close).toHaveBeenCalledTimes(2);
  });

  it('blocks remote navigation, subframes and webviews', async () => {
    const main = await launchMain();
    for (const url of ['https://example.com', `${main.page}?injected=1`, 'file:///untrusted.html']) {
      const event = { preventDefault: vi.fn() };
      main.events.get('will-navigate')!(event, url);
      expect(event.preventDefault).toHaveBeenCalledOnce();
    }
    const allowed = { preventDefault: vi.fn() };
    main.events.get('will-navigate')!(allowed, main.page);
    expect(allowed.preventDefault).not.toHaveBeenCalled();
    const subframe = { isMainFrame: false, url: main.page, preventDefault: vi.fn() };
    main.events.get('will-frame-navigate')!(subframe);
    expect(subframe.preventDefault).toHaveBeenCalledOnce();
    const webview = { preventDefault: vi.fn() };
    main.events.get('will-attach-webview')!(webview);
    expect(webview.preventDefault).toHaveBeenCalledOnce();
  });

  it('allows only credential-free web URLs in the external browser', async () => {
    const main = await launchMain();
    for (const url of ['file:///private.txt', 'javascript:alert(1)', 'myapp://run',
      'https://user:secret@example.com/', 'not a url']) {
      expect(main.openWindow(url)).toEqual({ action: 'deny' });
    }
    expect(main.openExternal).not.toHaveBeenCalled();
    expect(main.openWindow('https://example.com/help')).toEqual({ action: 'deny' });
    expect(main.openExternal).toHaveBeenCalledWith('https://example.com/help');
    main.openExternal.mockRejectedValueOnce(new Error('No browser'));
    expect(() => main.openWindow('https://example.com/')).not.toThrow();
    await Promise.resolve();
  });
});
