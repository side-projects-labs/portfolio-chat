export type Source = { url: string; title?: string };

function isHttpUrl(url: string): boolean {
  try {
    const { protocol } = new URL(url);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

export function Sources({ sources }: { sources: Source[] }) {
  if (sources.length === 0) {
    return <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">근거를 찾지 못했습니다</p>;
  }
  return (
    <details className="mt-2 text-sm">
      <summary className="text-xs text-zinc-600 dark:text-zinc-400">출처 {sources.length}개</summary>
      <ul className="mt-1 space-y-1">
        {sources.map((s) => (
          <li key={s.url}>
            {isHttpUrl(s.url) ? (
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-sky-700 underline dark:text-sky-400">
                {s.title ?? s.url}
              </a>
            ) : (
              <span>{s.title ?? "유효하지 않은 링크"}</span>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}
