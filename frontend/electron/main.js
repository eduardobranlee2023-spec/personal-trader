const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

const isDev = !app.isPackaged;
let mainWindow = null;

if (process.defaultApp) {
  app.setAsDefaultProtocolClient('personaltrader');
} else {
  app.setAsDefaultProtocolClient('personaltrader');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1500,
    height: 1000,
    minWidth: 1200,
    minHeight: 760,
    backgroundColor: '#05080c',
    title: 'Personal Trader',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    mainWindow.loadURL('http://127.0.0.1:5173/app.html');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
    return;
  }

  const distFile = path.join(__dirname, '..', 'dist', 'app.html');
  mainWindow.loadURL(pathToFileURL(distFile).toString());
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
