const { app, BrowserWindow, globalShortcut, Tray, Menu, screen, session } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let tray;
let nextProcess;

const PORT = 3001;

// ── Start Next.js server ──────────────────────────────────────
function startNextServer() {
  return new Promise((resolve) => {
    const bunPath = path.join(process.env.USERPROFILE, '.bun', 'bin', 'bun.exe');
    const projectRoot = path.join(__dirname, '..');

    nextProcess = spawn(bunPath, ['run', 'dev', '-p', String(PORT)], {
      cwd: projectRoot,
      stdio: 'ignore',
      detached: true,
    });
    nextProcess.unref();

    const check = async () => {
      try {
        await fetch(`http://localhost:${PORT}`);
        resolve();
      } catch {
        setTimeout(check, 500);
      }
    };
    setTimeout(check, 2000);
  });
}

// ── Create the Window ─────────────────────────────────────────
function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: Math.min(1200, width),
    height: Math.min(800, height),
    x: Math.floor((width - Math.min(1200, width)) / 2),
    y: Math.floor((height - Math.min(800, height)) / 2),
    frame: false,
    transparent: false,
    backgroundColor: '#080c14',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      // Enable media stream for microphone access
      webSecurity: false,
      allowRunningInsecureContent: true,
    },
    titleBarStyle: 'hidden',
    show: false,
    skipTaskbar: false,
  });

  // ── Grant microphone permission ──────────────────────────────
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    // Allow all permissions — microphone, camera, etc.
    const allowedPermissions = ['media', 'microphone', 'audioCapture', 'mediaKeySystem'];
    if (allowedPermissions.includes(permission)) {
      callback(true);
    } else {
      callback(true); // Allow everything for Jarvis
    }
  });

  // Also grant permission check (Electron 12+)
  session.defaultSession.setPermissionCheckHandler(() => {
    return true;
  });

  mainWindow.loadURL(`http://localhost:${PORT}`);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  // ── System Tray ──────────────────────────────────────────────
  tray = new Tray(path.join(__dirname, 'icon.png'));
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show JARVIS', click: () => mainWindow.show() },
    { type: 'separator' },
    { label: 'Quit JARVIS', click: () => { app.isQuitting = true; app.quit(); } },
  ]);
  tray.setToolTip('J.A.R.V.I.S. — Desktop AI Assistant');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => mainWindow.show());

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F4' && input.alt) {
      app.isQuitting = true;
      app.quit();
    }
  });

  // ── Log console messages for debugging ───────────────────────
  mainWindow.webContents.on('console-message', (event, level, message) => {
    if (message.includes('Voice') || message.includes('Speech') || message.includes('Error') || message.includes('mic')) {
      console.log(`[JARVIS] ${message}`);
    }
  });
}

// ── App Lifecycle ──────────────────────────────────────────────
app.whenReady().then(async () => {
  await startNextServer();
  createWindow();

  globalShortcut.register('CommandOrControl+Shift+J', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });
});

app.on('window-all-closed', () => {
  if (nextProcess) nextProcess.kill();
  app.quit();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (nextProcess) nextProcess.kill();
});
