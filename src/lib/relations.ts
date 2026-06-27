import type { TopicDefinition } from "../content/site";
import type { KnowledgeArticle, OriginalSource } from "./corpus";

function sourceLabelMatchesTitle(label: string, title: string): boolean {
  const normalizedLabel = label.replace(/\s+/g, "");
  const normalizedTitle = title.replace(/\s+/g, "");
  const labelWithoutYear = normalizedLabel.replace(/[（(](19|20)\d{2}[）)]/g, "");
  return normalizedTitle.includes(labelWithoutYear) || labelWithoutYear.includes(normalizedTitle);
}

export function articlesForTopic(articles: KnowledgeArticle[], topic: TopicDefinition): KnowledgeArticle[] {
  return articles
    .filter((article) => {
      if (article.category === topic.title) {
        return true;
      }
      return topic.keywords.some((keyword) => article.keyword.includes(keyword) || article.title.includes(keyword));
    })
    .sort((a, b) => b.quoteCount - a.quoteCount || a.title.localeCompare(b.title, "zh-Hans-CN"));
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

export function relatedArticles(article: KnowledgeArticle, articles: KnowledgeArticle[], limit = 4): KnowledgeArticle[] {
  return articles
    .filter((candidate) => candidate.slug !== article.slug && candidate.category === article.category)
    .sort((a, b) => b.quoteCount - a.quoteCount || a.title.localeCompare(b.title, "zh-Hans-CN"))
    .slice(0, limit);
}
