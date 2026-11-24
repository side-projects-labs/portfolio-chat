import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSnapshot, parsePreference, resolveTheme, setPreference, subscribe, themeInitScript, THEME_STORAGE_KEY } from "./theme";

type MQ = { matches: boolean; listeners: Set<() => void> };
let mq: MQ;

beforeEach(() => {
  mq = { matches: false, listeners: new Set() };
  vi.stubGlobal("matchMedia", () => ({
    get matches() {
      return mq.matches;
    },
    addEventListener: (_: string, cb: () => void) => mq.listeners.add(cb),
    removeEventListener: (_: string, cb: () => void) => mq.listeners.delete(cb),
  }));
  localStorage.clear();
  document.documentElement.className = "";
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("parsePreference", () => {
  it("허용된 값은 그대로, 그 밖은 system으로 돌려준다", () => {
    expect(parsePreference("light")).toBe("light");
    expect(parsePreference("dark")).toBe("dark");
    expect(parsePreference("system")).toBe("system");
    for (const v of [null, undefined, "", "blue", 1, {}]) expect(parsePreference(v)).toBe("system");
  });
});

describe("resolveTheme", () => {
  it("system은 OS 설정을 따르고 light·dark는 그대로다", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
});

describe("setPreference / getSnapshot", () => {
  it("저장소에 쓰고 html의 dark 클래스와 color-scheme을 맞춘다", () => {
    setPreference("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(getSnapshot()).toBe("dark");
    expect(document.documentElement).toHaveClass("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");

    setPreference("light");
    expect(document.documentElement).not.toHaveClass("dark");
    expect(document.documentElement.style.colorScheme).toBe("light");
  });

  it("system이면 OS 설정에 따라 클래스를 정하고 OS 설정이 바뀌면 따라간다", () => {
    mq.matches = true;
    setPreference("system");
    expect(document.documentElement).toHaveClass("dark");
    const cb = vi.fn();
    const off = subscribe(cb);
    mq.matches = false;
    mq.listeners.forEach((l) => l());
    expect(document.documentElement).not.toHaveClass("dark");
    expect(cb).toHaveBeenCalled();
    off();
    expect(mq.listeners.size).toBe(0);
  });

  it("light로 고정했을 때는 OS 설정이 바뀌어도 바뀌지 않는다", () => {
    setPreference("light");
    const off = subscribe(() => {});
    mq.matches = true;
    mq.listeners.forEach((l) => l());
    expect(document.documentElement).not.toHaveClass("dark");
    off();
  });

  it("저장소 접근이 막혀 있어도 던지지 않고 적용은 된다", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => setPreference("dark")).not.toThrow();
    expect(document.documentElement).toHaveClass("dark");
  });

  it("저장된 값이 잘못되었으면 system으로 본다", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "blue");
    expect(getSnapshot()).toBe("system");
  });
});

describe("themeInitScript", () => {
  const run = () => new Function(themeInitScript)();

  it("저장된 dark를 첫 페인트 전에 적용한다", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    run();
    expect(document.documentElement).toHaveClass("dark");
  });

  it("저장값이 없으면 OS 설정을 따른다", () => {
    mq.matches = true;
    run();
    expect(document.documentElement).toHaveClass("dark");
  });

  it("저장된 light는 OS가 dark여도 light다", () => {
    mq.matches = true;
    localStorage.setItem(THEME_STORAGE_KEY, "light");
    run();
    expect(document.documentElement).not.toHaveClass("dark");
  });

  it("저장소가 막혀 있어도 던지지 않는다", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(run).not.toThrow();
  });
});
