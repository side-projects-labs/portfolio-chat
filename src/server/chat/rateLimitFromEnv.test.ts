// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createRateLimitFromEnv } from "./rateLimitFromEnv";

const req = () => new Request("http://localhost/api/chat", { method: "POST", headers: { "x-forwarded-for": "1.1.1.1" } });

describe("createRateLimitFromEnv", () => {
  it("저장소 환경변수가 없으면 메모리 제한기를 쓰고 저장소에 접속하지 않는다", async () => {
    const fetchSpy = vi.fn();
    const limit = createRateLimitFromEnv({}, { fetch: fetchSpy as unknown as typeof fetch });
    let rejected = false;
    for (let i = 0; i < 25; i++) {
      const r = await limit({ request: req(), chars: 1 });
      if (!r.ok) rejected = true;
    }
    expect(rejected).toBe(true); // 분당 20회 기본 한도
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("URL과 토큰이 모두 있으면 공유 저장소를 쓴다", async () => {
    const fetchSpy = vi.fn(async () => Response.json([{ result: 1 }, { result: 1 }, { result: 1 }, { result: 1 }]));
    const limit = createRateLimitFromEnv(
      { UPSTASH_REDIS_REST_URL: "https://redis.example.test", UPSTASH_REDIS_REST_TOKEN: "fake-token" },
      { fetch: fetchSpy as unknown as typeof fetch },
    );
    expect((await limit({ request: req(), chars: 1 })).ok).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("하나만 있으면 반쪽 설정으로 보고 메모리 제한기를 쓴다", async () => {
    const fetchSpy = vi.fn();
    const limit = createRateLimitFromEnv({ UPSTASH_REDIS_REST_URL: "https://redis.example.test" }, { fetch: fetchSpy as unknown as typeof fetch });
    await limit({ request: req(), chars: 1 });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("저장소가 실패해도 메모리 제한기가 한도를 지킨다", async () => {
    const limit = createRateLimitFromEnv(
      { UPSTASH_REDIS_REST_URL: "https://redis.example.test", UPSTASH_REDIS_REST_TOKEN: "fake-token" },
      {
        fetch: (async () => {
          throw new Error("down");
        }) as unknown as typeof fetch,
      },
    );
    let rejected = false;
    for (let i = 0; i < 25; i++) {
      const r = await limit({ request: req(), chars: 1 });
      if (!r.ok) rejected = true;
    }
    expect(rejected).toBe(true);
  });
});
