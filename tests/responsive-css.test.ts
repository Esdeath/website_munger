import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/styles/global.css", "utf8");

function mediaBlock(maxWidth: number): string {
  const marker = `@media (max-width: ${maxWidth}px)`;
  const start = css.indexOf(marker);
  expect(start).toBeGreaterThanOrEqual(0);

  const nextMedia = css.indexOf("@media", start + marker.length);
  return nextMedia === -1 ? css.slice(start) : css.slice(start, nextMedia);
}

describe("responsive layout CSS", () => {
  it("switches the fixed sidebar to a compact top navigation on tablet widths", () => {
    const tablet = mediaBlock(1100);

    expect(tablet).toContain(".app-shell");
    expect(tablet).toContain("padding-left: 0;");
    expect(tablet).toContain(".archive-sidebar");
    expect(tablet).toContain("position: sticky;");
    expect(tablet).toContain(".sidebar-nav");
    expect(tablet).toContain("overflow-x: auto;");
    expect(tablet).toContain(".sidebar-section");
    expect(tablet).toContain("min-width: 220px;");
  });

  it("tightens reader and archive surfaces for phone widths", () => {
    const phone = mediaBlock(640);

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
