import React, { useState, useEffect } from 'react';
import { Storage } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface SettingsProps {
  onClose: () => void;
}

export function Settings({ onClose }: SettingsProps) {
  const [openAiKey, setOpenAiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [whisperKey, setWhisperKey] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  
  const [styles, setStyles] = useState<{id: string, name: string, prompt: string}[]>([]);
  const [newStyleName, setNewStyleName] = useState('');
  const [newStylePrompt, setNewStylePrompt] = useState('');
  
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedMic, setSelectedMic] = useState('');
  const [selectedFont, setSelectedFont] = useState('Roboto');

  useEffect(() => {
    setOpenAiKey(Storage.getApiKey('openai') || '');
    setAnthropicKey(Storage.getApiKey('anthropic') || '');
    setWhisperKey(Storage.getApiKey('whisper') || '');
    setStyles(Storage.getSummaryStyles());
    setSelectedMic(Storage.getPreferredMic() || '');
    setSelectedFont(Storage.getPreferredFont());

    // Get audio devices
    navigator.mediaDevices.enumerateDevices().then(devs => {
      setDevices(devs.filter(d => d.kind === 'audioinput'));
    });
  }, []);

  const handleSave = () => {
    Storage.setApiKey('openai', openAiKey);
    Storage.setApiKey('anthropic', anthropicKey);
    Storage.setApiKey('whisper', whisperKey);
    Storage.setPreferredMic(selectedMic);
    Storage.setPreferredFont(selectedFont);
    
    // Notify app to change font dynamically without reload
    document.documentElement.style.fontFamily = `"${selectedFont}", sans-serif`;

    setSaveStatus('Settings saved locally.');
    setTimeout(() => setSaveStatus(''), 3000);
  };

  return (
    <div className="absolute inset-0 bg-background z-50 flex flex-col p-8">
      <div className="flex justify-between items-center mb-8 border-b pb-4">
        <h2 className="text-2xl font-bold">Settings</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-6 h-6" />
        </Button>
      </div>

      <div className="max-w-xl space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">API Keys</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Keys are stored strictly locally and used for transcription and summarization.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">OpenAI API Key</label>
            <input
              type="password"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              value={openAiKey}
              onChange={(e) => setOpenAiKey(e.target.value)}
              placeholder="sk-..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Anthropic API Key</label>
            <input
              type="password"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
              placeholder="sk-ant-..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Custom Whisper Key (Optional)</label>
            <input
              type="password"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              value={whisperKey}
              onChange={(e) => setWhisperKey(e.target.value)}
              placeholder="Defaults to OpenAI key if empty"
            />
          </div>
          
          <div className="space-y-2 pt-4 border-t">
            <label className="text-sm font-medium leading-none">Microphone Source</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedMic}
              onChange={(e) => setSelectedMic(e.target.value)}
            >
              <option value="">Default System Microphone</option>
              {devices.map(device => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Microphone ${device.deviceId.substring(0, 5)}...`}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">Select the specific microphone to use when recording.</p>
          </div>

          <div className="space-y-2 pt-4 border-t">
            <label className="text-sm font-medium leading-none">Application Font</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedFont}
              onChange={(e) => setSelectedFont(e.target.value)}
            >
              <option value="Roboto">Roboto (Sans Serif)</option>
              <option value="Roboto Slab">Roboto Slab (Slab Serif)</option>
              <option value="Roboto Serif">Roboto Serif (Serif)</option>
            </select>
            <p className="text-xs text-muted-foreground">Choose the font style for the application.</p>
          </div>
        </div>

        <div className="pt-4 flex items-center gap-4 border-b pb-8">
          <Button onClick={handleSave}>Save Keys</Button>
          {saveStatus && <span className="text-sm text-green-500">{saveStatus}</span>}
        </div>
        
        <div className="pt-4">
          <h3 className="text-lg font-semibold mb-2">Custom Summary Styles</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Add custom prompts to shape how your meetings are summarized.
          </p>
          
          <div className="space-y-4 mb-6">
            {styles.map(s => (
               <div key={s.id} className="flex items-center justify-between p-3 border rounded-md">
                 <div>
                   <div className="font-medium text-sm">{s.name}</div>
                   <div className="text-xs text-muted-foreground truncate max-w-[300px]">{s.prompt}</div>
                 </div>
                 {['default', 'short', 'bullets'].includes(s.id) ? (
                   <span className="text-xs text-muted-foreground">Built-in</span>
                 ) : (
                   <Button variant="ghost" size="sm" onClick={() => {
                     const updated = styles.filter(x => x.id !== s.id);
                     Storage.setSummaryStyles(updated);
                     setStyles(updated);
                   }}>
                     <X className="w-4 h-4 text-destructive" />
                   </Button>
                 )}
               </div>
            ))}
          </div>

          <div className="space-y-4 border p-4 rounded-md bg-muted/10">
             <h4 className="font-medium text-sm">Add New Style</h4>
             <div className="space-y-2">
               <label className="text-xs font-medium">Style Name</label>
               <input
                 className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                 value={newStyleName}
                 onChange={(e) => setNewStyleName(e.target.value)}
                 placeholder="e.g. Sales Call Summary"
               />
             </div>
             <div className="space-y-2">
               <label className="text-xs font-medium">Custom Prompt</label>
               <textarea
                 className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                 value={newStylePrompt}
                 onChange={(e) => setNewStylePrompt(e.target.value)}
                 placeholder="Extract the key client objections and next steps..."
               />
             </div>
             <Button 
               size="sm" 
               onClick={() => {
                 if (newStyleName.trim() && newStylePrompt.trim()) {
                   const updated = [...styles, { 
                     id: `custom-${Date.now()}`, 
                     name: newStyleName.trim(), 
                     prompt: newStylePrompt.trim() 
                   }];
                   Storage.setSummaryStyles(updated);
                   setStyles(updated);
                   setNewStyleName('');
                   setNewStylePrompt('');
                 }
               }}
               disabled={!newStyleName.trim() || !newStylePrompt.trim()}
             >
               Add Style
             </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
