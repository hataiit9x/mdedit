// Multi-provider AI service — no backend required.
//
// Provider "gemini" (hybrid):
//   - If the app is served by server.ts (AI Studio deploy / `npm run dev`),
//     requests go through /api/gemini/* so a shared server-side key can be
//     used and never reaches the browser.
//   - Otherwise the browser calls Google's REST API directly with the user's
//     personal key (BYOK), sent only via the `x-goog-api-key` header.
//
// Provider "openai": any OpenAI-compatible endpoint (OpenAI, OpenRouter,
// Groq, DeepSeek, Ollama, ...) configured in Settings, called directly with
// `Authorization: Bearer` — the wire format mirrors ref/mdtools-main.
//
// API keys are read from secureKeyStore (session-only or AES-GCM encrypted),
// never from query strings, never logged.

import { AiActionType, TranslationTargetLanguage, AiProvider } from '../types';
import { getSecret } from './secureKeyStore';

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

const NO_KEY_ERROR =
  'Chưa cấu hình API Key. Hãy mở Cài đặt và nhập API Key cá nhân (BYOK), hoặc chạy ứng dụng cùng server để dùng key dùng chung.';

/* ------------------------------------------------------------------ */
/* Server detection (hybrid)                                           */
/* ------------------------------------------------------------------ */

export interface ServerStatus {
  available: boolean;
  hasServerKey: boolean;
  defaultModel: string;
}

let serverStatusCache: ServerStatus | null = null;

export async function checkServerKeyStatus(force = false): Promise<ServerStatus> {
  if (serverStatusCache && !force) return serverStatusCache;

  const fallback: ServerStatus = { available: false, hasServerKey: false, defaultModel: 'gemini-3.7-flash' };
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch('/api/gemini/status', { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) {
      serverStatusCache = fallback;
      return fallback;
    }
    // A static SPA fallback also answers 200 with an HTML document — only a
    // strict JSON body with the expected shape counts as "server present".
    const text = await res.text();
    if (!text.trimStart().startsWith('{')) {
      serverStatusCache = fallback;
      return fallback;
    }
    const data = JSON.parse(text);
    if (typeof data.hasServerKey !== 'boolean') {
      serverStatusCache = fallback;
      return fallback;
    }
    serverStatusCache = {
      available: true,
      hasServerKey: data.hasServerKey,
      defaultModel: data.defaultModel || 'gemini-3.7-flash',
    };
    return serverStatusCache;
  } catch {
    serverStatusCache = fallback;
    return fallback;
  }
}

export interface OpenAiServerStatus {
  available: boolean;
  configured: boolean;
  baseUrl: string | null;
  defaultModel: string | null;
}

let openAiServerCache: OpenAiServerStatus | null = null;

export async function checkOpenAiServerStatus(force = false): Promise<OpenAiServerStatus> {
  if (openAiServerCache && !force) return openAiServerCache;

  const fallback: OpenAiServerStatus = { available: false, configured: false, baseUrl: null, defaultModel: null };
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch('/api/openai/status', { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) {
      openAiServerCache = fallback;
      return fallback;
    }
    const text = await res.text();
    if (!text.trimStart().startsWith('{')) {
      openAiServerCache = fallback;
      return fallback;
    }
    const data = JSON.parse(text);
    if (typeof data.configured !== 'boolean') {
      openAiServerCache = fallback;
      return fallback;
    }
    openAiServerCache = {
      available: true,
      configured: data.configured,
      baseUrl: data.baseUrl || null,
      defaultModel: data.defaultModel || null,
    };
    return openAiServerCache;
  } catch {
    openAiServerCache = fallback;
    return fallback;
  }
}

/* ------------------------------------------------------------------ */
/* Error classification (ported from server.ts, Vietnamese UX)         */
/* ------------------------------------------------------------------ */

interface AiErrorDetails {
  message: string;
  isQuota: boolean;
  isInvalidKey: boolean;
  isTransient: boolean;
}

