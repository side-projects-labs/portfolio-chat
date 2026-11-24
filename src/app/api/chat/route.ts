import { handleChat } from "@/server/chat/handler";
import { createGroqStream } from "@/server/chat/groq";
import { createRateLimitFromEnv } from "@/server/chat/rateLimitFromEnv";

export const maxDuration = 30;

// 경보용 로그입니다. 내용·주소·토큰은 남기지 않고 종류만 남깁니다.
const rateLimit = createRateLimitFromEnv(process.env, {
  onError: (kind) => console.warn("[chat] rate_limit_store_error", { kind }),
});

if (process.env.VERCEL && !(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)) {
  console.warn("[chat] 공유 저장소가 설정되지 않아 인스턴스별 메모리 제한기를 씁니다");
}

export async function POST(request: Request) {
  return handleChat(request, {
    streamText: createGroqStream,
    rateLimit: async (input) => {
      const result = await rateLimit(input);
      if (!result.ok) console.warn("[chat] rate_limited", { retryAfterSec: result.retryAfterSec });
      return result;
    },
    onMetrics: (m) => console.info("[chat] metrics", m),
  });
}
