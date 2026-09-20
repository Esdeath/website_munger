import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("src/pages/books/munger-qa/index.astro", "utf8");
const endpoint = readFileSync("src/pages/books/munger-qa/reader.html.ts", "utf8");

describe("embedded Munger Q&A book", () => {
  it("renders the standalone reader inside the shared site layout", () => {
    expect(page).toContain('<BaseLayout title={title} description={description}>');
    expect(page).toContain('class="standalone-reader-frame"');
    expect(page).toContain('src="/books/munger-qa/reader.html"');
  });

  it("serves the generated book as the reader document", () => {
    expect(endpoint).toContain('"output", "munger-qa-book", "芒格问答录.html"');
    expect(endpoint).toContain('"Content-Type": "text/html; charset=utf-8"');
    expect(existsSync("output/munger-qa-book/芒格问答录.html")).toBe(true);
  });
});
