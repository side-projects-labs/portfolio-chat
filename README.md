# portfolio-chat

개발자를 위한 AI 기술 멘토 채팅입니다. 포트폴리오의 내부 AI 채팅을 [portfolio2](https://github.com/side-projects-labs/portfolio2)에서 분리해 독립적으로 운영하기 위한 저장소이며, 기존 코드를 옮기지 않고 새로 구현했습니다.

## 현재 상태

- **구현**: 스트리밍 채팅 화면과 서버 API를 만들었습니다(이슈 #6). portfolio2에서 옮겨 온 코드는 없습니다.
- **배포**: master에 병합되면 GitHub Actions가 Vercel production에 배포합니다(PR에서는 배포하지 않고 Preview는 쓰지 않습니다). 현재 배포는 **Vercel 인증으로 보호되어 있어 로그인한 계정만 접속할 수 있습니다.**
- **공개 전에 필요한 것**: 공유 요청 제한 저장소(Upstash), 채팅 전용 Groq 키, 비용 상한과 경보. 자세한 내용은 [docs/deploy.md](docs/deploy.md)를 봅니다.
- **스택**: Next.js, TypeScript, Tailwind, Vercel AI SDK, 모델 공급자 Groq. 모두 담당자의 선택이며 다른 후보와 비교 평가한 결과가 아닙니다.
- **확인하지 못한 것**: 실기기 모바일(iOS 키보드 포함), 스크린 리더(VoiceOver, TalkBack), 배포된 앱의 실제 채팅 응답, 실제 Upstash 연결.

## 주요 기능

- 스트리밍 응답, 응답 중단, 새 대화, 위로 스크롤한 동안 자동 스크롤 멈춤
- 마크다운 렌더링(표, 코드 블록 복사), 출처 표시
- 시스템·라이트·다크 테마, 모바일 안전 영역과 터치 크기, 키보드 접근성
- 입력 검증(길이·개수·형식·크기), 요청 제한(429), 오류 응답에 내부 정보를 싣지 않음
- 검색(근거 기반 응답)은 아직 없습니다. 정책은 [ADR 0002](docs/adr/0002-grounding-policy.md)에 있고 구현은 하지 않았습니다.

## 구조

| 경로 | 내용 |
| --- | --- |
| `src/app/` | 페이지, 레이아웃, 스타일, `api/chat/route.ts`(채팅 API) |
| `src/components/` | `Chat`, `Markdown`, `CodeBlock`, `Sources`, `ThemeToggle` |
| `src/lib/` | 테마 로직 |
| `src/server/chat/` | 입력 검증, 요청 제한(메모리·Upstash 공유), Groq 호출, 시스템 프롬프트, 핸들러 |
| `scripts/smoke.sh` | 배포 후 확인 스크립트 |
| `.github/workflows/` | `ci.yml`(PR 검증), `deploy.yml`(master push 배포) |
| `docs/` | 기준 문서, ADR, 평가 질문, 배포 문서 |

테스트는 각 파일 옆의 `*.test.ts(x)`에 있습니다.

## 실행

`package.json`의 스크립트를 쓰고 패키지 매니저는 pnpm, Node는 22.x입니다.

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

패키지를 추가한 뒤에는 `docker compose down -v` 다음에 `up -d --build`로 볼륨을 다시 만들어야 컨테이너에 반영됩니다.

## 환경변수

모두 서버에서만 읽으며 클라이언트 번들에 들어가지 않습니다. `.env.example`을 참고해 `.env.local`을 만들고 커밋하지 않습니다.

| 이름 | 필수 | 용도 |
| --- | --- | --- |
| `GROQ_API_KEY` | 예 | Groq API 키 |
| `GROQ_MODEL` | 예 | 사용할 모델 이름 |
| `CHAT_SYSTEM_PROMPT` | 아니요 | 운영용 시스템 프롬프트. 없으면 저장소의 일반 기본 문구를 씁니다(운영 지침은 저장소에 넣지 않습니다). |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | 아니요 | 요청 제한을 인스턴스 사이에 공유하는 Upstash Redis. 둘 다 있어야 쓰고, 없으면 인스턴스별 메모리 제한기로 동작합니다. |

## 배포

배포는 GitHub Actions와 Vercel로 하며, master push에서만 실행됩니다. 흐름, 설정, 알려진 한계는 [docs/deploy.md](docs/deploy.md)를 봅니다.

## 문서

- [docs/ui-ux.md](docs/ui-ux.md): 화면 기준(출처 표시, 스트리밍, 코드 블록, 접근성, 패널)
- [docs/ux-checklist.md](docs/ux-checklist.md): 사용자 경험 체크리스트
- [docs/adr/0001-architecture.md](docs/adr/0001-architecture.md): 아키텍처 결정과 남용 방어의 범위·한계
- [docs/adr/0002-grounding-policy.md](docs/adr/0002-grounding-policy.md): 근거 기반 응답과 근거가 없을 때의 정책
- [docs/evaluation/questions.md](docs/evaluation/questions.md): 평가 질문 세트와 채점 기준
- [docs/deploy.md](docs/deploy.md): 배포

## portfolio2와의 관계

이 저장소는 portfolio2의 채팅 코드를 옮겨 오지 않고 새로 구현했습니다. portfolio2에서 채팅 코드를 제거하는 일은 이 저장소의 동작이 배포 환경에서 확인된 뒤 portfolio2의 별도 이슈와 PR로 합니다. 아래는 그때 참고할 portfolio2의 기존 채팅 경로이며 이 저장소로 옮기지 않았습니다. 구현 중에는 `docs/TECHNICAL_CHAT_PROMPTS.md`의 앞부분을 기술 채팅의 성격을 확인하려고 읽었을 뿐 내용을 가져오지 않았습니다.

- `src/features/chat/`: Gemini 호출, 상태, 채팅 위젯 UI와 기술 채팅
- `src/pages/api/chat.ts`, `src/pages/api/technical-chat.ts`: 채팅 API 라우트
- `src/features/cmdpallete/api/chatgpt.ts`, `sendMessage.ts`: 명령 팔레트의 ChatGPT 호출
- `src/shared/types/chat.ts`: 채팅 타입
- `docs/TECHNICAL_CHAT_PROMPTS.md`: 기술 채팅 프롬프트 문서

## 개발 지침

- [공통 지침](AGENTS.md): 공개 저장소의 안전 규칙, 코드 이전 원칙, 브랜치·커밋·PR·이슈 규칙
- 공통 스킬: [tdd](.agents/skills/tdd/SKILL.md), [commit](.agents/skills/commit/SKILL.md), [pr](.agents/skills/pr/SKILL.md), [qa](.agents/skills/qa/SKILL.md), [review](.agents/skills/review/SKILL.md), [issue](.agents/skills/issue/SKILL.md)
- PR과 이슈 본문은 [PR 템플릿](.github/pull_request_template.md), [이슈 템플릿](.github/ISSUE_TEMPLATE.md)을 모두 채웁니다.
