import type { TopicDefinition } from "../content/site";
import type { KnowledgeArticle, OriginalSource } from "./corpus";
import type { KeywordLink } from "./render";

export function topicForCategory(category: string): string {
  return category;
}

export function articleKeywords(article: KnowledgeArticle): string[] {
  return [...new Set([article.keyword, ...article.aliases].map((keyword) => keyword.trim()).filter(Boolean))];
}

function sourceLabelMatchesTitle(label: string, title: string): boolean {
  const normalizedLabel = label.replace(/\s+/g, "");
  const normalizedTitle = title.replace(/\s+/g, "");
  const labelWithoutYear = normalizedLabel.replace(/[（(](19|20)\d{2}[）)]/g, "");
  return normalizedTitle.includes(labelWithoutYear) || labelWithoutYear.includes(normalizedTitle);
}

export function articlesForTopic(articles: KnowledgeArticle[], topic: TopicDefinition): KnowledgeArticle[] {
  return articles
    .filter((article) => topicForCategory(article.category) === topic.title)
    .sort(compareArticlesForDisplay);
}

export function compareArticlesForDisplay(a: KnowledgeArticle, b: KnowledgeArticle): number {
  if (a.order !== undefined || b.order !== undefined) {
    return (
      (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER) ||
      a.title.localeCompare(b.title, "zh-Hans-CN")
    );
  }
  return b.quoteCount - a.quoteCount || a.title.localeCompare(b.title, "zh-Hans-CN");
}

export function keywordLinksForArticles(articles: KnowledgeArticle[]): KeywordLink[] {
  const orderedArticles = [...articles].sort(compareArticlesForDisplay);
  const primaryOwners = new Map<string, string>();

  for (const article of orderedArticles) {
    const keyword = article.keyword.trim();
    if (keyword && !primaryOwners.has(keyword)) {
      primaryOwners.set(keyword, `/articles/${article.slug}/`);
    }
  }

  const owners = new Map(primaryOwners);
  for (const article of orderedArticles) {
    const href = `/articles/${article.slug}/`;
    for (const alias of article.aliases) {
      const keyword = alias.trim();
      if (keyword && !primaryOwners.has(keyword) && !owners.has(keyword)) {
        owners.set(keyword, href);
      }
    }
  }

  return [...owners].map(([keyword, href]) => ({ keyword, href }));
}

export function sourcesForArticle(article: KnowledgeArticle, sources: OriginalSource[]): OriginalSource[] {
  return sources
    .filter((source) => article.sources.some((sourceLabel) => sourceLabelMatchesTitle(sourceLabel, source.title)))
    .sort((a, b) => a.year.localeCompare(b.year) || a.title.localeCompare(b.title, "zh-Hans-CN"));
}

export function buildSourceArticleMap(
  articles: KnowledgeArticle[],
  sources: OriginalSource[]
): Map<string, KnowledgeArticle[]> {
  return new Map(
    sources.map((source) => [
      source.slug,
      articles.filter((article) =>
        article.sources.some((sourceLabel) => sourceLabelMatchesTitle(sourceLabel, source.title))
      )
    ])
  );
}

export function mentionedArticlesForSource(
  source: OriginalSource,
  articles: KnowledgeArticle[]
): KnowledgeArticle[] {
  const keywordsByHref = new Map<string, string[]>();
  for (const { keyword, href } of keywordLinksForArticles(articles)) {
    const keywords = keywordsByHref.get(href) ?? [];
    keywords.push(keyword);
    keywordsByHref.set(href, keywords);
  }

  const matchedHrefs = new Set<string>();
  return [...articles].sort(compareArticlesForDisplay).filter((article) => {
    const href = `/articles/${article.slug}/`;
    if (matchedHrefs.has(href)) {
      return false;
    }
    const matched = keywordsByHref.get(href)?.some((keyword) => source.body.includes(keyword)) ?? false;
    if (matched) {
      matchedHrefs.add(href);
    }
    return matched;
  });
}

export function sameYearSources(
  source: OriginalSource,
  sources: OriginalSource[],
  limit = 8
): OriginalSource[] {
  return sources
    .filter(
      (candidate) =>
        candidate.slug !== source.slug && candidate.type === source.type && candidate.year === source.year
    )
    .sort((a, b) => a.title.localeCompare(b.title, "zh-Hans-CN"))
    .slice(0, limit);
}

export function relatedArticles(article: KnowledgeArticle, articles: KnowledgeArticle[], limit = 4): KnowledgeArticle[] {
  return articles
    .filter((candidate) => candidate.slug !== article.slug && candidate.category === article.category)
    .sort(compareArticlesForDisplay)
    .slice(0, limit);
}