export function classifyAiError(rawMsg: string, statusCode = 0): AiErrorDetails {
  let msg = String(rawMsg || '');
  let code = statusCode;

  try {
    const jsonStart = msg.indexOf('{');
    if (jsonStart !== -1) {
      const jsonEnd = msg.lastIndexOf('}');
      if (jsonEnd > jsonStart) {
        const parsed = JSON.parse(msg.slice(jsonStart, jsonEnd + 1));
        if (parsed?.error?.message) msg = parsed.error.message;
        if (parsed?.error?.code) code = parsed.error.code;
        if (parsed?.error?.status === 'RESOURCE_EXHAUSTED') code = 429;
      }
    }
  } catch {
    /* keep original message */
  }

  const lower = msg.toLowerCase();
  const isQuota =
    code === 429 ||
    lower.includes('prepayment credits are depleted') ||
    lower.includes('resource_exhausted') ||
    lower.includes('quota') ||
    lower.includes('rate limit') ||
    lower.includes('credits are depleted') ||
    lower.includes('too many requests') ||
    lower.includes('billing');

  const isInvalidKey =
    code === 400 ||
    code === 401 ||
    code === 403 ||
    lower.includes('api_key_invalid') ||
    lower.includes('api key not valid') ||
    lower.includes('permission_denied') ||
    lower.includes('unauthenticated') ||
    lower.includes('unauthorized') ||
    lower.includes('forbidden') ||
    lower.includes('incorrect api key');

  const isTransient =
    !isQuota &&
    !isInvalidKey &&
    (code === 500 ||
      code === 502 ||
      code === 503 ||
      lower.includes('503') ||
      lower.includes('high demand') ||
      lower.includes('temporarily unavailable') ||
      lower.includes('try again later') ||
      lower.includes('overloaded'));

  let message = msg || 'Lỗi không xác định khi gọi AI.';
  if (isQuota) {
    message =
      'Tài khoản hoặc API Key đã hết lượt sử dụng (quota / rate limit - mã 429). Bạn có thể tạo API Key cá nhân miễn phí tại https://aistudio.google.com/app/apikey, dán vào mục Cài đặt, hoặc chuyển sang nhà cung cấp OpenAI-compatible khác.';
  } else if (isInvalidKey) {
    message = 'API Key không hợp lệ hoặc không có quyền truy cập. Vui lòng kiểm tra lại API Key trong mục Cài đặt.';
  } else if (isTransient) {
    message = 'Hệ thống AI đang quá tải tạm thời. Vui lòng thử lại sau vài giây hoặc đổi mô hình khác trong Cài đặt.';
  }

  return { message, isQuota, isInvalidKey, isTransient };
}

/* ------------------------------------------------------------------ */
/* Model resolution (mirrors server.ts)                                */
/* ------------------------------------------------------------------ */

const FALLBACK_MODELS: Record<string, string[]> = {
  'gemini-3.7-flash': ['gemini-3.6-flash', 'gemini-3.1-flash-lite', 'gemini-3.1-pro-preview'],
  'gemini-3.6-flash': ['gemini-3.7-flash', 'gemini-3.1-flash-lite'],
  'gemini-3.1-flash-lite': ['gemini-3.7-flash', 'gemini-3.6-flash'],
  'gemini-3.1-pro-preview': ['gemini-3.7-flash', 'gemini-3.6-flash'],
};

function resolveModelName(inputModel?: string): string {
  const normalized = (inputModel || '').trim();
  if (!normalized || ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-flash'].includes(normalized)) {
    return 'gemini-3.7-flash';
  }
  if (['gemini-2.5-pro', 'gemini-1.5-pro', 'gemini-pro'].includes(normalized)) {
    return 'gemini-3.1-pro-preview';
  }
  if (['gemini-flash-lite', 'gemini-lite'].includes(normalized)) {
    return 'gemini-3.1-flash-lite';
  }
  return normalized;
}

