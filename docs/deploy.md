# 배포 (Vercel + GitHub Actions)

워크플로는 둘로 나뉩니다.

- [.github/workflows/ci.yml](../.github/workflows/ci.yml): 검증만 합니다. 배포하지 않고 시크릿도 없습니다.
- [.github/workflows/deploy.yml](../.github/workflows/deploy.yml): master push에서만 실행되어 Vercel에 배포합니다.

## 흐름

| 이벤트 | 워크플로 | 하는 일 |
| --- | --- | --- |
| PR | `ci.yml` | `verify`: `pnpm install --frozen-lockfile`, `lint`, `typecheck`, `test`, `build` (시크릿 없이 실행, 포크 PR 포함). **배포하지 않음** |
| master push | `deploy.yml` | `verify`(`ci.yml`을 재사용 호출) 통과 후 `production` 배포와 smoke test |

- 배포는 **master push에서만** 일어납니다. PR에서는 Vercel에 배포하지 않습니다.
- `deploy.yml`은 `ci.yml`을 `workflow_call`로 호출해 같은 검증을 배포 조건으로 씁니다. 그래서 master push에서는 검증이 한 번만 돕니다(`ci.yml`은 `pull_request`에서만 직접 실행됨). `workflow_run` 방식은 포크 PR의 브랜치 이름이 `master`일 때 신뢰 경계가 흐려지는 함정이 있어 쓰지 않았습니다.
- 배포는 Vercel CLI(`vercel@66.6.0` 고정)의 `pull` → `build --prod` → `deploy --prebuilt --prod` 순서이고, 이어서 [scripts/smoke.sh](../scripts/smoke.sh)가 첫 화면(200)과 `/api/chat`의 잘못된 입력(400 `empty`)을 확인합니다. 모델을 호출하지 않아 비용이 들지 않습니다.
- Vercel의 Git 연동은 쓰지 않으며(`vercel.json`의 `git.deploymentEnabled: false`) 배포는 `deploy.yml`만 합니다.
- 동시에 여러 번 push하면 배포는 한 번에 하나씩만 실행되고 진행 중인 배포는 취소하지 않습니다. 대기 중인 실행이 여럿이면 GitHub가 가장 최근 것만 남깁니다.

### Preview를 쓰지 않는 결정과 그 영향

Preview 배포는 사용하지 않습니다(담당자 결정). PR에서는 배포하지 않고 master 병합 후 production에만 배포합니다.

- PR마다 만들어지던 Preview 배포와 URL이 없어집니다. PR에서는 `verify`만 확인할 수 있어, 배포 환경에서의 동작(Vercel 런타임, 환경변수, 요청 제한 저장소)은 **master에 병합된 뒤 production에서 처음 확인**됩니다.
- `deploy.yml`은 master push에서만 실행되므로 병합 전에는 한 번도 실행해 볼 수 없습니다. 문법은 `actionlint`로 확인했지만 실제 동작은 병합 후 첫 실행에서 드러납니다. 실패하면 Actions의 Re-run으로 다시 실행할 수 있습니다.
- 이전 PR 실행이 만든 GitHub Environment `preview`와, Vercel의 Preview 환경변수(`GROQ_API_KEY`, `GROQ_MODEL`)는 지웠습니다. Vercel에는 Production 환경변수만 있습니다. Preview를 다시 쓰려면 환경변수를 다시 넣고 워크플로에 배포 job을 추가해야 합니다.

## 승인 게이트를 쓰지 않는 결정

`production` 배포에는 GitHub Environment(승인자 지정)를 쓰지 않습니다. master에 병합할 수 있는 사람이 담당자뿐이라 병합이 곧 승인이라는 담당자의 결정입니다. 이 결정의 영향은 다음과 같습니다.

- master에 병합하면 `production` 배포가 곧바로 실행됩니다. 병합 전에 배포 결과를 되돌릴 확인 지점이 없습니다.
- 병합 권한이 다른 사람에게 열리거나 브랜치 보호가 풀리면 이 전제가 깨집니다. 그때 `production` Environment와 Required reviewers를 다시 검토합니다.

## 보안 원칙 (공개 저장소)

