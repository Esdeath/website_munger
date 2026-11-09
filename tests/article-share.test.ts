import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildArticleCopyContent,
  buildArticleShareText,
  buildFullArticleCopyHtml,
  buildFullArticleCopyText
} from "../src/lib/article-share";

describe("article share text", () => {
  it("leads with the bare title, then the article link", () => {
    const text = buildArticleShareText({
      title: "段永平谈买股票就是买公司",
      url: "https://munger.example/maigupiao"
    });

    expect(text).toBe("段永平谈买股票就是买公司\n原文链接：https://munger.example/maigupiao");
  });

  it("keeps title punctuation verbatim in plain text", () => {
    const text = buildArticleShareText({
      title: "<投资 & 经营>",
      url: "https://munger.example/a?x=1&y=2"
    });

    expect(text).toBe("<投资 & 经营>\n原文链接：https://munger.example/a?x=1&y=2");
  });
});

describe("full article copy", () => {
  const source = {
    title: "能力圈 <边界>",
    url: "https://munger.ayaseeri.com/articles/nengli-quan/"
  };

  it("puts the trimmed body between the title and one trailing link", () => {
    const text = buildFullArticleCopyText(source, "\n  第一节\n\n正文。  \n");

    expect(text).toBe(
      "能力圈 <边界>\n\n第一节\n\n正文。\n\n原文链接：https://munger.ayaseeri.com/articles/nengli-quan/"
    );
  });

  it("wraps the inlined body in a white-background article shell", () => {
    const html = buildFullArticleCopyHtml(source, '<h2 style="font-size:20px">第一节</h2>');

    expect(html).toBe(
      '<article style="color:#222;background-color:#fff"><h1>能力圈 &lt;边界&gt;</h1><h2 style="font-size:20px">第一节</h2><p>原文链接：<a href="https://munger.ayaseeri.com/articles/nengli-quan/">https://munger.ayaseeri.com/articles/nengli-quan/</a></p></article>'
    );
  });

  it("escapes the title and URL in the HTML shell", () => {
    const html = buildFullArticleCopyHtml(
      { title: "<投资 & '经营'>", url: 'https://munger.example/a?x=1&y="2"' },
      "<p>正文</p>"
    );

    expect(html).toBe(
      '<article style="color:#222;background-color:#fff"><h1>&lt;投资 &amp; &#039;经营&#039;&gt;</h1><p>正文</p><p>原文链接：<a href="https://munger.example/a?x=1&amp;y=&quot;2&quot;">https://munger.example/a?x=1&amp;y=&quot;2&quot;</a></p></article>'
    );
  });

  it("keeps the attribution only once, with no site name and no Markdown", () => {
    const text = buildFullArticleCopyText(source, "正文");
    const html = buildFullArticleCopyHtml(source, "<p>正文</p>");

    expect(text.match(/原文链接：/g)).toHaveLength(1);
    expect(html.match(/原文链接：/g)).toHaveLength(1);
    expect(text).not.toContain("查理·芒格知识库");
    expect(html).not.toContain("查理·芒格知识库");
    expect(text.split("\n")[0]).toBe("能力圈 <边界>");
    expect(html.startsWith('<article style="color:#222;background-color:#fff"><h1>')).toBe(true);
  });
});

describe("article selection copy", () => {
  it("appends the title and link after the selected markup", () => {
    const content = buildArticleCopyContent(
      { title: "能力圈", url: "https://munger.example/nengli-quan" },
      { html: "<p>正文 <strong>重点</strong></p>", text: "正文 重点" }
    );

    expect(content.text).toBe("正文 重点\n\n能力圈\n原文链接：https://munger.example/nengli-quan");
    expect(content.html).toBe(
      '<p>正文 <strong>重点</strong></p><p>能力圈<br>原文链接：<a href="https://munger.example/nengli-quan">https://munger.example/nengli-quan</a></p>'
    );
  });

  it("escapes the attribution without touching the selection markup", () => {
    const content = buildArticleCopyContent(
      { title: "<投资 & 经营>", url: 'https://munger.example/a?x=1&y="2"' },
      { html: '<ul><li><a href="https://munger.example/b">正文链接</a></li></ul>', text: "正文链接" }
    );

    expect(content.html).toMatch(
      /^<ul><li><a href="https:\/\/munger\.example\/b">正文链接<\/a><\/li><\/ul><p>&lt;投资 &amp; 经营&gt;<br>/
    );
    expect(content.html).toMatch(/href="https:\/\/munger\.example\/a\?x=1&amp;y=&quot;2&quot;"/);
  });
});

describe("article sharing integration", () => {
  const component = readFileSync("src/components/ArticleShare.astro", "utf8");
  const library = readFileSync("src/lib/article-share.ts", "utf8");
  const articlePage = readFileSync("src/pages/articles/[slug].astro", "utf8");
  const sourcePage = readFileSync("src/pages/sources/[slug].astro", "utf8");

  it("writes rich and plain clipboard formats through the shared builders", () => {
    expect(component).toContain('import { Share2 } from "@lucide/astro"');
    expect(component).toContain("buildFullArticleCopyContent");
    expect(component).toContain("buildSelectionCopyContent");
    expect(component).toContain("navigator.clipboard.write(");
    expect(component).toContain('"text/html": new Blob');
    expect(component).toContain('"text/plain": new Blob');
    expect(component).toContain("已复制");
    expect(component).toContain("复制失败，请重试");
  });

  it("takes over copying inside the article body and leaves the rest alone", () => {
    expect(component).toContain('addEventListener("copy"');
    expect(component).toContain('setData("text/plain"');
    expect(component).toContain('setData("text/html"');
    expect(component).toContain("event.preventDefault()");
    expect(component).toContain(".article-body");
    expect(component).not.toContain("data-share-markdown");
    expect(component).not.toContain("buildMarkdownSharePayload");
    expect(component).not.toContain("buildHtmlSharePayload");
    // 选区跨出正文时必须放行浏览器默认复制，否则框选侧边栏也会被塞进出处
    expect(library).toContain("root.contains(range.commonAncestorContainer)");
    expect(library).toContain("stripComments(holder)");
    // Vue 的 fragment 锚点注释不能跟着选区一起粘出去
    expect(library).toContain("NodeFilter.SHOW_COMMENT");
  });

  it("renders the shared control with the canonical article URL on both detail pages", () => {
    expect(articlePage).toContain('import ArticleShare from "../../components/ArticleShare.astro"');
    expect(articlePage).toContain("title={article.title}");
    expect(articlePage).toContain('url={canonicalUrl(`/articles/${article.slug}/`)}');
    expect(articlePage).not.toContain("markdown={article.body}");
    expect(sourcePage).toContain('import ArticleShare from "../../components/ArticleShare.astro"');
    expect(sourcePage).toContain("title={source.title}");
    expect(sourcePage).toContain('url={canonicalUrl(`/sources/${source.slug}/`)}');
    expect(sourcePage).not.toContain("markdown={bodyWithoutDuplicateTitle}");
  });

  it("drops the legacy Markdown and site-title attribution builders", () => {
    expect(library).not.toContain("buildMarkdownSharePayload");
    expect(library).not.toContain("buildHtmlSharePayload");
    expect(library).not.toContain("buildArticleSharePayload");
    expect(library).not.toContain("siteTitle");
  });
});
