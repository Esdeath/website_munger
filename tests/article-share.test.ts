import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildArticleSharePayload } from "../src/lib/article-share";

describe("article share payload", () => {
  const input = {
    siteTitle: "查理·芒格知识库",
    title: "能力圈 <边界>",
    url: "https://munger.ayaseeri.com/articles/能力圈/?from=a&b=c",
    markdown: "\n## 第一节\n\n> 保留引用。\n",
    html: '<h2 id="first">第一节</h2><blockquote><p>保留引用。</p></blockquote>'
  };

  it("wraps Markdown with linked site and article attribution at both ends", () => {
    const payload = buildArticleSharePayload(input);
    const attribution = `[查理·芒格知识库](${input.url}) · [能力圈 <边界>](${input.url})`;

    expect(payload.markdown).toBe(
      `${attribution}\n\n# 能力圈 <边界>\n\n## 第一节\n\n> 保留引用。\n\n---\n\n${attribution}`
    );
    expect(payload.markdown.match(/查理·芒格知识库/g)).toHaveLength(2);
    expect(payload.markdown.match(/能力圈 <边界>/g)).toHaveLength(3);
  });

  it("wraps rendered HTML without changing article structure", () => {
    const payload = buildArticleSharePayload(input);

    expect(payload.html).toContain("<h1>能力圈 &lt;边界&gt;</h1>");
    expect(payload.html).toContain(input.html);
    expect(payload.html.match(/查理·芒格知识库/g)).toHaveLength(2);
    expect(payload.html.match(/能力圈 &lt;边界&gt;/g)).toHaveLength(3);
    expect(payload.html).toContain("?from=a&amp;b=c");
  });
});

describe("article sharing integration", () => {
  const component = readFileSync("src/components/ArticleShare.astro", "utf8");
  const articlePage = readFileSync("src/pages/articles/[slug].astro", "utf8");
  const sourcePage = readFileSync("src/pages/sources/[slug].astro", "utf8");

  it("writes rich and Markdown clipboard formats with a plain-text fallback", () => {
    expect(component).toContain('import { Share2 } from "@lucide/astro"');
    expect(component).toContain("data-share-button");
    expect(component).toContain('role="status"');
    expect(component).toContain('"text/html"');
    expect(component).toContain('"text/plain"');
    expect(component).toContain("navigator.clipboard.writeText(payload.markdown)");
    expect(component).toContain("已复制");
    expect(component).toContain("复制失败，请重试");
  });

  it("renders the shared control on explanatory and original detail pages", () => {
    expect(articlePage).toContain('import ArticleShare from "../../components/ArticleShare.astro"');
    expect(articlePage).toContain("markdown={article.body}");
    expect(articlePage).toContain('url={canonicalUrl(`/articles/${article.slug}/`)}');
    expect(sourcePage).toContain('import ArticleShare from "../../components/ArticleShare.astro"');
    expect(sourcePage).toContain("markdown={bodyWithoutDuplicateTitle}");
    expect(sourcePage).toContain('url={canonicalUrl(`/sources/${source.slug}/`)}');
  });
});
