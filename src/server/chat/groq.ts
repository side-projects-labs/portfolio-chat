import { createGroq } from "@ai-sdk/groq";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

const SYSTEM_PROMPT =
  "당신은 개발자를 돕는 기술 멘토입니다. 한국어로 간결하게 답하고 코드는 코드 블록으로 씁니다. 확실하지 않으면 모른다고 말합니다.";

export async function* createGroqStream(input: {
  messages: unknown[];
  signal: AbortSignal;
}): AsyncIterable<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY가 설정되지 않았습니다");
  const modelId = process.env.GROQ_MODEL;
  if (!modelId) throw new Error("GROQ_MODEL이 설정되지 않았습니다");

  const groq = createGroq({ apiKey });
  const result = streamText({
    model: groq(modelId),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(input.messages as UIMessage[]),
    abortSignal: input.signal,
  });

  for await (const delta of result.textStream) yield delta;
}