function getCandidateModels(primary: string): string[] {
  const fallbacks = FALLBACK_MODELS[primary] || ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.1-flash-lite'];
  return [primary, ...fallbacks.filter((m) => m !== primary)];
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/* ------------------------------------------------------------------ */
/* Prompt construction                                                 */
/* ------------------------------------------------------------------ */

export interface ExecuteAiActionParams {
  action: AiActionType;
  text: string;
  targetLanguage?: TranslationTargetLanguage;
  customPrompt?: string;
  model?: string;
  provider?: AiProvider;
  baseUrl?: string;
}

function buildInstructionAndPrompt(params: ExecuteAiActionParams): { systemInstruction: string; prompt: string } {
  const { action, text, targetLanguage = 'English', customPrompt } = params;

  let systemInstruction: string;
  if (action === 'translate') {
    const fn = AI_SYSTEM_INSTRUCTIONS.translate as (lang: string) => string;
    systemInstruction = fn(targetLanguage);
  } else if (action === 'custom' && customPrompt) {
    systemInstruction = `You are an expert Markdown writing assistant. The user wants you to: "${customPrompt}". Return only the refined markdown content.`;
  } else {
    systemInstruction = AI_SYSTEM_INSTRUCTIONS[action] as string;
  }

  // Extra instructions ride along with any action, not only 'custom'.
  if (customPrompt && action !== 'custom') {
    systemInstruction += `\nAdditionally, follow these user instructions: "${customPrompt}"`;
  }

  const prompt = action === 'custom' && customPrompt ? `Instructions: ${customPrompt}\n\nInput Text:\n${text}` : text;
  return { systemInstruction, prompt };
}

function requireText(text: string): Error | null {
  if (!text || !text.trim()) {
    return new Error('Please select or provide text for the AI assistant to process.');
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Gemini: server-proxy branch                                         */
/* ------------------------------------------------------------------ */

async function geminiServerGenerate(params: ExecuteAiActionParams, apiKey: string): Promise<string> {
  const { systemInstruction, prompt } = buildInstructionAndPrompt(params);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['x-gemini-api-key'] = apiKey;

  const res = await fetch('/api/gemini/action', {
    method: 'POST',
    headers,
    body: JSON.stringify({ prompt, systemInstruction, model: params.model }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || 'Gemini API call failed.');
  }
  return (data.result || '').trim();
}

async function geminiServerStream(
  params: ExecuteAiActionParams,
  apiKey: string,
  hooks: StreamHooks
): Promise<string> {
  const { systemInstruction, prompt } = buildInstructionAndPrompt(params);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['x-gemini-api-key'] = apiKey;

  const response = await fetch('/api/gemini/action-stream', {
    method: 'POST',
    headers,
    body: JSON.stringify({ prompt, systemInstruction, model: params.model }),
    signal: hooks.signal,
  });

  if (!response.ok) {
    throw new Error(`HTTP error ${response.status}`);
  }

  return consumeSse(response, hooks, (parsed) => {
    // server.ts emits its own envelope: { text } | { error } | { done }
    if (parsed.error) throw new Error(parsed.error);
    return typeof parsed.text === 'string' ? parsed.text : '';
  });
}

/* ------------------------------------------------------------------ */
/* Gemini: direct REST branch (BYOK, no server)                        */
/* ------------------------------------------------------------------ */

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

async function geminiDirectGenerate(params: ExecuteAiActionParams, apiKey: string): Promise<string> {
  const { systemInstruction, prompt } = buildInstructionAndPrompt(params);
  const primary = resolveModelName(params.model);
  let lastError: AiErrorDetails | null = null;

  for (const model of getCandidateModels(primary)) {
    try {
      const res = await fetch(`${GEMINI_BASE}/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction }] } } : {}),
        }),
      });

      if (!res.ok) {
        const bodyText = await res.text();
        throw new Error(withStatus(bodyText || `HTTP ${res.status}`, res.status));
      }

      const data = await res.json();
      const text =
        data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') || '';
      return text.trim();
    } catch (err: any) {
      const details = classifyAiError(err?.message || String(err), err?.status || parseStatus(err?.message));
      lastError = details;
      if (details.isQuota || details.isInvalidKey) throw new Error(details.message);
      // transient or unknown: try the next fallback model
    }
  }

  throw new Error(lastError?.message || 'Không thể tạo phản hồi từ Gemini AI.');
}

async function geminiDirectStream(params: ExecuteAiActionParams, apiKey: string, hooks: StreamHooks): Promise<string> {
  const { systemInstruction, prompt } = buildInstructionAndPrompt(params);
  const primary = resolveModelName(params.model);
  let lastError: AiErrorDetails | null = null;

  for (const model of getCandidateModels(primary)) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(
          `${GEMINI_BASE}/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey,
            },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction }] } } : {}),
            }),
            signal: hooks.signal,
          }
        );

        if (!res.ok) {
          const bodyText = await res.text();
          throw new Error(withStatus(bodyText || `HTTP ${res.status}`, res.status));
        }

        return await consumeSse(res, hooks, (parsed) => {
          if (parsed?.error) throw new Error(parsed.error.message || 'Gemini API error');
          // Native Gemini SSE: candidates[0].content.parts[].text
          const parts = parsed?.candidates?.[0]?.content?.parts;
          if (Array.isArray(parts)) {
            return parts.map((p: { text?: string }) => p.text || '').join('');
          }
          return '';
        });
      } catch (err: any) {
        if (hooks.signal?.aborted) return '';
        const details = classifyAiError(err?.message || String(err), parseStatus(err?.message));
        lastError = details;
        if (details.isQuota || details.isInvalidKey) throw new Error(details.message);
        if (details.isTransient && attempt === 0) {
          await delay(400 * Math.pow(2, attempt));
          continue;
        }
        break; // try next fallback model
      }
    }
  }

  throw new Error(lastError?.message || 'Không thể tạo phản hồi từ Gemini AI.');
}

