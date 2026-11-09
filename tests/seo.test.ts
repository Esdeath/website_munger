import { describe, expect, it } from "vitest";
import { SITE_URL, TOPICS } from "../src/content/site";
import { loadSiteCorpus } from "../src/lib/corpus";
import {
  absoluteUrl,
  buildArticleSchema,
  buildBreadcrumbSchema,
  buildCreativeWorkSchema,
  buildLlmsFullTxt,
  buildLlmsTxt,
  buildRobotsTxt,
  buildSitemapEntries,
  buildSitemapXml,
  buildWebsiteSchema,
  canonicalUrl
} from "../src/lib/seo";
import { sourceTypeLabel } from "../src/lib/source-types";

const repositoryCorpus = loadSiteCorpus();

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function latestArticleDate(): string {
  const dates = repositoryCorpus.articles
    .map((article) => article.date)
    .filter((date): date is string => typeof date === "string" && DATE_PATTERN.test(date));

  return dates.reduce((latest, date) => (date > latest ? date : latest));
}

function extractLocs(xml: string): string[] {
  return [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((match) => match[1]);
}

function extractLastmods(xml: string): string[] {
  return [...xml.matchAll(/<lastmod>([^<]*)<\/lastmod>/g)].map((match) => match[1]);
}

/** XML 实体解码（sitemap loc 里可能把 & 转成 &amp;）。 */
function decodeXmlText(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

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
  it("labels Li Lu sources separately", () => {
    expect(sourceTypeLabel({ type: "li-lu" })).toBe("李录演讲和访谈");
  });

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
      articles: repositoryCorpus.articles,
      sources: repositoryCorpus.sources
    });
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain("https://munger.ayaseeri.com/");
    expect(urls).toContain("https://munger.ayaseeri.com/articles/");
    expect(urls).toContain("https://munger.ayaseeri.com/sources/");
    expect(urls).toContain("https://munger.ayaseeri.com/llms.txt");
    expect(urls).toContain("https://munger.ayaseeri.com/llms-full.txt");
    expect(urls.some((url) => url.includes("/articles/能力圈-知道自己不知道什么/"))).toBe(true);
    expect(urls.some((url) => url.includes("/sources/2023年-每日期刊股东会讲话/"))).toBe(true);
    expect(
      urls.some((url) => url.includes("/sources/李录-2024年北大光华管理学院-价值投资-十周年演讲/"))
    ).toBe(true);
    expect(urls).toContain("https://munger.ayaseeri.com/stop-doing/");
    expect(urls).toContain("https://munger.ayaseeri.com/book-list/");
    expect(urls).toContain("https://munger.ayaseeri.com/books/munger-qa/");
  });

  it("gives every sitemap entry a lastmod date without using the build date", () => {
    const entries = buildSitemapEntries({
      topics: TOPICS,
      articles: repositoryCorpus.articles,
      sources: repositoryCorpus.sources
    });
    const latest = latestArticleDate();

    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(entry.lastmod).toMatch(DATE_PATTERN);
    }

    // 聚合页统一用全站最新内容日期，而不是构建当天。
    const aggregateUrls = [
      "https://munger.ayaseeri.com/",
      "https://munger.ayaseeri.com/articles/",
      "https://munger.ayaseeri.com/sources/",
      "https://munger.ayaseeri.com/topics/",
      "https://munger.ayaseeri.com/stop-doing/",
      "https://munger.ayaseeri.com/book-list/",
      "https://munger.ayaseeri.com/books/munger-qa/",
      "https://munger.ayaseeri.com/llms.txt",
      "https://munger.ayaseeri.com/llms-full.txt"
    ];
    const lastmodByUrl = new Map(entries.map((entry) => [entry.url, entry.lastmod]));
    for (const url of aggregateUrls) {
      expect(lastmodByUrl.get(url)).toBe(latest);
    }

    // 文章用自己的 date。
    const article = repositoryCorpus.articles.find((item) => item.slug === "能力圈-知道自己不知道什么");
    expect(article?.date).toMatch(DATE_PATTERN);
    expect(lastmodByUrl.get(`https://munger.ayaseeri.com/articles/${article?.slug}/`)).toBe(article?.date);

    // 原文用自身年份（语料只有年份，取该年 1 月 1 日）。
    expect(
      lastmodByUrl.get("https://munger.ayaseeri.com/sources/2023年-每日期刊股东会讲话/")
    ).toBe("2023-01-01");
  });

  it("deduplicates sitemap entries while keeping full URL coverage", () => {
    const entries = buildSitemapEntries({
      topics: TOPICS,
      articles: repositoryCorpus.articles,
      sources: repositoryCorpus.sources
    });
    const urls = entries.map((entry) => entry.url);

    expect(new Set(urls).size).toBe(urls.length);
    expect(urls).toHaveLength(
      6 + // 首页、stop-doing、book-list、books/munger-qa、/topics/、/articles/
        TOPICS.length +
        repositoryCorpus.articles.length +
        2 + // /sources/、/llms.txt
        repositoryCorpus.sources.length +
        1 // /llms-full.txt
    );
  });

  it("builds sitemap XML with lastmod on every url", () => {
    const xml = buildSitemapXml([
      { url: "https://munger.ayaseeri.com/", lastmod: "2026-06-28" },
      { url: "https://munger.ayaseeri.com/articles/", lastmod: "2026-06-28" }
    ]);

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain("<loc>https://munger.ayaseeri.com/</loc>");
    expect(xml).toContain("<lastmod>2026-06-28</lastmod>");
    expect(extractLocs(xml)).toHaveLength(2);
    expect(extractLastmods(xml)).toHaveLength(2);
    expect(xml).not.toContain("<changefreq>");
    expect(xml).not.toContain("<priority>");
  });

  it("percent-encodes every sitemap loc and escapes XML entities", () => {
    const entries = buildSitemapEntries({
      topics: TOPICS,
      articles: repositoryCorpus.articles,
      sources: repositoryCorpus.sources
    });
    const xml = buildSitemapXml(entries);
    const locs = extractLocs(xml);

    // 每个 <url> 同时有 <loc> 与 <lastmod>。
    expect(locs).toHaveLength(entries.length);
    expect(extractLastmods(xml)).toHaveLength(entries.length);

    // 没有任何裸非 ASCII 字符。
    for (const loc of locs) {
      expect(loc).toMatch(/^[\x20-\x7E]+$/);
    }

    // 解码后与原始 URL 完全一致（不丢路径、不双重编码）。
    expect(locs.map((loc) => decodeURIComponent(decodeXmlText(loc)))).toEqual(
      entries.map((entry) => entry.url)
    );
    expect(locs.some((loc) => loc.includes("%25"))).toBe(false);

    // 中文原文路径必须被编码成百分号形式。
    const chineseLoc = locs.find((loc) =>
      decodeURIComponent(decodeXmlText(loc)).includes("/sources/李录-2024年北大光华管理学院-价值投资-十周年演讲/")
    );
    expect(chineseLoc).toBe(
      encodeURI("https://munger.ayaseeri.com/sources/李录-2024年北大光华管理学院-价值投资-十周年演讲/")
    );
    expect(xml).not.toMatch(/<loc>[^<]*[^\x00-\x7F]/);
  });

  it("builds robots.txt with one Allow group per AI crawler and a final wildcard group", () => {
    const text = buildRobotsTxt();
    const expectedDomestic = [
      "Baiduspider",
      "Baiduspider-render",
      "Bytespider",
      "Doubaobot",
      "Sogou web spider",
      "Sogou inst spider",
      "YisouSpider",
      "360Spider",
      "QwenBot",
      "Qwen-User",
      "TongyiBot",
      "AliyunBot",
      "KimiBot",
      "Kimi-User",
      "Kimi-SearchBot",
      "DeepSeekBot"
    ];
    const expectedGlobal = [
      "Googlebot",
      "bingbot",
      "GPTBot",
      "OAI-SearchBot",
      "ChatGPT-User",
      "ClaudeBot",
      "Claude-Web",
      "anthropic-ai",
      "PerplexityBot",
      "Perplexity-User",
      "Google-Extended",
      "GoogleOther",
      "Applebot-Extended",
      "CCBot",
      "Amazonbot",
      "Meta-ExternalAgent",
      "cohere-ai",
      "YouBot",
      "DuckAssistBot",
      "TikTokSpider"
    ];

    const userAgents = text
      .split("\n")
      .filter((line) => line.startsWith("User-agent: "))
      .map((line) => line.slice("User-agent: ".length));

    // 顺序：国内 AI/搜索 → 英文 AI → 通配。
    expect(userAgents).toEqual([...expectedDomestic, ...expectedGlobal, "*"]);
    expect(text.match(/^Allow: \/$/gm)).toHaveLength(userAgents.length);
    expect(text).not.toMatch(/Disallow|Crawl-delay/i);
    expect(text).not.toContain("\r");

    // 每个爬虫一个独立分组：User-agent、Allow、空行。
    const blocks = text.split("\n\n");
    expect(blocks).toHaveLength(userAgents.length + 1);
    for (const block of blocks.slice(0, userAgents.length)) {
      expect(block).toMatch(/^User-agent: .+\nAllow: \/$/);
    }
    expect(blocks.at(-1)).toBe("Sitemap: https://munger.ayaseeri.com/sitemap.xml\n");
    expect(text.endsWith("Sitemap: https://munger.ayaseeri.com/sitemap.xml\n")).toBe(true);
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
    expect(text).toContain("https://munger.ayaseeri.com/stop-doing/");
    expect(text).toContain("https://munger.ayaseeri.com/book-list/");
    expect(text).toContain("https://munger.ayaseeri.com/books/munger-qa/");
  });

  it("builds full llms index with representative articles and sources", () => {
    const text = buildLlmsFullTxt({
      topics: TOPICS,
      articles: repositoryCorpus.articles,
      sources: repositoryCorpus.sources
    });

    expect(text).toContain("## 主题索引");
    expect(text).toContain("## 解释文章索引");
    expect(text).toContain("## 原文资料索引");
    expect(text).toContain("能力圈");
    expect(text).toContain("2023年 每日期刊股东会讲话");
    expect(text).toContain("李录演讲和访谈");
    expect(text).toContain("著名投资人李录北大演讲全文");
  });
});
