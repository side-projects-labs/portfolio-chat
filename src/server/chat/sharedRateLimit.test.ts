// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createSharedRateLimit } from "./sharedRateLimit";

const URL_ = "https://redis.example.test";
const TOKEN = "fake-redis-token-value";

type Cmd = [string, string, ...(string | number)[]];

// Upstash REST의 /pipeline을 흉내 내는 가짜 저장소입니다.
function fakeRedis() {
  const store = new Map<string, number>();
  const calls: { url: string; headers: Headers; commands: Cmd[] }[] = [];
  const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const commands = JSON.parse(String(init?.body)) as Cmd[];
    calls.push({ url: String(input), headers: new Headers(init?.headers), commands });
    const results = commands.map(([name, key, arg]) => {
      if (name === "INCRBY") {
        const n = (store.get(key) ?? 0) + Number(arg);
        store.set(key, n);
        return { result: n };
      }
      if (name === "DECRBY") {
        const n = (store.get(key) ?? 0) - Number(arg);
        store.set(key, n);
        return { result: n };
      }
      return { result: 1 }; // PEXPIRE 등
    });
    return Response.json(results);
  });
  return { store, calls, fetch: fetchImpl as unknown as typeof fetch };
}

const req = (ip = "203.0.113.7") => new Request("http://localhost/api/chat", { method: "POST", headers: { "x-forwarded-for": ip } });

function setup(opts: Partial<Parameters<typeof createSharedRateLimit>[0]> = {}) {
  const redis = fakeRedis();
  let t = 1_000_000;
  const fallback = vi.fn(() => ({ ok: false as const, retryAfterSec: 99 }));
  const onError = vi.fn();
  const limit = createSharedRateLimit({
    url: URL_,
    token: TOKEN,
    requestsPerMinute: 3,
    charsPerTenMinutes: 1000,
    fetch: redis.fetch,
    now: () => t,
    fallback,
    onError,
    ...opts,
  });
  return { limit, redis, fallback, onError, advance: (ms: number) => (t += ms) };
}

describe("createSharedRateLimit", () => {
  it("분당 요청 수 한도까지 허용하고 넘으면 다시 시도할 초와 함께 거부한다", async () => {
    const { limit } = setup();
    const r = req();
    for (let i = 0; i < 3; i++) expect((await limit({ request: r, chars: 10 })).ok).toBe(true);
    const over = await limit({ request: r, chars: 10 });
    expect(over.ok).toBe(false);
    if (!over.ok) expect(over.retryAfterSec).toBeGreaterThan(0);
  });

  it("글자 수 예산을 넘으면 거부하고, 거부된 요청은 사용량에 남기지 않는다", async () => {
    const { limit } = setup({ requestsPerMinute: 100 });
    const r = req();
    expect((await limit({ request: r, chars: 600 })).ok).toBe(true);
    expect((await limit({ request: r, chars: 600 })).ok).toBe(false);
    // 거부된 600자가 남아 있다면 이 요청(400자)이 예산을 넘어 거부된다.
    expect((await limit({ request: r, chars: 400 })).ok).toBe(true);
  });

  it("클라이언트마다 따로 센다", async () => {
    const { limit } = setup({ requestsPerMinute: 1 });
    expect((await limit({ request: req("1.1.1.1"), chars: 1 })).ok).toBe(true);
    expect((await limit({ request: req("1.1.1.1"), chars: 1 })).ok).toBe(false);
    expect((await limit({ request: req("2.2.2.2"), chars: 1 })).ok).toBe(true);
  });

  it("창이 지나면 다시 허용한다", async () => {
    const { limit, advance } = setup({ requestsPerMinute: 1 });
    const r = req();
    expect((await limit({ request: r, chars: 1 })).ok).toBe(true);
    expect((await limit({ request: r, chars: 1 })).ok).toBe(false);
    advance(60_000);
    expect((await limit({ request: r, chars: 1 })).ok).toBe(true);
  });

  it("저장소에는 인증 헤더로 접속하고 클라이언트 주소 원문을 키에 쓰지 않는다", async () => {
    const { limit, redis } = setup();
    await limit({ request: req("203.0.113.7"), chars: 5 });
    const call = redis.calls[0];
    expect(call.url).toBe(`${URL_}/pipeline`);
    expect(call.headers.get("authorization")).toBe(`Bearer ${TOKEN}`);
    const keys = call.commands.map((c) => c[1]).join(" ");
    expect(keys).not.toContain("203.0.113.7");
    expect(keys).toMatch(/chat:rl:/);
  });

  it("네트워크 오류가 나면 던지지 않고 메모리 제한기 결과를 쓴다", async () => {
    const { limit, fallback, onError } = setup({
      fetch: (async () => {
        throw new Error(`connect failed ${TOKEN}`);
      }) as unknown as typeof fetch,
    });
    const result = await limit({ request: req(), chars: 1 });
    expect(fallback).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ ok: false, retryAfterSec: 99 });
    expect(onError).toHaveBeenCalledWith("network");
    expect(JSON.stringify(onError.mock.calls)).not.toContain(TOKEN);
  });

  it("HTTP 오류나 명령 오류도 메모리 제한기로 넘어간다", async () => {
    const http = setup({ fetch: (async () => new Response("boom", { status: 500 })) as unknown as typeof fetch });
    await http.limit({ request: req(), chars: 1 });
    expect(http.onError).toHaveBeenCalledWith("http");
    expect(http.fallback).toHaveBeenCalled();

    const cmd = setup({ fetch: (async () => Response.json([{ error: "ERR" }, { result: 1 }, { result: 1 }, { result: 1 }])) as unknown as typeof fetch });
    await cmd.limit({ request: req(), chars: 1 });
    expect(cmd.onError).toHaveBeenCalledWith("command");
    expect(cmd.fallback).toHaveBeenCalled();
  });

  it("응답이 늦으면 시간 제한 뒤 메모리 제한기로 넘어간다", async () => {
    const { limit, fallback, onError } = setup({
      timeoutMs: 20,
      fetch: ((_: RequestInfo | URL, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
        })) as unknown as typeof fetch,
    });
    await limit({ request: req(), chars: 1 });
    expect(fallback).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith("network");
  });
});
