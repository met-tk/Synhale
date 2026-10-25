const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');
const { pathToFileURL, fileURLToPath } = require('url');

const distIndexPath = path.resolve(__dirname, '../dist/index.html');
const normalizedTargetFilePath = path.resolve(distIndexPath).toLowerCase();

if (process.platform === 'win32') app.setAppUserModelId('com.synhale.app');

function isTrustedPage(url) {
  try {
    if (!url || typeof url !== 'string') return false;
    const parsed = new URL(url);
    if (parsed.protocol !== 'file:') return false;
    // Reject injected query parameters while allowing standard hash navigation
    if (parsed.search) return false;
    parsed.hash = '';
    const filePath = fileURLToPath(parsed.href);
    return path.resolve(filePath).toLowerCase() === normalizedTargetFilePath;
  } catch {
    return false;
  }
}

function getTrustedWindow(event) {
  const sender = event.sender;
  if (!sender || sender.isDestroyed()) return null;
  if (event.senderFrame !== sender.mainFrame || !isTrustedPage(event.senderFrame?.url)) return null;
  return BrowserWindow.fromWebContents(sender);
}

// Disable hardware acceleration issues on specific GPU drivers if needed,
// but keep standard audio/video acceleration enabled.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: 'Synhale · 呼吸声疗数字合成器',
    icon: path.join(__dirname, '../dist/icons/synhale-256.png'),
    backgroundColor: '#09090b',
    frame: false,
    thickFrame: true,
    roundedCorners: true,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      // Critical for synthesizer: keep audio scheduler & RAF alive in background/minimized
      backgroundThrottling: false,
      sandbox: true
    }
  });

  // Remove default File/Edit menu bar for clean industrial UI
  Menu.setApplicationMenu(null);

  // In production or default mode, load built dist/index.html
  win.loadFile(distIndexPath).catch((err) => {
    console.error('Failed to load dist/index.html:', err);
  });

  // Show window when ready to prevent white flash
  win.once('ready-to-show', () => {
    win.show();
  });

  // Window state notification to renderer
  win.on('maximize', () => {
    win.webContents.send('window-maximize-changed', true);
  });
  win.on('unmaximize', () => {
    win.webContents.send('window-maximize-changed', false);
  });

  // Block default context menu to remove browser feel
  win.webContents.on('context-menu', (e) => {
    e.preventDefault();
  });

  // Intercept refresh keys (F5, Ctrl+R) to prevent accidental reload during audio performance
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown') {
      if (input.key === 'F5' || ((input.control || input.meta) && input.key.toLowerCase() === 'r')) {
        event.preventDefault();
      }
    }
  });

  // The instrument is a single local document. Never navigate it to remote content.
  win.webContents.on('will-navigate', (event, url) => {
    if (!isTrustedPage(url)) event.preventDefault();
  });
  win.webContents.on('will-frame-navigate', (event) => {
    if (!event.isMainFrame || !isTrustedPage(event.url)) event.preventDefault();
  });
  win.webContents.on('will-attach-webview', (event) => event.preventDefault());

  // Deny every child window, including file:, javascript: and custom protocols.
  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password) {
        void shell.openExternal(parsed.href).catch(() => {});
      }
    } catch {
      // Malformed URLs are denied as well.
    }
    return { action: 'deny' };
  });
}

// IPC Handlers for frameless window controls
ipcMain.on('window-minimize', (event) => {
  const win = getTrustedWindow(event);
  if (win) win.minimize();
});

ipcMain.on('window-toggle-maximize', (event) => {
  const win = getTrustedWindow(event);
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }
});

ipcMain.on('window-close', (event) => {
  const win = getTrustedWindow(event);
  if (win) win.close();
});

ipcMain.handle('window-is-maximized', (event) => {
  const win = getTrustedWindow(event);
  return win ? win.isMaximized() : false;
});

// Ensure single instance lock so opening twice focuses the existing window
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      const win = windows[0];
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    // No microphone, camera, notifications or other device permissions are needed.
    const { session } = require('electron');
    session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
    session.defaultSession.setPermissionCheckHandler(() => false);
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
