import type { TopicDefinition } from "../content/site";
import type { KnowledgeArticle, OriginalSource } from "./corpus";
import { articlesForTopic } from "./relations";
import { textToSlug } from "./slug";

export interface SidebarItem {
  label: string;
  href: string;
  count: number;
  active?: boolean;
}

export interface SidebarSection {
  title: string;
  items: SidebarItem[];
}

export interface ArchiveCard {
  mark: string;
  title: string;
  description: string;
  href: string;
  count: number;
}

const sourceLabels = {
  shareholder: "股东会与股东信",
  speech: "演讲与访谈"
} as const;

function countSourcesByType(sources: OriginalSource[], type: OriginalSource["type"]): number {
  return sources.filter((source) => source.type === type).length;
}

export function categoryHref(category: string): string {
  return `/articles/#${textToSlug(category)}`;
}

export function buildSidebarSections(
  articles: KnowledgeArticle[],
  sources: OriginalSource[],
  activeHref?: string
): SidebarSection[] {
  const sections: SidebarSection[] = [
    {
      title: "原文",
      items: [
        {
          label: sourceLabels.shareholder,
          href: "/sources/#shareholder",
          count: countSourcesByType(sources, "shareholder")
        },
        {
          label: sourceLabels.speech,
          href: "/sources/#speech",
          count: countSourcesByType(sources, "speech")
        }
      ]
    },
    {
      title: "解读",
      items: Array.from(new Map(articles.map((article) => [article.category, article])).keys())
        .sort((a, b) => a.localeCompare(b, "zh-Hans-CN"))
        .map((category) => {
          const href = categoryHref(category);
          return {
            label: category,
            href,
            count: articles.filter((article) => article.category === category).length,
            active: activeHref === href
          };
        })
    }
  ];

  return sections.map((section) => ({
    ...section,
    items: section.items.map((item) => ({ ...item, active: item.active || activeHref === item.href }))
  }));
}

export function buildArchiveCards(topics: TopicDefinition[], articles: KnowledgeArticle[]): ArchiveCard[] {
  return topics.map((topic) => ({
    mark: topic.title.slice(0, 1),
    title: topic.title,
    description: topic.description,
    href: `/topics/${topic.slug}/`,
    count: articlesForTopic(articles, topic).length
  }));
}
