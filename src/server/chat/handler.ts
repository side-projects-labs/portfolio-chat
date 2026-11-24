import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { sanitizeMessages, validateChatInput } from "./validate";

export type ChatMetrics = { firstTokenMs: number | null; totalMs: number };

export type ChatDeps = {
  streamText: (input: { messages: unknown[]; signal: AbortSignal }) => AsyncIterable<string>;
  onMetrics?: (metrics: ChatMetrics) => void;
  rateLimit?: (input: { request: Request; chars: number }) => { ok: true } | { ok: false; retryAfterSec: number };
  now?: () => number;
};

export const SAFE_STREAM_ERROR = "응답을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.";

// 검증을 통과하는 가장 큰 요청(20개 × 2000자, 한글 3바이트)보다 넉넉한 상한입니다.
export const MAX_BODY_BYTES = 256 * 1024;

const json = (status: number, error: string, headers?: HeadersInit) =>
  Response.json({ error }, { status, headers });

export async function handleChat(request: Request, deps: ChatDeps): Promise<Response> {
  const now = deps.now ?? Date.now;

  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return json(413, "too_large");

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return json(400, "invalid");
  }
  // 문자 수가 아니라 실제 바이트 수로 잽니다.
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return json(413, "too_large");

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json(400, "invalid");
  }

  const validation = validateChatInput(body);
  if (!validation.ok) return json(400, validation.error);

  const messages = sanitizeMessages(body);

  if (deps.rateLimit) {
    const chars = messages.reduce((n, m) => n + m.parts.reduce((k, p) => k + p.text.length, 0), 0);
    const limited = deps.rateLimit({ request, chars });
    if (!limited.ok) return json(429, "rate_limited", { "Retry-After": String(limited.retryAfterSec) });
  }
  const startedAt = now();

  let source: AsyncIterable<string>;
  try {
    source = deps.streamText({ messages, signal: request.signal });
  } catch {
    return json(500, "model_unavailable");
  }

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      let firstTokenAt: number | null = null;
      try {
        writer.write({ type: "text-start", id: "t1" });
        for await (const delta of source) {
          firstTokenAt ??= now();
          writer.write({ type: "text-delta", id: "t1", delta });
        }
        writer.write({ type: "text-end", id: "t1" });
      } finally {
        deps.onMetrics?.({
          firstTokenMs: firstTokenAt === null ? null : firstTokenAt - startedAt,
          totalMs: now() - startedAt,
        });
      }
    },
    onError: () => SAFE_STREAM_ERROR,
  });

  return createUIMessageStreamResponse({ stream });
}
