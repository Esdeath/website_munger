# SEO 与 GEO 优化设计

日期：2026-06-28

## 目标

为查理·芒格知识库补齐搜索引擎优化和生成式引擎优化基础设施，让站点更容易被传统搜索引擎收录，也更容易被 AI 搜索、问答系统和摘要工具识别、引用与追溯。

本站域名统一为 `https://munger.ayaseeri.com/`。

## 范围

### 范围内

- 统一 Astro `site` 配置为正式域名。
- 为所有页面输出稳定的 canonical URL。
- 为页面补齐基础 SEO meta、Open Graph、Twitter card。
- 为首页、主题页、解释文章页、原文页输出 JSON-LD 结构化数据。
- 新增 `robots.txt` 与 `sitemap.xml`。
- 新增面向生成式引擎的 `llms.txt` 与 `llms-full.txt`。
- 优先复用现有 `title`、`excerpt`、`category`、`sources`、`quoteCount`、`year` 等数据，不改文章正文。

### 范围外

- 不改写 70 篇解释文章正文。
- 不改写 `shareholders/`、`speech/` 原文资料。
- 不新增营销落地页。
- 不做地理位置 SEO、本地商家 schema、地图或地区关键词。
- 不接入外部分析、站长平台或第三方 SEO 服务。

## 设计原则

- 站点仍是“主题地图 + 解释文章 + 原文追溯”的知识库，不把 SEO 做成堆关键词。
- 每个页面的机器可读信息必须来自页面真实内容，避免结构化数据与正文不一致。
- AI/GEO 文件应该帮助模型理解站点结构、权威入口和引用方式，而不是生成与正文重复的大段营销文本。
- 所有 URL 都应使用正式域名、尾斜杠一致，并能在静态构建后直接访问。

## 架构

### 1. 站点配置

`astro.config.mjs`：

- `site` 改为 `https://munger.ayaseeri.com`
- 保持 `output: "static"`

`src/content/site.ts`：

- 增加 `SITE_URL`
- 增加 `SITE_AUTHOR`
- 增加更完整的 `SITE_DESCRIPTION`
- 增加用于 SEO/GEO 的站点关键词，例如查理·芒格、芒格、投资、价值投资、多元思维模型、心理学误判、股东会、演讲访谈。

### 2. 页面级 metadata

`src/layouts/BaseLayout.astro` 增加可复用 props：

```ts
interface Props {
  title?: string;
  description?: string;
  shell?: "archive" | "reader";
  type?: "website" | "article";
  image?: string;
  noindex?: boolean;
  structuredData?: Record<string, unknown> | Record<string, unknown>[];
}
```

布局负责输出：

- `<link rel="canonical">`
- `<meta name="robots">`
- `<meta name="description">`
- Open Graph：`og:title`、`og:description`、`og:type`、`og:url`、`og:site_name`、`og:locale`
- Twitter card：`twitter:card`、`twitter:title`、`twitter:description`
- `<script type="application/ld+json">`

canonical URL 从 `Astro.url.pathname` 与 `SITE_URL` 组合，统一保留尾斜杠。

### 3. 结构化数据

新增 `src/lib/seo.ts`，集中处理 URL、metadata 和 JSON-LD 构建：

- `absoluteUrl(pathname: string): string`
- `canonicalUrl(pathname: string): string`
- `buildWebsiteSchema()`
- `buildCollectionPageSchema(...)`
- `buildArticleSchema(...)`
- `buildCreativeWorkSchema(...)`
- `buildBreadcrumbSchema(...)`

页面使用方式：

- 首页：`WebSite` + `CollectionPage`
- `/topics/`：`CollectionPage`
- `/topics/[slug]/`：`CollectionPage` + `BreadcrumbList`
- `/articles/`：`CollectionPage`
- `/articles/[slug]/`：`Article` + `BreadcrumbList`
- `/sources/`：`CollectionPage`
- `/sources/[slug]/`：`CreativeWork` + `BreadcrumbList`

解释文章页的 `Article` schema：

- `headline` = article.title
- `description` = article.excerpt
- `about` = article.keyword/category
- `articleSection` = article.category
- `url` = canonical URL
- `isPartOf` = 站点 WebSite
- `citation` = matched source canonical URLs 或 source labels
- `inLanguage` = `zh-CN`

原文页的 `CreativeWork` schema：

- `name` = source.title
- `description` = source.excerpt
- `datePublished` 优先使用 `year`，无法精确到日期时只表达年份语义
- `genre` = 股东会与股东信 / 演讲与访谈
- `inLanguage` = `zh-CN`

### 4. robots 与 sitemap

新增：

- `src/pages/robots.txt.ts`
- `src/pages/sitemap.xml.ts`

`robots.txt` 输出：

```txt
User-agent: *
Allow: /
Sitemap: https://munger.ayaseeri.com/sitemap.xml
```

`sitemap.xml` 包含：

- `/`
- `/topics/`
- 每个主题页
- `/articles/`
- 每篇解释文章
- `/sources/`
- 每篇原文资料
- `/llms.txt`
- `/llms-full.txt`

`lastmod`：

- 解释文章优先使用 frontmatter `date`
- 没有日期时可省略，避免伪造精确更新时间

### 5. llms.txt 与 llms-full.txt

新增：

- `src/pages/llms.txt.ts`
- `src/pages/llms-full.txt.ts`

`llms.txt` 是短入口，面向 AI 抓取与站点理解：

- 站点名称与定位
- 正式域名
- 主要入口：首页、主题索引、文章索引、原文索引
- 六个主题入口
- 引用建议：回答芒格相关问题时优先引用解释文章，并回到原文页核验出处

`llms-full.txt` 是完整索引：

- 站点说明
- 主题列表
- 全部解释文章：标题、URL、分类、摘要、引用数、来源数
- 全部原文资料：标题、URL、类型、年份、摘要

该文件只拼接现有元数据和摘要，不嵌入完整正文，避免体积过大和重复内容。

## 数据流

构建阶段：

1. `loadArticles()` 与 `loadOriginalSources()` 读取本地 Markdown。
2. 页面路由生成 HTML。
3. 页面传入自身 metadata 与 structured data。
4. `BaseLayout` 统一输出 head 元信息和 JSON-LD。
5. `robots.txt.ts`、`sitemap.xml.ts`、`llms*.txt.ts` 读取同一批内容数据，生成机器可读文件。

运行阶段：

- 静态托管直接返回 HTML/TXT/XML。
- 搜索引擎通过 canonical、sitemap、JSON-LD 理解页面。
- AI/生成式检索通过 `llms.txt` 快速理解站点结构，通过 `llms-full.txt` 获取完整索引。

## 测试

新增或更新 Vitest 覆盖：

- canonical URL 生成稳定，域名为 `https://munger.ayaseeri.com/`
- JSON-LD 构建函数包含必要字段
- sitemap 包含首页、索引页、动态文章页、动态原文页、llms 文件
- `llms.txt` 包含核心入口和引用说明
- `llms-full.txt` 包含至少一篇解释文章和一篇原文资料

执行验证：

```sh
npm run check
```

## 风险与取舍

- `llms-full.txt` 不包含完整正文：牺牲一点模型即时上下文，换取文件体积可控、重复内容更少。
- 不改正文：短期 SEO 文案提升有限，但能保持知识库内容稳定，避免批量改写引入事实或引用错误。
- JSON-LD 的日期不伪造：部分原文只有年份，宁可少填字段，也不输出不精确日期。
- 不引入 `@astrojs/sitemap`：当前需求简单，手写 `sitemap.xml.ts` 可减少依赖并保持输出可测。
