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
});