/* ------------------------------------------------------------------ */
/* OpenAI-compatible branch                                            */
/*                                                                     */
/* Routing: a personal key (stored client-side) always calls the user's */
/* endpoint DIRECTLY from the browser — this also makes local endpoints */
/* such as Ollama work, and keeps the personal key off our server.      */
/* Without a personal key, a server that has OPENAI_BASE_URL +          */
/* OPENAI_API_KEY configured proxies the call so a shared key can be    */
/* used without ever reaching the browser.                             */
/* ------------------------------------------------------------------ */

function normalizeBaseUrl(baseUrl: string): string {
  return (baseUrl || '').trim().replace(/\/+$/, '');
}

const NO_OPENAI_KEY_ERROR =
  'Chưa cấu hình OpenAI-compatible. Hãy mở Cài đặt nhập API Key cá nhân, hoặc cấu hình OPENAI_BASE_URL + OPENAI_API_KEY phía server.';

interface OpenAiRequestContext {
  systemInstruction: string;
  prompt: string;
  model: string;
}

function openAiMessages(ctx: OpenAiRequestContext) {
  return [
    { role: 'system', content: ctx.systemInstruction },
    { role: 'user', content: ctx.prompt },
  ];
}

async function openaiDirectGenerate(params: ExecuteAiActionParams, apiKey: string, baseUrl: string): Promise<string> {
  const { systemInstruction, prompt } = buildInstructionAndPrompt(params);
  const model = (params.model || '').trim();

  const res = await fetch(`${normalizeBaseUrl(baseUrl)}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    const bodyText = await res.text();
    throw new Error(withStatus(bodyText || `HTTP ${res.status}`, res.status));
  }

  const data = await res.json();
  return (data?.choices?.[0]?.message?.content || '').trim();
}

async function openaiDirectStream(
  params: ExecuteAiActionParams,
  apiKey: string,
  baseUrl: string,
  hooks: StreamHooks
): Promise<string> {
  const { systemInstruction, prompt } = buildInstructionAndPrompt(params);
  const model = (params.model || '').trim();

  const res = await fetch(`${normalizeBaseUrl(baseUrl)}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: prompt },
      ],
      stream: true,
    }),
    signal: hooks.signal,
  });

  if (!res.ok) {
    const bodyText = await res.text();
    throw new Error(withStatus(bodyText || `HTTP ${res.status}`, res.status));
  }

  return consumeSse(res, hooks, (parsed) => {
    if (parsed?.error) throw new Error(parsed.error.message || 'OpenAI-compatible API error');
    // OpenAI wire format (same as ref/mdtools-main): choices[0].delta.content
    const content = parsed?.choices?.[0]?.delta?.content;
    return typeof content === 'string' ? content : '';
  });
}

async function openaiServerGenerate(params: ExecuteAiActionParams, server: OpenAiServerStatus): Promise<string> {
  const ctx = { ...buildInstructionAndPrompt(params), model: (params.model || '').trim() || server.defaultModel || '' };

  const res = await fetch('/api/openai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: openAiMessages(ctx), model: ctx.model }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok || data?.error) {
    throw new Error(data?.error || `Lỗi từ server proxy (HTTP ${res.status}).`);
  }
  return (data?.choices?.[0]?.message?.content || '').trim();
}

