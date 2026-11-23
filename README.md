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

## 개발 지침

- [공통 지침](AGENTS.md): 공개 저장소의 안전 규칙, 코드 이전 원칙, 브랜치·커밋·PR·이슈 규칙
- 공통 스킬: [tdd](.agents/skills/tdd/SKILL.md), [commit](.agents/skills/commit/SKILL.md), [pr](.agents/skills/pr/SKILL.md), [qa](.agents/skills/qa/SKILL.md), [review](.agents/skills/review/SKILL.md), [issue](.agents/skills/issue/SKILL.md)
- PR과 이슈 본문은 [PR 템플릿](.github/pull_request_template.md), [이슈 템플릿](.github/ISSUE_TEMPLATE.md)을 모두 채웁니다.
