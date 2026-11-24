"use client";

import { useEffect, useRef, useState } from "react";

type CopyState = "idle" | "copied" | "failed";

const RESET_MS = 1500;

function ClipboardIcon() {
  return (
    <svg data-icon="clipboard" aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="4" rx="1" />
      <path d="M9 4H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg data-icon="check" aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(code);
      setState("copied");
    } catch {
      setState("failed");
    }
    timer.current = setTimeout(() => setState("idle"), RESET_MS);
  }

  return (
    <figure className="my-3 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-950 text-zinc-100 dark:border-zinc-800">
      <figcaption className="flex h-10 items-center pointer-coarse:h-12 justify-between gap-3 border-b border-zinc-800 px-3 text-xs text-zinc-400">
        <span className="min-w-0 flex-1 truncate" title={lang}>
          {lang}
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          <span role="status" className="text-zinc-300">
            {state === "copied" && "복사됨"}
            {state === "failed" && "복사하지 못했습니다"}
          </span>
          <button
            type="button"
            onClick={copy}
            aria-label={state === "copied" ? "복사됨" : "코드 복사"}
            title="클립보드에 복사"
            className="hover-ghost flex size-7 items-center justify-center rounded-md text-zinc-400 pointer-coarse:size-11 hover:text-zinc-100 [--hover-bg:#27272a]"
          >
            {state === "copied" ? <CheckIcon /> : <ClipboardIcon />}
          </button>
        </span>
      </figcaption>
      <pre tabIndex={0} className="no-scrollbar overflow-x-auto p-3 text-sm leading-relaxed">
        <code>{code}</code>
      </pre>
    </figure>
  );
}
