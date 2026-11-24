# portfolio-chat

포트폴리오의 내부 AI 채팅을 [portfolio2](https://github.com/side-projects-labs/portfolio2)에서 분리하기 위한 저장소입니다.

## 현재 상태

이슈 #6의 첫 구현 단계입니다. 아직 portfolio2에서 옮겨 온 코드는 없습니다.

- 스택: Next.js, Vercel AI SDK, 모델 공급자 Groq (모두 담당자의 선택이며 비교 평가한 결과가 아닙니다)
- 기준 문서: [docs/ui-ux.md](docs/ui-ux.md), [docs/ux-checklist.md](docs/ux-checklist.md), [docs/adr/0001-architecture.md](docs/adr/0001-architecture.md), [docs/evaluation/questions.md](docs/evaluation/questions.md)

## 실행

`package.json`의 스크립트를 쓰고 패키지 매니저는 pnpm입니다.

| 명령 | 용도 |
| --- | --- |
| `pnpm dev` | 개발 서버 |
| `pnpm test` | 테스트(vitest) |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | 타입 검사 |
| `pnpm build` | 프로덕션 빌드 |

개발 서버를 컨테이너로 띄우려면 다음을 씁니다. 이미지에는 환경변수를 넣지 않고 실행할 때 `.env.local`을 주입합니다.

| 명령 | 용도 |
| --- | --- |
| `docker compose up -d --build` | 이미지를 만들고 `portfolio-chat-dev` 컨테이너를 실행 (http://localhost:3000) |
| `docker compose logs -f web` | 로그 확인 |
| `docker compose down` | 컨테이너 중지·삭제 (볼륨 포함은 `-v`) |

배포는 GitHub Actions와 Vercel로 합니다. 설정과 주의점은 [docs/deploy.md](docs/deploy.md)를 봅니다.

환경변수는 서버에서만 읽습니다. `.env.example`을 참고해 `.env.local`을 만들고 커밋하지 않습니다.

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