async function openaiServerStream(
  params: ExecuteAiActionParams,
  server: OpenAiServerStatus,
  hooks: StreamHooks
): Promise<string> {
  const ctx = { ...buildInstructionAndPrompt(params), model: (params.model || '').trim() || server.defaultModel || '' };

  const response = await fetch('/api/openai/chat-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: openAiMessages(ctx), model: ctx.model }),
    signal: hooks.signal,
  });

  if (!response.ok) {
    throw new Error(`HTTP error ${response.status}`);
  }

  // Server passes upstream OpenAI SSE through verbatim.
  return consumeSse(response, hooks, (parsed) => {
    if (parsed?.error) throw new Error(parsed.error.message || 'OpenAI-compatible API error');
    const content = parsed?.choices?.[0]?.delta?.content;
    return typeof content === 'string' ? content : '';
  });
}

async function resolveOpenAiRoute(params: ExecuteAiActionParams): Promise<
  | { mode: 'direct'; apiKey: string; baseUrl: string }
  | { mode: 'server'; server: OpenAiServerStatus }
> {
  const personalKey = await getSecret('openai');
  if (personalKey) {
    return { mode: 'direct', apiKey: personalKey, baseUrl: params.baseUrl || 'https://api.openai.com/v1' };
  }

  const server = await checkOpenAiServerStatus();
  if (server.available && server.configured) {
    return { mode: 'server', server };
  }

  throw new Error(NO_OPENAI_KEY_ERROR);
}

/* ------------------------------------------------------------------ */
/* SSE consumption                                                     */
/* ------------------------------------------------------------------ */

interface StreamHooks {
  onChunk: (chunkText: string, accumulated: string) => void;
  onDone?: (finalText: string) => void;
  onError?: (error: Error) => void;
  signal?: AbortSignal;
}

async function consumeSse(
  response: Response,
  hooks: StreamHooks,
  extractText: (parsed: any) => string
): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body is not readable');
  }

  const decoder = new TextDecoder();
  let accumulated = '';
  let buffer = '';

  try {
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
        if (!jsonStr || jsonStr === '[DONE]') continue;

        try {
          const parsed = JSON.parse(jsonStr);
          const text = extractText(parsed);
          if (text) {
            accumulated += text;
            hooks.onChunk(text, accumulated);
          }
        } catch (e: any) {
          if (e && e.message && !e.message.startsWith('Unexpected token')) {
            throw e;
          }
        }
      }
    }
  } finally {
    reader.releaseLock?.();
  }

  if (hooks.onDone) hooks.onDone(accumulated);
  return accumulated;
}

function withStatus(message: string, status: number): string {
  return `[status:${status}] ${message}`;
}

