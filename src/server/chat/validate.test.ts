import { describe, expect, it } from "vitest";
import { MAX_MESSAGES, MAX_TEXT_LENGTH, validateChatInput } from "./validate";

const msg = (role: "user" | "assistant", text: string) => ({
  id: "m",
  role,
  parts: [{ type: "text", text }],
});

describe("validateChatInput", () => {
  it("정상 입력은 통과한다", () => {
    expect(validateChatInput({ messages: [msg("user", "클로저가 뭐야?")] })).toEqual({ ok: true });
  });

  it("상한 길이 입력은 통과하고 초과는 too_long으로 거부한다", () => {
    expect(validateChatInput({ messages: [msg("user", "a".repeat(MAX_TEXT_LENGTH))] })).toEqual({ ok: true });
    expect(validateChatInput({ messages: [msg("user", "a".repeat(MAX_TEXT_LENGTH + 1))] })).toEqual({ ok: false, error: "too_long" });
  });

  it("빈 메시지 목록과 공백뿐인 입력은 empty로 거부한다", () => {
    expect(validateChatInput({ messages: [] })).toEqual({ ok: false, error: "empty" });
    expect(validateChatInput({ messages: [msg("user", "   ")] })).toEqual({ ok: false, error: "empty" });
  });

  it("메시지 개수 상한을 넘기면 too_many로 거부한다", () => {
    const messages = Array.from({ length: MAX_MESSAGES + 1 }, () => msg("user", "hi"));
    expect(validateChatInput({ messages })).toEqual({ ok: false, error: "too_many" });
  });

  it("형식이 맞지 않는 본문은 invalid로 거부한다", () => {
    for (const body of [null, undefined, "x", {}, { messages: "x" }, { messages: [{ role: "user" }] }, { messages: [{ id: "m", role: "system", parts: [] }] }]) {
      expect(validateChatInput(body)).toEqual({ ok: false, error: "invalid" });
    }
  });

  it("마지막 메시지가 사용자 것이 아니면 invalid로 거부한다", () => {
    expect(validateChatInput({ messages: [msg("user", "hi"), msg("assistant", "hello")] })).toEqual({ ok: false, error: "invalid" });
  });

  it("파일·도구·데이터 같은 비텍스트 part는 invalid로 거부한다", () => {
    for (const part of [
      { type: "file", mediaType: "image/png", url: "data:image/png;base64,AAAA" },
      { type: "tool-search", toolCallId: "t", state: "output-available" },
      { type: "data-anything", data: {} },
    ]) {
      expect(
        validateChatInput({ messages: [{ id: "u", role: "user", parts: [{ type: "text", text: "hi" }, part] }] }),
      ).toEqual({ ok: false, error: "invalid" });
    }
  });

  it("AI SDK가 붙이는 step-start·source-url·reasoning part는 허용한다", () => {
    const messages = [
      { id: "u1", role: "user", parts: [{ type: "text", text: "질문" }] },
      {
        id: "a1",
        role: "assistant",
        parts: [{ type: "step-start" }, { type: "reasoning", text: "생각" }, { type: "text", text: "답" }, { type: "source-url", sourceId: "s", url: "https://example.com" }],
      },
      { id: "u2", role: "user", parts: [{ type: "text", text: "다음 질문" }] },
    ];
    expect(validateChatInput({ messages })).toEqual({ ok: true });
  });
});

