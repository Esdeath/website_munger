import { TOPICS, type TopicDefinition } from "../content/site";
import type { KnowledgeArticle, OriginalSource } from "./corpus";
import { articlesForTopic, topicForCategory } from "./relations";
import { textToSlug } from "./slug";

export interface SidebarLeaf {
  label: string;
  href: string;
  active: boolean;
}

export interface SidebarGroup {
  label: string;
  count: number;
  open: boolean;
  children: SidebarLeaf[];
}

export interface SidebarSection {
  title: string;
  groups: SidebarGroup[];
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

function normalizePath(path: string): string {
  if (!path) {
    return "/";
  }
  return path.endsWith("/") ? path : `${path}/`;
}

export function categoryHref(category: string): string {
  return `/articles/#${textToSlug(category)}`;
}

function toLeaf(label: string, href: string, currentPath: string): SidebarLeaf {
  return { label, href, active: normalizePath(currentPath) === normalizePath(href) };
}

function makeGroup(label: string, children: SidebarLeaf[]): SidebarGroup {
  return { label, count: children.length, children, open: children.some((leaf) => leaf.active) };
}

export function buildSidebarSections(
  articles: KnowledgeArticle[],
  sources: OriginalSource[],
  currentPath = ""
): SidebarSection[] {
  const sourceGroup = (type: OriginalSource["type"]): SidebarGroup =>
    makeGroup(
      sourceLabels[type],
      sources
        .filter((source) => source.type === type)
        .sort((a, b) => a.year.localeCompare(b.year) || a.title.localeCompare(b.title, "zh-Hans-CN"))
        .map((source) => toLeaf(source.title, `/sources/${source.slug}/`, currentPath))
    );

  const articleGroup = (topicTitle: string): SidebarGroup =>
    makeGroup(
      topicTitle,
      articles
        .filter((article) => topicForCategory(article.category) === topicTitle)
        .sort((a, b) => b.quoteCount - a.quoteCount)
        .map((article) => toLeaf(article.title, `/articles/${article.slug}/`, currentPath))
    );

  const articleGroups = TOPICS.map((topic) => articleGroup(topic.title)).filter((group) => group.count > 0);

  return [
    { title: "原文", groups: [sourceGroup("shareholder"), sourceGroup("speech")] },
    { title: "解读", groups: articleGroups }
  ];
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

export const STOP_DOING_NAV = { label: "不可为清单", href: "/stop-doing/" } as const;