function parseStatus(message: string): number {
  const m = String(message || '').match(/\[status:(\d+)\]/);
  return m ? Number(m[1]) : 0;
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export async function executeAiAction(params: ExecuteAiActionParams): Promise<string> {
  const empty = requireText(params.text);
  if (empty) throw empty;

  const provider = params.provider || 'gemini';

  if (provider === 'openai') {
    const route = await resolveOpenAiRoute(params);
    if (route.mode === 'direct') {
      return openaiDirectGenerate(params, route.apiKey, route.baseUrl);
    }
    return openaiServerGenerate(params, route.server);
  }

  // Gemini: prefer the server proxy when one is present (shared key stays server-side)
  const server = await checkServerKeyStatus();
  const apiKey = await getSecret('gemini');
  if (server.available) {
    return geminiServerGenerate(params, apiKey);
  }

  if (!apiKey) {
    throw new Error(NO_KEY_ERROR);
  }
  return geminiDirectGenerate(params, apiKey);
}

export interface ExecuteAiActionStreamParams extends ExecuteAiActionParams {
  onChunk: (chunkText: string, accumulated: string) => void;
  onDone?: (finalText: string) => void;
  onError?: (error: Error) => void;
  signal?: AbortSignal;
}

export async function executeAiActionStream(params: ExecuteAiActionStreamParams): Promise<string> {
  const { onChunk, onDone, onError, signal, ...rest } = params;
  const hooks: StreamHooks = { onChunk, onDone, onError, signal };

  const empty = requireText(rest.text);
  if (empty) {
    onError?.(empty);
    throw empty;
  }

  const provider = rest.provider || 'gemini';

  try {
    if (provider === 'openai') {
      const route = await resolveOpenAiRoute(rest);
      if (route.mode === 'direct') {
        return await openaiDirectStream(rest, route.apiKey, route.baseUrl, hooks);
      }
      return await openaiServerStream(rest, route.server, hooks);
    }

    const server = await checkServerKeyStatus();
    const apiKey = await getSecret('gemini');
    if (server.available) {
      return await geminiServerStream(rest, apiKey, hooks);
    }

    if (!apiKey) {
      throw new Error(NO_KEY_ERROR);
    }
    return await geminiDirectStream(rest, apiKey, hooks);
  } catch (err: any) {
    if (signal?.aborted) {
      return '';
    }
    onError?.(err);
    throw err;
  }
}

/* ------------------------------------------------------------------ */
/* Key testing                                                         */
/* ------------------------------------------------------------------ */

export async function testGeminiApiKey(
  apiKey: string,
  model: string = 'gemini-3.7-flash'
): Promise<{ success: boolean; message: string }> {
  const key = apiKey.trim();
  try {
    const server = await checkServerKeyStatus();
    if (server.available) {
      const res = await fetch('/api/gemini/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(key ? { 'x-gemini-api-key': key } : {}) },
        body: JSON.stringify({ apiKey: key, model }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, message: data.error || 'Failed to connect to Gemini API' };
      }
      return { success: true, message: data.message || 'Key is valid!' };
    }

    if (!key) {
      return { success: false, message: NO_KEY_ERROR };
    }

    const res = await fetch(`${GEMINI_BASE}/${encodeURIComponent(resolveModelName(model))}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Respond with the single word: OK' }] }] }),
    });
    if (!res.ok) {
      const bodyText = await res.text();
      const details = classifyAiError(bodyText, res.status);
      return { success: false, message: details.message };
    }
    return { success: true, message: `Đã kết nối thành công tới Gemini (${resolveModelName(model)})!` };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Network error while testing key' };
  }
}

export async function testOpenAiApiKey(
  apiKey: string,
  baseUrl: string,
  model?: string
): Promise<{ success: boolean; message: string }> {
  const key = apiKey.trim();
  const base = normalizeBaseUrl(baseUrl);
  try {
    if (!base) {
      return { success: false, message: 'Chưa nhập Base URL.' };
    }
    if (!key) {
      return { success: false, message: 'Chưa nhập API Key.' };
    }

    const res = await fetch(`${base}/models`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) {
      const bodyText = await res.text();
      const details = classifyAiError(bodyText, res.status);
      return { success: false, message: details.message };
    }
    const data = await res.json().catch(() => null);
    const modelCount = Array.isArray(data?.data) ? data.data.length : 0;
    const modelNote = model ? ` — model: ${model}` : '';
    return {
      success: true,
      message: `Kết nối thành công! Endpoint phản hồi ${modelCount > 0 ? `${modelCount} model` : 'OK'}${modelNote}.`,
    };
  } catch (err: any) {
    return {
      success: false,
      message:
        'Không kết nối được tới endpoint. Kiểm tra Base URL, key, và đảm bảo endpoint cho phép gọi trực tiếp từ trình duyệt (CORS).',
    };
  }
}

/**
 * Test the SERVER-side OpenAI-compatible configuration (OPENAI_BASE_URL +
 * OPENAI_API_KEY) through the proxy — used when no personal key is set.
 */
export async function testServerOpenAiConfig(): Promise<{ success: boolean; message: string }> {
  try {
    const server = await checkOpenAiServerStatus(true);
    if (!server.available || !server.configured) {
      return { success: false, message: 'Server chưa cấu hình OpenAI-compatible.' };
    }

    const res = await fetch('/api/openai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Respond with the single word: OK' }],
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || data?.error) {
      return { success: false, message: data?.error || `Lỗi từ server proxy (HTTP ${res.status}).` };
    }
    const text = (data?.choices?.[0]?.message?.content || '').trim();
    return {
      success: true,
      message: `Server proxy kết nối thành công tới ${server.baseUrl}${server.defaultModel ? ` (model: ${server.defaultModel})` : ''} — phản hồi: "${text.slice(0, 40)}".`,
    };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Không kiểm tra được cấu hình server.' };
  }
}
