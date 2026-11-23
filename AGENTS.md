# AGENTS.md

이 문서는 portfolio-chat 저장소 전체에서 작업하는 에이전트의 공통 지침입니다. 사용자 지시를 우선합니다.

## 프로젝트와 책임

- portfolio2의 내부 AI 채팅을 분리해 독립적으로 운영하기 위한 저장소입니다. 초기 단계이며 아직 옮겨 온 코드와 기술 스택이 없습니다. 분리 대상 경로와 현재 상태는 [README.md](README.md)를 기준으로 확인합니다.
- 이 저장소는 **공개 저장소**입니다. 커밋하는 모든 내용은 누구나 읽을 수 있다고 가정합니다.
- 채팅 기능의 원본은 portfolio2입니다. 요청 범위 없이 portfolio2를 수정하지 않습니다. 다른 저장소를 고칠 때는 저장소별로 이슈와 PR을 따로 둡니다.

## 코드 이전 원칙

- 코드를 옮기는 PR에는 원본 경로와 portfolio2의 기준 커밋을 적습니다. 이전 PR에서는 동작을 바꾸지 않고, 동작 변경과 이전을 같은 PR에 섞지 않습니다.
- 옮기는 코드의 테스트도 함께 옮깁니다. 의존하는 공통 UI·타입·유틸이 있으면 복사할지 분리할지를 이슈에 근거와 함께 정하고, 임의로 새 공통 모듈을 만들지 않습니다.
- portfolio2에서 채팅 코드를 제거하는 일은 이 저장소로 이전이 끝나고 확인된 뒤 portfolio2의 별도 이슈와 PR로 합니다.

## 실행과 검증

- 기술 스택과 패키지 매니저는 아직 정해지지 않았습니다. `package.json`과 lockfile이 생기면 그 파일에 있는 스크립트와 도구만 사용합니다. 존재하지 않는 명령이나 다른 저장소의 명령을 가져오지 않습니다.
- 실행 동작을 수정하면 `tdd` 스킬대로 테스트를 먼저 작성하고 실패를 확인한 뒤 구현합니다. 실행하지 못한 검증은 통과로 보고하지 않고 이유를 적습니다.
- 문서만 바꾸면 새 실행 테스트를 억지로 만들지 않고 링크·경로·민감정보 포함 여부를 확인합니다.
- 현재 CI가 없습니다. 병합 전에 로컬에서 실행한 검증과 실행하지 못한 검증을 PR에 그대로 적습니다.
- 개발 서버는 사용자 요청이나 이미 실행된 서버가 있을 때만 사용합니다.

## 안전 (공개 저장소)

- `.env*`, 인증서, API 키, 토큰, 개인정보를 출력하거나 커밋하지 않습니다. 테스트와 예시에는 실제 값 대신 가짜 값을 씁니다. 필요한 환경변수는 `.env.example`에 이름만 적습니다.
- AI 호출에 쓰는 키는 서버에서만 읽고 클라이언트 번들로 보내지 않습니다.
- 사용자 입력은 신뢰하지 않습니다. 모델에 보내기 전에 길이와 형식을 검증하고, 오류 응답에 키·내부 주소·스택·모델 응답 원문을 그대로 싣지 않습니다.
- 프롬프트 문서와 대화 예시를 공개해도 되는지는 커밋 전에 확인합니다. 실제 사용자 대화나 개인정보를 예시로 쓰지 않습니다.
- 라이선스와 `PROJECT.md`는 담당자 확인 없이 추가하지 않습니다. `PROJECT.md`가 있으면 Hub가 포트폴리오에 즉시 공개합니다.
- `master`에 직접 커밋하지 않습니다. 커밋·푸시·PR 생성·머지·이슈 생성과 종료는 사용자가 요청했을 때만 수행합니다.

## 브랜치·커밋·PR·이슈

