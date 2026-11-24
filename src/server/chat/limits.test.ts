import { describe, expect, it } from "vitest";
import { clientKey, createChatRateLimit } from "./limits";

const req = (headers: Record<string, string> = {}) => new Request("http://localhost/api/chat", { method: "POST", headers });

describe("clientKey", () => {
  it("x-forwarded-for의 첫 주소를 쓴다", () => {
    expect(clientKey(req({ "x-forwarded-for": " 203.0.113.7 , 10.0.0.1" }))).toBe("203.0.113.7");
  });
  it("없으면 x-real-ip, 그것도 없으면 unknown이다", () => {
    expect(clientKey(req({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
    expect(clientKey(req())).toBe("unknown");
  });
});

describe("createChatRateLimit", () => {
  it("분당 요청 수 한도를 넘으면 거부한다", () => {
    const limit = createChatRateLimit({ requestsPerMinute: 3, charsPerTenMinutes: 1_000_000 });
    const r = req({ "x-forwarded-for": "1.1.1.1" });
    for (let i = 0; i < 3; i++) expect(limit({ request: r, chars: 10 }).ok).toBe(true);
    const over = limit({ request: r, chars: 10 });
    expect(over.ok).toBe(false);
    if (!over.ok) expect(over.retryAfterSec).toBeGreaterThan(0);
  });

  it("10분당 글자 수 예산을 넘으면 요청 수가 남아 있어도 거부한다", () => {
    const limit = createChatRateLimit({ requestsPerMinute: 100, charsPerTenMinutes: 1000 });
    const r = req({ "x-forwarded-for": "1.1.1.1" });
    expect(limit({ request: r, chars: 600 }).ok).toBe(true);
    expect(limit({ request: r, chars: 600 }).ok).toBe(false);
  });

  it("클라이언트마다 따로 센다", () => {
    const limit = createChatRateLimit({ requestsPerMinute: 1, charsPerTenMinutes: 1_000_000 });
    expect(limit({ request: req({ "x-forwarded-for": "1.1.1.1" }), chars: 1 }).ok).toBe(true);
    expect(limit({ request: req({ "x-forwarded-for": "1.1.1.1" }), chars: 1 }).ok).toBe(false);
    expect(limit({ request: req({ "x-forwarded-for": "2.2.2.2" }), chars: 1 }).ok).toBe(true);
  });

  it("창이 지나면 다시 허용한다", () => {
    let t = 0;
    const limit = createChatRateLimit({ requestsPerMinute: 1, charsPerTenMinutes: 1_000_000, now: () => t });
    const r = req({ "x-forwarded-for": "1.1.1.1" });
    expect(limit({ request: r, chars: 1 }).ok).toBe(true);
    expect(limit({ request: r, chars: 1 }).ok).toBe(false);
    t += 60_000;
    expect(limit({ request: r, chars: 1 }).ok).toBe(true);
  });
});
