export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

const PRUNE_THRESHOLD = 1000;

// 고정 창 방식의 메모리 제한기입니다. 한 서버 프로세스 안에서만 셉니다.
// 서버리스처럼 인스턴스가 여러 개인 배포에서는 인스턴스마다 따로 세므로 공유 저장소가 필요합니다.
export function createRateLimiter({ limit, windowMs, now = Date.now }: { limit: number; windowMs: number; now?: () => number }) {
  const entries = new Map<string, { start: number; used: number }>();

  function prune(at: number) {
    for (const [key, e] of entries) {
      if (at - e.start >= windowMs) entries.delete(key);
    }
  }

  return {
    check(key: string, cost = 1): RateLimitResult {
      const at = now();
      if (entries.size > PRUNE_THRESHOLD) prune(at);

      let entry = entries.get(key);
      if (!entry || at - entry.start >= windowMs) {
        entry = { start: at, used: 0 };
        entries.set(key, entry);
      }

      if (entry.used + cost > limit) {
        return { ok: false, retryAfterSec: Math.max(1, Math.ceil((entry.start + windowMs - at) / 1000)) };
      }
      entry.used += cost;
      return { ok: true };
    },
  };
}