- `pull_request_target`을 쓰지 않고, 포크 PR에는 시크릿을 주지 않습니다.
- 액션은 커밋 SHA로 고정했고 `persist-credentials: false`입니다. `run:`에는 PR 제목·브랜치명 같은 외부 입력을 넣지 않습니다.
- Vercel 토큰은 환경변수(`VERCEL_TOKEN`)로만 전달해 명령줄 인자로 로그에 남지 않게 했고, 필요한 `pull`·`deploy` 단계에만 줍니다. 의존성 설치와 프로젝트 빌드(`next build`)에는 노출하지 않습니다.
- smoke test의 보호 우회 시크릿은 명령줄 인자가 아니라 권한 600의 임시 파일로 넘기며 출력에 남기지 않습니다.
- AI 키(`GROQ_API_KEY`)는 GitHub가 아니라 Vercel 프로젝트의 환경변수에만 둡니다. 빌드는 키가 필요 없습니다.

## 현재 상태

| 항목 | 상태 |
| --- | --- |
| Vercel 프로젝트 `portfolio-chat` 생성·로컬 연동 (`yeon-cheols-projects`, Git 미연결) | 완료 |
| Node 버전 | `package.json`의 `engines`로 22.x 고정 (새 프로젝트 기본값은 26.x였음). 함수 런타임 `nodejs22.x` 확인 |
| GitHub 변수 `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`와 시크릿 `VERCEL_TOKEN` | 등록됨. 워크플로를 나누기 전 PR 실행(Preview 배포)에서 토큰이 유효함을 확인했고, 나눈 뒤의 `deploy.yml`은 아직 실행되지 않음 |
| Vercel 환경변수 `GROQ_API_KEY`(민감 변수), `GROQ_MODEL` | Production에만 등록됨(Preview는 쓰지 않아 지움). 값은 로컬 `.env.local`에서 그대로 복사했고 확인하지 않음. `dreamweaver-ai`와 같은 키라 한쪽의 비용·교체가 다른 쪽에 영향을 줌. 키와 모델은 현재 것을 운영에도 그대로 쓰기로 한 담당자 결정이 있음(2026-11-25) |
| 요청 제한 | 공유 저장소(Upstash Redis REST) 지원을 코드에 추가함. 환경변수가 없으면 인스턴스별 메모리 제한기로 동작. 저장소가 구성되어 있다는 담당자 확인이 있음(2026-11-25, 에이전트는 확인하지 못함) |
| 비용 상한과 경보 | 모델 공급자 콘솔과 Vercel에서 설정하는 항목. 구성되어 있다는 담당자 확인이 있음(2026-11-25, 에이전트는 확인하지 못함). 임계값은 이 저장소에 적지 않음 |
| 배포 후 smoke test | 스크립트와 단계 추가, 개발 컨테이너로 실행 확인. 보호된 배포 URL에는 우회 시크릿이 필요하며 없으면 건너뜀(알림). 이전 Preview 실행에서는 보호로 건너뛰었음 |
| `deploy.yml`(`production` job, `vercel deploy --prod`) | **한 번도 실행하지 않음 (미검증).** 병합 후 첫 master push에서 처음 실행됨 |

## 설정 (담당자)

1, 4번은 이미 구성되어 있다는 담당자 확인이 있습니다(2026-11-25). 아래는 구성할 때의 기준이며, 에이전트는 실제 설정을 확인하지 못했습니다. 3번은 하지 않기로 했습니다.

1. **공유 요청 제한 저장소 (구성됨, 담당자 확인)**: Vercel Marketplace의 Upstash Redis를 `portfolio-chat` 프로젝트에 연결하거나 Upstash에서 직접 만듭니다. 서버에는 아래 두 환경변수가 Production에 있어야 합니다(Preview 배포를 하지 않으므로 Preview는 필요 없습니다). 연동이 다른 이름(예: `KV_REST_API_URL`, `KV_REST_API_TOKEN`)으로 넣는다면 이 두 이름으로 맞춰 추가합니다. 둘 다 없으면 메모리 제한기로 동작하고, 저장소가 실패해도 메모리 제한기로 넘어갑니다. 연동이 넣는 변수 이름은 확인하지 않았습니다.

   | 이름 | 값 |
   | --- | --- |
   | `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL |
   | `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST 토큰(민감 변수로 등록) |

