import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sourcePage = readFileSync("src/pages/sources/[slug].astro", "utf8");

describe("source detail page", () => {
  it("leaves standalone HTML sources to their public static route", () => {
    expect(sourcePage).toContain(".filter((source) => !source.standalone)");
  });

  it("shows source information, heading directory, body keywords, and related sources in order", () => {
    const sourceInfo = sourcePage.indexOf("<h2>原文信息</h2>");
    const directory = sourcePage.indexOf("<h2>本篇目录（{source.headings.length}）</h2>");
    const keywords = sourcePage.indexOf("<h2>本篇涉及的关键词（{mentionedArticles.length}）</h2>");
    const related = sourcePage.indexOf("<h2>同类原文</h2>");

    expect(sourceInfo).toBeGreaterThanOrEqual(0);
    expect(directory).toBeGreaterThan(sourceInfo);
    expect(keywords).toBeGreaterThan(directory);
    expect(related).toBeGreaterThan(keywords);
    expect(sourcePage).toContain("const mentionedArticles = mentionedArticlesForSource(source, articles);");
    expect(sourcePage).toContain("source.headings.map((heading) => (");
    expect(sourcePage).toContain('<li><a href={`#${heading.slug}`}>{heading.text}</a></li>');
    expect(sourcePage).toContain("mentionedArticles.map((article) => (");
    expect(sourcePage).toContain('<li><a href={`/articles/${article.slug}/`}>{article.keyword}</a></li>');
    expect(sourcePage).toContain("<p>{citedBy.length} 篇解读引用</p>");
  });
});
