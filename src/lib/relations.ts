import type { TopicDefinition } from "../content/site";
import type { KnowledgeArticle, OriginalSource } from "./corpus";

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
  const claimedKeywords = new Set<string>();

  return [...articles]
    .sort(compareArticlesForDisplay)
    .filter((article) => {
      const keywords = articleKeywords(article);
      const match = keywords.find((keyword) => source.body.includes(keyword) && !claimedKeywords.has(keyword));
      if (!match) {
        return false;
      }
      keywords.forEach((keyword) => claimedKeywords.add(keyword));
      return true;
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
