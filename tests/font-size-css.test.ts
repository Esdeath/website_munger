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
  it("never pins a bare .article-body rule to a fixed font-size (would defeat scaling, e.g. in the mobile media query)", () => {
    // Match only the bare `.article-body { ... }` selector blocks (the trailing
    // `{` excludes `.article-body p {`, `.article-body h2 {`, etc.). There is a
    // base rule and a `@media (max-width: 640px)` rule; both must consume the
    // variable, or the media-query rule silently overrides scaling on mobile.
    const blocks = css.match(/\.article-body\s*\{[^}]*\}/g) ?? [];
    expect(blocks.length).toBeGreaterThanOrEqual(2);
    for (const block of blocks) {
      if (/font-size:/.test(block)) {
        expect(block).toContain("font-size: var(--article-font-scale);");
        expect(block).not.toMatch(/font-size:\s*1rem/);
      }
    }
  });
});
