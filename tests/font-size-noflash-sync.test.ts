import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ARTICLE_FONT_SIZE_DEFAULT,
  ARTICLE_FONT_SIZE_LEVELS,
  ARTICLE_FONT_SIZE_STORAGE_KEY
} from "../src/lib/font-size";

// The inline `is:inline` no-flash script in BaseLayout cannot import font-size.ts
// (it must run before any module loads), so it duplicates the levels/key/default.
// These tests guard that duplication against drift from the canonical source.
const layout = readFileSync("src/layouts/BaseLayout.astro", "utf8");

describe("BaseLayout no-flash font-size script stays in sync with font-size.ts", () => {
  it("reads the canonical storage key", () => {
    expect(layout).toContain(ARTICLE_FONT_SIZE_STORAGE_KEY);
  });
  it("embeds the full level list", () => {
    expect(layout).toContain(`[${[...ARTICLE_FONT_SIZE_LEVELS].join(", ")}]`);
  });
  it("embeds the default percent", () => {
    expect(layout).toMatch(new RegExp(`DEFAULT\\s*=\\s*${ARTICLE_FONT_SIZE_DEFAULT}`));
  });
  it("sets the --article-font-scale custom property before paint", () => {
    expect(layout).toContain('setProperty("--article-font-scale"');
  });
});
