"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { getSnapshot, setPreference, subscribe, type ThemePreference } from "@/lib/theme";

const icon = (children: ReactNode) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

const OPTIONS: { value: ThemePreference; label: string; icon: ReactNode }[] = [
  {
    value: "system",
    label: "시스템",
    icon: icon(
      <>
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8M12 16v4" />
      </>,
    ),
  },
  {
    value: "light",
    label: "라이트",
    icon: icon(
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </>,
    ),
  },
  {
    value: "dark",
    label: "다크",
    icon: icon(<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />),
  },
];

export function ThemeToggle() {
  // 서버에서는 저장된 값을 알 수 없으므로 system으로 그리고, 클라이언트에서 저장된 값으로 맞춥니다.
  const current = useSyncExternalStore(subscribe, getSnapshot, () => "system" as ThemePreference);

  return (
    <fieldset className="flex items-center rounded-full border border-zinc-500 p-0.5">
      <legend className="sr-only">테마</legend>
      {OPTIONS.map((o) => {
        const checked = current === o.value;
        return (
          <label key={o.value} title={o.label} className="relative">
            <input
              type="radio"
              name="theme"
              value={o.value}
              checked={checked}
              onChange={() => setPreference(o.value)}
              className="peer sr-only"
            />
            <span
              className={`flex size-7 items-center justify-center rounded-full peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--focus)] pointer-coarse:size-11 ${
                checked
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "hover-ghost text-zinc-600 dark:text-zinc-400"
              }`}
            >
              {o.icon}
              <span className="sr-only">{o.label}</span>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
