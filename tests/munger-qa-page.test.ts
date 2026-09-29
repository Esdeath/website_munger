import { existsSync, readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GET } from "../src/pages/books/munger-qa/reader.html";

const page = readFileSync("src/pages/books/munger-qa/index.astro", "utf8");
const endpoint = readFileSync("src/pages/books/munger-qa/reader.html.ts", "utf8");

describe("embedded Munger Q&A book", () => {
  it("renders the standalone reader inside the shared site layout", () => {
    expect(page).toContain('<BaseLayout title={title} description={description}>');
    expect(page).toContain('class="standalone-reader-frame"');
    expect(page).toContain('src={readerSrc}');
    expect(page).toContain('import.meta.env.DEV ? "/books/munger-qa/reader.html" : "/books/munger-qa/reader"');
  });

  it("serves the generated book as the reader document", () => {
    expect(endpoint).toContain('"output", "munger-qa-book", "芒格问答录.html"');
    expect(endpoint).toContain('"Content-Type": "text/html; charset=utf-8"');
    expect(existsSync("output/munger-qa-book/芒格问答录.html")).toBe(true);
  });

  it("loads a separate cover on the website and keeps the downloadable HTML self-contained", async () => {
    const webReader = await GET().text();
    const offlineReader = readFileSync("output/munger-qa-book/芒格问答录.html", "utf8");

    expect(webReader).toContain('src="/books/munger-qa/cover.webp"');
    expect(webReader).not.toContain("data:image/png;base64,");
    expect(Buffer.byteLength(webReader)).toBeLessThan(1_000_000);
    expect(statSync("public/books/munger-qa/cover.webp").size).toBeLessThan(500_000);
    expect(offlineReader).toContain("data:image/png;base64,");
  });
});
