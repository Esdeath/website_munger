import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/styles/global.css", "utf8");

describe("article font-size scaling in global.css", () => {
  it("declares --article-font-scale at 100% on :root", () => {
    expect(css).toMatch(/:root\s*\{[^}]*--article-font-scale:\s*100%;/s);
  });
  it("scales .article-body from the variable", () => {
    expect(css).toMatch(/\.article-body\s*\{[^}]*font-size:\s*var\(--article-font-scale\);/s);
  });
});
