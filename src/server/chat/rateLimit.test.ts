import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rateLimit";

function setup(limit = 3, windowMs = 60_000) {
  let t = 1_000_000;
  const limiter = createRateLimiter({ limit, windowMs, now: () => t });
  return { limiter, advance: (ms: number) => (t += ms) };
}

describe("createRateLimiter", () => {
  it("한도까지는 허용하고 넘으면 거부하며 다시 시도할 초를 알려 준다", () => {
    const { limiter, advance } = setup();
    for (let i = 0; i < 3; i++) expect(limiter.check("a")).toEqual({ ok: true });
    advance(10_000);
    expect(limiter.check("a")).toEqual({ ok: false, retryAfterSec: 50 });
  });

  it("창이 지나면 다시 허용한다", () => {
    const { limiter, advance } = setup();
    for (let i = 0; i < 3; i++) limiter.check("a");
    expect(limiter.check("a").ok).toBe(false);
    advance(60_000);
    expect(limiter.check("a")).toEqual({ ok: true });
  });

  it("키마다 따로 센다", () => {
    const { limiter } = setup(1);
    expect(limiter.check("a").ok).toBe(true);
    expect(limiter.check("a").ok).toBe(false);
    expect(limiter.check("b").ok).toBe(true);
  });

  it("비용만큼 소모하고 남은 양보다 크면 거부한다", () => {
    const { limiter } = setup(100);
    expect(limiter.check("a", 60).ok).toBe(true);
    expect(limiter.check("a", 41).ok).toBe(false);
    expect(limiter.check("a", 40).ok).toBe(true);
  });

  it("거부된 요청은 사용량을 늘리지 않는다", () => {
    const { limiter } = setup(100);
    limiter.check("a", 60);
    expect(limiter.check("a", 90).ok).toBe(false);
    expect(limiter.check("a", 40).ok).toBe(true);
  });

  it("한도보다 큰 단일 비용은 항상 거부한다", () => {
    const { limiter } = setup(100);
    expect(limiter.check("a", 101).ok).toBe(false);
  });
});
