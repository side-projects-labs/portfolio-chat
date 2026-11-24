# 배포 (Vercel + GitHub Actions)

워크플로: [.github/workflows/ci.yml](../.github/workflows/ci.yml)

## 흐름

| 이벤트 | 하는 일 |
| --- | --- |
| 모든 PR, master push | `verify`: `pnpm install --frozen-lockfile`, `lint`, `typecheck`, `test`, `build` (시크릿 없이 실행, 포크 PR 포함) |
| 같은 저장소의 PR | `verify` 통과 후 `preview` 배포 (포크 PR은 시크릿이 없어 건너뜀) |
| master push | `verify` 통과 후 `production` 배포 |

배포는 Vercel CLI(`vercel@66.6.0` 고정)의 `pull` → `build` → `deploy --prebuilt` 순서입니다. Vercel의 Git 연동은 쓰지 않으며(`vercel.json`의 `git.deploymentEnabled: false`) 배포는 이 워크플로만 합니다.

## 보안 원칙 (공개 저장소)

- `pull_request_target`을 쓰지 않고, 포크 PR에는 시크릿을 주지 않습니다.
- 액션은 커밋 SHA로 고정했고 `persist-credentials: false`입니다. `run:`에는 PR 제목·브랜치명 같은 외부 입력을 넣지 않습니다.
- Vercel 토큰은 환경변수(`VERCEL_TOKEN`)로만 전달해 명령줄 인자로 로그에 남지 않게 했고, 필요한 `pull`·`deploy` 단계에만 줍니다. 의존성 설치와 프로젝트 빌드(`next build`)에는 노출하지 않습니다.
- AI 키(`GROQ_API_KEY`)는 GitHub가 아니라 Vercel 프로젝트의 환경변수에만 둡니다. 빌드는 키가 필요 없습니다.

## 현재 상태

| 항목 | 상태 |
| --- | --- |
| Vercel 프로젝트 `portfolio-chat` 생성·로컬 연동 (`yeon-cheols-projects`, Git 미연결) | 완료 |
| Node 버전 | `package.json`의 `engines`로 22.x 고정 (새 프로젝트 기본값은 26.x였음). `vercel build`에서 함수 런타임 `nodejs22.x` 확인 |
| 워크플로 문법 | `actionlint` 통과 |
| `vercel pull`, `vercel build` | 로컬에서 실행해 성공 확인 |
| `vercel deploy`와 GitHub Actions의 실제 실행 | **실행하지 않음 (미검증)** |

## 해야 할 설정 (담당자)

1. **Vercel 토큰 준비**: 새로 발급하거나(권장) 기존 토큰을 씁니다. Vercel 계정 설정의 Tokens에서 만료일을 두고 발급합니다.
2. **GitHub 시크릿과 변수**: `portfolio-admin`과 같은 방식입니다. 토큰만 시크릿이고, 팀·프로젝트 ID는 비밀이 아니라 변수입니다.

   | 종류 | 이름 | 값 | 상태 |
   | --- | --- | --- | --- |
   | 변수 | `VERCEL_ORG_ID` | 팀 ID. `portfolio-admin`과 같은 팀이라 같은 값 | 등록함 |
   | 변수 | `VERCEL_PROJECT_ID` | `portfolio-chat` 프로젝트의 ID(`.vercel/project.json`의 `projectId`). **`portfolio-admin`의 값을 쓰면 안 됨** | 등록함 |
   | 시크릿 | `VERCEL_TOKEN` | Vercel 토큰 | **등록 필요** (GitHub 시크릿은 값을 읽을 수 없어 `portfolio-admin`의 것을 복사할 수 없음) |

   토큰은 직접 등록합니다. 터미널에서 `gh secret set VERCEL_TOKEN --repo side-projects-labs/portfolio-chat`을 실행하면 값을 붙여 넣으라고 묻습니다. 기존 토큰을 재사용하면 한 저장소의 유출이 다른 프로젝트 배포에도 영향을 주므로, 가능하면 이 저장소 전용 토큰(만료일 설정)을 권장합니다.

3. **GitHub Environments**: `preview`, `production`을 만들고 `production`에는 Required reviewers를 걸어 master 병합 후 사람이 승인해야 배포되게 하는 것을 권장합니다.
4. **Vercel 프로젝트 환경변수**: Production과 Preview에 각각 `GROQ_API_KEY`, `GROQ_MODEL`을 넣고, 운영용 프롬프트를 쓰면 `CHAT_SYSTEM_PROMPT`도 넣습니다. 값은 저장소에 적지 않습니다.
5. **Preview 보호**: Vercel의 Deployment Protection에서 Preview에 인증을 켜는 것을 권장합니다. 공개 Preview URL에서도 AI 키가 쓰이므로 누구나 호출해 비용이 날 수 있습니다.

## production 배포 전에 해결해야 할 것

- **요청 제한이 인스턴스마다 따로 셉니다.** 지금 제한기는 메모리 안에서만 동작합니다([ADR 0001](adr/0001-architecture.md)의 한계 1). Vercel은 요청마다 다른 인스턴스가 처리할 수 있어 제한이 약해집니다. 공유 저장소 기반으로 바꾸기 전에는 production을 공개하지 않는 것을 권장합니다.
- **클라이언트 식별 헤더**: `x-forwarded-for`를 믿습니다. Vercel이 이 헤더를 어떻게 설정하는지는 아직 확인하지 않았습니다.
- **비용 상한과 경보**는 코드가 아니라 모델 공급자 콘솔과 Vercel에서 설정해야 합니다.

## 롤백

Vercel 대시보드에서 이전 production 배포를 Promote하거나 `vercel rollback`을 씁니다. 이 절차는 실행해 보지 않았습니다.
