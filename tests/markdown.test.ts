import { describe, expect, it } from "vitest";
import { extractExcerpt, extractHeadings, parseMarkdownDocument } from "../src/lib/markdown";
import { renderMarkdownToHtml } from "../src/lib/render";

const articleMarkdown = `---
title: 多元思维模型:把知识挂上格栅
keyword: 多元思维模型
category: 思维方法
quote_count: 17
sources:
  - 论基本的、普世的智慧，及其与投资管理和商业的关系(1994)
  - 每日期刊股东会讲话(2017)
date: 2026-06-25
---

> 「你们必须在头脑中拥有一些思维模型。」

## 一、拿着一把锤子，你能看见什么

一个商学院毕业生进入咨询行业。

## 二、他怎么定义

知识的碎片毫无用处。
`;

describe("parseMarkdownDocument", () => {
  it("parses front matter and body", () => {
    const parsed = parseMarkdownDocument("articles/多元思维模型-把知识挂上格栅.md", articleMarkdown);

    expect(parsed.data.title).toBe("多元思维模型:把知识挂上格栅");
    expect(parsed.data.keyword).toBe("多元思维模型");
    expect(parsed.data.category).toBe("思维方法");
    expect(parsed.data.quote_count).toBe(17);
    expect(parsed.data.sources).toEqual([
      "论基本的、普世的智慧，及其与投资管理和商业的关系(1994)",
      "每日期刊股东会讲话(2017)"
    ]);
    expect(parsed.body).toContain("一个商学院毕业生进入咨询行业。");
  });
});

describe("extractHeadings", () => {
  it("extracts level two headings with ids", () => {
    const parsed = parseMarkdownDocument("articles/多元思维模型-把知识挂上格栅.md", articleMarkdown);

    expect(extractHeadings(parsed.body)).toEqual([
      { depth: 2, text: "一、拿着一把锤子，你能看见什么", slug: "一-拿着一把锤子-你能看见什么" },
      { depth: 2, text: "二、他怎么定义", slug: "二-他怎么定义" }
    ]);
  });

  it("uses visible text for formatted headings so directory links match rendered ids", async () => {
    const body = "### **TRADING STAMP AND MOTIVATION BUSINESSES（交易印花与激励业务）**";
    const [heading] = extractHeadings(body);

    expect(heading).toEqual({
      depth: 3,
      text: "TRADING STAMP AND MOTIVATION BUSINESSES（交易印花与激励业务）",
      slug: "trading-stamp-and-motivation-businesses（交易印花与激励业务）"
    });
    await expect(renderMarkdownToHtml(body)).resolves.toContain(`id="${heading.slug}"`);
  });
});

describe("extractExcerpt", () => {
  it("uses the first non-heading and non-quote paragraph", () => {
    const parsed = parseMarkdownDocument("articles/多元思维模型-把知识挂上格栅.md", articleMarkdown);

    expect(extractExcerpt(parsed.body, 30)).toBe("一个商学院毕业生进入咨询行业。");
  });
});

describe("renderMarkdownToHtml", () => {
  const abilityCircleHref = "/articles/能力圈-知道自己不知道什么/";
  const moatHref = "/articles/护城河-宽且不断变宽的护城河/";

  it("adds stable ids to rendered headings", async () => {
    const parsed = parseMarkdownDocument("articles/多元思维模型-把知识挂上格栅.md", articleMarkdown);

    await expect(renderMarkdownToHtml(parsed.body)).resolves.toContain(
      '<h2 id="一-拿着一把锤子-你能看见什么">一、拿着一把锤子，你能看见什么</h2>'
    );
  });

  it("renders strong labels that end with Chinese punctuation", async () => {
    await expect(renderMarkdownToHtml("**采访者：**听起来他确实是个理想的老师。")).resolves.toBe(
      "<p><strong>采访者：</strong>听起来他确实是个理想的老师。</p>\n"
    );
  });

  it("links keyword mentions to their article pages", async () => {
    await expect(
      renderMarkdownToHtml("能力圈和护城河需要一起看。", {
        keywordLinks: [
          { keyword: "能力圈", href: abilityCircleHref },
          { keyword: "护城河", href: moatHref }
        ]
      })
    ).resolves.toContain(`<a href="${encodeURI(abilityCircleHref)}">能力圈</a>和<a href="${encodeURI(moatHref)}">护城河</a>`);
  });

  it("does not nest keyword links inside existing links", async () => {
    await expect(
      renderMarkdownToHtml(`[能力圈](${abilityCircleHref})和护城河。`, {
        keywordLinks: [{ keyword: "能力圈", href: abilityCircleHref }]
      })
    ).resolves.toContain(`<a href="${encodeURI(abilityCircleHref)}">能力圈</a>和护城河。`);
  });

  it("does not link the current article keyword to itself", async () => {
    await expect(
      renderMarkdownToHtml("能力圈和护城河。", {
        currentHref: abilityCircleHref,
        keywordLinks: [
          { keyword: "能力圈", href: abilityCircleHref },
          { keyword: "护城河", href: moatHref }
        ]
      })
    ).resolves.toContain(`能力圈和<a href="${encodeURI(moatHref)}">护城河</a>`);
  });

  it("keeps the first owner when duplicate keyword links are supplied", async () => {
    const specialistHref = "/articles/激励机制-永远别低估它的力量/";
    const lectureHref = "/articles/思维模型讲义06-误判心理学/";

    const html = await renderMarkdownToHtml("激励机制", {
      keywordLinks: [
        { keyword: "激励机制", href: specialistHref },
        { keyword: "激励机制", href: lectureHref }
      ]
    });

    expect(html).toContain(`<a href="${encodeURI(specialistHref)}">激励机制</a>`);
    expect(html).not.toContain(encodeURI(lectureHref));
  });

  it("suppresses every term owned by the current article", async () => {
    await expect(
      renderMarkdownToHtml("能力圈和投资边界都要与护城河一起看。", {
        currentHref: abilityCircleHref,
        keywordLinks: [
          { keyword: "能力圈", href: abilityCircleHref },
          { keyword: "投资边界", href: abilityCircleHref },
          { keyword: "护城河", href: moatHref }
        ]
      })
    ).resolves.toContain(`能力圈和投资边界都要与<a href="${encodeURI(moatHref)}">护城河</a>一起看。`);
  });

  it("rewrites copied Markdown links and unlinks unavailable local documents", async () => {
    const resolve = (url: string) => {
      if (url === "模型.md") return "/thinking-grids/模型/";
      if (url === "README.md") return null;
      return undefined;
    };

    await expect(
      renderMarkdownToHtml("[模型](模型.md) [说明](README.md) [锚点](#层级)", { relativeLinkResolver: resolve })
    ).resolves.toContain(
      '<a href="/thinking-grids/%E6%A8%A1%E5%9E%8B/">模型</a> 说明 <a href="#%E5%B1%82%E7%BA%A7">锚点</a>'
    );
  });
});
