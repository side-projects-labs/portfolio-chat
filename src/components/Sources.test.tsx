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

  it("출처가 없으면 아무것도 그리지 않는다 (검색을 하지 않았다면 근거 없음이라고 말하지 않는다)", () => {
    const { container } = render(<Sources sources={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("검색을 했는데 근거가 없었다고 알려 주면 근거 없음 상태를 보여 준다", () => {
    render(<Sources sources={[]} notFound />);
    expect(screen.getByText("근거를 찾지 못했습니다")).toBeInTheDocument();
    expect(screen.queryByText(/출처 \d+개/)).not.toBeInTheDocument();
  });

  it("출처가 있으면 notFound가 켜져 있어도 출처를 보여 준다", () => {
    render(<Sources sources={[{ url: "https://example.com/a", title: "문서 A" }]} notFound />);
    expect(screen.getByText("출처 1개")).toBeInTheDocument();
    expect(screen.queryByText("근거를 찾지 못했습니다")).not.toBeInTheDocument();
  });

  it("http(s)가 아닌 링크는 링크로 만들지 않는다", () => {
    render(<Sources sources={[{ url: "javascript:alert(1)", title: "위험" }]} />);
    expect(screen.queryByRole("link", { name: "위험" })).not.toBeInTheDocument();
  });
});
