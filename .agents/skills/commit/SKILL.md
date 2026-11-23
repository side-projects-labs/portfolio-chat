---
name: commit
description: 변경사항을 검토·검증한 뒤 이 저장소의 컨벤션(Conventional Commits)으로 커밋한다. 사용자가 커밋, 커밋 메시지 작성, 커밋 후 푸시를 요청할 때 사용한다.
disable-model-invocation: true
---

# Commit

커밋과 푸시는 사용자가 요청했을 때만 한다. 이 절차는 요청받은 커밋을 만드는 방법이다.

## 절차

```
- [ ] 1. 상태 파악: git status, git diff, git diff --staged, git log --oneline -10
- [ ] 2. 커밋 대상 선별 (관련 없는 변경/민감 파일 제외)
- [ ] 3. 검증: package.json에 실제로 있는 lint·타입 검사·테스트 스크립트 (스택이 없으면 그 사실을 보고)
- [ ] 4. 논리 단위로 스테이징 (git add <파일>; git add -A 지양)
- [ ] 5. 코드 리뷰: review 스킬 staged 모드 (git diff --staged) → 🔴 있으면 커밋 중단 후 보고
- [ ] 6. 커밋 메시지 작성 및 커밋
- [ ] 7. git status로 결과 확인, 요청 시에만 푸시
```

5단계는 코드(`src/` 등)나 CI 설정이 스테이징된 경우 필수다. 문서(`*.md`)만 커밋할 때는 생략할 수 있고, 생략했다고 보고한다.

## 커밋 대상 제외 (공개 저장소)

- `.env*`(`.env.example` 제외), 인증서·키 파일, `node_modules/`, 빌드 산출물, `.DS_Store`
- 비밀값이 포함된 파일, 실제 사용자 대화나 개인정보가 든 파일
- 사용자가 작업 중인 무관한 변경은 건드리지 말고 그대로 둔다
- 위 파일이 스테이징돼 있으면 커밋 전 사용자에게 알린다. 커밋 전에 `git diff --staged`에서 키·토큰 패턴을 직접 확인한다

## 메시지 형식

```
<type>(<scope>): <제목>

<선택: 본문. 왜 바꿨는지. 72자 줄바꿈>

Refs #<이슈번호>
```

- type: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`
- scope는 선택. 제목은 한글로 쓰고 마침표를 붙이지 않는다. 영문은 소문자로 시작한다
- 서로 다른 목적의 변경은 커밋을 분리한다
- 이슈를 자동으로 닫지 않도록 `Fixes`, `Closes`는 쓰지 않고 `Refs #번호`만 쓴다

## 커밋 실행

여러 줄 메시지는 HEREDOC 사용:

```bash
git commit -m "$(cat <<'EOF'
docs: 에이전트 지침과 공통 스킬을 추가한다

본문

Refs #1
EOF
)"
```

## 금지 사항

- `--no-verify`, `--amend`(사용자 요청 없을 때), `git push --force`
- `master`에 직접 커밋/푸시 — 현재 브랜치가 `master`면 멈추고 사용자에게 확인 (저장소를 처음 만들 때의 초기 커밋만 예외였다)
- 검증 실패 상태로 커밋 — 실패 내용을 보고하고 사용자 판단을 받는다. 훅 실패를 우회하지 않는다

## 푸시 (요청 시)

`git push` (업스트림 없으면 `git push -u origin <branch>`). 결과의 커밋 해시와 브랜치를 보고한다.
