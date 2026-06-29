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
    expect(base).toContain("position: fixed;");
    expect(base).toContain("transform: translateX(-100%);");
    expect(base).toContain(".nav-drawer-state:checked ~ .archive-sidebar");
    expect(base).toContain("transform: translateX(0);");
    expect(base).toContain(".mobile-topbar");
    expect(base).toContain("position: fixed;");
    expect(base).toContain(".overview-page");
    expect(base).toContain("width: 100%;");
  });

  it("puts mobile drawer controls in the top bar", () => {
    const layoutSource = readFileSync("src/layouts/BaseLayout.astro", "utf8");

    expect(layoutSource).toContain('<header class="mobile-topbar"');
    expect(layoutSource).toContain('id="nav-drawer-state"');
    expect(layoutSource).toContain('class="drawer-state nav-drawer-state"');
    expect(layoutSource).toContain('class="topbar-button nav-drawer-toggle"');
    expect(layoutSource).toContain('class="drawer-scrim nav-drawer-scrim"');
    expect(layoutSource).toContain('class="topbar-button reader-drawer-toggle"');
    expect(layoutSource.indexOf('<aside class="archive-sidebar"')).toBeGreaterThan(
      layoutSource.indexOf('for="nav-drawer-state"')
    );
  });

  it("keeps reader sidebars behind a mobile drawer control", () => {
    const articlePage = readFileSync("src/pages/articles/[slug].astro", "utf8");
    const sourcePage = readFileSync("src/pages/sources/[slug].astro", "utf8");

    for (const pageSource of [articlePage, sourcePage]) {
      expect(pageSource).toContain('id="reader-drawer-state"');
      expect(pageSource).toContain('class="drawer-state reader-drawer-state"');
      expect(pageSource).toContain('class="drawer-scrim reader-drawer-scrim"');
      expect(pageSource.indexOf('<aside class="reader-aside"')).toBeGreaterThan(
        pageSource.indexOf('id="reader-drawer-state"')
      );
    }
  });

  it("enhances the navigation into a fixed sidebar only on wide desktop widths", () => {
    const desktop = mediaBlock("(min-width: 1101px)");

    expect(desktop).toContain(".app-shell");
    expect(desktop).toContain("padding-left: var(--sidebar);");
    expect(desktop).toContain(".archive-sidebar");
    expect(desktop).toContain("position: fixed;");
    expect(desktop).toContain("width: calc(var(--sidebar) - 32px);");
    expect(desktop).toContain("transform: none;");
    expect(desktop).toContain(".mobile-topbar");
    expect(desktop).toContain("display: none;");
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
    expect(phone).toContain(".reader-aside");
    expect(phone).toContain("transform: translateX(100%);");
  });
});
