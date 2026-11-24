import { describe, expect, it, vi } from "vitest";
import { handleChat, type ChatDeps } from "./handler";

const SECRET = "gsk_fake_key_123 http://internal.example:8080 at Error: stack";

const post = (body: unknown) =>
  new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

const userBody = (text = "안녕") => ({
  messages: [{ id: "u1", role: "user", parts: [{ type: "text", text }] }],
});

async function* chunks(...parts: string[]) {
  for (const p of parts) yield p;
}

describe("handleChat", () => {
  it("잘못된 입력은 400을 주고 모델을 호출하지 않는다", async () => {
    const streamText = vi.fn();
    for (const body of ["{not json", { messages: [] }, { messages: [{ id: "a", role: "user", parts: [{ type: "text", text: "a".repeat(5000) }] }] }]) {
      const res = await handleChat(post(body), { streamText });
      expect(res.status).toBe(400);
      expect(await res.json()).toHaveProperty("error");
    }
    expect(streamText).not.toHaveBeenCalled();
  });

  it("모델 조각을 순서대로 text-delta로 스트리밍한다", async () => {
    const res = await handleChat(post(userBody()), { streamText: () => chunks("안", "녕", "하세요") });
    expect(res.status).toBe(200);
    const text = await res.text();
    const deltas = [...text.matchAll(/"type":"text-delta"[^}]*"delta":"([^"]*)"|"delta":"([^"]*)"[^}]*"type":"text-delta"/g)].map((m) => m[1] ?? m[2]);
    expect(deltas).toEqual(["안", "녕", "하세요"]);
  });

  it("스트리밍 중 모델이 실패해도 키·내부 주소·스택 원문을 응답에 싣지 않는다", async () => {
    async function* failing() {
      yield "일부";
      throw new Error(SECRET);
    }
    const res = await handleChat(post(userBody()), { streamText: () => failing() });
    const text = await res.text();
    expect(text).toContain("error");
    expect(text).not.toContain("gsk_fake_key_123");
    expect(text).not.toContain("internal.example");
    expect(text).not.toContain("stack");
  });

  it("모델 호출을 시작하기 전에 던져도 500과 안전한 본문을 준다", async () => {
    const res = await handleChat(post(userBody()), {
      streamText: () => {
        throw new Error(SECRET);
      },
    });
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(text).not.toContain("gsk_fake_key_123");
    expect(text).not.toContain("internal.example");
  });

  it("첫 토큰까지의 시간과 전체 시간을 기록한다", async () => {
    const times = [1000, 1250, 1900]; // 시작, 첫 조각, 종료
    const now = () => times.shift() ?? 0;
    const onMetrics = vi.fn();
    const deps: ChatDeps = { streamText: () => chunks("a", "b"), onMetrics, now };
    const res = await handleChat(post(userBody()), deps);
    await res.text();
    expect(onMetrics).toHaveBeenCalledTimes(1);
    expect(onMetrics).toHaveBeenCalledWith({ firstTokenMs: 250, totalMs: 900 });
  });

  it("조각이 없으면 firstTokenMs는 null이다", async () => {
    const onMetrics = vi.fn();
    const res = await handleChat(post(userBody()), { streamText: () => chunks(), onMetrics });
    await res.text();
    expect(onMetrics.mock.calls[0][0].firstTokenMs).toBeNull();
  });

  it("모델에는 텍스트 part만 전달하고 그 밖의 필드와 part는 버린다", async () => {
    const streamText = vi.fn(() => chunks("ok"));
    const body = {
      messages: [
        { id: "u1", role: "user", parts: [{ type: "text", text: "질문", providerMetadata: { x: "y".repeat(50) } }] },
        { id: "a1", role: "assistant", parts: [{ type: "step-start" }, { type: "text", text: "답" }, { type: "source-url", sourceId: "s", url: "https://example.com" }] },
        { id: "u2", role: "user", parts: [{ type: "text", text: "다음" }] },
      ],
      extra: "무시",
    };
    const res = await handleChat(post(body), { streamText });
    await res.text();
    expect(streamText).toHaveBeenCalledTimes(1);
    const sent = (streamText.mock.calls[0] as unknown as [{ messages: unknown[] }])[0].messages;
    expect(sent).toEqual([
      { id: "u1", role: "user", parts: [{ type: "text", text: "질문" }] },
      { id: "a1", role: "assistant", parts: [{ type: "text", text: "답" }] },
      { id: "u2", role: "user", parts: [{ type: "text", text: "다음" }] },
    ]);
  });

  it("제한을 넘으면 429와 Retry-After를 주고 모델을 호출하지 않는다", async () => {
    const streamText = vi.fn(() => chunks("x"));
    const rateLimit = vi.fn(() => ({ ok: false as const, retryAfterSec: 42 }));
    const res = await handleChat(post(userBody()), { streamText, rateLimit });
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("42");
    expect(await res.json()).toEqual({ error: "rate_limited" });
    expect(streamText).not.toHaveBeenCalled();
  });

  it("제한 확인에 요청과 모델로 보낼 글자 수를 넘긴다", async () => {
    const rateLimit = vi.fn(() => ({ ok: true as const }));
    const res = await handleChat(post(userBody("안녕하세요")), { streamText: () => chunks("x"), rateLimit });
    await res.text();
    expect(rateLimit).toHaveBeenCalledTimes(1);
    const arg = (rateLimit.mock.calls[0] as unknown as [{ request: Request; chars: number }])[0];
    expect(arg.chars).toBe(5);
    expect(arg.request).toBeInstanceOf(Request);
  });

  it("잘못된 입력은 제한 확인을 하기 전에 거부한다", async () => {
    const rateLimit = vi.fn(() => ({ ok: true as const }));
    const res = await handleChat(post({ messages: [] }), { streamText: () => chunks("x"), rateLimit });
    expect(res.status).toBe(400);
    expect(rateLimit).not.toHaveBeenCalled();
  });

  it("본문이 상한보다 크면 읽기 전에 413으로 거부한다", async () => {
    const streamText = vi.fn(() => chunks("x"));
    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json", "content-length": String(10 * 1024 * 1024) },
      body: JSON.stringify(userBody()),
    });
    const res = await handleChat(req, { streamText });
    expect(res.status).toBe(413);
    expect(await res.json()).toEqual({ error: "too_large" });
    expect(streamText).not.toHaveBeenCalled();
  });

  it("Content-Length가 없어도 읽은 본문이 상한보다 크면 413으로 거부한다", async () => {
    const streamText = vi.fn(() => chunks("x"));
    const huge = JSON.stringify({ messages: [], pad: "가".repeat(300_000) });
    const res = await handleChat(post(huge), { streamText });
    expect(res.status).toBe(413);
    expect(streamText).not.toHaveBeenCalled();
  });

  it("비동기 제한기가 허용하면 모델을 호출하고 스트리밍한다", async () => {
    const streamText = vi.fn(() => chunks("ok"));
    const res = await handleChat(post(userBody()), { streamText, rateLimit: async () => ({ ok: true as const }) });
    expect(res.status).toBe(200);
    await res.text();
    expect(streamText).toHaveBeenCalledTimes(1);
  });

  it("비동기 제한기가 거부하면 429와 Retry-After를 주고 모델을 호출하지 않는다", async () => {
    const streamText = vi.fn(() => chunks("x"));
    const res = await handleChat(post(userBody()), {
      streamText,
      rateLimit: async () => ({ ok: false as const, retryAfterSec: 42 }),
    });
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("42");
    expect(streamText).not.toHaveBeenCalled();
  });
});

