import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DefaultChatTransport } from "ai";
import { afterEach, describe, expect, it, vi } from "vitest";
import { handleChat, type ChatDeps } from "@/server/chat/handler";
import { MAX_TEXT_LENGTH } from "@/server/chat/validate";
import { Chat } from "./Chat";

function setup(deps: ChatDeps) {
  const transport = new DefaultChatTransport({
    api: "/api/chat",
    fetch: async (_input, init) => handleChat(new Request("http://localhost/api/chat", init), deps),
  });
  render(<Chat transport={transport} />);
  return userEvent.setup();
}

async function* say(...parts: string[]) {
  for (const p of parts) yield p;
}

describe("Chat", () => {
  it("첫 화면에서 AI 안내와 예시 질문을 보여 준다", () => {
    setup({ streamText: () => say() });
    expect(screen.getByText(/AI가 만든 답변은 틀릴 수 있습니다/)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^예시:/ }).length).toBeGreaterThanOrEqual(3);
  });

  it("질문을 보내면 내 메시지와 스트리밍된 답변을 보여 준다", async () => {
    const user = setup({ streamText: () => say("안녕", "하세요") });
    await user.type(screen.getByRole("textbox", { name: "메시지" }), "인사해 줘");
    await user.click(screen.getByRole("button", { name: "보내기" }));
    expect(await screen.findByText("인사해 줘")).toBeInTheDocument();
    expect(await screen.findByText("안녕하세요")).toBeInTheDocument();
  });

  it("검색 단계가 없는 지금은 답변에 근거 없음 문구를 붙이지 않는다", async () => {
    const user = setup({ streamText: () => say("그냥 답변") });
    await user.type(screen.getByRole("textbox", { name: "메시지" }), "질문");
    await user.click(screen.getByRole("button", { name: "보내기" }));
    await screen.findByText("그냥 답변");
    expect(screen.queryByText("근거를 찾지 못했습니다")).not.toBeInTheDocument();
    expect(screen.queryByText(/출처 \d+개/)).not.toBeInTheDocument();
  });

  it("답변의 코드 블록을 복사 버튼이 있는 코드 블록으로 보여 준다", async () => {
    const user = setup({ streamText: () => say("예:\n```ts\nconst a = 1;\n```") });
    await user.type(screen.getByRole("textbox", { name: "메시지" }), "코드");
    await user.click(screen.getByRole("button", { name: "보내기" }));
    expect(await screen.findByRole("button", { name: "코드 복사" })).toBeInTheDocument();
    expect(screen.getByText("const a = 1;")).toBeInTheDocument();
  });

  it("생성 중 중단하면 받은 내용을 남기고 중단됨을 표시한다", async () => {
    const user = setup({
      streamText: async function* ({ signal }) {
        yield "첫 조각";
        await new Promise<void>((resolve) => signal.addEventListener("abort", () => resolve()));
      },
    });
    await user.type(screen.getByRole("textbox", { name: "메시지" }), "길게 답해 줘");
    await user.click(screen.getByRole("button", { name: "보내기" }));
    await screen.findByText("첫 조각");
    await user.click(await screen.findByRole("button", { name: "중단" }));
    expect(await screen.findByText("중단됨")).toBeInTheDocument();
    expect(screen.getByText("첫 조각")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "중단" })).not.toBeInTheDocument();
  });

  it("오류가 나면 안전한 안내와 다시 시도 버튼만 보여 준다", async () => {
    const user = setup({
      streamText: async function* () {
        throw new Error("gsk_fake_key_123 http://internal.example");
      },
    });
    await user.type(screen.getByRole("textbox", { name: "메시지" }), "질문");
    await user.click(screen.getByRole("button", { name: "보내기" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("응답을 만들지 못했습니다");
    expect(document.body).not.toHaveTextContent("gsk_fake_key_123");
    expect(document.body).not.toHaveTextContent("internal.example");
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument();
  });

  it("전송 계층이 원문이 섞인 오류로 실패해도 화면에는 안전한 안내만 보여 준다", async () => {
    const transport = new DefaultChatTransport({
      api: "/api/chat",
      fetch: async () => {
        throw new Error("gsk_fake_key_123 http://internal.example");
      },
    });
    render(<Chat transport={transport} />);
    const user = userEvent.setup();
    await user.type(screen.getByRole("textbox", { name: "메시지" }), "질문");
    await user.click(screen.getByRole("button", { name: "보내기" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("응답을 만들지 못했습니다");
    expect(document.body).not.toHaveTextContent("gsk_fake_key_123");
    expect(document.body).not.toHaveTextContent("internal.example");
  });

  it("요청 제한에 걸리면 일반 오류 대신 잠시 후 다시 시도하라는 안내만 보여 준다", async () => {
    const user = setup({
      streamText: () => say("x"),
      rateLimit: () => ({ ok: false, retryAfterSec: 30 }),
    });
    await user.type(screen.getByRole("textbox", { name: "메시지" }), "질문");
    await user.click(screen.getByRole("button", { name: "보내기" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("요청이 너무 많습니다");
    expect(alert).not.toHaveTextContent("rate_limited");
    expect(alert).not.toHaveTextContent("{");
  });

  it("빈 입력과 상한을 넘은 입력은 보낼 수 없다", () => {
    setup({ streamText: () => say() });
    const box = screen.getByRole("textbox", { name: "메시지" });
    expect(screen.getByRole("button", { name: "보내기" })).toBeDisabled();
    fireEvent.change(box, { target: { value: "a".repeat(MAX_TEXT_LENGTH + 1) } });
    expect(screen.getByRole("button", { name: "보내기" })).toBeDisabled();
    expect(screen.getByText(/글자 수를 줄여 주세요/)).toBeInTheDocument();
  });

  it("Enter로 보내고 Shift+Enter는 줄바꿈이다", async () => {
    const streamText = vi.fn(() => say("ok"));
    const user = setup({ streamText });
    const box = screen.getByRole("textbox", { name: "메시지" });
    await user.type(box, "첫 줄{Shift>}{Enter}{/Shift}둘째 줄");
    expect(streamText).not.toHaveBeenCalled();
    expect(box).toHaveValue("첫 줄\n둘째 줄");
    await user.type(box, "{Enter}");
    await waitFor(() => expect(streamText).toHaveBeenCalledTimes(1));
  });

  it("예시 질문을 누르면 그 질문을 바로 보낸다", async () => {
    const streamText = vi.fn(() => say("ok"));
    const user = setup({ streamText });
    const example = screen.getAllByRole("button", { name: /^예시:/ })[0];
    await user.click(example);
    await waitFor(() => expect(streamText).toHaveBeenCalledTimes(1));
  });
});

afterEach(() => vi.restoreAllMocks());

function scrollMetrics(el: HTMLElement, m: { scrollHeight: number; clientHeight: number; scrollTop: number }) {
  for (const [k, v] of Object.entries(m)) Object.defineProperty(el, k, { configurable: true, writable: true, value: v });
}

describe("Chat 사용 경험", () => {
  it("위로 스크롤해 읽는 중에는 맨 아래로 버튼을 보여 주고 자동으로 끌어내리지 않는다", async () => {
    const scrollIntoView = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoView;
    let releaseSecond!: () => void;
    const second = new Promise<void>((resolve) => (releaseSecond = resolve));
    const user = setup({
      streamText: async function* ({ signal }) {
        yield "첫 조각";
        await second;
        yield "둘째 조각";
        await new Promise<void>((resolve) => signal.addEventListener("abort", () => resolve()));
      },
    });
    await user.type(screen.getByRole("textbox", { name: "메시지" }), "질문");
    await user.click(screen.getByRole("button", { name: "보내기" }));
    await screen.findByText("첫 조각");

    const log = screen.getByRole("log");
    scrollMetrics(log, { scrollHeight: 2000, clientHeight: 500, scrollTop: 100 });
    fireEvent.scroll(log);
    const button = await screen.findByRole("button", { name: "맨 아래로" });

    scrollIntoView.mockClear();
    releaseSecond();
    await screen.findByText(/둘째 조각/);
    expect(scrollIntoView).not.toHaveBeenCalled();

    await user.click(button);
    expect(scrollIntoView).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("button", { name: "맨 아래로" })).not.toBeInTheDocument());
  });

  it("맨 아래 근처에서는 맨 아래로 버튼이 없다", async () => {
    const user = setup({ streamText: () => say("답") });
    await user.type(screen.getByRole("textbox", { name: "메시지" }), "질문");
    await user.click(screen.getByRole("button", { name: "보내기" }));
    await screen.findByText("답");
    const log = screen.getByRole("log");
    scrollMetrics(log, { scrollHeight: 2000, clientHeight: 500, scrollTop: 1480 });
    fireEvent.scroll(log);
    expect(screen.queryByRole("button", { name: "맨 아래로" })).not.toBeInTheDocument();
  });

  it("입력창은 내용에 맞춰 높이가 늘고 최대 높이를 넘지 않으며 전송하면 돌아온다", async () => {
    let scrollHeight = 40;
    vi.spyOn(HTMLTextAreaElement.prototype, "scrollHeight", "get").mockImplementation(() => scrollHeight);
    const user = setup({ streamText: () => say("ok") });
    const box = screen.getByRole("textbox", { name: "메시지" });

    scrollHeight = 96;
    await user.type(box, "a");
    expect(box.style.height).toBe("96px");

    scrollHeight = 900;
    await user.type(box, "b");
    expect(box.style.height).toBe("160px");

    scrollHeight = 40;
    await user.type(box, "{Enter}");
    await waitFor(() => expect(box.style.height).toBe("40px"));
  });

  it("전송과 중단 뒤에도 입력창에 포커스가 있다", async () => {
    const user = setup({
      streamText: async function* ({ signal }) {
        yield "첫 조각";
        await new Promise<void>((resolve) => signal.addEventListener("abort", () => resolve()));
      },
    });
    const box = screen.getByRole("textbox", { name: "메시지" });
    await user.type(box, "질문");
    await user.click(screen.getByRole("button", { name: "보내기" }));
    expect(box).toHaveFocus();
    await user.click(await screen.findByRole("button", { name: "중단" }));
    await waitFor(() => expect(box).toHaveFocus());
  });

  it("새 대화를 누르면 대화를 비우고 처음 화면으로 돌아간다", async () => {
    const user = setup({ streamText: () => say("답변입니다") });
    expect(screen.queryByRole("button", { name: "새 대화" })).not.toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: "메시지" }), "첫 질문");
    await user.click(screen.getByRole("button", { name: "보내기" }));
    await screen.findByText("답변입니다");
    await user.click(screen.getByRole("button", { name: "새 대화" }));
    expect(screen.queryByText("답변입니다")).not.toBeInTheDocument();
    expect(screen.queryByText("첫 질문")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^예시:/ }).length).toBeGreaterThanOrEqual(3);
    expect(screen.getByRole("textbox", { name: "메시지" })).toHaveFocus();
  });
});

