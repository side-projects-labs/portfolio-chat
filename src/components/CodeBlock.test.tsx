import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CodeBlock } from "./CodeBlock";

afterEach(() => vi.restoreAllMocks());

describe("CodeBlock", () => {
  it("언어 표시와 코드를 보여 준다", () => {
    render(<CodeBlock lang="ts" code="const a = 1;" />);
    expect(screen.getByText("ts")).toBeInTheDocument();
    expect(screen.getByText("const a = 1;")).toBeInTheDocument();
  });

  it("복사 버튼을 누르면 코드를 클립보드에 쓰고 복사됨을 알린다", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    render(<CodeBlock lang="ts" code="const a = 1;" />);
    await user.click(screen.getByRole("button", { name: "코드 복사" }));
    expect(writeText).toHaveBeenCalledWith("const a = 1;");
    expect(await screen.findByText("복사됨")).toBeInTheDocument();
  });

  it("복사 전에는 클립보드 아이콘만 보이고 글자 라벨은 없다", () => {
    render(<CodeBlock lang="ts" code="x" />);
    const button = screen.getByRole("button", { name: "코드 복사" });
    expect(button.querySelector('[data-icon="clipboard"]')).not.toBeNull();
    expect(button.querySelector('[data-icon="check"]')).toBeNull();
    expect(button).not.toHaveTextContent("복사");
  });

  it("복사하면 체크 아이콘과 복사됨으로 바뀌었다가 잠시 뒤 클립보드 아이콘으로 돌아온다", async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    render(<CodeBlock lang="ts" code="x" />);
    await user.click(screen.getByRole("button", { name: "코드 복사" }));
    const button = screen.getByRole("button", { name: "복사됨" });
    expect(button.querySelector('[data-icon="check"]')).not.toBeNull();
    await waitFor(
      () => expect(screen.getByRole("button", { name: "코드 복사" }).querySelector('[data-icon="clipboard"]')).not.toBeNull(),
      { timeout: 3000 },
    );
  });

  it("클립보드 쓰기가 실패하면 복사됨으로 바꾸지 않고 실패를 알린다", async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denied"));
    render(<CodeBlock lang="ts" code="x" />);
    await user.click(screen.getByRole("button", { name: "코드 복사" }));
    expect(await screen.findByText("복사하지 못했습니다")).toBeInTheDocument();
    expect(screen.queryByText("복사됨")).not.toBeInTheDocument();
  });

  it("가로로 넘치는 코드는 키보드로 스크롤할 수 있게 초점을 받는다", () => {
    render(<CodeBlock lang="ts" code="const veryLong = 1;" />);
    expect(screen.getByText("const veryLong = 1;").closest("pre")).toHaveAttribute("tabindex", "0");
  });
});
