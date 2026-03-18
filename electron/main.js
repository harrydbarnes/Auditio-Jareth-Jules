import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: true,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
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

// IPC handlers for File System
ipcMain.handle('get-app-data-path', () => {
  const customPath = path.join(app.getPath('userData'), 'MeetingsData');
  if (!fs.existsSync(customPath)) {
    fs.mkdirSync(customPath, { recursive: true });
  }
  return customPath;
});

ipcMain.handle('read-dir', async (_, dirPath) => {
  try {
    return fs.readdirSync(dirPath, { withFileTypes: true }).map(dirent => ({
      name: dirent.name,
      isDirectory: dirent.isDirectory()
    }));
  } catch (e) {
    return [];
  }
});

ipcMain.handle('read-file', async (_, filePath) => {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (e) {
    return null;
  }
});

ipcMain.handle('write-file', async (_, filePath, content) => {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
});

ipcMain.handle('mkdir', async (_, dirPath) => {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
    return true;
  } catch (e) {
    return false;
  }
});

ipcMain.handle('delete-file', async (_, filePath) => {
  try {
    fs.rmSync(filePath, { recursive: true, force: true });
    return true;
  } catch (e) {
    return false;
  }
});

ipcMain.handle('rename', async (_, oldPath, newPath) => {
  try {
    fs.renameSync(oldPath, newPath);
    return true;
  } catch (e) {
    return false;
  }
});

ipcMain.handle('write-binary-file', async (_, filePath, base64Content) => {
  try {
    fs.writeFileSync(filePath, Buffer.from(base64Content, 'base64'));
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
});
