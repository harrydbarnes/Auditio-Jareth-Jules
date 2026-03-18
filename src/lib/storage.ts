// Storage utility for local file operations using Electron IPC

export interface MeetingMetadata {
  id: string;
  name: string;
  date: string;
  duration: number;
  speakers: string[];
  summaryStyle: string;
  folder: string;
}

export const Storage = {
  getAppDataPath: async (): Promise<string> => {
    return window.electronAPI.getAppDataPath();
  },

  getMeetingsDir: async (): Promise<string> => {
    const appData = await Storage.getAppDataPath();
    return `${appData}/Meetings`;
  },

  createMeetingFolder: async (folderName: string): Promise<string> => {
    const appData = await Storage.getAppDataPath();
    const targetPath = `${appData}/Meetings/${folderName}`;
    await window.electronAPI.mkdir(targetPath);
    return targetPath;
  },

  saveMeetingData: async (
    folderName: string,
    metadata: MeetingMetadata,
    transcript: string,
    summary: string,
    audioBlob: Blob
  ) => {
    const appData = await Storage.getAppDataPath();
    const meetingFolder = `${appData}/Meetings/${folderName}`;
    await window.electronAPI.mkdir(meetingFolder);

    // Save metadata
    await window.electronAPI.writeFile(
      `${meetingFolder}/metadata.json`,
      JSON.stringify(metadata, null, 2)
    );

    // Save transcript
    await window.electronAPI.writeFile(`${meetingFolder}/transcript.md`, transcript);

    // Save summary
    await window.electronAPI.writeFile(`${meetingFolder}/summary.md`, summary);

    // Save audio
    const arrayBuffer = await audioBlob.arrayBuffer();
    
    // We can use FileReader to get base64 easily
    const base64Audio = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          // result looks like: "data:audio/webm;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2Vib..."
          const base64 = reader.result.split(',')[1];
          resolve(base64 || '');
        } else {
          reject(new Error('Failed to convert to base64'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(audioBlob);
    });

    await window.electronAPI.writeBinaryFile(`${meetingFolder}/audio.wav`, base64Audio);
  },
  
  // Settings Management via LocalStorage
  getApiKey: (provider: 'openai' | 'anthropic' | 'whisper'): string | null => {
    return localStorage.getItem(`api_key_${provider}`);
  },

  setApiKey: (provider: 'openai' | 'anthropic' | 'whisper', key: string) => {
    localStorage.setItem(`api_key_${provider}`, key);
  },

  // Folder UI helpers
  getFolders: (): string[] => {
    const folders = localStorage.getItem('app_folders');
    if (!folders) {
      const defaultFolders = ['Work', 'Personal', 'Project A', 'Interviews'];
      localStorage.setItem('app_folders', JSON.stringify(defaultFolders));
      return defaultFolders;
    }
    return JSON.parse(folders);
  },

  setFolders: (folders: string[]) => {
    localStorage.setItem('app_folders', JSON.stringify(folders));
  },

  getTodaysMeetingCount: async (): Promise<number> => {
    try {
      const meetingsDir = await Storage.getMeetingsDir();
      // @ts-ignore
      const dirs = await window.electronAPI.readDir(meetingsDir);
      
      const today = new Date().toISOString().split('T')[0];
      let count = 0;

      for (const dir of dirs) {
        if (dir.isDirectory) {
          const metaPath = `${meetingsDir}/${dir.name}/metadata.json`;
          // @ts-ignore
          const metaContent = await window.electronAPI.readFile(metaPath);
          if (metaContent) {
            try {
              const meta = JSON.parse(metaContent) as MeetingMetadata;
              if (meta.date.startsWith(today)) {
                count++;
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }
      return count;
    } catch (e) {
      return 0; // Directory might not exist yet
    }
  },

  // Summary styles helpers
  getSummaryStyles: (): { id: string, name: string, prompt: string }[] => {
    const styles = localStorage.getItem('app_summary_styles');
    if (!styles) {
      const defaultStyles = [
        { id: 'default', name: 'Default (Granola)', prompt: 'default' },
        { id: 'short', name: 'Short', prompt: 'short' },
        { id: 'bullets', name: 'Bullet points only', prompt: 'bullets' }
      ];
      localStorage.setItem('app_summary_styles', JSON.stringify(defaultStyles));
      return defaultStyles;
    }
    return JSON.parse(styles);
  },

  setSummaryStyles: (styles: { id: string, name: string, prompt: string }[]) => {
    localStorage.setItem('app_summary_styles', JSON.stringify(styles));
  },

  // Audio settings
  getPreferredMic: (): string | null => {
    return localStorage.getItem('app_preferred_mic');
  },

  setPreferredMic: (deviceId: string) => {
    localStorage.setItem('app_preferred_mic', deviceId);
  },

  // Font Settings
  getPreferredFont: (): string => {
    return localStorage.getItem('app_preferred_font') || 'Roboto';
  },

  setPreferredFont: (font: string) => {
    localStorage.setItem('app_preferred_font', font);
  }
};
