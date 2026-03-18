import React, { useState, useEffect } from 'react';
import { Storage } from '@/lib/storage';
import { Mic, Folder, Settings as SettingsIcon, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  onOpenSettings: () => void;
  activeFolder: string | null;
  setActiveFolder: (f: string | null) => void;
}

export function Sidebar({ onOpenSettings, activeFolder, setActiveFolder }: SidebarProps) {
  const [folders, setFolders] = useState<string[]>([]);
  const [newFolder, setNewFolder] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    setFolders(Storage.getFolders());
  }, []);

  const handleAddFolder = () => {
    if (newFolder.trim() && !folders.includes(newFolder.trim())) {
      const updated = [...folders, newFolder.trim()];
      Storage.setFolders(updated);
      setFolders(updated);
    }
    setNewFolder('');
    setIsAdding(false);
  };

  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleDeleteFolder = (f: string) => {
    const updated = folders.filter((folder) => folder !== f);
    Storage.setFolders(updated);
    setFolders(updated);
    if (activeFolder === f) {
      setActiveFolder(null);
    }
  };

  const handleRenameFolder = (oldName: string) => {
    if (editValue.trim() && editValue !== oldName && !folders.includes(editValue.trim())) {
      const updated = folders.map(f => f === oldName ? editValue.trim() : f);
      Storage.setFolders(updated);
      setFolders(updated);
      if (activeFolder === oldName) {
         setActiveFolder(editValue.trim());
      }
    }
    setEditingFolder(null);
  };

  const handleDrop = async (e: React.DragEvent, targetFolder: string) => {
    e.preventDefault();
    const meetingId = e.dataTransfer.getData('meetingId');
    if (meetingId) {
      // Need to update the meeting's metadata.json with the new folder
      try {
        const meetingsDir = await Storage.getMeetingsDir();
        const metaPath = `${meetingsDir}/${meetingId}/metadata.json`;
        // @ts-ignore
        const metaContent = await window.electronAPI.readFile(metaPath);
        if (metaContent) {
           const meta = JSON.parse(metaContent);
           meta.folder = targetFolder;
           // @ts-ignore
           await window.electronAPI.writeFile(metaPath, JSON.stringify(meta, null, 2));
           // Re-trigger active folder load to refresh UI by resetting state
           setActiveFolder(targetFolder);
        }
      } catch (err) {
        console.error("Failed to move meeting", err);
      }
    }
  };

  const allowDrop = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="w-64 border-r border-border bg-card flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h1 className="text-2xl font-black tracking-tighter flex items-center gap-2 uppercase">
          <Mic className="w-6 h-6 text-primary" />
          Jareth
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Folders
            </h2>
            <button
              onClick={() => setIsAdding(true)}
              className="text-muted-foreground hover:text-foreground"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1">
            <button
              onClick={() => setActiveFolder(null)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors ${
                activeFolder === null
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-accent/50 text-muted-foreground'
              }`}
            >
              <Folder className="w-4 h-4" />
              All Meetings
            </button>
            {folders.map((folder) => (
              <div 
                key={folder} 
                className="group flex items-center justify-between w-full"
                onDrop={(e) => handleDrop(e, folder)}
                onDragOver={allowDrop}
              >
                {editingFolder === folder ? (
                  <input
                    autoFocus
                    className="flex-1 h-7 text-sm rounded-md border border-input bg-background px-2 mx-1"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRenameFolder(folder)}
                    onBlur={() => handleRenameFolder(folder)}
                  />
                ) : (
                  <button
                    onClick={() => setActiveFolder(folder)}
                    onDoubleClick={() => {
                      setEditingFolder(folder);
                      setEditValue(folder);
                    }}
                    className={`flex-1 flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors ${
                      activeFolder === folder
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-accent/50 text-muted-foreground'
                    }`}
                  >
                    <Folder className="w-4 h-4" />
                    <span className="truncate">{folder}</span>
                  </button>
                )}
                <button
                  onClick={() => handleDeleteFolder(folder)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}

            {isAdding && (
              <div className="flex items-center gap-2 px-2 py-1.5">
                <input
                  autoFocus
                  className="flex-1 h-7 text-sm rounded-md border border-input bg-background px-2"
                  value={newFolder}
                  onChange={(e) => setNewFolder(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddFolder()}
                  onBlur={handleAddFolder}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-border">
        <Button variant="ghost" className="w-full justify-start gap-2" onClick={onOpenSettings}>
          <SettingsIcon className="w-4 h-4" />
          Settings
        </Button>
      </div>
    </div>
  );
}