- 브랜치는 `feat|fix|docs|ci|chore/<이슈번호>-<설명>` 형식입니다. 커밋과 PR 본문에 `Refs #<이슈번호>`를 남기고 `Fixes`, `Closes`는 쓰지 않습니다. 이슈를 닫는 시점은 사용자가 정합니다.
- 커밋 메시지는 `<type>(<scope>): <제목>` 형식(Conventional Commits)이고 제목은 한글로 마침표 없이 씁니다.
- PR 본문은 `.github/pull_request_template.md`, 이슈 본문은 `.github/ISSUE_TEMPLATE.md`의 절을 모두 채웁니다. `gh pr create`와 `gh issue create`를 `--body`나 `--body-file`로 쓸 때는 템플릿이 자동으로 채워지지 않으므로 파일을 읽어 옮겨 적고 안내 주석만 지웁니다. 확인하지 못한 항목은 체크하지 않고 이유를 적습니다.
- 이슈는 조직 `side-projects-labs`의 GitHub Project `@NoCodeBuild`에 넣고 Status를 Project의 옵션(`Todo`, `In Progress`, `In Review`, `Done`)으로 둡니다. 번호와 필드 ID는 실행할 때 조회합니다.
- 병합은 사용자가 요청했을 때만 하고, 병합 전에 PR의 검증 결과와 최신 리뷰의 🔴 여부를 확인합니다. `AGENTS.md`와 `.agents/skills/` 같은 지침 변경 PR은 담당자가 직접 머지합니다.

## 에이전트 스킬

모든 에이전트(Cursor, Claude Code, Codex 등)가 공통으로 사용하는 스킬은 `.agents/skills/<skill-name>/SKILL.md`에 있습니다. `.cursor/skills/`와 `.claude/skills/`의 항목은 같은 디렉터리를 가리키는 심볼릭 링크입니다.

### 필수 규칙

아래 작업을 할 때는 해당 `SKILL.md`를 먼저 읽고 그 절차를 따릅니다. 스킬은 작업 절차를 정할 뿐이며 커밋·푸시·PR·머지·이슈는 위 "안전"의 규칙대로 사용자가 요청했을 때만 수행합니다.

1. **코드 수정 → `tdd` 스킬**: 실패하는 테스트를 먼저 작성하고 실패를 확인한 뒤 구현합니다. 문서와 설정만 바꾸는 경우는 예외이며 그 판단 근거를 알립니다.
2. **커밋 → `commit` 스킬**: 코드 변경 커밋은 직전에 `review` 스킬(staged)을 실행하고 🔴가 있으면 커밋하지 않고 보고합니다.
3. **PR 생성 → `pr` 스킬**: 위 "브랜치·커밋·PR·이슈"의 템플릿 규칙을 따르고, 담당자는 `gh`의 활성 계정으로 지정하며, 생성 후 `review` 스킬(branch) 결과를 PR 댓글로 남깁니다.
4. **코드 리뷰 기준 → `review` 스킬**: 댓글 본문은 `.agents/skills/review/TEMPLATE.md`만 채웁니다. 목적, 데이터 흐름, 불변조건, 보안(공개 저장소의 비밀값·프롬프트 노출), 테스트 근거를 검토하고 발견마다 코드 근거를 적습니다.
5. **이슈 생성 → `issue` 스킬**: 본문은 `.github/ISSUE_TEMPLATE.md`만 채우고 제목과 본문 문장은 `~습니다` 또는 `~ㅂ니다`로 끝냅니다.

### 스킬 목록

| 스킬 | 경로 | 사용 시점 |
| --- | --- | --- |
| `tdd` | `.agents/skills/tdd/SKILL.md` | **코드를 수정할 때 항상** |
| `commit` | `.agents/skills/commit/SKILL.md` | **커밋을 요청받았을 때** |
| `pr` | `.agents/skills/pr/SKILL.md` | **PR 생성을 요청받았을 때** |
| `qa` | `.agents/skills/qa/SKILL.md` | 작업 완료 전 검증, 커밋/PR 직전, "QA 해줘" 요청 시 |
| `review` | `.agents/skills/review/SKILL.md` | **커밋 직전(staged), PR 생성 직후(branch)**, "리뷰 해줘" 요청 시 |
| `issue` | `.agents/skills/issue/SKILL.md` | **이슈 생성을 요청받았을 때** |

일반적인 작업 흐름: `tdd` → `qa` → `commit`(→ `review` staged) → `pr`(→ `review` branch 댓글) → 사용자 요청으로 머지.

새 스킬은 `.agents/skills/<kebab-case-name>/SKILL.md`로 만들고 `.cursor/skills/`, `.claude/skills/`에 `ln -s ../../.agents/skills/<이름>`으로 연결한 뒤 위 표에 등록합니다. 스킬 수정은 항상 `.agents/skills/` 원본에서 합니다.

