import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import { ThemeToggle } from "./ThemeToggle";

beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }));
  localStorage.clear();
  document.documentElement.className = "";
});

describe("ThemeToggle", () => {
  it("시스템·라이트·다크 세 선택지를 테마 그룹으로 보여 주고 기본은 시스템이다", () => {
    render(<ThemeToggle />);
    expect(screen.getByRole("group", { name: "테마" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "시스템" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "라이트" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "다크" })).not.toBeChecked();
  });

  it("다크를 고르면 적용하고 저장하며 선택 표시가 옮겨간다", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    await user.click(screen.getByRole("radio", { name: "다크" }));
    expect(document.documentElement).toHaveClass("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(screen.getByRole("radio", { name: "다크" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "시스템" })).not.toBeChecked();
  });

  it("저장된 선택을 불러와 표시한다", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "light");
    render(<ThemeToggle />);
    expect(screen.getByRole("radio", { name: "라이트" })).toBeChecked();
  });

  it("그룹에서 탭은 한 번만 멈추고 방향키로 선택을 옮긴다", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    await user.tab();
    expect(screen.getByRole("radio", { name: "시스템" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "라이트" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "라이트" })).toHaveFocus();
    expect(document.documentElement).not.toHaveClass("dark");
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "다크" })).toBeChecked();
    expect(document.documentElement).toHaveClass("dark");
  });
});
