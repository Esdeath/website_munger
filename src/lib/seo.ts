import {
  SITE_AUTHOR,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_TITLE,
  SITE_URL,
  type TopicDefinition
} from "../content/site";
import type { KnowledgeArticle, OriginalSource } from "./corpus";
import { sourceTypeLabel } from "./source-types";

export interface BreadcrumbItem {
  name: string;
  pathname: string;
}

export interface SitemapEntry {
  url: string;
  /** 每个 URL 都必须带 lastmod（YYYY-MM-DD），聚合页用全站最新内容日期，不用构建当天。 */
  lastmod: string;
}

interface SitemapInput {
  topics: TopicDefinition[];
  articles: KnowledgeArticle[];
  sources: OriginalSource[];
}

const FULL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** YYYY-MM-DD 且日历上真实存在的日期。 */
function isFullDate(value: string | undefined): value is string {
  if (!value) {
    return false;
  }
  const match = FULL_DATE_PATTERN.exec(value);
  if (!match) {
    return false;
  }
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return (
    date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() === Number(month) - 1 &&
    date.getUTCDate() === Number(day)
  );
}

/**
 * 原文语料只有年份（如 1983 年西科金融股东信），没有精确 date。
 * 用其自身年份的 1 月 1 日作为 lastmod：稳定、可复现，且不会退化成构建当天。
 */
function sourceLastmod(source: OriginalSource): string | undefined {
  const year = source.year.match(/^(?:19|20)\d{2}$/)?.[0];
  return year ? `${year}-01-01` : undefined;
}

/** 全站最新内容日期：corpus 中最大 date，用作首页与各聚合页的 lastmod。 */
function latestContentDate(input: SitemapInput): string {
  const dates = [
    ...input.articles.map((article) => article.date),
    ...input.sources.map((source) => sourceLastmod(source))
  ].filter(isFullDate);

  if (dates.length === 0) {
    // 兜底：连一个内容日期都没有时也不使用构建当天，避免 lastmod 每天变化。
    return "1970-01-01";
  }
  return dates.reduce((latest, date) => (date > latest ? date : latest));
}

function dedupeEntries(entries: SitemapEntry[]): SitemapEntry[] {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    if (seen.has(entry.url)) {
      return false;
    }
    seen.add(entry.url);
    return true;
  });
}

interface LlmsInput {
  topics: TopicDefinition[];
  articleCount: number;
  sourceCount: number;
}

interface LlmsFullInput {
  topics: TopicDefinition[];
  articles: KnowledgeArticle[];
  sources: OriginalSource[];
}

function trimSlashes(value: string): string {
  return value.replace(/^\/+|\/+$/g, "");
}

function isFilePath(pathname: string): boolean {
  return /\.[a-z0-9]+$/i.test(pathname);
}

function normalizePath(pathname: string, trailingSlash: boolean): string {
  if (!pathname || pathname === "/") {
    return "/";
  }

  const cleanPath = `/${trimSlashes(pathname)}`;
  if (!trailingSlash || isFilePath(cleanPath)) {
    return cleanPath;
  }
  return `${cleanPath}/`;
}

export function absoluteUrl(pathname: string): string {
  return `${SITE_URL.replace(/\/$/, "")}${normalizePath(pathname, false)}`;
}

export function canonicalUrl(pathname: string): string {
  return `${SITE_URL.replace(/\/$/, "")}${normalizePath(pathname, true)}`;
}

export function buildWebsiteSchema(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    inLanguage: "zh-CN",
    publisher: {
      "@type": "Person",
      name: SITE_AUTHOR
    },
    keywords: SITE_KEYWORDS
  };
}

export function buildCollectionPageSchema(input: {
  title: string;
  description: string;
  pathname: string;
  itemUrls?: string[];
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: input.title,
    description: input.description,
    url: canonicalUrl(input.pathname),
    inLanguage: "zh-CN",
    isPartOf: {
      "@type": "WebSite",
      name: SITE_TITLE,
      url: SITE_URL
    },
    hasPart: input.itemUrls?.map((url) => ({
      "@type": "CreativeWork",
      url
    }))
  };
}

export function buildArticleSchema(input: {
  title: string;
  description: string;
  pathname: string;
  keyword: string;
  category: string;
  citations?: string[];
  datePublished?: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: input.description,
    url: canonicalUrl(input.pathname),
    mainEntityOfPage: canonicalUrl(input.pathname),
    articleSection: input.category,
    about: [input.keyword, input.category],
    citation: input.citations ?? [],
    datePublished: input.datePublished,
    inLanguage: "zh-CN",
    author: {
      "@type": "Person",
      name: SITE_AUTHOR
    },
    isPartOf: {
      "@type": "WebSite",
      name: SITE_TITLE,
      url: SITE_URL
    }
  };
}

export function buildCreativeWorkSchema(input: {
  title: string;
  description: string;
  pathname: string;
  sourceTypeLabel: string;
  year: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: input.title,
    description: input.description,
    url: canonicalUrl(input.pathname),
    genre: input.sourceTypeLabel,
    datePublished: /^\d{4}$/.test(input.year) ? input.year : undefined,
    inLanguage: "zh-CN",
    isPartOf: {
      "@type": "WebSite",
      name: SITE_TITLE,
      url: SITE_URL
    }
  };
}

