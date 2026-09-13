import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readerPage = readFileSync("src/components/ReaderPage.astro", "utf8");
const detailPages = [
  readFileSync("src/pages/articles/[slug].astro", "utf8"),
  readFileSync("src/pages/sources/[slug].astro", "utf8"),
  readFileSync("src/pages/thinking-grids/[slug].astro", "utf8")
];
const stopDoingPage = readFileSync("src/pages/stop-doing.astro", "utf8");

describe("shared reader page", () => {
  it("owns the common reader structure and exposes only page-specific slots", () => {
    expect(readerPage).toContain('shell="reader"');
    expect(readerPage).toContain('<article class="reader-layout">');
    expect(readerPage).toContain('<header class="reader-header">');
    expect(readerPage).toContain('<slot name="header" />');
    expect(readerPage).toContain('<slot name="actions" />');
    expect(readerPage).toContain('<div class="article-body" set:html={html} />');
    expect(readerPage).toContain('<slot name="aside" />');
  });

  it("is used by every Markdown detail reader", () => {
    for (const page of detailPages) {
      expect(page).toContain('import ReaderPage from "../../components/ReaderPage.astro"');
      expect(page).toContain('<Fragment slot="header">');
      expect(page).toContain('<Fragment slot="aside">');
      expect(page).not.toContain('<article class="reader-layout">');
    }
  });

  it("keeps the stop-doing collection on the archive page structure", () => {
    expect(stopDoingPage).toContain('import BaseLayout from "../layouts/BaseLayout.astro"');
    expect(stopDoingPage).toContain('<section class="page">');
    expect(stopDoingPage).not.toContain("ReaderPage");
  });
});
