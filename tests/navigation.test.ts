import { describe, expect, it } from "vitest";
import { TOPICS } from "../src/content/site";
import type { KnowledgeArticle, OriginalSource } from "../src/lib/corpus";
import {
  buildArchiveCards,
  buildSidebarSections,
  SEEKING_WISDOM_NAV,
  STOP_DOING_NAV,
  THINKING_GRID_NAV
} from "../src/lib/navigation";

const articles = [
  {
    slug: "能力圈-知道自己不知道什么",
    filePath: "articles/能力圈-知道自己不知道什么.md",
    title: "能力圈:知道自己不知道什么",
    keyword: "能力圈",
    aliases: [],
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
    aliases: [],
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
  },
  {
    slug: "seeking-wisdom-中文版",
    filePath: "public/sources/seeking-wisdom-中文版/reader.html",
    title: "探索智慧：从达尔文到芒格",
    type: "speech",
    year: "2003",
    excerpt: "",
    body: "",
    headings: [],
    standalone: true
  },
  {
    slug: "李录-2024年北大光华管理学院-价值投资-十周年演讲",
    filePath: "li-lu/李录：2024年北大光华管理学院《价值投资》十周年演讲.md",
    title: "2024年12月7日，著名投资人李录北大演讲全文",
    type: "li-lu",
    year: "2024",
    excerpt: "",
    body: "",
    headings: []
  }
] satisfies OriginalSource[];

describe("buildSidebarSections", () => {
  it("builds original-source and article sections with grouped counts", () => {
    const sections = buildSidebarSections(articles, sources);

    expect(sections.map((section) => section.title)).toEqual(["原文", "解读"]);
    expect(sections[0].groups.map((group) => [group.label, group.count])).toEqual([
      ["股东会与股东信", 1],
      ["演讲与访谈", 1],
      ["李录演讲和访谈", 1]
    ]);
    expect(sections[0].groups[0].children.map((leaf) => leaf.label)).toEqual([
      "2017年 每日期刊股东会讲话"
    ]);
    expect(sections[0].groups[1].children.map((leaf) => leaf.label)).not.toContain("探索智慧：从达尔文到芒格");
    expect(sections[1].groups.map((group) => group.label)).toContain("投资原则");
  });

  it("does not expose a thought-method group after the lecture merge", () => {
    const sections = buildSidebarSections(articles, sources);

    expect(sections[1].groups.map((group) => group.label)).not.toContain("思维方法");
  });

  it("marks the active leaf and opens its parent group", () => {
    const sections = buildSidebarSections(articles, sources, "/sources/查理芒格-1995年哈佛法学院演讲/");

    const speech = sections[0].groups.find((group) => group.label === "演讲与访谈")!;
    expect(speech.open).toBe(true);
    expect(speech.children[0].active).toBe(true);

    const shareholder = sections[0].groups.find((group) => group.label === "股东会与股东信")!;
    expect(shareholder.open).toBe(false);
  });

  it("normalizes trailing slashes when matching the active leaf", () => {
    const open = (path: string) =>
      buildSidebarSections(articles, sources, path)[1].groups.find((group) => group.label === "投资原则")!.open;

    expect(open("/articles/能力圈-知道自己不知道什么/")).toBe(true);
    expect(open("/articles/能力圈-知道自己不知道什么")).toBe(true);
  });

  it("opens the Li Lu group for an active Li Lu source", () => {
    const sections = buildSidebarSections(
      articles,
      sources,
      "/sources/李录-2024年北大光华管理学院-价值投资-十周年演讲/"
    );

    const liLu = sections[0].groups.find((group) => group.label === "李录演讲和访谈")!;
    expect(liLu.open).toBe(true);
    expect(liLu.children[0].active).toBe(true);
  });
});

describe("STOP_DOING_NAV", () => {
  it("is a top-level entry pointing at /stop-doing/", () => {
    expect(STOP_DOING_NAV).toEqual({ label: "不可为清单", href: "/stop-doing/" });
  });
});

describe("THINKING_GRID_NAV", () => {
  it("is a top-level entry pointing at the thinking grid index", () => {
    expect(THINKING_GRID_NAV).toEqual({ label: "思维格栅", href: "/thinking-grids/" });
  });
});

describe("SEEKING_WISDOM_NAV", () => {
  it("is a top-level entry pointing at the embedded reader", () => {
    expect(SEEKING_WISDOM_NAV).toEqual({ label: "探索智慧", href: "/sources/seeking-wisdom-中文版/" });
  });
});

describe("buildArchiveCards", () => {
  it("turns topics into archive-style cards", () => {
    const topics = ["investment-principles", "mental-model-lectures"].map(
      (slug) => TOPICS.find((topic) => topic.slug === slug)!
    );
    const cards = buildArchiveCards(topics, articles);

    expect(cards).toEqual([
      expect.objectContaining({ mark: "投", title: "投资原则", count: 1 }),
      expect.objectContaining({ mark: "思", title: "思维模型讲义", count: 0 })
    ]);
  });
});
