# ADR 0001: AI 채팅 기술 아키텍처 기준

- 상태: 제안 (담당자 확인 전)
- 이슈: #3
- 범위: 구성 요소별 채택·보류·제외와 이유
- 갱신: 이슈 #6에서 후보 비교 단계를 없애고 레퍼런스 UI/UX와 빠른 응답을 기준으로 바로 구현하기로 했습니다. 스택은 Next.js, Vercel AI SDK, AI Elements, 모델 공급자는 Groq입니다. 모두 담당자의 선택이며 같은 질문 세트로 비교해 평가한 결과가 아닙니다.

근거 표시는 [ui-ux.md](../ui-ux.md)와 같습니다.

## 배경

문서 Q&A 서비스는 검색 후 생성, 인용, 근거가 없으면 모른다고 답하는 구조입니다 `[벤더]` [kapa.ai](https://docs.kapa.ai/use-cases/documentation-assistant), [eesel](https://www.eesel.ai/blog/ai-assistant-for-developer-docs). Stack Overflow AI Assist는 커뮤니티 콘텐츠를 먼저 검색하고 없을 때만 모델 생성으로 넘어갑니다 `[벤더]` [출처](https://stackoverflow.blog/2025/12/02/introducing-stack-overflow-ai-assist-a-tool-for-the-modern-developer/). 코딩 환각의 주된 원인은 낡은 정보이고 해결책은 최신 문서를 붙이는 것이라고 보고됩니다 `[벤더]` [Mintlify](https://www.mintlify.com/library/ai-hallucinations), [Firecrawl](https://www.firecrawl.dev/glossary/web-search-apis/llm-hallucinate-deprecated-apis).

## 결정 요약

| 영역 | 결정 | 재검토 조건 |
| --- | --- | --- |
| 근거 기반 응답 | 채택 (검색 후 생성, 인용, 근거 없을 때의 정책은 [ADR 0002](0002-grounding-policy.md)) | 평가 질문 세트에서 근거 없음 오류가 기준 이상일 때 구조 변경 |
| 스트리밍 | 채택 | 해당 없음 |
| 스트림 재연결 | 보류 | 끊김이 평가·운영에서 반복 확인될 때 |
| 메시지 저장 | 보류 (저장 범위 결정 필요) | 이어 보기·피드백 분석 요구가 생길 때 |
| 모델 공급자 | 채택: Groq (담당자 결정, 비교 평가 없음) | 평가 질문 세트 점수나 응답 지연이 기준에 못 미칠 때 |
| 관측·평가 | 채택 (첫 토큰·전체 응답 시간 측정부터, 도구는 미정) | 외부 관측 도구가 필요해질 때 |
| 남용 방어 | 채택 | 해당 없음 |
| 문서 조회 도구 | 보류 | 평가에서 최신 버전 질문의 정확도가 낮을 때 |
| 코드 실행 샌드박스 | 제외(보류) | 사용자가 코드 실행을 요구하고 비용·보안 계획이 서 있을 때 |

## 1. 근거 기반 응답 — 채택

- 결정: 질문마다 먼저 근거를 찾고, 찾은 근거에 기대어 답하며, 출처를 붙인다. 근거가 없으면 모른다고 답한다.
- 이유: 개발자 신뢰와 낡은 정보 문제에 대한 완화책으로 보고된다. 위 배경의 근거.
- 근거 원천에는 외부 공식 문서를 포함하기로 했다(담당자 결정). 어떤 문서를 쓰는지, 라이선스와 크롤링 허용 여부는 확인 전이며 [ADR 0002](0002-grounding-policy.md)의 조건과 열린 질문에 적었다.
- `llms.txt`는 효과에 대한 독립 분석 글이 있으나 본문을 대조하지 못했다. 효과가 확인되기 전까지 이것에 의존하지 않는다. `[블로그]` [Ahrefs](https://www.ahrefs.com/blog/llmstxt-study/)

## 2. 스트리밍과 메시지 저장

- 스트리밍은 채택한다(UI 기준 2절).
- 스트림 재연결은 보류한다. AI SDK의 재연결은 Redis 등 저장소를 직접 구성해야 하고 `[벤더]` [AI SDK](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-resume-streams), 구성 비용이 크다는 반론이 판매사 글에 있다 `[벤더]` [Ably](https://ably.com/topic/ai-stack/vercel-ai-sdk-resumable-stream-what-it-covers-and-what-it-doesnt).
- 메시지 저장은 보류한다. 저장하면 개인정보 처리 책임이 생기므로 범위(저장 안 함, 세션 동안만, 영구)를 먼저 정한다. 실제 사용자 대화는 이 저장소에 커밋하지 않는다. `AGENTS.md` 안전 규칙
- 채팅 템플릿은 참고만 한다. `[벤더]` [Vercel Chatbot](https://vercel.com/templates/next.js/chatbot)

## 3. 모델 게이트웨이 — 보류

- 공급자는 Groq로 정했다(담당자 결정). 같은 질문 세트로 다른 후보와 비교하지 않았고, 구현 후 [평가 질문 세트](../evaluation/questions.md)로 품질을 점검한다.
- 모델 호출은 서버 경계의 한 모듈에 두고 테스트에서 대역으로 바꿀 수 있게 해, 공급자를 바꿔야 할 때 교체 범위를 좁힌다. `[가정]`
- Groq의 모델 이름, 속도, 한도, 약관은 이 문서에서 확인하지 않았다. 5단계에서 공식 문서를 확인해 기록한다.
- 불변조건: AI 호출 키는 서버에서만 읽고 클라이언트 번들로 보내지 않는다. `AGENTS.md`
- 공급자 교체가 쉬운 구조가 필요한지는 근거를 모으지 못했다. `[가정]`

## 4. 관측·평가 — 채택(도구 미정)

- 질문 단위로 입력 길이, 지연, 토큰, 출처 유무, 오류를 기록한다. 대화 원문의 저장 여부는 2절 결정에 따른다.
- 후보 도구로 Langfuse가 조사되었으나 벤더 문서이며 대안과 비교하지 않았다 `[벤더]` [출처](https://langfuse.com/docs.md). 도입이 필요해질 때 대안과 비교한다.

## 5. 남용 방어 — 채택

공개 채팅 엔드포인트는 비용 남용의 표적이며 토큰 기준 제한, 길이 상한, 사용자별 제한, 비용 경보가 권고됩니다 `[블로그]` [BotGuard](https://dev.to/botguard/bot-abuse-in-ai-apis-why-your-llm-endpoint-is-a-target-1a6p), [FlowHunt](https://www.flowhunt.io/blog/llm-api-security-rate-limiting-auth-abuse-prevention/), 프롬프트 인젝션 방어 사례 [dev.to](https://dev.to/goofypluto999/hardening-a-free-public-ai-tool-against-prompt-injection-in-2-hours-5c86).

- 입력 길이와 형식은 모델에 보내기 전에 검증한다.
- 사용자(또는 IP)별 요청·토큰 제한을 둔다. 수치는 비용 계산 후 정한다. `[가정]`
- 비용 경보를 둔다. 임계값은 운영 전에 정한다.
- 오류 응답에 키, 내부 주소, 스택, 모델 응답 원문을 싣지 않는다.
- 프롬프트 인젝션으로 시스템 프롬프트가 노출될 수 있다고 가정하고, 시스템 프롬프트에는 비밀값을 넣지 않는다. 프롬프트 원문의 공개 여부는 커밋 전에 확인한다.

### 이슈 #6에서 구현한 범위와 한계

- 입력: 메시지 20개, 텍스트 합계 2000자 이하, 요청 본문 256KB 이하이고 허용한 part 종류(`text`, `reasoning`, `step-start`, `source-url`) 외에는 거부한다. 모델에는 텍스트 part만 보낸다.
- 제한: 클라이언트별로 분당 20회, 10분당 입력 40,000자까지 허용하고 넘으면 429와 `Retry-After`를 준다. 수치는 개발용 기본값이며 실제 비용을 계산해 정한 값이 아니다. `[가정]`
- 한계 1: 기본 제한기는 메모리 안에서만 센다. 서버리스처럼 인스턴스가 여러 개이거나 재시작하면 카운트가 따로 쌓이거나 초기화된다. 이를 위해 Upstash Redis REST 기반 공유 제한기를 추가했고 `UPSTASH_REDIS_REST_URL`·`UPSTASH_REDIS_REST_TOKEN`이 모두 있을 때만 쓴다(저장소가 실패하면 메모리 제한기로 넘어가고, 클라이언트 주소는 해시해서 저장한다). 저장소를 만들고 환경변수를 넣기 전에는 여전히 메모리 제한기다.
- 한계 2: 클라이언트 식별은 `x-forwarded-for`·`x-real-ip` 헤더를 믿는다. Vercel 문서에 따르면 Vercel이 직접 요청을 받을 때는 `x-forwarded-for`를 덮어써서 위조를 막지만, 앞단에 다른 프록시·CDN이 있으면 이 보장이 깨진다([근거와 조건](../deploy.md#클라이언트-식별-x-forwarded-for)). `x-real-ip`의 덮어쓰기는 문서에서 확인하지 못했다.
- 한계 3: 비용 경보는 코드로 구현하지 않았다. 제한에 걸리면 서버 로그에 `rate_limited`만 남긴다. 실제 비용 상한과 경보는 모델 공급자 콘솔과 호스팅 쪽에서 설정해야 한다.
- 시스템 프롬프트: 저장소에는 일반적인 기본 문구만 두고, 운영용 지침은 `CHAT_SYSTEM_PROMPT` 환경변수로 덮어쓴다.

### 수용한 위험: 대화 이력의 신뢰

- 클라이언트가 이전 대화 이력을 매 요청에 함께 보내므로, 이력에 가짜 assistant 응답을 넣을 수 있다. 서명으로 막지 않았다.
- 수용한 이유: 영향이 요청한 사용자 본인의 응답에 한정되고, 이력 길이와 글자 수, 요청 횟수 상한이 있으며, 서버에 사용자 간 공유 상태가 없다. 이 판단은 저장된 대화나 사용자별 권한이 생기면 다시 검토한다. `[가정]`

## 6. 문서 조회 도구 — 보류

- 최신 문서를 모델에 붙이는 도구(예: Context7 MCP)가 있다 `[벤더]` [GitHub](https://github.com/upstash/context7), [블로그](https://upstash.com/blog/context7-mcp).
- 보류 이유: 필요 여부를 같은 질문 세트로 확인하지 않았다. 외부 서비스 의존과 비용이 생긴다.
- 재검토 조건: 평가의 최신 버전 질문 유형에서 근거 기반 응답만으로 최신성 점수가 기준 미만일 때.

## 7. 코드 실행 샌드박스 — 제외(보류)

- 후보 사례: [e2b fragments](https://github.com/e2b-dev/fragments) `[벤더]`
- 제외 이유: 보안 위험(임의 코드 실행)과 비용이 크고, 현재 요구가 확인되지 않았다.
- 재검토 조건: 코드 실행 요구가 확인되고 격리·비용 한도 계획이 서 있을 때.

## 참고 사례 (포트폴리오 채팅)

- [dev.to 이력서 채팅](https://dev.to/okasputra/stop-sending-static-resumes-how-i-built-a-chat-with-my-resume-bot-nextjs-rag-4kdm), [dev.to AI 포트폴리오](https://dev.to/roy_amit/building-an-ai-powered-portfolio-a-developers-journey-16a1), [smart-portfolio](https://github.com/medevs/smart-portfolio) — 구성 아이디어 참고용이며 근거로 쓰지 않았다.
- 오픈소스 채팅 UI 비교 [블로그](https://blog.elest.io/librechat-vs-openwebui-vs-lobe-chat-which-to-self-host-in-2026/) — 자체 호스팅 선택지 참고용.

## 결과와 한계

- 이 ADR은 방향이며 스택을 확정하지 않았다.
- 근거 대부분이 블로그·벤더 문서·2차 요약이다. 어느 구성이 우리 질문에서 더 나은지는 [평가 질문 세트](../evaluation/questions.md)로 비교해야 한다.
