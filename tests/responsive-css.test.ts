import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/styles/global.css", "utf8");

function baseBlock(): string {
  const firstMedia = css.indexOf("@media");
  return firstMedia === -1 ? css : css.slice(0, firstMedia);
}

function mediaBlock(query: string): string {
  const marker = `@media ${query}`;
  const start = css.indexOf(marker);
  expect(start).toBeGreaterThanOrEqual(0);

  const nextMedia = css.indexOf("@media", start + marker.length);
  return nextMedia === -1 ? css.slice(start) : css.slice(start, nextMedia);
}

describe("responsive layout CSS", () => {
  it("uses the compact mobile shell as the default layout", () => {
    const base = baseBlock();

    expect(base).toContain(".app-shell");
    expect(base).toContain("padding-left: 0;");
    expect(base).toContain(".archive-sidebar");
    expect(base).toContain("position: sticky;");
    expect(base).not.toContain("position: fixed;");
    expect(base).toContain(".sidebar-nav");
    expect(base).toContain("overflow-x: auto;");
    expect(base).toContain(".overview-page");
    expect(base).toContain("width: 100%;");
  });

  it("enhances the navigation into a fixed sidebar only on wide desktop widths", () => {
    const desktop = mediaBlock("(min-width: 1101px)");

    expect(desktop).toContain(".app-shell");
    expect(desktop).toContain("padding-left: var(--sidebar);");
    expect(desktop).toContain(".archive-sidebar");
    expect(desktop).toContain("position: fixed;");
    expect(desktop).toContain("width: calc(var(--sidebar) - 32px);");
    expect(desktop).toContain(".sidebar-nav");
    expect(desktop).toContain("display: block;");
    expect(desktop).toContain(".overview-page");
    expect(desktop).toContain("width: min(740px, calc(100vw - var(--sidebar) - 90px));");
  });

  it("tightens reader and archive surfaces for phone widths", () => {
    const phone = mediaBlock("(max-width: 640px)");

    expect(phone).toContain(".overview-page");
    expect(phone).toContain("padding: 18px 14px 52px;");
    expect(phone).toContain(".reader-layout");
    expect(phone).toContain("padding: 20px 14px 56px;");
    expect(phone).toContain(".article-body blockquote");
    expect(phone).toContain("padding: 18px;");
    expect(phone).toContain(".sidebar-section");
    expect(phone).toContain("min-width: 260px;");
  });
});
