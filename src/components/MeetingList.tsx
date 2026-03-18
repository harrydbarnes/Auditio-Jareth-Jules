import React, { useEffect, useState } from 'react';
import { Storage, MeetingMetadata } from '@/lib/storage';
import { FileText, Calendar, Clock, Search } from 'lucide-react';
import { format } from 'date-fns';

interface MeetingListProps {
  activeFolder: string | null;
  onSelectMeeting: (folderPath: string) => void;
  refreshTrigger: number;
}

export function MeetingList({ activeFolder, onSelectMeeting, refreshTrigger }: MeetingListProps) {
  const [meetings, setMeetings] = useState<MeetingMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadMeetings = async () => {
      setLoading(true);
      try {
        const meetingsDir = await Storage.getMeetingsDir();
        // Check if directory exists, if not return []
        try {
          // @ts-ignore
          const dirs = await window.electronAPI.readDir(meetingsDir);
          
          const loadedMeetings: MeetingMetadata[] = [];
          for (const dir of dirs) {
            if (dir.isDirectory) {
              const metaPath = `${meetingsDir}/${dir.name}/metadata.json`;
              // @ts-ignore
              const metaContent = await window.electronAPI.readFile(metaPath);
              if (metaContent) {
                try {
                  const meta = JSON.parse(metaContent) as MeetingMetadata;
                  // Handle cases where older meetings don't have a folder property
                  if (!meta.folder) meta.folder = 'Work'; // fallback

                  if (activeFolder === null || meta.folder === activeFolder) {
                     loadedMeetings.push({
                        ...meta,
                        id: dir.name // The actual folder name
                     });
                  }
                } catch (e) {
                  console.error("Failed to parse metadata", e);
                }
              }
            }
          }
          
          // Sort by date descending
          loadedMeetings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setMeetings(loadedMeetings);
        } catch(e) {
          // directory likely doesn't exist
          setMeetings([]);
        }
      } catch (e) {
        console.error("Failed to load meetings", e);
      } finally {
        setLoading(false);
      }
    };

    loadMeetings();
  }, [activeFolder, refreshTrigger]);

  const filteredMeetings = meetings.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.speakers.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleDragStart = (e: React.DragEvent, meetingId: string) => {
    e.dataTransfer.setData('meetingId', meetingId);
  };

  if (loading) {
    return (
      <div className="w-80 border-r border-border bg-background flex flex-col items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="w-80 border-r border-border bg-background flex flex-col h-full">
      <div className="p-4 border-b border-border bg-card z-10 sticky top-0 space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold text-sm">
            {activeFolder ? activeFolder : 'All Meetings'}
          </h2>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {filteredMeetings.length}
          </span>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search meetings..."
            className="w-full h-8 pl-9 pr-3 text-sm rounded-md border border-input bg-background"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredMeetings.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center h-full">
            <FileText className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-sm">No meetings found.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredMeetings.map((m) => (
              <div
                key={m.id}
                draggable
                onDragStart={(e) => handleDragStart(e, m.id)}
                onClick={() => onSelectMeeting(m.id)}
                className="p-4 hover:bg-accent cursor-pointer transition-colors"
              >
                <h3 className="font-medium text-sm truncate mb-1">{m.name}</h3>
                <div className="flex items-center text-xs text-muted-foreground gap-3">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(m.date), 'MMM d, yyyy')}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {Math.round(m.duration / 60)}m
                  </div>
                </div>
                {m.speakers && m.speakers.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {m.speakers.slice(0, 2).map((s, i) => (
                      <span key={i} className="text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded">
                        {s}
                      </span>
                    ))}
                    {m.speakers.length > 2 && (
                      <span className="text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded">
                        +{m.speakers.length - 2}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
