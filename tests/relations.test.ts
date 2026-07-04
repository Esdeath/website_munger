import { describe, expect, it } from "vitest";
import { TOPICS } from "../src/content/site";
import type { KnowledgeArticle, OriginalSource } from "../src/lib/corpus";
import {
  articlesForTopic,
  buildSourceArticleMap,
  relatedArticles,
  sourcesForArticle,
  topicForCategory
} from "../src/lib/relations";

const articles = [
  {
    slug: "能力圈-知道自己不知道什么",
    filePath: "articles/能力圈-知道自己不知道什么.md",
    title: "能力圈:知道自己不知道什么",
    keyword: "能力圈",
    category: "投资原则",
    quoteCount: 16,
    sources: ["每日期刊股东会讲话(2017)"],
    excerpt: "知道边界，比拥有能力更重要。",
    body: "",
    headings: []
  },
  {
    slug: "护城河-宽且不断变宽的护城河",
    filePath: "articles/护城河-宽且不断变宽的护城河.md",
    title: "护城河:宽且不断变宽的护城河",
    keyword: "护城河",
    category: "投资原则",
    quoteCount: 18,
    sources: ["西科金融股东会讲话(2002)"],
    excerpt: "最深的护城河，是每天都在变宽的那条。",
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
    sources: ["每日期刊股东会讲话(2017)"],
    excerpt: "手里只有一把锤子，看什么都像钉子。",
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
    slug: "2002年-西科金融股东会讲话",
    filePath: "shareholders/2002年 西科金融股东会讲话.md",
    title: "2002年 西科金融股东会讲话",
    type: "shareholder",
    year: "2002",
    excerpt: "",
    body: "",
    headings: []
  }
] satisfies OriginalSource[];

describe("articlesForTopic", () => {
  it("keeps the topic list aligned to the articles frontmatter categories", () => {
    expect(TOPICS.map((topic) => topic.title)).toEqual([
      "投资原则",
      "思维方法",
      "思维模型讲义",
      "人性偏误",
      "品格处世",
      "常引用人物",
      "公司案例",
      "学科体系",
      "宏观警示"
    ]);
  });

  it("groups articles into a topic by their exact category", () => {
    const topic = TOPICS.find((item) => item.slug === "investment-principles");
    expect(topic).toBeDefined();
    expect(articlesForTopic(articles, topic!).map((article) => article.keyword)).toEqual(["护城河", "能力圈"]);
  });

  it("does not fold macro warning articles into investment principles", () => {
    const macro = {
      slug: "利率-资产价格的重力",
      filePath: "articles/利率-资产价格的重力.md",
      title: "利率:资产价格的重力",
      keyword: "利率",
      category: "宏观警示",
      quoteCount: 20,
      sources: [],
      excerpt: "",
      body: "",
      headings: []
    } satisfies KnowledgeArticle;
    const investment = TOPICS.find((item) => item.slug === "investment-principles")!;
    const macroWarning = TOPICS.find((item) => item.slug === "macro-warnings")!;

    expect(topicForCategory(macro.category)).toBe("宏观警示");
    expect(articlesForTopic([macro], investment)).toEqual([]);
    expect(articlesForTopic([macro], macroWarning).map((article) => article.keyword)).toEqual(["利率"]);
  });

  it("does not double-count an article in a topic it merely keyword-matches", () => {
    const coke = {
      slug: "可口可乐-定价权的复利机器",
      filePath: "articles/可口可乐-定价权的复利机器.md",
      title: "可口可乐:定价权的复利机器",
      keyword: "可口可乐",
      category: "公司案例",
      quoteCount: 22,
      sources: [],
      excerpt: "",
      body: "",
      headings: []
    } satisfies KnowledgeArticle;
    const investment = TOPICS.find((item) => item.slug === "investment-principles")!;
    const business = TOPICS.find((item) => item.slug === "company-cases")!;
    expect(articlesForTopic([coke], investment)).toEqual([]);
    expect(articlesForTopic([coke], business).map((article) => article.keyword)).toEqual(["可口可乐"]);
  });
});

describe("sourcesForArticle", () => {
  it("matches source labels to source titles", () => {
    expect(sourcesForArticle(articles[0], sources).map((source) => source.title)).toEqual([
      "2017年 每日期刊股东会讲话"
    ]);
  });
});

describe("buildSourceArticleMap", () => {
  it("maps original sources back to articles", () => {
    const map = buildSourceArticleMap(articles, sources);
    expect(map.get("2017年-每日期刊股东会讲话")?.map((article) => article.keyword)).toEqual([
      "能力圈",
      "多元思维模型"
    ]);
  });
});

describe("relatedArticles", () => {
  it("returns same-category articles before unrelated articles", () => {
    expect(relatedArticles(articles[0], articles).map((article) => article.keyword)).toEqual(["护城河"]);
  });
});
