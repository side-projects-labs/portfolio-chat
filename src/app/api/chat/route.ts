import { handleChat } from "@/server/chat/handler";
import { createGroqStream } from "@/server/chat/groq";
import { createChatRateLimit } from "@/server/chat/limits";

export const maxDuration = 30;

const rateLimit = createChatRateLimit();

export async function POST(request: Request) {
  return handleChat(request, {
    streamText: createGroqStream,
    rateLimit: (input) => {
      const result = rateLimit(input);
      // 경보용 로그입니다. 내용과 주소는 남기지 않습니다.
      if (!result.ok) console.warn("[chat] rate_limited", { retryAfterSec: result.retryAfterSec });
      return result;
    },
    onMetrics: (m) => console.info("[chat] metrics", m),
  });
}
