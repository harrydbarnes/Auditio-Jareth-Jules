import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.whenReady().then(() => {
  const mainWindow = new BrowserWindow({
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'electron/preload.js'),
      nodeIntegration: true,
      contextIsolation: true,
    },
  });

  ipcMain.handle('get-app-data-path', () => {
    return '/tmp/meetings';
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

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log('CONSOLE:', message);
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.log('FAIL LOAD:', errorDescription);
  });

  mainWindow.loadFile(path.join(__dirname, 'dist/index.html')).then(() => {
    console.log('LOADED');
    setTimeout(() => {
      mainWindow.webContents.executeJavaScript('document.body.innerHTML').then((result) => {
        console.log('HTML:', result);
        app.quit();
      });
    }, 2000);
  });
});
