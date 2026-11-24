import { handleChat } from "@/server/chat/handler";
import { createGroqStream } from "@/server/chat/groq";

export const maxDuration = 30;

export async function POST(request: Request) {
  return handleChat(request, {
    streamText: createGroqStream,
    onMetrics: (m) => console.info("[chat] metrics", m),
  });
}
