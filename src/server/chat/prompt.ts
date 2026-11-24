// 저장소에는 일반적인 기본 문구만 둡니다. 실제 운영 지침은 CHAT_SYSTEM_PROMPT 환경변수로 덮어쓰며,
// 공개해도 되는지 확인되지 않은 프롬프트는 저장소에 넣지 않습니다.
export const DEFAULT_SYSTEM_PROMPT =
  "당신은 개발자를 돕는 기술 멘토입니다. 한국어로 간결하게 답하고 코드는 코드 블록으로 씁니다. 확실하지 않으면 모른다고 말합니다.";

export function getSystemPrompt(env: Record<string, string | undefined>): string {
  const custom = env.CHAT_SYSTEM_PROMPT?.trim();
  return custom ? custom : DEFAULT_SYSTEM_PROMPT;
}
