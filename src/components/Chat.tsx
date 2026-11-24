"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type ChatTransport, type UIMessage } from "ai";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { MAX_TEXT_LENGTH } from "@/server/chat/validate";
import { Markdown } from "./Markdown";
import { ThemeToggle } from "./ThemeToggle";
import { Sources, type Source } from "./Sources";

const EXAMPLES = [
  "클로저가 무엇인지 예시와 함께 설명해 줘",
  "React에서 리렌더링이 자주 일어나는 이유를 어떻게 찾아?",
  "디바운스와 쓰로틀의 차이를 코드로 보여 줘",
];

const SAFE_ERROR = "응답을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.";
const RATE_LIMITED_ERROR = "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.";

// 서버 응답 원문은 화면에 보여 주지 않고, 알려진 코드만 고정된 문구로 바꿉니다.
function errorText(error: Error | undefined): string {
  return error?.message.includes("rate_limited") ? RATE_LIMITED_ERROR : SAFE_ERROR;
}

const NEAR_BOTTOM_PX = 80;
const MAX_INPUT_HEIGHT_PX = 160;

const defaultTransport = new DefaultChatTransport({ api: "/api/chat" });

function textOf(message: UIMessage): string {
  return message.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
}

function sourcesOf(message: UIMessage): Source[] {
  return message.parts.flatMap((p) => (p.type === "source-url" ? [{ url: p.url, title: p.title }] : []));
}

