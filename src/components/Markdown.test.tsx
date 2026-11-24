import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Markdown } from "./Markdown";

describe("Markdown", () => {
  it("굵게와 인라인 코드를 서식으로 렌더링한다", () => {
    render(<Markdown text={"**중요**하고 `useMemo`를 씁니다"} />);
    expect(screen.getByText("중요").tagName).toBe("STRONG");
    expect(screen.getByText("useMemo").tagName).toBe("CODE");
  });

  it("목록과 제목을 렌더링한다", () => {
    render(<Markdown text={"#### 체크리스트\n\n1. 하나\n2. 둘\n\n- 가\n- 나"} />);
    expect(screen.getByRole("heading", { name: "체크리스트" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
  });

  it("답변 안의 제목은 몇 단계든 페이지 제목(h1) 바로 아래인 h2로 렌더링해 단계를 건너뛰지 않는다", () => {
    render(<Markdown text={"# 가\n\n## 나\n\n### 다\n\n#### 라"} />);
    const headings = screen.getAllByRole("heading");
    expect(headings.map((h) => h.textContent)).toEqual(["가", "나", "다", "라"]);
    expect(headings.every((h) => h.tagName === "H2")).toBe(true);
  });

  it("표(GFM)를 표로 렌더링한다", () => {
    render(<Markdown text={"| 항목 | 설명 |\n| --- | --- |\n| 메모 | 값을 기억 |"} />);
    const table = screen.getByRole("table");
    expect(within(table).getByRole("columnheader", { name: "항목" })).toBeInTheDocument();
    expect(within(table).getByRole("cell", { name: "값을 기억" })).toBeInTheDocument();
  });

  it("표 머리글은 열 범위를 알리고 가로로 넘치는 표는 키보드로 스크롤할 수 있다", () => {
    render(<Markdown text={"| 항목 | 설명 |\n| --- | --- |\n| 메모 | 값 |"} />);
    expect(screen.getByRole("columnheader", { name: "항목" })).toHaveAttribute("scope", "col");
    expect(screen.getByRole("region", { name: "표" })).toHaveAttribute("tabindex", "0");
  });

  it("코드 펜스는 언어 표시와 복사 버튼이 있는 코드 블록으로 렌더링한다", () => {
    render(<Markdown text={"예:\n\n```ts\nconst a = 1;\n```\n"} />);
    expect(screen.getByText("ts")).toBeInTheDocument();
    expect(screen.getByText("const a = 1;")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "코드 복사" })).toBeInTheDocument();
  });

  it("언어가 없는 코드 펜스도 코드 블록으로 렌더링한다", () => {
    render(<Markdown text={"```\nplain\n```"} />);
    expect(screen.getByRole("button", { name: "코드 복사" })).toBeInTheDocument();
  });

  it("스트리밍 중 닫히지 않은 코드 펜스도 코드 블록으로 렌더링한다", () => {
    render(<Markdown text={"```js\nlet x"} />);
    expect(screen.getByText("let x")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "코드 복사" })).toBeInTheDocument();
  });

  it("원문 HTML은 요소로 렌더링하지 않는다", () => {
    const { container } = render(<Markdown text={'<img src=x onerror="alert(1)"> <script>alert(1)</script> 안녕'} />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("script")).toBeNull();
  });

  it("javascript: 링크는 클릭 가능한 링크로 만들지 않는다", () => {
    const { container } = render(<Markdown text={"[위험](javascript:alert(1))"} />);
    const a = container.querySelector("a");
    expect(a?.getAttribute("href") ?? "").not.toMatch(/^javascript:/i);
  });

  it("https 링크는 새 탭에서 안전하게 연다", () => {
    render(<Markdown text={"[문서](https://example.com/a)"} />);
    const a = screen.getByRole("link", { name: "문서" });
    expect(a).toHaveAttribute("href", "https://example.com/a");
    expect(a).toHaveAttribute("target", "_blank");
    expect(a.getAttribute("rel")).toContain("noopener");
  });
});
