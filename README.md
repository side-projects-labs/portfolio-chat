# portfolio-chat

포트폴리오의 내부 AI 채팅을 [portfolio2](https://github.com/side-projects-labs/portfolio2)에서 분리하기 위한 저장소입니다.

## 현재 상태

저장소를 만든 초기 단계입니다. 아직 portfolio2에서 옮겨 온 코드는 없습니다.

## 분리 대상 (portfolio2 기준, 확인한 경로)

- `src/features/chat/`: Gemini 호출(`api/gemini.ts`), 상태(`model/useChatStore.ts`), 채팅 위젯 UI와 기술 채팅(`ui/`)
- `src/pages/api/chat.ts`, `src/pages/api/technical-chat.ts`: 채팅 API 라우트
- `src/features/cmdpallete/api/chatgpt.ts`, `sendMessage.ts`: 명령 팔레트의 ChatGPT 호출
- `src/shared/types/chat.ts`: 채팅 타입
- `docs/TECHNICAL_CHAT_PROMPTS.md`: 기술 채팅 프롬프트 문서

어디까지 옮길지, 공통 UI와 타입 같은 의존성을 어떻게 나눌지는 아직 정하지 않았습니다.
