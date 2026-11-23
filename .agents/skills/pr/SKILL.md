---
name: pr
description: 현재 브랜치의 변경사항으로 저장소 PR 템플릿(.github/pull_request_template.md)에 맞춘 GitHub Pull Request를 gh CLI로 생성한다. 사용자가 PR 생성, PR 올리기, PR 설명 작성을 요청할 때 사용한다.
disable-model-invocation: true
---

# Pull Request

PR 생성과 푸시는 사용자가 요청했을 때만 한다. 머지는 사용자가 명시적으로 요청하지 않으면 하지 않는다.

## 절차

```
- [ ] 1. 브랜치 확인: git branch --show-current (master면 중단하고 사용자 확인)
- [ ] 2. 베이스 결정: 기본 master (사용자가 지정하면 그 브랜치)
- [ ] 3. 커밋되지 않은 변경 확인 → 있으면 commit 스킬 진행 여부를 사용자에게 확인
- [ ] 4. 변경 분석: git fetch origin && git log --oneline origin/<base>..HEAD, git diff origin/<base>...HEAD --stat
- [ ] 5. 검증: package.json에 실제로 있는 lint·타입 검사·테스트 스크립트. 스택이 없으면 문서 검증(링크·경로·민감정보)
- [ ] 6. 원격 푸시: git push -u origin HEAD
- [ ] 7. 담당자 계정 확인: gh api user --jq .login
- [ ] 8. 템플릿 파일을 읽어 모든 절을 채운 본문을 작성한 뒤 gh pr create --assignee <login> (템플릿 필수)
- [ ] 9. 담당자 지정 검증: gh pr view --json assignees
- [ ] 10. 코드 리뷰: review 스킬 branch 모드 → 결과를 PR 댓글로 작성
- [ ] 11. PR URL과 리뷰 요약 보고
```

이미 열린 PR이 있는지 `gh pr list --head <branch>`로 확인한다. 있으면 새로 만들지 않고 `gh pr edit`로 갱신할지 사용자에게 묻는다.

## 제목

마지막 커밋이 아니라 **브랜치 전체 변경**을 요약한다. 커밋 컨벤션과 같은 `<type>(<scope>): <제목>`.

## 본문 (`.github/pull_request_template.md` 기반)

**PR 템플릿 사용은 필수다.** 본문은 템플릿의 모든 절을 순서대로 채운다. 절을 빼거나 순서를 바꾸거나 자유 형식으로 쓰지 않는다. 해당하지 않는 절도 "없음"과 이유로 채운다.

`gh pr create`를 `--body`나 `--body-file`로 쓰면 템플릿이 자동으로 채워지지 않는다. 생성 전에 `.github/pull_request_template.md`를 읽어 절과 체크리스트를 그대로 옮겨 적고, 안내 주석(`[//]: # ...`)만 지운다. 이미 만든 PR이 템플릿을 따르지 않으면 `gh pr edit <번호> --body-file <파일>`로 고친다.

- 체크리스트는 **실제로 확인된 항목만** `[x]`로 표시한다. 확인하지 못했거나 해당하지 않는 항목은 비워 두고 이유를 적는다
- 검증 결과에는 실행한 명령과 결과를 적는다. 스택이 없어 실행할 수 없는 검증은 그 사실과 이유를 적고 통과로 쓰지 않는다
- 관련 이슈에는 `Fixes`나 `Closes` 대신 `Refs #번호`만 적어 머지로 이슈가 자동으로 닫히지 않게 한다
- 코드를 portfolio2에서 옮기는 PR이면 원본 경로와 portfolio2의 기준 커밋을 변경사항에 적는다

## 담당자 (assignee) — 필수

PR 담당자는 **현재 `gh`에 로그인된 활성 GitHub 계정**으로 지정한다. 담당자 없이 PR을 만들지 않는다.

```bash
gh auth status
ASSIGNEE=$(gh api user --jq .login)
```

- 로그인돼 있지 않거나 `gh api user`가 실패하면 PR을 만들지 말고 `gh auth login`을 사용자에게 요청한다
- 다른 계정을 지정하려고 `gh auth switch`를 임의로 실행하지 않는다

## 생성 명령

```bash
gh pr create --base master --assignee "$ASSIGNEE" --title "<type>(<scope>): <제목>" --body-file <본문 파일>
```

생성 후 담당자를 검증한다. 비어 있으면 `gh pr edit <번호> --add-assignee "$ASSIGNEE"`로 지정하고 다시 확인한다.

## 코드 리뷰 댓글

PR 생성 후 `review` 스킬을 branch 모드로 실행하고, 결과를 PR 댓글로 남긴다. 본문은 `.agents/skills/review/TEMPLATE.md`만 채우고, 본인 PR은 approve할 수 없으므로 댓글로 남긴다.

```bash
gh pr comment <번호> --body-file <리뷰 파일>
```

댓글 파일 첫 줄은 `<!-- ai-review:local -->`이고 그 다음에 템플릿 본문만 붙인다. 이 저장소에는 CI 리뷰가 없어 로컬에서만 실행한다. PR에 커밋을 추가로 푸시했으면 리뷰를 다시 실행해 새 댓글을 남긴다. 중요한 미확인 사항의 검증 보류는 차단으로 취급한다.

## 머지 (요청 시)

머지는 사용자가 명시적으로 요청했을 때만 한다. 현재 CI가 없으므로 PR의 검증 결과와 최신 리뷰 댓글을 직접 확인한다.

```bash
gh pr view <번호> --json comments --jq '[.comments[] | select(.body | test("ai-review:"))] | last | .body' | grep "🔴"
gh pr merge <번호> --merge
```

- 최신 `ai-review:local` 댓글에 🔴가 있으면 머지하지 않는다
- `AGENTS.md`와 `.agents/skills/` 같은 지침 변경 PR은 담당자가 직접 머지한다. 에이전트는 머지하지 않는다

## 보고

PR 링크를 마크다운 링크로 제공하고, 지정된 담당자 계정과 검증 중 실패하거나 건너뛴 항목을 함께 알린다.
