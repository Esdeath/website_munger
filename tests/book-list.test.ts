import { describe, expect, it } from "vitest";
import { BOOK_GROUP_DEFINITIONS, loadBookList, parseBookList, statusDisplayLabel } from "../src/lib/book-list";

const SAMPLE = `
| 序号 | 归类 | 英文原名 | 作者 | 中文版与状态 | 豆瓣 | 芒格推荐出处／归类 | 核对说明 |
|---:|---|---|---|---|---|---|---|
| 1 | 正式20本 | Deep Simplicity | John Gribbin | ✅ 简体｜《深奥的简洁》 | [打开豆瓣](https://book.douban.com/subject/34910866/) | 《穷查理宝典》附录正式书单 | 江苏凤凰文艺出版社2019版。 |
| 2 | 正式20本 | Andrew Carnegie | Joseph Frazier Wall | ⚠️ 未找到对应中译本或独立豆瓣条目 | [打开豆瓣](https://search.douban.com/book/subject_search?search_text=Andrew%20Carnegie) | 《穷查理宝典》附录正式书单 | 链接为豆瓣站内检索。 |
| 3 | 其他明确19项 | The Years of Lyndon Johnson（系列） | Robert A. Caro | 📚 系列部分中译｜《权力之路：林登·约翰逊传 Vol.1》 | [打开豆瓣](https://book.douban.com/subject/30141311/) | 2004年Wesco股东会 | 按整套系列计1项。 |
| 4 | 强正面评价7项 | In the Plex | Steven Levy | 🟨 繁体｜《Google總部大揭密》 | [打开豆瓣](https://book.douban.com/subject/6963066/) | 公开谈话中的正面评价 | 未找到正式简体中文版。 |
| 5 | 强正面评价7项 | Darwin's Blind Spot | Frank Ryan | ⬜ 无中译本｜《达尔文的盲点》（暂译） | [打开豆瓣](https://book.douban.com/subject/2857898/) | 《穷查理宝典》扩展阅读语境 | 链接为英文原版。 |
`;

describe("parseBookList", () => {
  const groups = parseBookList(SAMPLE);

  it("groups entries by 归类 in definition order", () => {
    expect(groups.map((group) => group.definition.key)).toEqual([
      "正式20本",
      "其他明确19项",
      "强正面评价7项"
    ]);
    expect(groups.map((group) => group.books.length)).toEqual([2, 1, 2]);
  });

  it("parses title, author, douban url and notes from table cells", () => {
    const first = groups[0].books[0];
    expect(first.index).toBe(1);
    expect(first.englishTitle).toBe("Deep Simplicity");
    expect(first.author).toBe("John Gribbin");
    expect(first.chineseTitle).toBe("《深奥的简洁》");
    expect(first.doubanUrl).toBe("https://book.douban.com/subject/34910866/");
    expect(first.recommendation).toBe("《穷查理宝典》附录正式书单");
    expect(first.note).toBe("江苏凤凰文艺出版社2019版。");
  });

  it("detects the five version statuses", () => {
    const statuses = groups.flatMap((group) => group.books).map((book) => book.status);
    expect(statuses).toEqual(["simplified", "caution", "series", "traditional", "untranslated"]);
  });

  it("keeps the status label and leaves chineseTitle null when the cell has no title", () => {
    const carnegie = groups[0].books[1];
    expect(carnegie.chineseTitle).toBeNull();
    expect(carnegie.statusLabel).toBe("未找到对应中译本或独立豆瓣条目");
  });

  it("throws on markdown without book rows", () => {
    expect(() => parseBookList("# 空文件")).toThrow(/未在内容文件中解析出任何书目行/);
  });
});

describe("loadBookList", () => {
  const groups = loadBookList();

  it("loads all 46 entries split 20/19/7", () => {
    expect(groups.map((group) => group.books.length)).toEqual([20, 19, 7]);
  });

  it("gives every entry a douban link and recommendation source", () => {
    for (const book of groups.flatMap((group) => group.books)) {
      expect(book.doubanUrl).toMatch(/^https:\/\/(book|search)\.douban\.com\//);
      expect(book.recommendation.length).toBeGreaterThan(0);
    }
  });
});

describe("statusDisplayLabel", () => {
  it("maps every status to a Chinese label", () => {
    expect(statusDisplayLabel("simplified")).toBe("简体");
    expect(statusDisplayLabel("caution")).toBe("待核实");
  });
});

describe("BOOK_GROUP_DEFINITIONS", () => {
  it("exposes stable anchor slugs", () => {
    expect(BOOK_GROUP_DEFINITIONS.map((definition) => definition.slug)).toEqual([
      "official-20",
      "explicit-19",
      "endorsed-7"
    ]);
  });
});
