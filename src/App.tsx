import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Play, Pause, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sidebar } from '@/components/Sidebar';
import { Settings } from '@/components/Settings';
import { LiveToolbar } from '@/components/LiveToolbar';
import { MeetingList } from '@/components/MeetingList';
import { AudioRecorder, webmToWav } from '@/lib/audio';
import { TranscriptionService } from '@/lib/transcription';
import { AI } from '@/lib/ai';
import { Storage, MeetingMetadata } from '@/lib/storage';
import { format } from 'date-fns';

function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Recording settings
  const [captureMic, setCaptureMic] = useState(true);
  const [captureSystem, setCaptureSystem] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0);
  const [selectedSummaryStyle, setSelectedSummaryStyle] = useState('default');
  const [summaryStyles, setSummaryStyles] = useState<{id: string, name: string, prompt: string}[]>([]);
  const [todaysMeetingsCount, setTodaysMeetingsCount] = useState(0);

  useEffect(() => {
    setSummaryStyles(Storage.getSummaryStyles());
  }, [isSettingsOpen]); // Refresh when settings close

  useEffect(() => {
    Storage.getTodaysMeetingCount().then(setTodaysMeetingsCount);
  }, [refreshTrigger]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    let timeGreeting = "Good day";
    if (hour < 12) timeGreeting = "Morning";
    else if (hour < 17) timeGreeting = "Afternoon";
    else timeGreeting = "Evening";

    if (todaysMeetingsCount === 0) {
      return `${timeGreeting}! Ready for your first meeting?`;
    } else if (todaysMeetingsCount < 3) {
      return `${timeGreeting}! Meeting #${todaysMeetingsCount + 1} coming right up.`;
    } else if (todaysMeetingsCount < 5) {
      return `Meeting #${todaysMeetingsCount + 1} today. You're on fire!`;
    } else {
      return `Meeting #${todaysMeetingsCount + 1}? Hang in there, warrior.`;
    }
  };

  // Live state
  const [transcriptSoFar, setTranscriptSoFar] = useState<string>('');
  
  // Selected meeting view
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [selectedMeetingData, setSelectedMeetingData] = useState<{
    metadata: MeetingMetadata;
    transcript: string;
    summary: string;
  } | null>(null);
  
  // Speaker renaming state
  const [editingSpeaker, setEditingSpeaker] = useState<{oldName: string, newName: string} | null>(null);

  useEffect(() => {
    // Apply font on load
    const font = Storage.getPreferredFont();
    document.documentElement.style.fontFamily = `"${font}", sans-serif`;

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = async () => {
    if (!captureMic && !captureSystem) {
      alert("Please select at least one audio source.");
      return;
    }

    recorderRef.current = new AudioRecorder((chunk) => {
      // Simulated live updates for demo purposes
      setTranscriptSoFar(prev => prev.includes("(Recording in progress...)") ? prev : prev + "\n(Recording in progress...)");
    });
    
    const success = await recorderRef.current.start(captureMic, captureSystem, (level) => {
      setAudioLevel(level);
    });

    if (success) {
      setIsRecording(true);
      setRecordingTime(0);
      setTranscriptSoFar('');
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      alert("Failed to access microphone or system audio. Ensure permissions are granted.");
    }
  };

  const handleStopRecording = async () => {
    if (!recorderRef.current || !isRecording) return;
    
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setIsProcessing(true);

    try {
      const audioBlob = await recorderRef.current.stop();
      
      // Step 1: Transcribe
      const transcriptionResult = await TranscriptionService.transcribeAudio(audioBlob);
      const transcriptStr = TranscriptionService.formatTranscript(transcriptionResult);
      
      // Step 2: Summarize using selected style
      const customPrompt = summaryStyles.find(s => s.id === selectedSummaryStyle)?.prompt || 'default';
      const summaryStr = await AI.generateSummary(transcriptStr, customPrompt);
      
      // Extract unique speakers if possible, or mock
      const speakers = ["Speaker 1"];
      if (transcriptStr.includes("Speaker 2")) speakers.push("Speaker 2");

      // Step 3: Save locally
      const meetingName = `Meeting ${format(new Date(), 'HH:mm')}`;
      const folderName = `${format(new Date(), 'yyyy-MM-dd')} ${meetingName}`.replace(/[:/]/g, '-');
      
      const targetFolder = activeFolder || 'Work'; // fallback

      const metadata: MeetingMetadata = {
        id: folderName,
        name: meetingName,
        date: new Date().toISOString(),
        duration: recordingTime,
        speakers,
        summaryStyle: selectedSummaryStyle,
        folder: targetFolder
      };

      // Convert WebM to WAV
      const wavBlob = await webmToWav(audioBlob);

      await Storage.saveMeetingData(folderName, metadata, transcriptStr, summaryStr, wavBlob);
      
      setRefreshTrigger(prev => prev + 1);
      setSelectedMeetingId(folderName);
      await loadMeetingData(folderName);

    } catch (err: any) {
      alert(`Error processing recording: ${err.message}`);
    } finally {
      setIsProcessing(false);
      setRecordingTime(0);
      setTranscriptSoFar('');
    }
  };

  const handleRenameSpeaker = async (oldName: string, newName: string) => {
    if (!newName.trim() || oldName === newName || !selectedMeetingId || !selectedMeetingData) {
      setEditingSpeaker(null);
      return;
    }

    try {
      // 1. Update Transcript Text
      // A simple replace all for "**Speaker X**:" or "Speaker X:" 
      // This is a naive replacement but works for the demo format.
      const updatedTranscript = selectedMeetingData.transcript.replace(
        new RegExp(oldName, 'g'), 
        newName.trim()
      );

      // 2. Update Metadata Speakers Array
      const updatedSpeakers = selectedMeetingData.metadata.speakers.map(s => s === oldName ? newName.trim() : s);
      const updatedMetadata = { ...selectedMeetingData.metadata, speakers: updatedSpeakers };

      // 3. Save to disk
      const meetingsDir = await Storage.getMeetingsDir();
      const basePath = `${meetingsDir}/${selectedMeetingId}`;
      
      // @ts-ignore
      await window.electronAPI.writeFile(`${basePath}/transcript.md`, updatedTranscript);
      // @ts-ignore
      await window.electronAPI.writeFile(`${basePath}/metadata.json`, JSON.stringify(updatedMetadata, null, 2));

      // 4. Update UI state
      setSelectedMeetingData({
        ...selectedMeetingData,
        transcript: updatedTranscript,
        metadata: updatedMetadata
      });
      setRefreshTrigger(prev => prev + 1);

    } catch (err) {
      console.error("Failed to rename speaker", err);
    } finally {
      setEditingSpeaker(null);
    }
  };

  const loadMeetingData = async (id: string) => {
    try {
      const meetingsDir = await Storage.getMeetingsDir();
      const basePath = `${meetingsDir}/${id}`;
      // @ts-ignore
      const metaContent = await window.electronAPI.readFile(`${basePath}/metadata.json`);
      // @ts-ignore
      const transcriptContent = await window.electronAPI.readFile(`${basePath}/transcript.md`);
      // @ts-ignore
      const summaryContent = await window.electronAPI.readFile(`${basePath}/summary.md`);

      if (metaContent) {
        setSelectedMeetingData({
          metadata: JSON.parse(metaContent),
          transcript: transcriptContent || '',
          summary: summaryContent || ''
        });
      }
    } catch (e) {
      console.error("Failed to load meeting data", e);
    }
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
      {isSettingsOpen && <Settings onClose={() => setIsSettingsOpen(false)} />}
      
      <Sidebar 
        onOpenSettings={() => setIsSettingsOpen(true)} 
        activeFolder={activeFolder} 
        setActiveFolder={(f) => {
           setActiveFolder(f);
           setSelectedMeetingId(null);
           setSelectedMeetingData(null);
        }} 
      />

      <MeetingList 
        activeFolder={activeFolder} 
        onSelectMeeting={(id) => {
          setSelectedMeetingId(id);
          loadMeetingData(id);
        }}
        refreshTrigger={refreshTrigger}
      />

      <div className="flex-1 bg-background flex flex-col relative overflow-hidden">
        {selectedMeetingData && !isRecording && !isProcessing ? (
          <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full flex flex-col gap-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-2">{selectedMeetingData.metadata.name}</h1>
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>{format(new Date(selectedMeetingData.metadata.date), 'MMMM d, yyyy h:mm a')}</span>
                <span>•</span>
                <span>{Math.round(selectedMeetingData.metadata.duration / 60)} min</span>
                <span>•</span>
                <span>{selectedMeetingData.metadata.folder}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <h2 className="text-xl font-semibold border-b pb-2">AI Summary</h2>
                <div className="prose prose-sm dark:prose-invert">
                  {/* Basic markdown render */}
                  {selectedMeetingData.summary.split('\n').map((line, i) => {
                    if (line.startsWith('## ')) return <h3 key={i} className="text-lg font-medium mt-4 mb-2">{line.replace('## ', '')}</h3>;
                    if (line.startsWith('- ')) return <li key={i} className="ml-4">{line.replace('- ', '')}</li>;
                    if (!line.trim()) return <br key={i} />;
                    return <p key={i}>{line}</p>;
                  })}
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                  <h2 className="text-xl font-semibold">Transcript</h2>
                </div>
                
                {/* Speaker Renaming Controls */}
                {selectedMeetingData.metadata.speakers && selectedMeetingData.metadata.speakers.length > 0 && (
                  <div className="flex flex-wrap gap-2 items-center bg-card p-2 rounded-md border text-sm">
                    <span className="text-muted-foreground mr-2 text-xs uppercase font-bold">Speakers:</span>
                    {selectedMeetingData.metadata.speakers.map((speaker, idx) => (
                       <div key={idx} className="flex items-center gap-1">
                         {editingSpeaker?.oldName === speaker ? (
                           <div className="flex items-center gap-1">
                             <input 
                               autoFocus
                               className="h-6 w-24 text-xs px-1 border rounded"
                               value={editingSpeaker.newName}
                               onChange={(e) => setEditingSpeaker({...editingSpeaker, newName: e.target.value})}
                               onKeyDown={(e) => {
                                 if (e.key === 'Enter') handleRenameSpeaker(speaker, editingSpeaker.newName);
                                 if (e.key === 'Escape') setEditingSpeaker(null);
                               }}
                               onBlur={() => handleRenameSpeaker(speaker, editingSpeaker.newName)}
                             />
                           </div>
                         ) : (
                           <span 
                             className="bg-secondary text-secondary-foreground px-2 py-0.5 rounded text-xs cursor-pointer hover:bg-secondary/80"
                             onClick={() => setEditingSpeaker({oldName: speaker, newName: speaker})}
                           >
                             {speaker}
                           </span>
                         )}
                       </div>
                    ))}
                  </div>
                )}

                <div className="prose prose-sm dark:prose-invert bg-muted/30 p-4 rounded-lg h-[600px] overflow-y-auto font-mono text-xs">
                  {selectedMeetingData.transcript.split('\n').map((line, i) => (
                    <p key={i} className="mb-2 whitespace-pre-wrap">{line.replace(/\*\*/g, '')}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 p-8 flex flex-col items-center justify-center text-center">
            {isProcessing ? (
              <div className="space-y-6 flex flex-col items-center">
                <Loader2 className="w-16 h-16 animate-spin text-primary" />
                <h2 className="text-2xl font-semibold">Processing Meeting...</h2>
                <p className="text-muted-foreground max-w-md">
                  Transcribing audio and generating smart summaries. This may take a minute depending on the meeting length.
                </p>
              </div>
            ) : isRecording ? (
              <div className="space-y-8 flex flex-col items-center">
                <div className="text-7xl font-mono tracking-wider font-light text-primary animate-pulse">
                  {formatTime(recordingTime)}
                </div>
                
                {/* Audio Waveform / Level Meter */}
                <div className="flex items-end gap-1 h-12 justify-center w-full max-w-xs">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div 
                      key={i} 
                      className="w-2 bg-primary rounded-t-sm transition-all duration-75"
                      style={{ 
                        height: `${Math.max(4, Math.random() * (audioLevel * 0.8) + (audioLevel * 0.2))}%`,
                        opacity: audioLevel > 5 ? 1 : 0.3
                      }}
                    />
                  ))}
                </div>

                <div className="flex justify-center gap-6">
                  <Button size="lg" variant="destructive" onClick={handleStopRecording} className="rounded-full w-20 h-20 p-0 shadow-lg hover:scale-105 transition-transform flex flex-col items-center justify-center gap-1">
                    <Square className="w-8 h-8 fill-current" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Stop</span>
                  </Button>
                </div>
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                  Recording: {[captureMic && "Microphone", captureSystem && "System"].filter(Boolean).join(" + ")}
                </div>

                <div className="mt-8 max-w-lg w-full bg-muted/20 border border-border rounded-lg p-4 text-left h-40 overflow-y-auto">
                   <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Live Transcript</div>
                   <div className="text-sm italic opacity-50">
                     {transcriptSoFar || "Listening..."}
                   </div>
                </div>
              </div>
            ) : (
              <div className="space-y-8 max-w-md mx-auto">
                <div className="mx-auto w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                  <Mic className="w-12 h-12 text-primary" />
                </div>
                <div>
                  <h2 className="text-5xl font-black tracking-tighter mb-4 uppercase">
                    {getGreeting()}
                  </h2>
                  <p className="text-muted-foreground text-lg mb-6 font-medium">
                    Capture system audio and microphone simultaneously. Get automated summaries and speaker diarization.
                  </p>
                  
                  {/* Audio Source Selection */}
                  <div className="flex justify-center gap-4 mb-6">
                    <label className={`flex items-center gap-2 cursor-pointer p-4 border-2 rounded-2xl transition-all ${captureMic ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent/50'}`}>
                      <input 
                        type="checkbox" 
                        checked={captureMic} 
                        onChange={(e) => setCaptureMic(e.target.checked)}
                        className="w-5 h-5 rounded text-primary focus:ring-primary accent-primary"
                      />
                      <span className="text-sm font-bold uppercase tracking-wide">Microphone</span>
                    </label>
                    <label className={`flex items-center gap-2 cursor-pointer p-4 border-2 rounded-2xl transition-all ${captureSystem ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent/50'}`}>
                      <input 
                        type="checkbox" 
                        checked={captureSystem} 
                        onChange={(e) => setCaptureSystem(e.target.checked)}
                        className="w-5 h-5 rounded text-primary focus:ring-primary accent-primary"
                      />
                      <span className="text-sm font-bold uppercase tracking-wide">System Audio</span>
                    </label>
                  </div>
                  
                  {/* Summary Style Selection */}
                  <div className="flex flex-col items-center mb-8">
                     <label className="text-xs font-semibold text-muted-foreground uppercase mb-2">Summary Style</label>
                     <select 
                       className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm max-w-[250px] w-full"
                       value={selectedSummaryStyle}
                       onChange={(e) => setSelectedSummaryStyle(e.target.value)}
                     >
                       {summaryStyles.map(s => (
                         <option key={s.id} value={s.id}>{s.name}</option>
                       ))}
                     </select>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-4">
                  <Button size="lg" onClick={handleStartRecording} className="rounded-full w-28 h-28 p-0 shadow-2xl hover:scale-110 transition-transform bg-primary text-primary-foreground hover:bg-primary/90 flex flex-col items-center justify-center gap-1">
                    <Mic className="w-12 h-12" />
                    <span className="text-xs font-black uppercase tracking-widest mt-1">Record</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {isRecording && <LiveToolbar transcriptSoFar={transcriptSoFar} />}
      </div>
    </div>
  );
}

export default App;