2. **smoke test용 보호 우회 시크릿 (선택)**: smoke test는 `vercel deploy`가 출력하는 배포 고유 URL을 요청하는데, 이 주소는 Vercel 인증으로 보호되어 401/302를 받습니다. production 도메인(`portfolio-chat-pi.vercel.app`)은 공개라 보호되지 않지만 smoke test는 그 주소를 쓰지 않습니다. 우회 시크릿이 없으면 이 단계는 실패가 아니라 알림과 함께 건너뜁니다. Vercel 프로젝트 Settings → Deployment Protection의 "Protection Bypass for Automation"에서 시크릿을 만들고, GitHub 시크릿 `VERCEL_AUTOMATION_BYPASS_SECRET`으로 등록합니다(`gh secret set VERCEL_AUTOMATION_BYPASS_SECRET --repo side-projects-labs/portfolio-chat`).
3. **채팅 전용 Groq 키 (하지 않기로 함, 담당자 결정)**: 현재 `dreamweaver-ai`와 같은 키와 모델을 운영에도 그대로 씁니다. 그래서 비용 한도와 키 교체가 두 프로젝트에 함께 적용됩니다. 나누려면 Groq 콘솔에서 새 키를 발급해 Vercel의 `GROQ_API_KEY`를 교체해야 하며 코드로는 할 수 없습니다.
4. **비용 상한과 경보 (구성됨, 담당자 확인)**: 코드가 아니라 모델 공급자 콘솔과 Vercel에서 설정합니다. 코드는 제한에 걸릴 때 서버 로그에 `rate_limited`만 남깁니다.
5. 운영용 프롬프트를 쓰면 `CHAT_SYSTEM_PROMPT`를 Production에 추가합니다. 값은 저장소에 적지 않습니다.

## 공개 상태 (2026-11-24 직접 확인)

| 주소 | 인증 | 확인한 응답 |
| --- | --- | --- |
| `https://portfolio-chat-pi.vercel.app/` (production 도메인, 저장소 `homepage`) | 없음(공개) | 첫 화면 200, `POST /api/chat` 빈 입력에 400 |
| `https://portfolio-chat-yeon-cheols-projects.vercel.app/` (팀 범위 별칭) | Vercel 인증 | 302(Vercel 로그인으로 이동) |
| `https://portfolio-chat-<해시>-yeon-cheols-projects.vercel.app` (배포마다 생기는 고유 주소) | Vercel 인증 | 302(첫 화면), 401(API) |

- 이 문서의 이전 판본과 README는 "production 도메인도 인증으로 보호된다"고 적었는데, `portfolio-chat-pi.vercel.app`을 직접 확인하지 않은 추정이었고 틀렸습니다. 위 표가 직접 확인한 값입니다.
- 따라서 채팅은 누구나 호출할 수 있고, 모델 호출 비용은 이 서비스의 Groq 키로 나갑니다. 2026-11-24 시점에는 키를 다른 프로젝트와 공유했고 요청 제한이 인스턴스별 메모리 방식이라 서버리스에서는 약했습니다. 이후 위 "설정"의 1·4번(공유 제한 저장소, 비용 상한과 경보)을 구성했다는 담당자 확인이 있습니다(2026-11-25). 키는 나누지 않고 공유 상태로 운영하기로 했습니다(담당자 결정). 이 표의 응답 확인은 11월 24일 값이며 그 뒤 설정을 바꾼 뒤에는 다시 확인하지 않았습니다.
- Vercel의 인증 설정이 어느 주소를 보호하는지는 Vercel 설정에 따라 달라지므로, 이 표는 설정을 바꾸면 다시 확인해야 합니다.

## 클라이언트 식별 (`x-forwarded-for`)

요청 제한은 `x-forwarded-for`의 첫 주소로 클라이언트를 구분합니다. Vercel 문서에 따르면 Vercel은 이 헤더를 덮어써서 외부에서 보낸 값을 전달하지 않으며, 이는 IP 위조를 막기 위한 것입니다([Request headers](https://vercel.com/docs/headers/request-headers), [Reverse Proxy Servers and Vercel](https://vercel.com/docs/security/reverse-proxy)). 다만 다음 조건이 있습니다.

- **Vercel에 직접 연결할 때만** 신뢰할 수 있습니다. Vercel 앞에 다른 프록시나 CDN을 두면 이 헤더에는 그 프록시의 주소가 들어가고, 실제 사용자 주소를 정확히 알 수 없습니다. 이 경우 Vercel의 Verified Proxy 설정이 필요합니다.
- `x-real-ip`가 같은 방식으로 덮어써지는지는 문서에 명시되어 있지 않아 확인하지 못했습니다. 코드는 `x-forwarded-for`가 없을 때만 `x-real-ip`를 씁니다.
- 이 근거는 문서를 읽은 것이고, 실제 배포에서 위조 헤더를 보내 확인하지는 않았습니다.

## 롤백

Vercel 대시보드에서 이전 production 배포를 Promote하거나 `vercel rollback`을 씁니다. 이 절차는 실행해 보지 않았습니다.
