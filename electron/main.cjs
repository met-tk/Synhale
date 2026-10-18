const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');

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
    backgroundColor: '#09090b',
    frame: false,
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
  const distIndexPath = path.join(__dirname, '../dist/index.html');
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

  // Open external links in user's default browser instead of electron window
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
}

// IPC Handlers for frameless window controls
ipcMain.on('window-minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.minimize();
});

ipcMain.on('window-toggle-maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }
});

ipcMain.on('window-close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.close();
});

ipcMain.handle('window-is-maximized', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
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
