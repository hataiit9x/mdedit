import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

async function startServer() {
  const app = express();
  // Cloud Run injects PORT; keep 3000 for local dev.
  const PORT = Number(process.env.PORT) || 3000;

  // Cloud Run terminates TLS one hop in front of the app. Trust exactly one
  // proxy so callers cannot bypass the limiter with a forged left-most XFF.
  app.set("trust proxy", 1);

  app.use(express.json({ limit: "10mb" }));

  // Simple in-memory rate limit for the AI proxies: without it, shared API
  // keys on a public deployment could be drained by anyone who finds the
  // URL. No external dependency needed at this scale.
  const RATE_LIMIT_WINDOW_MS = 60_000;
  const RATE_LIMIT_MAX_REQUESTS = 30;
  const rateBuckets = new Map<string, { count: number; resetAt: number }>();

  app.use("/api", (_req, res, next) => {
    const ip = _req.ip || _req.socket?.remoteAddress || "unknown";
    const now = Date.now();
    const bucket = rateBuckets.get(ip);

    if (!bucket || bucket.resetAt < now) {
      // Opportunistic cleanup so the map cannot grow unbounded
      if (rateBuckets.size > 10_000) {
        for (const [key, value] of rateBuckets) {
          if (value.resetAt < now) rateBuckets.delete(key);
        }
      }
      if (rateBuckets.size >= 10_000) {
        const oldestKey = rateBuckets.keys().next().value;
        if (oldestKey) rateBuckets.delete(oldestKey);
      }
      rateBuckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
      return next();
    }

    bucket.count += 1;
    if (bucket.count > RATE_LIMIT_MAX_REQUESTS) {
      res.setHeader("Retry-After", Math.ceil((bucket.resetAt - now) / 1000));
      res.status(429).json({
        error: "Quá nhiều yêu cầu AI trong một phút. Vui lòng thử lại sau ít phút.",
      });
      return;
    }
    next();
  });

  // Check server API key status
  app.get("/api/gemini/status", (_req, res) => {
    const hasServerKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
    res.json({
      hasServerKey,
      defaultModel: "gemini-3.7-flash",
    });
  });

  // Map deprecated or discontinued model names to active Gemini 3 series models
  const resolveModelName = (inputModel?: string): string => {
    const normalized = (inputModel || "").trim();
    if (!normalized || normalized === "gemini-2.5-flash" || normalized === "gemini-1.5-flash" || normalized === "gemini-flash") {
      return "gemini-3.7-flash";
    }
    if (normalized === "gemini-2.5-pro" || normalized === "gemini-1.5-pro" || normalized === "gemini-pro") {
      return "gemini-3.1-pro-preview";
    }
    if (normalized === "gemini-flash-lite" || normalized === "gemini-lite") {
      return "gemini-3.1-flash-lite";
    }
    return normalized;
  };

  // Determine fallback models in case of 503 high demand or model error
  const getFallbackModels = (primaryModel: string): string[] => {
    const fallbacks: Record<string, string[]> = {
      "gemini-3.7-flash": ["gemini-3.6-flash", "gemini-3.1-flash-lite", "gemini-3.1-pro-preview"],
      "gemini-3.6-flash": ["gemini-3.7-flash", "gemini-3.1-flash-lite"],
      "gemini-3.1-flash-lite": ["gemini-3.7-flash", "gemini-3.6-flash"],
      "gemini-3.1-pro-preview": ["gemini-3.7-flash", "gemini-3.6-flash"],
    };
    return fallbacks[primaryModel] || ["gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.1-flash-lite"];
  };

  // Parse and extract clean human-friendly Gemini error details
  const extractGeminiError = (err: any): { message: string; isQuota: boolean; isInvalidKey: boolean; isTransient: boolean } => {
    let rawMsg = String(err?.message || err || "");
    let statusCode = err?.status || err?.code || 0;

    // Extract JSON error payload if embedded
    try {
      const jsonStart = rawMsg.indexOf("{");
      if (jsonStart !== -1) {
        const jsonEnd = rawMsg.lastIndexOf("}");
        if (jsonEnd > jsonStart) {
          const parsed = JSON.parse(rawMsg.slice(jsonStart, jsonEnd + 1));
          if (parsed?.error?.message) {
            rawMsg = parsed.error.message;
          }
          if (parsed?.error?.code) {
            statusCode = parsed.error.code;
          }
          if (parsed?.error?.status === "RESOURCE_EXHAUSTED") {
            statusCode = 429;
          }
        }
      }
    } catch {}

    const lower = rawMsg.toLowerCase();
    const isQuota =
      statusCode === 429 ||
      lower.includes("prepayment credits are depleted") ||
      lower.includes("resource_exhausted") ||
      lower.includes("quota") ||
      lower.includes("rate limit") ||
      lower.includes("credits are depleted") ||
      lower.includes("too many requests");

    const isInvalidKey =
      statusCode === 400 ||
      statusCode === 401 ||
      statusCode === 403 ||
      lower.includes("api_key_invalid") ||
      lower.includes("api key not valid") ||
      lower.includes("permission_denied") ||
      lower.includes("unauthenticated") ||
      lower.includes("forbidden");

    const isTransient =
      !isQuota &&
      !isInvalidKey &&
      (statusCode === 503 ||
        statusCode === 500 ||
        lower.includes("503") ||
        lower.includes("high demand") ||
        lower.includes("temporarily unavailable") ||
        lower.includes("try again later") ||
        lower.includes("overloaded"));

    let userFriendly = rawMsg;
    if (isQuota) {
      userFriendly = "Tài khoản hoặc API Key đã hết lượt sử dụng (Quota / Prepayment Credits depleted - Mã lỗi 429). Bạn có thể cấu hình API Key cá nhân miễn phí tại https://aistudio.google.com/app/apikey và dán vào mục Cài đặt (Settings) để tiếp tục sử dụng.";
    } else if (isInvalidKey) {
      userFriendly = "Gemini API Key không hợp lệ hoặc không có quyền truy cập. Vui lòng kiểm tra lại API Key trong mục Cài đặt.";
    } else if (isTransient) {
      userFriendly = "Hệ thống Gemini đang quá tải tạm thời. Vui lòng thử lại sau vài giây hoặc đổi mô hình khác trong Cài đặt.";
    }

    return {
      message: userFriendly,
      isQuota,
      isInvalidKey,
      isTransient,
    };
  };

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // Helper to get GoogleGenAI client
  const getAiClient = () => {
    const key = process.env.GEMINI_API_KEY?.trim();
    if (!key) {
      throw new Error("Server chưa cấu hình GEMINI_API_KEY. Hãy thêm secret phía server hoặc dùng BYOK trực tiếp trong trình duyệt.");
    }
    return new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  };

  // Helper to execute generation with automatic retries and model fallback
  const generateWithFallback = async (
    ai: any,
    primaryModel: string,
    generateParams: { contents: any; config?: any }
  ) => {
    const candidateModels = [primaryModel, ...getFallbackModels(primaryModel).filter((m) => m !== primaryModel)];
    let lastErrorDetails: any = null;

    for (const currentModel of candidateModels) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model: currentModel,
            contents: generateParams.contents,
            config: generateParams.config,
          });
          return { response, modelUsed: currentModel };
        } catch (err: any) {
          const errDetails = extractGeminiError(err);
          lastErrorDetails = errDetails;

          // If quota exhausted or invalid key, retrying other models won't help
          if (errDetails.isQuota || errDetails.isInvalidKey) {
            console.warn(`Non-recoverable error on model ${currentModel}:`, errDetails.message);
            throw new Error(errDetails.message);
          }

          if (errDetails.isTransient) {
            console.warn(`Transient error on model ${currentModel} (attempt ${attempt + 1}):`, err?.message || err);
            await delay(400 * Math.pow(2, attempt));
            continue;
          } else {
            throw new Error(errDetails.message);
          }
        }
      }
    }

    throw new Error(lastErrorDetails?.message || "Không thể tạo phản hồi từ Gemini AI.");
  };

  // Test Gemini API key
  app.post("/api/gemini/test-key", async (req, res) => {
    try {
      const modelName = resolveModelName(req.body?.model);
      const ai = getAiClient();

      const { response, modelUsed } = await generateWithFallback(ai, modelName, {
        contents: "Respond with the single word: OK",
      });

      const text = response.text || "";
      res.json({
        success: true,
        message: `Đã kết nối thành công tới Gemini (${modelUsed})!`,
        output: text.trim(),
        modelUsed,
      });
    } catch (err: any) {
      console.error("Test key error:", err);
      const errDetails = extractGeminiError(err);
      res.status(400).json({
        success: false,
        error: errDetails.message,
        isQuota: errDetails.isQuota,
        isInvalidKey: errDetails.isInvalidKey,
      });
    }
  });

  // Execute AI Writing Assistant action (Synchronous)
  app.post("/api/gemini/action", async (req, res) => {
    try {
      const { prompt, systemInstruction, model } = req.body;

      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ error: "Thiếu văn bản đầu vào cho AI." });
      }

      const modelName = resolveModelName(model);
      const ai = getAiClient();

      const { response, modelUsed } = await generateWithFallback(ai, modelName, {
        contents: prompt,
        config: systemInstruction
          ? {
              systemInstruction: systemInstruction,
            }
          : undefined,
      });

      const outputText = response.text || "";
      res.json({ result: outputText, modelUsed });
    } catch (err: any) {
      console.error("AI action error:", err);
      const errDetails = extractGeminiError(err);
      res.status(500).json({
        error: errDetails.message,
        isQuota: errDetails.isQuota,
        isInvalidKey: errDetails.isInvalidKey,
      });
    }
  });

  // Execute AI Writing Assistant action with Realtime Stream (SSE)
  app.post("/api/gemini/action-stream", async (req, res) => {
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    let isClosed = false;
    // See the OpenAI stream endpoint: res 'close', not req 'close'.
    res.on("close", () => {
      isClosed = true;
    });

    try {
      const { prompt, systemInstruction, model } = req.body;

      if (!prompt || typeof prompt !== "string") {
        res.write(`data: ${JSON.stringify({ error: "Thiếu văn bản đầu vào." })}\n\n`);
        return res.end();
      }

      const modelName = resolveModelName(model);
      const ai = getAiClient();
      const candidateModels = [modelName, ...getFallbackModels(modelName).filter((m) => m !== modelName)];

      let streamSucceeded = false;
      let lastErrDetails: any = null;

      for (const curModel of candidateModels) {
        if (isClosed) break;
        try {
          const streamResult = await ai.models.generateContentStream({
            model: curModel,
            contents: prompt,
            config: systemInstruction
              ? {
                  systemInstruction,
                }
              : undefined,
          });

          for await (const chunk of streamResult) {
            if (isClosed) break;
            const chunkText =
              chunk.text ||
              chunk.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("") ||
              "";
            if (chunkText) {
              res.write(`data: ${JSON.stringify({ text: chunkText, modelUsed: curModel })}\n\n`);
            }
          }

          streamSucceeded = true;
          if (!isClosed) {
            res.write(`data: ${JSON.stringify({ done: true, modelUsed: curModel })}\n\n`);
            res.end();
          }
          break;
        } catch (err: any) {
          const errDetails = extractGeminiError(err);
          lastErrDetails = errDetails;
          console.warn(`Stream attempt failed on model ${curModel}:`, errDetails.message);

          // If quota exhausted or invalid key, do not loop through fallback models
          if (errDetails.isQuota || errDetails.isInvalidKey) {
            break;
          }

          if (!errDetails.isTransient) {
            break;
          }
          await delay(300);
        }
      }

      if (!streamSucceeded && !isClosed) {
        const errorMsg = lastErrDetails?.message || "Không thể tạo phản hồi từ AI.";
        res.write(
          `data: ${JSON.stringify({
            error: errorMsg,
            isQuota: lastErrDetails?.isQuota,
            isInvalidKey: lastErrDetails?.isInvalidKey,
          })}\n\n`
        );
        res.end();
      }
    } catch (err: any) {
      console.error("AI action stream error:", err);
      if (!isClosed) {
        const errDetails = extractGeminiError(err);
        res.write(
          `data: ${JSON.stringify({
            error: errDetails.message || "Lỗi máy chủ nội bộ",
            isQuota: errDetails.isQuota,
            isInvalidKey: errDetails.isInvalidKey,
          })}\n\n`
        );
        res.end();
      }
    }
  });

  /* ---------------------------------------------------------------- */
  /* OpenAI-compatible proxy (shared server-side key via env)          */
  /*                                                                    */
  /* Configure with: OPENAI_BASE_URL, OPENAI_API_KEY, OPENAI_MODEL.     */
  /* Works with OpenAI, OpenRouter, Groq, DeepSeek, or any endpoint     */
  /* exposing POST {base}/chat/completions. Note: a LOCAL endpoint      */
  /* such as Ollama is only reachable when the server runs locally —    */
  /* from a Cloud Run deployment "localhost" is the Cloud Run host.     */
  /* ---------------------------------------------------------------- */

  const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL || "").trim().replace(/\/+$/, "");
  const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || "").trim();
  const OPENAI_MODEL = (process.env.OPENAI_MODEL || "").trim();

  app.get("/api/openai/status", (_req, res) => {
    res.json({
      configured: Boolean(OPENAI_BASE_URL && OPENAI_API_KEY),
      baseUrl: OPENAI_BASE_URL || null,
      defaultModel: OPENAI_MODEL || null,
    });
  });

  const extractUpstreamError = (bodyText: string): string => {
    try {
      const parsed = JSON.parse(bodyText);
      return parsed?.error?.message || parsed?.message || "";
    } catch {
      return bodyText.slice(0, 300);
    }
  };

  app.post("/api/openai/chat", async (req, res) => {
    try {
      const { messages, model } = req.body || {};
      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: "Thiếu nội dung yêu cầu (messages)." });
      }
      if (!OPENAI_BASE_URL || !OPENAI_API_KEY) {
        return res.status(400).json({
          error:
            "Server chưa cấu hình OpenAI-compatible (OPENAI_BASE_URL + OPENAI_API_KEY). Hãy nhập API Key cá nhân trong Cài đặt.",
        });
      }

      const upstream = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          messages,
          model: (model || "").trim() || OPENAI_MODEL || undefined,
        }),
      });

      const text = await upstream.text();
      if (!upstream.ok) {
        return res.status(upstream.status).json({
          error: extractUpstreamError(text) || `Endpoint trả về lỗi (${upstream.status}).`,
        });
      }

      try {
        res.status(200).json(JSON.parse(text));
      } catch {
        return res.status(502).json({ error: "Endpoint trả về phản hồi không hợp lệ." });
      }
    } catch (err: any) {
      console.error("OpenAI proxy error:", err?.message || err);
      res.status(502).json({
        error: "Không kết nối được endpoint OpenAI-compatible. Kiểm tra OPENAI_BASE_URL trên server.",
      });
    }
  });

  // Streaming proxy: upstream SSE bytes are passed through verbatim so the
  // client keeps its standard choices[0].delta.content parsing.
  app.post("/api/openai/chat-stream", async (req, res) => {
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    const sendError = (message: string) => {
      res.write(`data: ${JSON.stringify({ error: { message } })}\n\n`);
      res.end();
    };

    const { messages, model } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return sendError("Thiếu nội dung yêu cầu (messages).");
    }
    if (!OPENAI_BASE_URL || !OPENAI_API_KEY) {
      return sendError(
        "Server chưa cấu hình OpenAI-compatible. Hãy nhập API Key cá nhân trong Cài đặt."
      );
    }

    const abortController = new AbortController();
    // NB: listen on the RESPONSE 'close' — since Node 16, req 'close' fires
    // as soon as the request body has been consumed, which would abort the
    // upstream fetch before a single byte is streamed.
    res.on("close", () => {
      if (!res.writableEnded) abortController.abort();
    });

    try {
      const upstream = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          messages,
          stream: true,
          model: (model || "").trim() || OPENAI_MODEL || undefined,
        }),
        signal: abortController.signal,
      });

      if (!upstream.ok || !upstream.body) {
        const text = await upstream.text().catch(() => "");
        return sendError(extractUpstreamError(text) || `Endpoint trả về lỗi (${upstream.status}).`);
      }

      const reader = upstream.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) res.write(value);
        }
      } finally {
        reader.releaseLock();
      }
      res.end();
    } catch (err: any) {
      if (abortController.signal.aborted) return;
      console.error("OpenAI stream proxy error:", err?.message || err);
      sendError("Không kết nối được endpoint OpenAI-compatible trong lúc streaming.");
    }
  });

  // Vite middleware for development vs static build in production
  const isProduction = process.env.NODE_ENV === "production" || process.argv.includes("--production");
  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production hardening: a strict CSP keeps injected/inline scripts from
    // executing even if an XSS slips through the client-side sanitisation.
    // connect-src still allows https endpoints so the browser can call
    // Gemini / OpenAI-compatible providers directly (BYOK mode), plus
    // localhost for self-hosted endpoints such as Ollama.
    app.use((_req, res, next) => {
      res.setHeader(
        "Content-Security-Policy",
        [
          "default-src 'self'",
          "script-src 'self'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob: https:",
          "font-src 'self' data:",
          "connect-src 'self' https: http://localhost:* http://127.0.0.1:*",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "frame-ancestors 'none'",
        ].join("; ")
      );
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Referrer-Policy", "no-referrer");
      next();
    });

    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`MDEdit server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

