"use client";

import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "./CodeBlock";

// 원문 HTML은 렌더링하지 않고(react-markdown 기본값), 링크 주소는 기본 urlTransform이 http(s)·mailto 등만 남깁니다.
const components: Components = {
  pre({ children }) {
    const child = Children.toArray(children)[0];
    if (!isValidElement(child)) return null;
    const { className, children: code } = (child as ReactElement<{ className?: string; children?: ReactNode }>).props;
    const lang = /language-(\S+)/.exec(className ?? "")?.[1] ?? "";
    return <CodeBlock lang={lang} code={String(code ?? "").replace(/\n$/, "")} />;
  },
  code({ children }) {
    return <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[0.9em] dark:bg-zinc-800">{children}</code>;
  },
  a({ href, children }) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-sky-700 underline underline-offset-2 dark:text-sky-400">
        {children}
      </a>
    );
  },
  p: ({ children }) => <p className="my-3 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="my-3 list-disc space-y-1 pl-6">{children}</ul>,
  ol: ({ children }) => <ol className="my-3 list-decimal space-y-1 pl-6">{children}</ol>,
  // 페이지 제목이 h1이므로 답변 안의 제목은 단계와 관계없이 모두 h2로 두고 크기만 구분합니다(단계 건너뜀 방지).
  h1: ({ children }) => <h2 className="mb-2 mt-5 text-xl font-semibold">{children}</h2>,
  h2: ({ children }) => <h2 className="mb-2 mt-5 text-lg font-semibold">{children}</h2>,
  h3: ({ children }) => <h2 className="mb-2 mt-4 text-base font-semibold">{children}</h2>,
  h4: ({ children }) => <h2 className="mb-1.5 mt-4 text-base font-medium">{children}</h2>,
  h5: ({ children }) => <h2 className="mb-1.5 mt-4 text-base font-medium">{children}</h2>,
  h6: ({ children }) => <h2 className="mb-1.5 mt-4 text-base font-medium">{children}</h2>,
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-2 border-zinc-300 pl-4 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">{children}</blockquote>
  ),
  hr: () => <hr className="my-5 border-zinc-200 dark:border-zinc-800" />,
  table: ({ children }) => (
    <div role="region" aria-label="표" tabIndex={0} className="no-scrollbar my-3 overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
      <table className="w-full border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => <th scope="col" className="border-b border-zinc-200 bg-zinc-50 px-3 py-2 font-medium dark:border-zinc-800 dark:bg-zinc-900">{children}</th>,
  td: ({ children }) => <td className="border-b border-zinc-100 px-3 py-2 align-top last:border-b-0 dark:border-zinc-900">{children}</td>,
};

export function Markdown({ text }: { text: string }) {
  return (
    <div className="[overflow-wrap:anywhere]">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
