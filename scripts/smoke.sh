#!/usr/bin/env bash
# 배포 후 확인(smoke test): 첫 화면이 200이고, /api/chat에 잘못된 입력을 보내 400 {"error":"empty"}가 오는지 봅니다.
# 모델을 호출하지 않으므로 비용이 들지 않습니다.
#
# 사용법: scripts/smoke.sh <배포 URL>
# 환경변수(선택): VERCEL_AUTOMATION_BYPASS_SECRET — Vercel 배포 보호를 통과하는 자동화용 우회 시크릿
#
# 종료 코드: 0 성공, 1 실패, 2 사용법 오류, 3 보호된 배포인데 우회 시크릿이 없어 확인하지 못함
set -u

BASE="${1:-}"
if [ -z "$BASE" ]; then
  echo "사용법: smoke.sh <배포 URL>" >&2
  exit 2
fi
BASE="${BASE%/}"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

# 우회 시크릿은 명령줄 인자(프로세스 목록에 보임)가 아니라 권한 600의 임시 파일로 넘깁니다.
header_args=()
if [ -n "${VERCEL_AUTOMATION_BYPASS_SECRET:-}" ]; then
  umask 077
  printf 'x-vercel-protection-bypass: %s\n' "$VERCEL_AUTOMATION_BYPASS_SECRET" > "$tmp/headers"
  header_args=(-H "@$tmp/headers")
fi

# 응답 본문은 $tmp/body에 두고 상태 코드만 출력합니다. 접속 실패는 000입니다.
request() {
  curl -sS -m 30 -o "$tmp/body" -w '%{http_code}' ${header_args[@]+"${header_args[@]}"} "$@" 2>/dev/null || echo 000
}

home_status="$(request "$BASE/")"

if { [ "$home_status" = "401" ] || [ "$home_status" = "403" ] || [ "$home_status" = "302" ]; } && [ -z "${VERCEL_AUTOMATION_BYPASS_SECRET:-}" ]; then
  echo "보호된 배포로 보여 확인하지 못했습니다(첫 화면 ${home_status}). VERCEL_AUTOMATION_BYPASS_SECRET이 필요합니다."
  exit 3
fi

if [ "$home_status" != "200" ]; then
  echo "실패: 첫 화면 상태 코드 ${home_status} (기대 200)"
  exit 1
fi

api_status="$(request -X POST -H 'content-type: application/json' -d '{"messages":[]}' "$BASE/api/chat")"
if [ "$api_status" != "400" ] || ! grep -q '"error":"empty"' "$tmp/body"; then
  echo "실패: /api/chat 잘못된 입력 응답 상태 ${api_status} (기대 400, error=empty)"
  exit 1
fi

echo "성공: 첫 화면 200, /api/chat 잘못된 입력 400"
