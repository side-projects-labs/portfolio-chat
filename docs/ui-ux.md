# AI 채팅 디자인 UI/UX 기준

이 문서는 portfolio-chat의 화면 기준을 정합니다. 구현과 스택은 정하지 않습니다. 이슈: #3.

## 읽는 법

각 항목 뒤의 표시는 근거의 강도입니다. 강도가 낮은 항목은 확정 사실이 아니라 후보 판단입니다.

| 표시 | 뜻 |
| --- | --- |
| `[1차]` | 연구 기관·표준 기관이 직접 낸 자료 |
| `[벤더]` | 해당 제품을 파는 쪽의 문서나 블로그 |
| `[제3자]` | 제품을 외부에서 분석한 글 |
| `[블로그]` | 개인·업체 블로그, 2차 요약 |
| `[사례]` | 커뮤니티 글·논의 (개별 의견이며 대표성 없음) |
| `[가정]` | 근거를 찾지 못했고 이 저장소에서 가정으로 둔 항목 |

링크는 HTTP 응답이 200인 것까지 확인했고(Microsoft 링크는 403, 봇 차단으로 추정), 본문 전체를 읽고 검증한 것은 아닙니다. 확인하지 못한 범위는 문서 끝 "한계"에 적습니다.

## 1. 출처 표시

| 기준 | 근거 |
| --- | --- |
| 답변에 쓴 출처를 답변 본문보다 먼저 또는 바로 옆에서 보이게 한다 | Stack Overflow AI Assist는 출처를 답변 위에 펼치고 인용문을 붙입니다 `[벤더]` [출처](https://stackoverflow.blog/2025/12/02/introducing-stack-overflow-ai-assist-a-tool-for-the-modern-developer/) |
| 출처는 문장 옆 인라인 칩, 답변 요약 줄, 상단 패널 중 둘 이상으로 접근 가능하게 한다 | Perplexity가 세 방식을 함께 씁니다 `[제3자]` [출처 1](https://aiuxplayground.com/teardowns/perplexity/citations), [출처 2](https://ai-design-patterns.pages.dev/teardowns/perplexity/citations) |
| 출처 표기가 개발자 신뢰의 기반이라는 벤더의 주장을 받아들여, 출처가 없는 주장은 출처 없음으로 보이게 한다 (본문 미대조) | Stack Overflow 블로그 `[벤더]` [출처](https://stackoverflow.blog/2024/09/30/attribution-as-the-foundation-of-developer-trust/) |
| 근거 문서가 없으면 모른다고 답하는 상태를 별도 화면 상태로 둔다. 단, 검색 단계가 있어 "찾았는데 없었다"는 신호가 있을 때만 표시하고, 검색을 하지 않는 응답에는 표시하지 않는다(이슈 #6 시점에는 검색 단계가 없어 화면에 나타나지 않는다) | kapa.ai 문서 Q&A 구조 `[벤더]` [출처](https://docs.kapa.ai/use-cases/documentation-assistant) |
| 출처 링크가 실제로 열리는지는 화면이 아니라 평가 질문 세트에서 확인한다 | `[가정]` |
| 근거에 따라 화면 상태를 셋으로 나눈다: 출처 있음 / "출처 없이 생성된 답변입니다"(일반 지식형) / "근거를 찾지 못했습니다"(사실·최신형). 정책은 [ADR 0002](adr/0002-grounding-policy.md) | `[가정]` |

## 2. 스트리밍과 중단

- 답변은 생성되는 대로 보여 주고, 생성 중에는 중단 버튼을 항상 같은 위치에 둔다. `[블로그]` [UXPin](https://www.uxpin.com/studio/blog/chat-user-interface-design/), [FrontKit](https://thefrontkit.com/blogs/ai-chat-ui-best-practices)
- 중단하면 지금까지 받은 내용을 남기고 "중단됨"을 표시한다. `[가정]`
- 스트림이 끊긴 경우 자동 재연결은 기본 기능이 아니다. 재연결을 하려면 저장소를 직접 구성해야 한다. `[벤더]` [AI SDK](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-resume-streams), 다른 시각: [Ably](https://ably.com/topic/ai-stack/vercel-ai-sdk-resumable-stream-what-it-covers-and-what-it-doesnt) `[벤더]`
- 끊긴 뒤의 기본 동작은 "끊겼습니다. 다시 시도" 버튼과 입력 보존이다. 재연결은 ADR의 보류 항목이다. `[가정]`

## 3. 코드 블록

- 언어 표시, 복사 버튼, 가로 스크롤(줄바꿈 강제 금지)을 둔다. `[블로그]` [Setproduct](https://www.setproduct.com/blog/ai-chat-interface-ui-design), [Shanti](https://shantiinfosoft.com/blog/designing-ai-chat-interfaces/)
- 스트리밍 중 닫히지 않은 코드 블록도 깨지지 않고 렌더링한다. `[가정]`
- 코드 실행 버튼은 두지 않는다. 샌드박스는 ADR에서 보류했다.

## 4. 접근성

- 키보드만으로 입력, 전송, 중단, 출처 열기·닫기가 가능하다. `[블로그]` [Conferbot](https://www.conferbot.com/blog/chatbot-ui-design-best-practices)
- 새 답변이 도착하면 스크린 리더에 알린다(스트리밍 중에는 토큰마다 읽지 않고 완료 시점에 알린다). `[가정]`
- 색만으로 상태(오류, 중단, 근거 없음)를 구분하지 않는다. `[블로그]` 같은 출처
- 구체적인 기준(WCAG 레벨)은 후속 이슈에서 정한다. 이 문서에서는 정하지 않았다.

## 5. 패널 사용 조건

- 기본은 한 열의 대화 화면이다.
- 사이드 패널은 긴 코드나 긴 문서처럼 대화 흐름을 끊는 결과물에만 쓴다. `[제3자]` [Artifacts 패턴](https://aiuxplayground.com/pattern/chat-artifact)
- 출처 목록은 패널이 아니라 답변 위·옆의 접힘 영역을 우선한다. 패널은 출처가 많을 때의 선택지로 둔다. `[가정]`
- 딥리서치형 진행 표시는 이번 범위가 아니다. 비교 글은 참고용이다. `[블로그]` [dev.to](https://dev.to/franciscomoretti/deep-research-uis-perplexity-vs-manus-vs-chatgpt-vs-gemini-5cc2)

## 6. 컴포넌트 후보

이슈 #6에서 Next.js, Vercel AI SDK, AI Elements를 쓰기로 했다. 이는 담당자의 선택이며 다른 후보와 비교해 평가한 결과가 아니다. assistant-ui는 쓰지 않는다.

- Vercel AI Elements `[벤더]` [출처](https://vercel.com/blog/introducing-ai-elements)
- assistant-ui [출처](https://github.com/assistant-ui/assistant-ui)

## 한계

- 접근한 링크 대부분은 블로그·벤더·제3자 분석이며 독립된 실측이 아니다.
- 후속 질문 칩, 메시지 편집·재생성의 동작은 근거를 찾지 못했다. 기준에 넣지 않았다.
- 링크 본문을 전부 읽고 인용 문장을 대조하지 않았다. 이 문서의 항목은 이슈 #3의 조사 요약과 링크 응답 확인에 기댄다.
