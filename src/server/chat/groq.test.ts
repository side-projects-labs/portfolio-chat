import { afterEach, describe, expect, it, vi } from "vitest";
import { createGroqStream } from "./groq";

afterEach(() => vi.unstubAllEnvs());

describe("createGroqStream", () => {
  it("GROQ_API_KEY가 없으면 모델을 호출하지 않고 설정 오류로 던진다", async () => {
    vi.stubEnv("GROQ_API_KEY", "");
    const run = async () => {
      for await (const _ of createGroqStream({ messages: [], signal: new AbortController().signal })) void _;
    };
    await expect(run()).rejects.toThrow("GROQ_API_KEY");
  });

  it("GROQ_MODEL이 없으면 설정 오류로 던진다", async () => {
    vi.stubEnv("GROQ_API_KEY", "gsk_fake");
    vi.stubEnv("GROQ_MODEL", "");
    const run = async () => {
      for await (const _ of createGroqStream({ messages: [], signal: new AbortController().signal })) void _;
    };
    await expect(run()).rejects.toThrow("GROQ_MODEL");
  });
});
