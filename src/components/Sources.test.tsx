import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Sources } from "./Sources";

describe("Sources", () => {
  it("출처가 있으면 개수와 링크를 접어서 보여 준다", () => {
    render(<Sources sources={[{ url: "https://example.com/a", title: "문서 A" }, { url: "https://example.com/b" }]} />);
    expect(screen.getByText("출처 2개")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "문서 A" })).toHaveAttribute("href", "https://example.com/a");
    expect(screen.getByRole("link", { name: "https://example.com/b" })).toBeInTheDocument();
  });

  it("출처가 없으면 근거를 찾지 못했다는 별도 상태를 보여 준다", () => {
    render(<Sources sources={[]} />);
    expect(screen.getByText("근거를 찾지 못했습니다")).toBeInTheDocument();
    expect(screen.queryByText(/출처 \d+개/)).not.toBeInTheDocument();
  });

  it("http(s)가 아닌 링크는 링크로 만들지 않는다", () => {
    render(<Sources sources={[{ url: "javascript:alert(1)", title: "위험" }]} />);
    expect(screen.queryByRole("link", { name: "위험" })).not.toBeInTheDocument();
  });
});
