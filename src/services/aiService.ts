import { AiActionType, TranslationTargetLanguage } from '../types';

export const AI_SYSTEM_INSTRUCTIONS: Record<AiActionType, string | ((lang: string) => string)> = {
  improve:
    'You are a professional writing editor and Markdown specialist. Improve the following text for clarity, vocabulary, flow, and impact while preserving the exact original language (e.g. Vietnamese if Vietnamese, English if English) and Markdown formatting. Return ONLY the improved Markdown content directly, with no introductory or concluding chatter.',
  grammar:
    'You are an expert proofreader and linguist. Correct all spelling, grammar, punctuation, and typographical mistakes in the text while keeping the exact original language, tone, and Markdown structure. Return ONLY the corrected Markdown text directly with no explanations.',
  summarize:
    'You are a high-density summarization expert. Produce a clear, concise, well-structured Markdown summary of the provided text, capturing all essential insights and key takeaways in the same language as the input. Return ONLY the summary directly.',
  expand:
    'You are an insightful content creator and technical writer. Expand and elaborate on the provided text with relevant details, clear explanations, context, and examples while matching the original tone, style, language, and Markdown conventions. Return ONLY the expanded Markdown content.',
  translate: (language: string) =>
    `You are a professional translator and native localization expert. Accurately translate the provided text into ${language}. Preserve all Markdown elements, code blocks, URLs, and formatting faithfully. Return ONLY the translated Markdown text directly.`,
  outline:
    'You are an expert document architect. Convert or organize the provided text into a well-structured hierarchical Markdown outline using headings (#, ##, ###) and structured bullet points in the same language as the source text. Return ONLY the outline directly.',
  continue:
    'You are an expert co-writer. Seamlessly continue writing from the end of the provided text, preserving the identical voice, style, topic, language, and Markdown structure. Return ONLY the new continuation text directly.',
  simplify:
    'You are a plain-language communication specialist. Rewrite the text to make it easy to understand, clear, and direct without losing key meaning. Keep the same language and Markdown formatting. Return ONLY the simplified Markdown text directly.',
  custom:
    'You are an expert Markdown writing assistant and technical writer. Strictly follow the user custom instructions, preserving Markdown syntax and quality. Return ONLY the generated or transformed Markdown content directly.',
};

export const AVAILABLE_MODELS = [
  { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash', badge: 'Default • Ultra Fast & Powerful' },
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', badge: 'Next-Gen Balanced' },
  { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite', badge: 'Ultra Lightweight & Fast' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', badge: 'Advanced Reasoning & Logic' },
];

export async function testGeminiApiKey(apiKey: string, model: string = 'gemini-3.7-flash'): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('/api/gemini/test-key', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-gemini-api-key': apiKey.trim(),
      },
      body: JSON.stringify({ apiKey: apiKey.trim(), model }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to connect to Gemini API');
    }

    return { success: true, message: data.message || 'Key is valid!' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Network error while testing key' };
  }
}

export async function checkServerKeyStatus(): Promise<{ hasServerKey: boolean; defaultModel: string }> {
  try {
    const res = await fetch('/api/gemini/status');
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('Could not check server API key status', e);
  }
  return { hasServerKey: false, defaultModel: 'gemini-3.7-flash' };
}

export interface ExecuteAiActionParams {
  action: AiActionType;
  text: string;
  targetLanguage?: TranslationTargetLanguage;
  customPrompt?: string;
  model?: string;
  apiKey?: string;
}

export async function executeAiAction(params: ExecuteAiActionParams): Promise<string> {
  const { action, text, targetLanguage = 'English', customPrompt, model = 'gemini-3.7-flash', apiKey } = params;

  if (!text || !text.trim()) {
    throw new Error('Please select or provide text for the AI assistant to process.');
  }

  let systemInstruction: string;
  if (action === 'translate') {
    const fn = AI_SYSTEM_INSTRUCTIONS.translate as (lang: string) => string;
    systemInstruction = fn(targetLanguage);
  } else if (action === 'custom' && customPrompt) {
    systemInstruction = `You are an expert Markdown writing assistant. The user wants you to: "${customPrompt}". Return only the refined markdown content.`;
  } else {
    systemInstruction = AI_SYSTEM_INSTRUCTIONS[action] as string;
  }

  const prompt = action === 'custom' && customPrompt ? `Instructions: ${customPrompt}\n\nInput Text:\n${text}` : text;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (apiKey && apiKey.trim()) {
    headers['x-gemini-api-key'] = apiKey.trim();
  }

  const res = await fetch('/api/gemini/action', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prompt,
      systemInstruction,
      model,
      apiKey: apiKey?.trim(),
    }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || 'Gemini API call failed.');
  }

  return (data.result || '').trim();
}

export interface ExecuteAiActionStreamParams extends ExecuteAiActionParams {
  onChunk: (chunkText: string, accumulated: string) => void;
  onDone?: (finalText: string) => void;
  onError?: (error: Error) => void;
  signal?: AbortSignal;
}

export async function executeAiActionStream(params: ExecuteAiActionStreamParams): Promise<string> {
  const {
    action,
    text,
    targetLanguage = 'English',
    customPrompt,
    model = 'gemini-3.7-flash',
    apiKey,
    onChunk,
    onDone,
    onError,
    signal,
  } = params;

  if (!text || !text.trim()) {
    const err = new Error('Please select or provide text for the AI assistant to process.');
    if (onError) onError(err);
    throw err;
  }

  let systemInstruction: string;
  if (action === 'translate') {
    const fn = AI_SYSTEM_INSTRUCTIONS.translate as (lang: string) => string;
    systemInstruction = fn(targetLanguage);
  } else if (action === 'custom' && customPrompt) {
    systemInstruction = `You are an expert Markdown writing assistant. The user wants you to: "${customPrompt}". Return only the refined markdown content.`;
  } else {
    systemInstruction = AI_SYSTEM_INSTRUCTIONS[action] as string;
  }

  const prompt = action === 'custom' && customPrompt ? `Instructions: ${customPrompt}\n\nInput Text:\n${text}` : text;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (apiKey && apiKey.trim()) {
    headers['x-gemini-api-key'] = apiKey.trim();
  }

  try {
    const response = await fetch('/api/gemini/action-stream', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        prompt,
        systemInstruction,
        model,
        apiKey: apiKey?.trim(),
      }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder();
    let accumulated = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const jsonStr = trimmed.substring(5).trim();
        if (!jsonStr) continue;

        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed.error) {
            throw new Error(parsed.error);
          }
          if (parsed.text) {
            accumulated += parsed.text;
            onChunk(parsed.text, accumulated);
          }
          if (parsed.done) {
            // Stream complete
          }
        } catch (e: any) {
          if (e.message && !e.message.startsWith('Unexpected token')) {
            throw e;
          }
        }
      }
    }

    if (onDone) onDone(accumulated);
    return accumulated;
  } catch (err: any) {
    if (signal?.aborted) {
      return '';
    }
    if (onError) onError(err);
    throw err;
  }
}

