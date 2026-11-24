# AI 채팅 사용자 경험 체크리스트

이슈 #3의 사용자 경험 축입니다. 구성은 Microsoft Human-AI 지침의 4단계(처음, 사용 중, 틀렸을 때, 시간이 지나며)를 따릅니다. 지침 원문: [Microsoft HAX Toolkit](https://www.microsoft.com/en-us/haxtoolkit/ai-guidelines/) `[1차]` (접속 시 403이 나와 원문 대조는 하지 못했습니다. 4단계 구성은 이슈 #3의 조사 요약에 기댑니다).

근거 표시는 [ui-ux.md](ui-ux.md)와 같습니다. 체크 항목은 구현 후 검증에 쓰며, 지금은 모두 미확인입니다.

## 1. 처음

- [ ] 이 채팅이 무엇을 할 수 있고 무엇을 못 하는지 첫 화면에서 한두 문장으로 알린다. `[가정]` Microsoft 지침에 같은 취지의 항목이 있는지는 원문 대조 전이다.
- [ ] 답변이 AI 생성이고 틀릴 수 있음을 알린다. 문구는 짧게 한다. `[가정]`
- [ ] 예시 질문을 보여 준다. 예시는 평가 질문 세트와 같은 유형으로 맞춘다. `[가정]`

## 2. 사용 중

- [ ] 불확실하면 확신 없는 어조로 말하고, 근거가 없으면 "근거를 찾지 못했다"고 말한다. `[1차, 본문 미대조]` [NN/g](https://nngroup.com/articles/dimensions-of-ai-chatbots)
- [ ] 질문이 모호하면 추측해서 답하지 않고 되묻는다. `[1차, 본문 미대조]` 같은 출처. 한 번에 한 가지만 묻는 규칙과 되묻기 횟수 상한은 `[가정]`
- [ ] 긴 답변을 늘리고 줄이는 후속 동작(더 자세히, 더 짧게)을 제공한다. `[1차, 본문 미대조]` [NN/g 확장·축소](https://www.nngroup.com/articles/accordion-editing-apple-picking/) 그러나 칩 형태가 효과적인지는 근거가 없다. `[가정]`
- [ ] 답변이 길이 제한으로 잘리면 "이어서"를 누르게 한다. 이어 쓰기 요청 사례: [HuggingChat 논의](https://huggingface.co/spaces/huggingchat/chat-ui/discussions/176) `[사례]`
- [ ] 출처를 눌렀을 때 원문 위치로 이동한다. `[벤더]` [Stack Overflow](https://stackoverflow.blog/2024/09/30/attribution-as-the-foundation-of-developer-trust/)

## 3. 틀렸을 때

- [ ] 사용자가 "틀렸다"고 알릴 방법(피드백 버튼)이 있다. `[가정]` Microsoft 지침의 "틀렸을 때" 단계에 대응시킨 항목
- [ ] 틀렸다는 말을 들으면 변명하지 않고 정정하거나 근거 확인을 제안한다. `[가정]`
- [ ] 낡은 정보가 흔한 오류라는 점을 알고, 버전이 중요한 질문에서는 기준 버전과 확인 날짜를 답변에 쓴다. `[벤더]` [Mintlify](https://www.mintlify.com/library/ai-hallucinations), [OpenAI 커뮤니티](https://community.openai.com/t/my-biggest-pain-point-with-gpt-coding-outdated-libraries-apis-docs/958684)
- [ ] 서버 오류·제한 초과 때 사용자에게 내부 정보(키, 내부 주소, 스택, 모델 응답 원문)를 보여 주지 않는다. `AGENTS.md` 안전 규칙
- [ ] 개발자들의 불만 사례(과한 확신, 장황함 등)를 점검 항목으로 쓴다. `[사례]` [HN 1](https://hn.svelte.dev/item/44815819), [HN 2](https://hn.svelte.dev/item/46045987)

## 4. 시간이 지나며

- [ ] 대화 이력을 어디까지 저장하는지 알린다. 저장 위치와 기간은 ADR에서 정한다. `[가정]`
- [ ] 출처 문서가 바뀌면 답변의 최신성이 떨어질 수 있음을 운영 점검 항목으로 둔다. `[가정]`
- [ ] 피드백과 평가 질문 결과를 모아 개선하는 주기를 정한다. 주기는 후속 이슈에서 정한다.

## 어조 원칙

- 한국어로 답하고 필요한 영어 용어는 병기한다. 기존 portfolio2 기술 채팅의 성격과 맞춘다(참고만 했고 프롬프트는 옮기지 않았다).
- 과한 친근함과 과한 확신을 피한다. 어조가 신뢰에 미치는 영향은 검토되지 않은 연구만 있다. `[검토 필요]` [arXiv](https://arxiv.org/html/2605.28498)
- 사용자를 평가하거나 훈계하지 않는다. `[가정]`

## 보조 자료

- Google PAIR 가이드북 `[1차, 본문 미대조]` [출처](https://pair.withgoogle.com/guidebook) 체크 항목 세부 설계에 쓸 후보이며 이번 문서에서 항목을 대조하지 않았다.

## 한계

- 후속 질문 칩, 메시지 편집·재생성은 근거를 찾지 못해 필수 항목에 넣지 않았다.
- 한국어 기술 질문에서의 품질 차이는 근거가 없다. 평가 질문 세트의 한국어 유형으로 직접 확인한다.