export function Chat({ transport = defaultTransport }: { transport?: ChatTransport<UIMessage> }) {
  const { messages, setMessages, sendMessage, status, stop, regenerate, clearError, error } = useChat({ transport });
  const [input, setInput] = useState("");
  const [stopped, setStopped] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const streaming = status === "submitted" || status === "streaming";
  const tooLong = input.length > MAX_TEXT_LENGTH;
  const canSend = !streaming && !tooLong && input.trim() !== "";

  useEffect(() => {
    if (atBottom) endRef.current?.scrollIntoView?.({ block: "end" });
  }, [messages, status, atBottom]);

  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_INPUT_HEIGHT_PX)}px`;
  }, [input]);

  function send(text: string) {
    setStopped(false);
    setInput("");
    setAtBottom(true);
    void sendMessage({ text });
    inputRef.current?.focus();
  }

  function newChat() {
    void stop();
    clearError();
    setMessages([]);
    setInput("");
    setStopped(false);
    setAtBottom(true);
    inputRef.current?.focus();
  }

  function jumpToBottom() {
    setAtBottom(true);
    const reduceMotion = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    endRef.current?.scrollIntoView?.({ block: "end", behavior: reduceMotion ? "auto" : "smooth" });
  }

  return (
    <main className="mx-auto flex h-dvh w-full max-w-3xl flex-col pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
      <header className="flex items-center justify-between pb-3 pt-[max(1rem,env(safe-area-inset-top))] text-sm text-zinc-600 dark:text-zinc-400">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="뒤로"
            onClick={() => window.history.back()}
            className="hover-ghost rounded-lg px-2.5 py-1 pointer-coarse:px-3 pointer-coarse:py-3"
          >
            <span aria-hidden="true">←</span>
          </button>
          <h1>기술 멘토 채팅</h1>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={newChat}
              className="hover-ghost rounded-lg px-2.5 py-1 pointer-coarse:px-3 pointer-coarse:py-3"
            >
              새 대화
            </button>
          )}
          <ThemeToggle />
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        role="log"
        aria-label="대화 내용"
        tabIndex={0}
        aria-live="polite"
        aria-busy={streaming}
        onScroll={(e) => {
          const el = e.currentTarget;
          setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX);
        }}
        className="no-scrollbar flex-1 space-y-6 overflow-y-auto overscroll-contain pb-6"
      >
        {messages.length === 0 && (
          <section className="pt-16">
            <h2 className="text-2xl font-semibold">무엇이 궁금하세요?</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">AI가 만든 답변은 틀릴 수 있습니다. 중요한 내용은 공식 문서로 확인해 주세요.</p>
            <div className="mt-6 grid gap-2 sm:grid-cols-3">
              {EXAMPLES.map((q) => (
                <button
                  key={q}
                  type="button"
                  aria-label={`예시: ${q}`}
                  onClick={() => send(q)}
                  className="hover-card rounded-xl border border-zinc-300 p-3 text-left text-sm pointer-coarse:p-4 dark:border-zinc-700"
                >
                  {q}
                </button>
              ))}
            </div>
          </section>
        )}

        {messages.map((m, i) => {
          const last = i === messages.length - 1;
          const text = textOf(m);
          if (m.role === "user") {
            return (
              <div key={m.id} className="flex justify-end">
                <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl bg-zinc-100 px-4 py-2 dark:bg-zinc-800">{text}</p>
              </div>
            );
          }
          return (
            <article key={m.id} className="text-[15px] leading-relaxed">
              <Markdown text={text} />
              {last && stopped && !streaming && <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">중단됨</p>}
              {!(last && streaming) && <Sources sources={sourcesOf(m)} />}
            </article>
          );
        })}

        {status === "submitted" && <p className="text-sm text-zinc-600 dark:text-zinc-400">답변을 준비하고 있습니다…</p>}

        {status === "error" && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            <p>{errorText(error)}</p>
            <button type="button" onClick={() => void regenerate()} className="hover-ghost mt-2 rounded-lg border border-red-300 px-3 py-1 [--hover-bg:#fee2e2] pointer-coarse:py-3 dark:border-red-800 dark:[--hover-bg:#7f1d1d]">
              다시 시도
            </button>
          </div>
        )}
        <div ref={endRef} />
      </div>
      {!atBottom && (
        <button
          type="button"
          onClick={jumpToBottom}
          className="hover-ghost absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs shadow-md pointer-coarse:px-4 pointer-coarse:py-3 dark:border-zinc-600 dark:bg-zinc-900"
        >
          맨 아래로
        </button>
      )}
      </div>

      <form
        className="sticky bottom-0 pb-[max(1rem,env(safe-area-inset-bottom))]"
        onSubmit={(e) => {
          e.preventDefault();
          if (canSend) send(input.trim());
        }}
      >
        <div className="flex items-end gap-2 rounded-2xl border border-zinc-500 bg-white p-2 shadow-sm focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--focus)] dark:bg-zinc-900">
          <textarea
            ref={inputRef}
            aria-label="메시지"
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                if (canSend) send(input.trim());
              }
            }}
            enterKeyHint="send"
            autoComplete="off"
            placeholder="질문을 입력하세요"
            className="no-scrollbar max-h-40 flex-1 resize-none bg-transparent px-2 py-1.5 text-base outline-none placeholder:text-zinc-600 dark:placeholder:text-zinc-400"
          />
          {streaming ? (
            <button
              type="button"
              onClick={() => {
                setStopped(true);
                void stop();
                inputRef.current?.focus();
              }}
              className="hover-primary min-h-10 rounded-xl bg-zinc-900 px-4 py-2 text-sm text-white pointer-coarse:min-h-11 dark:bg-zinc-100 dark:text-zinc-900"
            >
              중단
            </button>
          ) : (
            <button type="submit" disabled={!canSend} className="hover-primary min-h-10 rounded-xl bg-sky-700 px-4 py-2 text-sm text-white pointer-coarse:min-h-11 disabled:opacity-40">
              보내기
            </button>
          )}
        </div>
        {tooLong && (
          <p role="status" className="mt-1 text-xs text-red-600 dark:text-red-400">
            {input.length}/{MAX_TEXT_LENGTH}자입니다. 글자 수를 줄여 주세요.
          </p>
        )}
      </form>
    </main>
  );
}
