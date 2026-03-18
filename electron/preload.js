const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getAppDataPath: () => ipcRenderer.invoke('get-app-data-path'),
  readDir: (dirPath) => ipcRenderer.invoke('read-dir', dirPath),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
  writeBinaryFile: (filePath, base64Content) => ipcRenderer.invoke('write-binary-file', filePath, base64Content),
  mkdir: (dirPath) => ipcRenderer.invoke('mkdir', dirPath),
  deleteFile: (filePath) => ipcRenderer.invoke('delete-file', filePath),
  rename: (oldPath, newPath) => ipcRenderer.invoke('rename', oldPath, newPath),
});
