import { Storage } from './storage';

export const AI = {
  generateSummary: async (transcript: string, style: string = 'default'): Promise<string> => {
    const apiKey = Storage.getApiKey('openai');
    if (!apiKey) {
      throw new Error("No OpenAI API key found for summarization.");
    }

    let systemPrompt = "You are a highly skilled AI assistant that summarizes meetings.";

    if (style === 'default') {
      systemPrompt += `
Format your output EXACTLY like this:
## Key points
- [Point 1]
- [Point 2]

## Decisions
- [Decision 1]

## Action items
- [Action 1]

## Questions
- [Question 1]

## Notes
- [Note 1]
`;
    } else if (style === 'short') {
      systemPrompt += " Provide a very brief 3-sentence summary of the meeting.";
    } else if (style === 'bullets') {
      systemPrompt += " Provide ONLY bullet points of the most important information.";
    } else {
      // Custom prompt
      systemPrompt += ` Follow this custom instruction: ${style}`;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Here is the transcript to summarize:\n\n${transcript}` }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`AI request failed: ${await response.text()}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  },

  askLiveQuestion: async (transcriptSoFar: string, question: string): Promise<string> => {
    const apiKey = Storage.getApiKey('openai');
    if (!apiKey) {
      throw new Error("No OpenAI API key found.");
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are an AI assistant helping during a live meeting. Based on the transcript so far, answer the user\'s question concisely.' },
          { role: 'user', content: `Transcript so far:\n${transcriptSoFar}\n\nQuestion: ${question}` }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`AI request failed: ${await response.text()}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }
};
