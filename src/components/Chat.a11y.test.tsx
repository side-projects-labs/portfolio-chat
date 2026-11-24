import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DefaultChatTransport } from "ai";
import { afterEach, describe, expect, it, vi } from "vitest";
import { handleChat, type ChatDeps } from "@/server/chat/handler";
import { Chat } from "./Chat";

function renderChat(deps: ChatDeps) {
  const transport = new DefaultChatTransport({
    api: "/api/chat",
    fetch: async (_i, init) => handleChat(new Request("http://localhost/api/chat", init), deps),
  });
  render(<Chat transport={transport} />);
  return userEvent.setup();
}

async function* say(...parts: string[]) {
  for (const p of parts) yield p;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Chat 웹 표준·접근성", () => {
  it("main 랜드마크가 있고 h1은 대화 전후 모두 하나뿐이다", async () => {
    const user = renderChat({ streamText: () => say("답") });
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("기술 멘토 채팅");

    await user.type(screen.getByRole("textbox", { name: "메시지" }), "질문");
    await user.click(screen.getByRole("button", { name: "보내기" }));
    await screen.findByText("답");
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("스크롤되는 대화 영역은 이름이 있고 키보드로 초점을 줄 수 있다", () => {
    renderChat({ streamText: () => say() });
    const log = screen.getByRole("log", { name: "대화 내용" });
    expect(log).toHaveAttribute("tabindex", "0");
  });

  it("입력창은 모바일 키보드에 전송 키를 보여 주고 자동 완성을 끈다", () => {
    renderChat({ streamText: () => say() });
    const box = screen.getByRole("textbox", { name: "메시지" });
    expect(box).toHaveAttribute("enterkeyhint", "send");
    expect(box).toHaveAttribute("autocomplete", "off");
  });

  it("움직임 줄이기 설정이면 맨 아래로 이동을 부드럽게 하지 않는다", async () => {
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: q.includes("reduce"), addEventListener() {}, removeEventListener() {} }));
    const scrollIntoView = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoView;
    const user = renderChat({
      streamText: async function* ({ signal }) {
        yield "첫";
        await new Promise<void>((r) => signal.addEventListener("abort", () => r()));
      },
    });
    await user.type(screen.getByRole("textbox", { name: "메시지" }), "q");
    await user.click(screen.getByRole("button", { name: "보내기" }));
    await screen.findByText("첫");
    const log = screen.getByRole("log");
    for (const [k, v] of Object.entries({ scrollHeight: 2000, clientHeight: 500, scrollTop: 0 })) Object.defineProperty(log, k, { configurable: true, value: v });
    fireEvent.scroll(log);
    scrollIntoView.mockClear();
    await user.click(await screen.findByRole("button", { name: "맨 아래로" }));
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled());
    expect(scrollIntoView.mock.calls.every(([o]) => o?.behavior !== "smooth")).toBe(true);
  });

  it("움직임 줄이기 설정이 없으면 부드럽게 이동한다", async () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    const scrollIntoView = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoView;
    const user = renderChat({
      streamText: async function* ({ signal }) {
        yield "첫";
        await new Promise<void>((r) => signal.addEventListener("abort", () => r()));
      },
    });
    await user.type(screen.getByRole("textbox", { name: "메시지" }), "q");
    await user.click(screen.getByRole("button", { name: "보내기" }));
    await screen.findByText("첫");
    const log = screen.getByRole("log");
    for (const [k, v] of Object.entries({ scrollHeight: 2000, clientHeight: 500, scrollTop: 0 })) Object.defineProperty(log, k, { configurable: true, value: v });
    fireEvent.scroll(log);
    scrollIntoView.mockClear();
    await user.click(await screen.findByRole("button", { name: "맨 아래로" }));
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ behavior: "smooth" })));
  });
});
