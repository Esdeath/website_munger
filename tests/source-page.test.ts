import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sourcePage = readFileSync("src/pages/sources/[slug].astro", "utf8");

describe("source detail page", () => {
  it("shows an unconditional heading directory directly after source information", () => {
    const sourceInfo = sourcePage.indexOf("<h2>原文信息</h2>");
    const directory = sourcePage.indexOf("<h2>本篇目录（{source.headings.length}）</h2>");
    const keywords = sourcePage.indexOf("<h2>本篇涉及的关键词（{citedBy.length}）</h2>");

    expect(sourceInfo).toBeGreaterThanOrEqual(0);
    expect(directory).toBeGreaterThan(sourceInfo);
    expect(keywords).toBeGreaterThan(directory);
    expect(sourcePage).toContain('<ul class="link-list">');
    expect(sourcePage).toContain("source.headings.map((heading) => (");
    expect(sourcePage).toContain('<li><a href={`#${heading.slug}`}>{heading.text}</a></li>');
  });
});
