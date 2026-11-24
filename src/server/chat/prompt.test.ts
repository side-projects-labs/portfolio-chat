import { describe, expect, it } from "vitest";
import { DEFAULT_SYSTEM_PROMPT, getSystemPrompt } from "./prompt";

describe("getSystemPrompt", () => {
  it("환경변수가 없으면 저장소의 일반 기본 프롬프트를 쓴다", () => {
    expect(DEFAULT_SYSTEM_PROMPT.length).toBeGreaterThan(10);
    expect(getSystemPrompt({})).toBe(DEFAULT_SYSTEM_PROMPT);
  });

  it("CHAT_SYSTEM_PROMPT가 있으면 그 값을 쓴다", () => {
    expect(getSystemPrompt({ CHAT_SYSTEM_PROMPT: "비공개 지침" })).toBe("비공개 지침");
  });

  it("공백뿐인 값은 없는 것으로 보고 기본 프롬프트를 쓴다", () => {
    expect(getSystemPrompt({ CHAT_SYSTEM_PROMPT: "   " })).toBe(DEFAULT_SYSTEM_PROMPT);
  });

  it("기본 프롬프트에는 키·주소 같은 비밀값 형태가 없다", () => {
    expect(DEFAULT_SYSTEM_PROMPT).not.toMatch(/gsk_|sk-|https?:\/\/|@/);
  });
});
