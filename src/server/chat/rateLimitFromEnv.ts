import { createChatRateLimit } from "./limits";
import type { RateLimitResult } from "./rateLimit";
import { createSharedRateLimit } from "./sharedRateLimit";

// UPSTASH_REDIS_REST_URL과 UPSTASH_REDIS_REST_TOKEN이 모두 있으면 공유 저장소 제한기를, 아니면 메모리 제한기를 씁니다.
// 서버리스에서는 공유 저장소가 있어야 제한이 인스턴스 사이에 이어집니다. 저장소가 실패하면 메모리 제한기로 넘어갑니다.
export function createRateLimitFromEnv(
  env: Record<string, string | undefined>,
  options: { fetch?: typeof fetch; now?: () => number; onError?: (kind: string) => void } = {},
): (input: { request: Request; chars: number }) => RateLimitResult | Promise<RateLimitResult> {
  const memory = createChatRateLimit({ now: options.now });
  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return memory;

  return createSharedRateLimit({ url, token, fetch: options.fetch, now: options.now, fallback: memory, onError: options.onError });
}
