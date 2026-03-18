import { Storage } from './storage';

export interface TranscriptionResult {
  text: string;
  segments: any[];
}

export const TranscriptionService = {
  transcribeAudio: async (audioBlob: Blob): Promise<TranscriptionResult> => {
    const apiKey = Storage.getApiKey('whisper') || Storage.getApiKey('openai');
    
    if (!apiKey) {
      throw new Error("No API key provided for transcription.");
    }

    const formData = new FormData();
    formData.append("file", audioBlob, "audio.webm");
    formData.append("model", "whisper-1");
    
    // We request verbose_json to potentially get segments, though diarization isn't 
    // natively perfect in basic whisper API without extra prompting or specialized models.
    formData.append("response_format", "verbose_json");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Transcription failed: ${errorText}`);
    }

    const data = await response.json();
    return {
      text: data.text,
      segments: data.segments || []
    };
  },

  // Note: True speaker diarization is not fully supported out-of-the-box by the basic 
  // OpenAI Whisper API without workarounds, but we can simulate it or format the text 
  // into speakers as a post-processing step if needed, or just return the text.
  formatTranscript: (result: TranscriptionResult): string => {
    if (!result.segments || result.segments.length === 0) {
      return `Speaker 1: ${result.text}`;
    }

    // A mock diarization: alternate speakers by segment for demonstration,
    // or just list them.
    let formatted = "";
    result.segments.forEach((segment, index) => {
      // In a real advanced diarization, we'd have speaker IDs.
      const speakerId = (index % 2) + 1; 
      formatted += `**Speaker ${speakerId}**: ${segment.text.trim()}\n\n`;
    });
    return formatted.trim();
  }
};
