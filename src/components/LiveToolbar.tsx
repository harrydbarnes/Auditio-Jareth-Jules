import React, { useState } from 'react';
import { MessageSquare, X, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AI } from '@/lib/ai';

interface LiveToolbarProps {
  transcriptSoFar: string;
}

export function LiveToolbar({ transcriptSoFar }: LiveToolbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAsk = async (presetQuestion?: string) => {
    const q = presetQuestion || question;
    if (!q.trim()) return;

    if (!transcriptSoFar.trim()) {
      setAnswer("No transcript available yet. Please wait for audio to be processed.");
      setIsOpen(true);
      return;
    }

    setIsLoading(true);
    setIsOpen(true);
    try {
      const result = await AI.askLiveQuestion(transcriptSoFar, q);
      setAnswer(result);
    } catch (err: any) {
      setAnswer(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center">
      {isOpen && (
        <div className="mb-4 w-96 bg-card border border-border shadow-xl rounded-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4">
          <div className="flex justify-between items-center bg-muted/50 p-3 border-b border-border">
            <h3 className="font-semibold text-sm">AI Assistant</h3>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="p-4 max-h-60 overflow-y-auto text-sm space-y-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mb-2" />
                <p>Analyzing transcript...</p>
              </div>
            ) : answer ? (
              <div className="prose prose-sm dark:prose-invert">
                {answer.split('\n').map((line, i) => (
                  <p key={i} className="mb-1">{line}</p>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center">Ask a question about the meeting so far.</p>
            )}
          </div>
          <div className="p-3 border-t border-border flex gap-2">
            <input
              type="text"
              placeholder="Ask anything..."
              className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
            />
            <Button size="icon" className="h-9 w-9" onClick={() => handleAsk()} disabled={isLoading || !question.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-full shadow-lg p-2 flex items-center gap-2">
        <Button variant="ghost" size="sm" className="rounded-full text-xs" onClick={() => handleAsk('What did I just miss in the last 2 minutes?')}>
          What did I miss?
        </Button>
        <Button variant="ghost" size="sm" className="rounded-full text-xs" onClick={() => handleAsk('Summarise the discussion so far.')}>
          Summarise
        </Button>
        <Button variant="ghost" size="sm" className="rounded-full text-xs" onClick={() => handleAsk('What are the action items so far?')}>
          Action items
        </Button>
        <Button variant="ghost" size="sm" className="rounded-full text-xs" onClick={() => handleAsk('Give me a smart, insightful question to ask right now.')}>
          Suggest question
        </Button>
        <div className="w-px h-6 bg-border mx-2" />
        <Button variant="secondary" size="sm" className="rounded-full gap-2 text-xs" onClick={() => setIsOpen(!isOpen)}>
          <MessageSquare className="w-3 h-3" />
          Ask AI
        </Button>
      </div>
    </div>
  );
}
