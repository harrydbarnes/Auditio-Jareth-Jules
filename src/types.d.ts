interface Window {
  electronAPI: {
    getAppDataPath: () => Promise<string>;
    readDir: (dirPath: string) => Promise<{ name: string; isDirectory: boolean }[]>;
    readFile: (filePath: string) => Promise<string | null>;
    writeFile: (filePath: string, content: string) => Promise<boolean>;
    writeBinaryFile: (filePath: string, base64Content: string) => Promise<boolean>;
    mkdir: (dirPath: string) => Promise<boolean>;
    deleteFile: (filePath: string) => Promise<boolean>;
    rename: (oldPath: string, newPath: string) => Promise<boolean>;
  };
}
