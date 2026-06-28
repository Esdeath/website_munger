import { describe, expect, it } from "vitest";
import { SITE_URL, TOPICS } from "../src/content/site";
import { loadArticles, loadOriginalSources } from "../src/lib/corpus";
import {
  absoluteUrl,
  buildArticleSchema,
  buildBreadcrumbSchema,
  buildCreativeWorkSchema,
  buildLlmsFullTxt,
  buildLlmsTxt,
  buildSitemapEntries,
  buildSitemapXml,
  buildWebsiteSchema,
  canonicalUrl
} from "../src/lib/seo";

describe("SEO URL helpers", () => {
  it("uses the production domain", () => {
    expect(SITE_URL).toBe("https://munger.ayaseeri.com/");
  });

  it("normalizes canonical URLs with one trailing slash", () => {
    expect(canonicalUrl("/articles/能力圈/")).toBe("https://munger.ayaseeri.com/articles/能力圈/");
    expect(canonicalUrl("/articles/能力圈")).toBe("https://munger.ayaseeri.com/articles/能力圈/");
    expect(canonicalUrl("/")).toBe("https://munger.ayaseeri.com/");
  });

  it("builds absolute URLs for static files without forcing a trailing slash", () => {
    expect(absoluteUrl("/llms.txt")).toBe("https://munger.ayaseeri.com/llms.txt");
  });
});

describe("JSON-LD builders", () => {
  it("builds a website schema for the knowledge base", () => {
    expect(buildWebsiteSchema()).toEqual(
      expect.objectContaining({
        "@context": "https://schema.org",
        "@type": "WebSite",
        url: "https://munger.ayaseeri.com/",
        inLanguage: "zh-CN"
      })
    );
  });

  it("builds article schema with citations", () => {
    const schema = buildArticleSchema({
      title: "能力圈：知道自己不知道什么",
      description: "能力圈是芒格判断边界的核心概念。",
      pathname: "/articles/能力圈-知道自己不知道什么/",
      keyword: "能力圈",
      category: "投资原则",
      citations: ["https://munger.ayaseeri.com/sources/2023年-每日期刊股东会讲话/"]
    });

    expect(schema).toMatchObject({
      "@type": "Article",
      headline: "能力圈：知道自己不知道什么",
      articleSection: "投资原则",
      about: ["能力圈", "投资原则"],
      citation: ["https://munger.ayaseeri.com/sources/2023年-每日期刊股东会讲话/"],
      inLanguage: "zh-CN"
    });
  });

  it("builds creative work schema for original sources", () => {
    const schema = buildCreativeWorkSchema({
      title: "2023年 每日期刊股东会讲话",
      description: "芒格在每日期刊股东会上的问答记录。",
      pathname: "/sources/2023年-每日期刊股东会讲话/",
      sourceTypeLabel: "股东会与股东信",
      year: "2023"
    });

    expect(schema).toMatchObject({
      "@type": "CreativeWork",
      name: "2023年 每日期刊股东会讲话",
      genre: "股东会与股东信",
      datePublished: "2023",
      inLanguage: "zh-CN"
    });
  });

  it("builds breadcrumb schema with absolute item URLs", () => {
    const schema = buildBreadcrumbSchema([
      { name: "首页", pathname: "/" },
      { name: "解释文章", pathname: "/articles/" },
      { name: "能力圈", pathname: "/articles/能力圈/" }
    ]);

    expect(schema).toMatchObject({
      "@type": "BreadcrumbList",
      itemListElement: [
        expect.objectContaining({ position: 1, name: "首页", item: "https://munger.ayaseeri.com/" }),
        expect.objectContaining({ position: 2, name: "解释文章", item: "https://munger.ayaseeri.com/articles/" }),
        expect.objectContaining({ position: 3, name: "能力圈", item: "https://munger.ayaseeri.com/articles/能力圈/" })
      ]
    });
  });
});

describe("sitemap and llms builders", () => {
  it("builds sitemap entries for core routes and corpus pages", () => {
    const entries = buildSitemapEntries({
      topics: TOPICS,
      articles: loadArticles(),
      sources: loadOriginalSources()
    });
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain("https://munger.ayaseeri.com/");
    expect(urls).toContain("https://munger.ayaseeri.com/articles/");
    expect(urls).toContain("https://munger.ayaseeri.com/sources/");
    expect(urls).toContain("https://munger.ayaseeri.com/llms.txt");
    expect(urls.some((url) => url.includes("/articles/能力圈-知道自己不知道什么/"))).toBe(true);
    expect(urls.some((url) => url.includes("/sources/2023年-每日期刊股东会讲话/"))).toBe(true);
  });

  it("builds sitemap XML", () => {
    const xml = buildSitemapXml([
      { url: "https://munger.ayaseeri.com/" },
      { url: "https://munger.ayaseeri.com/articles/", lastmod: "2026-06-28" }
    ]);

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain("<loc>https://munger.ayaseeri.com/</loc>");
    expect(xml).toContain("<lastmod>2026-06-28</lastmod>");
  });

  it("builds concise llms.txt with core entry points and citation guidance", () => {
    const text = buildLlmsTxt({
      topics: TOPICS,
      articleCount: 70,
      sourceCount: 83
    });

    expect(text).toContain("# 查理·芒格知识库");
    expect(text).toContain("https://munger.ayaseeri.com/topics/");
    expect(text).toContain("https://munger.ayaseeri.com/articles/");
    expect(text).toContain("回答芒格相关问题时，优先引用解释文章，并回到原文资料核验出处。");
  });

  it("builds full llms index with representative articles and sources", () => {
    const text = buildLlmsFullTxt({
      topics: TOPICS,
      articles: loadArticles(),
      sources: loadOriginalSources()
    });

    expect(text).toContain("## 主题索引");
    expect(text).toContain("## 解释文章索引");
    expect(text).toContain("## 原文资料索引");
    expect(text).toContain("能力圈");
    expect(text).toContain("2023年 每日期刊股东会讲话");
  });
});
