import { createGroq } from "@ai-sdk/groq";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { getSystemPrompt } from "./prompt";


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
    system: getSystemPrompt(process.env),
    messages: await convertToModelMessages(input.messages as UIMessage[]),
    abortSignal: input.signal,
  });

  for await (const delta of result.textStream) yield delta;
}
