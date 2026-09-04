import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/styles/global.css", "utf8");

describe("theme palettes in global.css", () => {
  it("uses duan's light palette on :root", () => {
    expect(css).toContain("--bg: #f8f5f0;");
    expect(css).toContain("--orange: #b5462a;");
  });
  it("defines a dark theme block", () => {
    expect(css).toMatch(/html\.dark\s*\{/);
    expect(css).toContain("--bg: #1a1a1a;");
    expect(css).toContain("color-scheme: dark;");
  });
  it("defines a green theme block", () => {
    expect(css).toMatch(/html\.green\s*\{/);
    expect(css).toContain("--bg: #c0edc6;");
  });
  it("overrides the concrete --orange token in each theme block", () => {
    expect(css).toContain("--orange: #e07a5a;"); // html.dark
    expect(css).toContain("--orange: #8f3d2c;"); // html.green
  });
  it("never redefines the --green* aliases inside a theme block", () => {
    // The alias mechanism relies on --green* being declared only in :root (as
    // var(--orange*)); redefining them in html.dark/html.green would break the
    // per-theme brand/link colors that read --green-dark.
    const themeBlocks = css.match(/html\.(?:dark|green)\s*\{[^}]*\}/g) ?? [];
    expect(themeBlocks.length).toBe(2);
    for (const block of themeBlocks) {
      expect(block).not.toContain("--green");
    }
  });
  it("exposes the picker easing token and sidebar header layout", () => {
    expect(css).toContain("--ease-out:");
    expect(css).toContain(".sidebar-header");
  });
});
