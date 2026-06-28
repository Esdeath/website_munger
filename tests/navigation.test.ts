import { describe, expect, it } from "vitest";
import { TOPICS } from "../src/content/site";
import type { KnowledgeArticle, OriginalSource } from "../src/lib/corpus";
import { buildArchiveCards, buildSidebarSections } from "../src/lib/navigation";

const articles = [
  {
    slug: "能力圈-知道自己不知道什么",
    filePath: "articles/能力圈-知道自己不知道什么.md",
    title: "能力圈:知道自己不知道什么",
    keyword: "能力圈",
    category: "投资原则",
    quoteCount: 16,
    sources: [],
    excerpt: "",
    body: "",
    headings: []
  },
  {
    slug: "多元思维模型-把知识挂上格栅",
    filePath: "articles/多元思维模型-把知识挂上格栅.md",
    title: "多元思维模型:把知识挂上格栅",
    keyword: "多元思维模型",
    category: "思维方法",
    quoteCount: 17,
    sources: [],
    excerpt: "",
    body: "",
    headings: []
  }
] satisfies KnowledgeArticle[];

const sources = [
  {
    slug: "2017年-每日期刊股东会讲话",
    filePath: "shareholders/2017年 每日期刊股东会讲话.md",
    title: "2017年 每日期刊股东会讲话",
    type: "shareholder",
    year: "2017",
    excerpt: "",
    body: "",
    headings: []
  },
  {
    slug: "查理芒格-1995年哈佛法学院演讲",
    filePath: "speech/查理芒格：1995年哈佛法学院演讲.md",
    title: "查理芒格：1995年哈佛法学院演讲",
    type: "speech",
    year: "1995",
    excerpt: "",
    body: "",
    headings: []
  }
] satisfies OriginalSource[];

describe("buildSidebarSections", () => {
  it("builds original-source and article sections with counts", () => {
    const sections = buildSidebarSections(articles, sources);

    expect(sections.map((section) => section.title)).toEqual(["原文", "解读"]);
    expect(sections[0].items.map((item) => [item.label, item.count])).toEqual([
      ["股东会与股东信", 1],
      ["演讲与访谈", 1]
    ]);
    expect(sections[1].items.map((item) => item.label)).toContain("投资原则");
  });
});

describe("buildArchiveCards", () => {
  it("turns topics into archive-style cards", () => {
    const cards = buildArchiveCards(TOPICS.slice(0, 2), articles);

    expect(cards).toEqual([
      expect.objectContaining({ mark: "投", title: "投资原则", count: 1 }),
      expect.objectContaining({ mark: "思", title: "思维方法", count: 1 })
    ]);
  });
});
