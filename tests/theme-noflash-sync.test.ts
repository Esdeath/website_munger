import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { themeMetaColors } from "../src/lib/theme";

// The inline `is:inline` no-flash script in BaseLayout cannot import theme.ts
// (it must run before any module loads), so it duplicates the theme -> color
// map. These tests guard that duplicated map against drift from the canonical
// source in theme.ts.
const layout = readFileSync("src/layouts/BaseLayout.astro", "utf8");

describe("BaseLayout no-flash script stays in sync with theme.ts", () => {
  it("embeds every theme color from themeMetaColors", () => {
    for (const color of Object.values(themeMetaColors)) {
      expect(layout).toContain(color);
    }
  });

  it("uses the light color as the default theme-color meta", () => {
    expect(layout).toContain(`content="${themeMetaColors.light}"`);
  });
});