## 에이전트별 진입점

에이전트마다 자동으로 읽는 파일이 달라서, 각 도구가 이 파일(`AGENTS.md`)로 오도록 진입점 파일을 둡니다. 진입점 파일에는 내용을 늘리지 않고 지침은 항상 이 파일에서 수정합니다.

| 에이전트 | 자동으로 읽는 파일 | 스킬 위치 |
| --- | --- | --- |
| Cursor | `AGENTS.md`, `.cursor/rules/agents.mdc` (항상 적용) | `.cursor/skills/` |
| Codex | `AGENTS.md` | `.agents/skills/` |
| Claude Code | `CLAUDE.md` (`@AGENTS.md` 포함) | `.claude/skills/` |
| Gemini CLI | `GEMINI.md` (`@AGENTS.md` 포함) | `.agents/skills/` |
| GitHub Copilot | `.github/copilot-instructions.md` | `.agents/skills/` |

필수 규칙을 바꾸면 요약이 들어 있는 `.cursor/rules/agents.mdc`와 `.github/copilot-instructions.md`도 함께 갱신합니다.

<!-- portfolio-hub:project-guidance:start -->
## 포트폴리오 문서 입력 계약

- 기본 브랜치 루트 PROJECT.md를 프로젝트 소개의 원본으로 유지합니다. 프로젝트 초안 작업에서 이 저장소의 AI가 아래 규격으로 생성하고 내용 변경 시 함께 갱신합니다. Hub는 내용을 AI로 다시 생성하지 않고 검증한 필드를 그대로 전송합니다.
- PROJECT.md는 첫 번째 JSON 코드 블록에 아래 메타데이터를 작성하고, 블록 뒤 빈 줄 다음에 마크다운 본문을 작성합니다. 본문의 제목·목차·내용 구성은 자유입니다.

```json
{
  "schemaVersion": 1,
  "slug": "project-slug",
  "title": "프로젝트 제목",
  "description": "프로젝트 설명",
  "stacks": ["TypeScript"],
  "image": "https://example.com/public-project.png",
  "linkDemo": null,
  "linkGithub": null
}
```

- schemaVersion, slug, title, description, stacks는 필수입니다. slug는 기존 프로젝트 식별자로 유지하며 변경하면 다른 프로젝트가 생성될 수 있습니다. stacks는 문자열 배열입니다. JSON에 계약 밖 필드를 추가하지 않습니다.
- image는 선택적인 공개 HTTP(S) 이미지 URL입니다. URL이 제공된 경우에만 기존 이미지를 교체합니다. 생략/null/빈 문자열이면 기존 이미지를 유지하며, 신규 프로젝트는 이미지 없이 생성합니다. 로컬 파일 경로·비공개 GitHub 원본 URL·자격 증명이 필요한 URL을 넣지 않습니다.
- 대표 이미지 파일을 저장소에 보관할 때는 루트 PROJECT.png를 사용합니다. 적절한 배포 화면이 있으면 활용하고 없으면 이 저장소에서 생성형 썸네일을 준비합니다. 필요한 경우 갱신하며 일반 코드 변경마다 재생성하지 않습니다.
- 공개 이미지 업로드와 공개 URL 준비는 이 저장소가 담당합니다. Hub는 이미지 파일을 읽거나 업로드하지 않습니다. 도구를 사용할 수 없거나 URL을 제공하지 못하면 image를 생략할 수 있습니다.
- linkDemo와 linkGithub는 선택적인 HTTP(S) 링크이며 생략/null/빈 문자열이면 기존 링크 값을 지웁니다. JSON 뒤 마크다운 전체를 API의 content로 사용하므로 중복 생성하지 않습니다.
- 이 규격 문서가 있으면 Hub가 프로젝트를 생성·업데이트하며 즉시 공개하고 관리자 편집 내용도 교체합니다. 공개 가능한 소개만 작성하고 비밀값·내부 정보는 넣지 않습니다. 이 지침은 다른 비공개 파일을 공개할 권한을 부여하지 않습니다.
- 기존 프로젝트 규칙과 함께 적용하며 충돌은 담당자에게 확인합니다. Hub는 이 구간 밖의 기존 규칙과 원본 PROJECT.md를 변경하지 않습니다. 지침 PR은 담당자가 직접 머지합니다.
<!-- portfolio-hub:project-guidance:end -->
