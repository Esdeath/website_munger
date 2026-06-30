import { describe, expect, it } from "vitest";
import { parseStopDoingList } from "../src/lib/stop-doing";

const noSources: { slug: string; title: string }[] = [];

describe("parseStopDoingList", () => {
  it("parses one topic with one entry", () => {
    const md = [
      "## 投资原则",
      "",
      "### 不要因为喜欢活动就去活动",
      "> 「我们不是因为喜欢活动而活动，我们喜欢的是赚钱。」",
      "> ——《2014年 每日期刊股东会讲话》2014",
      ""
    ].join("\n");

    const groups = parseStopDoingList(md, noSources);

    expect(groups).toHaveLength(1);
    expect(groups[0].topic.title).toBe("投资原则");
    expect(groups[0].topic.slug).toBe("investment-principles");
    expect(groups[0].entries).toHaveLength(1);
    expect(groups[0].entries[0]).toEqual({
      headline: "不要因为喜欢活动就去活动",
      quote: "我们不是因为喜欢活动而活动，我们喜欢的是赚钱。",
      sourceTitle: "2014年 每日期刊股东会讲话",
      sourceYear: "2014",
      sourceSlug: null
    });
  });

  it("keeps an em-dash (——) inside the quote body intact", () => {
    const md = [
      "## 投资原则",
      "### 不要被花言巧语骗了",
      "> 「我反对——强烈反对——这种做法。」",
      "> ——《2014年 每日期刊股东会讲话》2014"
    ].join("\n");
    const [group] = parseStopDoingList(md, []);
    expect(group.entries[0].quote).toBe("我反对——强烈反对——这种做法。");
    expect(group.entries[0].sourceTitle).toBe("2014年 每日期刊股东会讲话");
    expect(group.entries[0].sourceYear).toBe("2014");
  });

  it("joins a quote that wraps across two blockquote lines without inserting spaces", () => {
    const md = [
      "## 投资原则",
      "### 不要急",
      "> 「前半段",
      "> 后半段。」",
      "> ——《2014年 每日期刊股东会讲话》2014"
    ].join("\n");
    const [group] = parseStopDoingList(md, []);
    expect(group.entries[0].quote).toBe("前半段后半段。");
  });

  it("throws when an entry appears before any topic heading", () => {
    const md = ["### 不要乱来", "> 「随便。」", "> ——《某篇》2000"].join("\n");
    expect(() => parseStopDoingList(md, [])).toThrow(/主题分组/);
  });

  const sources = [
    { slug: "2014年-每日期刊股东会讲话", title: "2014年 每日期刊股东会讲话" },
    { slug: "查理芒格-1995年哈佛法学院演讲", title: "查理芒格：1995年哈佛法学院演讲" }
  ];

  it("resolves sourceSlug by matching the citation title against sources", () => {
    const md = [
      "## 投资原则",
      "### 不要因为喜欢活动就去活动",
      "> 「我们不是因为喜欢活动而活动，我们喜欢的是赚钱。」",
      "> ——《2014年 每日期刊股东会讲话》2014"
    ].join("\n");
    const [group] = parseStopDoingList(md, sources);
    expect(group.entries[0].sourceSlug).toBe("2014年-每日期刊股东会讲话");
  });

  it("leaves sourceSlug null when no source matches", () => {
    const md = [
      "## 投资原则",
      "### 不要乱来",
      "> 「这是一句不存在出处的话。」",
      "> ——《某篇并不存在的演讲》1999"
    ].join("\n");
    const [group] = parseStopDoingList(md, sources);
    expect(group.entries[0].sourceSlug).toBeNull();
  });

  it("parses multiple topics and entries, ordering groups by TOPICS order", () => {
    // 文件内「人性偏误」在前、「投资原则」在后；
    // 但 TOPICS 中「投资原则」先于「人性偏误」，故输出按 TOPICS 顺序。
    const md = [
      "## 人性偏误",
      "### 不要低估激励机制",
      "> 「永远别低估激励机制的力量。」",
      "> ——《查理芒格：1995年哈佛法学院演讲》1995",
      "",
      "## 投资原则",
      "### 不要因为喜欢活动就去活动",
      "> 「我们不是因为喜欢活动而活动，我们喜欢的是赚钱。」",
      "> ——《2014年 每日期刊股东会讲话》2014",
      "### 不要追逐自己看不懂的机会",
      "> 「我们喜欢的是赚钱。」",
      "> ——《2014年 每日期刊股东会讲话》2014"
    ].join("\n");
    const groups = parseStopDoingList(md, sources);
    expect(groups.map((g) => g.topic.title)).toEqual(["投资原则", "人性偏误"]);
    expect(groups[0].entries.map((e) => e.headline)).toEqual([
      "不要因为喜欢活动就去活动",
      "不要追逐自己看不懂的机会"
    ]);
  });
});