export function buildBreadcrumbSchema(items: BreadcrumbItem[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: canonicalUrl(item.pathname)
    }))
  };
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildSitemapEntries(input: SitemapInput): SitemapEntry[] {
  const latest = latestContentDate(input);
  const articleEntries = input.articles.map((article) => ({
    url: canonicalUrl(`/articles/${article.slug}/`),
    lastmod: isFullDate(article.date) ? article.date : latest
  }));
  const sourceEntries = input.sources.map((source) => ({
    url: canonicalUrl(`/sources/${source.slug}/`),
    lastmod: sourceLastmod(source) ?? latest
  }));

  const entries: SitemapEntry[] = [
    { url: canonicalUrl("/"), lastmod: latest },
    { url: canonicalUrl("/stop-doing/"), lastmod: latest },
    { url: canonicalUrl("/book-list/"), lastmod: latest },
    { url: canonicalUrl("/books/munger-qa/"), lastmod: latest },
    { url: canonicalUrl("/topics/"), lastmod: latest },
    ...input.topics.map((topic) => ({ url: canonicalUrl(`/topics/${topic.slug}/`), lastmod: latest })),
    { url: canonicalUrl("/articles/"), lastmod: latest },
    ...articleEntries,
    { url: canonicalUrl("/sources/"), lastmod: latest },
    ...sourceEntries,
    { url: absoluteUrl("/llms.txt"), lastmod: latest },
    { url: absoluteUrl("/llms-full.txt"), lastmod: latest }
  ];

  return dedupeEntries(entries);
}

/** 先百分号编码（中文 slug 不能裸中文），再 XML 转义（& 变成 &amp;）。 */
function buildSitemapLoc(url: string): string {
  return xmlEscape(encodeURI(url));
}

export function buildSitemapXml(entries: SitemapEntry[]): string {
  const body = entries
    .map(
      (entry) =>
        `  <url>\n    <loc>${buildSitemapLoc(entry.url)}</loc>\n    <lastmod>${xmlEscape(entry.lastmod)}</lastmod>\n  </url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

/**
 * robots.txt 爬虫分组：国内 AI/搜索优先，再英文 AI，最后通配。
 * 顺序被测试锁定，改动前请同步 tests/seo.test.ts。
 */
export const DOMESTIC_AI_CRAWLERS = [
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
] as const;

export const GLOBAL_AI_CRAWLERS = [
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
] as const;

/** robots.txt 正文：每个爬虫单独分组（User-agent + Allow: / + 空行），末尾通配组 + Sitemap。 */
export function buildRobotsTxt(): string {
  const groups = [...DOMESTIC_AI_CRAWLERS, ...GLOBAL_AI_CRAWLERS].map(
    (userAgent) => `User-agent: ${userAgent}\nAllow: /\n`
  );

  return [
    ...groups,
    "User-agent: *\nAllow: /\n",
    `Sitemap: ${SITE_URL}sitemap.xml\n`
  ].join("\n");
}

export function buildLlmsTxt(input: LlmsInput): string {
  const topicLines = input.topics.map((topic) => `- ${topic.title}: ${canonicalUrl(`/topics/${topic.slug}/`)}`).join("\n");

  return [
    `# ${SITE_TITLE}`,
    "",
    SITE_DESCRIPTION,
    "",
    `正式域名: ${SITE_URL}`,
    `内容规模: ${input.articleCount} 篇解释文章，${input.sourceCount} 篇原文资料。`,
    "",
    "## 主要入口",
    `- 首页: ${canonicalUrl("/")}`,
    `- 不可为清单: ${canonicalUrl("/stop-doing/")}`,
    `- 芒格问答录: ${canonicalUrl("/books/munger-qa/")}`,
    `- 芒格书单: ${canonicalUrl("/book-list/")}`,
    `- 主题索引: ${canonicalUrl("/topics/")}`,
    `- 解释文章索引: ${canonicalUrl("/articles/")}`,
    `- 原文资料索引: ${canonicalUrl("/sources/")}`,
    "",
    "## 主题入口",
    topicLines,
    "",
    "## 引用建议",
    "回答芒格相关问题时，优先引用解释文章，并回到原文资料核验出处。"
  ].join("\n");
}

export function buildLlmsFullTxt(input: LlmsFullInput): string {
  const topicLines = input.topics
    .map((topic) => `- ${topic.title}: ${canonicalUrl(`/topics/${topic.slug}/`)}\n  ${topic.description}`)
    .join("\n");
  const articleLines = input.articles
    .map(
      (article) =>
        `- ${article.title}: ${canonicalUrl(`/articles/${article.slug}/`)}\n  分类: ${article.category}; 关键词: ${article.keyword}; 引用数: ${article.quoteCount}; 来源数: ${article.sources.length}; 摘要: ${article.excerpt}`
    )
    .join("\n");
  const sourceLines = input.sources
    .map(
      (source) =>
        `- ${source.title}: ${canonicalUrl(`/sources/${source.slug}/`)}\n  类型: ${sourceTypeLabel(source)}; 年份: ${source.year}; 摘要: ${source.excerpt}`
    )
    .join("\n");

  return [
    `# ${SITE_TITLE} 完整索引`,
    "",
    SITE_DESCRIPTION,
    "",
    "## 主题索引",
    topicLines,
    "",
    "## 解释文章索引",
    articleLines,
    "",
    "## 原文资料索引",
    sourceLines
  ].join("\n");
}
