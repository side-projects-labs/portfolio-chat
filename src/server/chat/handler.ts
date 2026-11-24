import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { sanitizeMessages, validateChatInput } from "./validate";

export type ChatMetrics = { firstTokenMs: number | null; totalMs: number };

export type ChatDeps = {
  streamText: (input: { messages: unknown[]; signal: AbortSignal }) => AsyncIterable<string>;
  onMetrics?: (metrics: ChatMetrics) => void;
  now?: () => number;
};

export const SAFE_STREAM_ERROR = "응답을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.";

const json = (status: number, error: string) =>
  Response.json({ error }, { status });

export async function handleChat(request: Request, deps: ChatDeps): Promise<Response> {
  const now = deps.now ?? Date.now;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, "invalid");
  }

  const validation = validateChatInput(body);
  if (!validation.ok) return json(400, validation.error);

  const messages = sanitizeMessages(body);
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
