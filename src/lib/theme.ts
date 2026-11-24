export type ThemePreference = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

export function parsePreference(value: unknown): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}

export function resolveTheme(pref: ThemePreference, systemDark: boolean): "light" | "dark" {
  if (pref === "system") return systemDark ? "dark" : "light";
  return pref;
}

function systemPrefersDark(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia(DARK_QUERY).matches;
}

// 저장소 쓰기가 막힌 환경(시크릿 모드 등)에서도 이번 방문 동안은 선택이 유지되게 합니다.
let fallback: ThemePreference | null = null;

export function getSnapshot(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored !== null) return parsePreference(stored);
  } catch {
    // 저장소를 읽지 못하면 아래 기본값을 씁니다.
  }
  return fallback ?? "system";
}

function applyTheme(pref: ThemePreference) {
  const theme = resolveTheme(pref, systemPrefersDark());
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

const listeners = new Set<() => void>();

export function setPreference(pref: ThemePreference): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, pref);
    fallback = null;
  } catch {
    fallback = pref;
  }
  applyTheme(pref);
  listeners.forEach((l) => l());
}

export function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  const mql = typeof window.matchMedia === "function" ? window.matchMedia(DARK_QUERY) : null;
  const onSystemChange = () => {
    applyTheme(getSnapshot());
    callback();
  };
  mql?.addEventListener("change", onSystemChange);
  return () => {
    listeners.delete(callback);
    mql?.removeEventListener("change", onSystemChange);
  };
}

// 첫 페인트 전에 실행해 테마 깜빡임을 막는 스크립트입니다. 위 로직과 같은 규칙을 씁니다.
export const themeInitScript = `(function(){var p="system";try{var s=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(s==="light"||s==="dark")p=s}catch(e){}var d=p==="dark"||(p==="system"&&typeof matchMedia==="function"&&matchMedia(${JSON.stringify(
  DARK_QUERY,
)}).matches);var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light"})();`;
