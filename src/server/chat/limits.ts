import { createRateLimiter, type RateLimitResult } from "./rateLimit";

// 프록시가 붙인 헤더를 믿습니다. 플랫폼(Vercel 등)이 덮어쓰는 환경에서만 의미가 있고,
// 앞단 없이 직접 노출하면 클라이언트가 값을 꾸밀 수 있습니다.
export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function createChatRateLimit({
  requestsPerMinute = 20,
  charsPerTenMinutes = 40_000,
  now,
}: { requestsPerMinute?: number; charsPerTenMinutes?: number; now?: () => number } = {}) {
  const requests = createRateLimiter({ limit: requestsPerMinute, windowMs: 60_000, now });
  const chars = createRateLimiter({ limit: charsPerTenMinutes, windowMs: 10 * 60_000, now });

  return ({ request, chars: cost }: { request: Request; chars: number }): RateLimitResult => {
    const key = clientKey(request);
    const byRequests = requests.check(key);
    if (!byRequests.ok) return byRequests;
    return chars.check(key, cost);
  };
}
