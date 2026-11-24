import { z } from "zod";

export const MAX_TEXT_LENGTH = 2000;
export const MAX_MESSAGES = 20;

export type ChatInputError = "empty" | "too_long" | "too_many" | "invalid";
export type ValidationResult = { ok: true } | { ok: false; error: ChatInputError };

// 클라이언트가 보낼 수 있는 part는 AI SDK가 대화 이력에 붙이는 종류로 제한합니다.
// file·tool·data 같은 part는 크기와 의미를 신뢰할 수 없으므로 받지 않습니다.
const ALLOWED_PART_TYPES = ["text", "reasoning", "step-start", "source-url"] as const;

const bodySchema = z.object({
  messages: z.array(
    z.object({
      id: z.string(),
      role: z.enum(["user", "assistant"]),
      parts: z.array(
        z
          .object({
            type: z.enum(ALLOWED_PART_TYPES),
            text: z.string().optional(),
            url: z.string().max(2048).optional(),
          })
          .passthrough(),
      ),
    }),
  ),
});

type Part = { type: string; text?: string };

function textOf(parts: Part[]): string {
  return parts
    .filter((p) => p.type === "text")
    .map((p) => p.text ?? "")
    .join("");
}

// 길이 상한은 요청 크기를 묶기 위해 text를 가진 모든 part에 적용합니다.
function allTextLength(parts: Part[]): number {
  return parts.reduce((n, p) => n + (p.text?.length ?? 0), 0);
}

export type ModelMessage = { id: string; role: "user" | "assistant"; parts: { type: "text"; text: string }[] };

// 검증을 통과한 본문에서 모델에 보낼 것(텍스트 part)만 남깁니다. 그 밖의 필드와 part는 버립니다.
export function sanitizeMessages(body: unknown): ModelMessage[] {
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return [];
  return parsed.data.messages
    .map((m) => ({
      id: m.id,
      role: m.role,
      parts: m.parts.flatMap((p) => (p.type === "text" ? [{ type: "text" as const, text: p.text ?? "" }] : [])),
    }))
    .filter((m) => m.parts.length > 0);
}

export function validateChatInput(body: unknown): ValidationResult {
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const { messages } = parsed.data;
  if (messages.length === 0) return { ok: false, error: "empty" };
  if (messages.length > MAX_MESSAGES) return { ok: false, error: "too_many" };

  const last = messages[messages.length - 1];
  if (last.role !== "user") return { ok: false, error: "invalid" };

  for (const m of messages) {
    if (allTextLength(m.parts) > MAX_TEXT_LENGTH) return { ok: false, error: "too_long" };
  }
  if (textOf(last.parts).trim() === "") return { ok: false, error: "empty" };

  return { ok: true };
}
