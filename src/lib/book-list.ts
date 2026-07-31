import fs from "node:fs";
import path from "node:path";

export type BookStatus = "simplified" | "series" | "traditional" | "untranslated" | "caution";

export interface BookEntry {
  index: number;
  group: string;
  englishTitle: string;
  author: string;
  status: BookStatus;
  statusLabel: string;
  chineseTitle: string | null;
  doubanUrl: string;
  recommendation: string;
  note: string;
}

export interface BookGroupDefinition {
  key: string;
  slug: string;
  title: string;
  description: string;
}

export interface BookGroup {
  definition: BookGroupDefinition;
  books: BookEntry[];
}

const ROOT = process.cwd();
const CONTENT_PATH = "book-list/芒格书单.md";

export const BOOK_GROUP_DEFINITIONS: BookGroupDefinition[] = [
  {
    key: "正式20本",
    slug: "official-20",
    title: "《穷查理宝典》正式书单（20本）",
    description:
      "来自《穷查理宝典》附录中明确标为 Charlie Munger's Recommended Books 的正式书单，证据等级最高。"
  },
  {
    key: "其他明确19项",
    slug: "explicit-19",
    title: "股东会与荐语明确推荐（19项）",
    description: "来自伯克希尔、Wesco、Daily Journal 股东会现场推荐，或芒格明确提供的书籍荐语。"
  },
  {
    key: "强正面评价7项",
    slug: "endorsed-7",
    title: "强正面评价与间接背书（7项）",
    description:
      "芒格曾高度肯定、讨论或间接背书，但证据强度低于正式书单与明确推荐，不应与前39项混为同一等级。"
  }
];

const STATUS_LABELS: Record<BookStatus, string> = {
  simplified: "简体",
  series: "系列部分中译",
  traditional: "繁体",
  untranslated: "无中译本",
  caution: "待核实"
};

export function statusDisplayLabel(status: BookStatus): string {
  return STATUS_LABELS[status];
}

function detectStatus(cell: string): BookStatus {
  if (cell.startsWith("✅")) return "simplified";
  if (cell.startsWith("📚")) return "series";
  if (cell.startsWith("🟨")) return "traditional";
  if (cell.startsWith("⬜")) return "untranslated";
  if (cell.startsWith("⚠")) return "caution";
  throw new Error(`芒格书单:无法识别的版本状态「${cell}」`);
}

// 单元格形如「✅ 简体｜《深奥的简洁》」:全角｜前是状态说明,后是中文书名。
function parseChineseCell(cell: string): {
  status: BookStatus;
  statusLabel: string;
  chineseTitle: string | null;
} {
  const status = detectStatus(cell);
  const [left, ...rest] = cell.split("｜");
  const statusLabel = left.replace(/^[^一-鿿]+/, "").trim();
  const chineseTitle = rest.length > 0 ? rest.join("｜").trim() : null;
  return { status, statusLabel, chineseTitle };
}

function parseDoubanUrl(cell: string): string {
  const match = cell.match(/\[打开豆瓣\]\((.+?)\)/);
  if (!match) {
    throw new Error(`芒格书单:豆瓣列缺少「打开豆瓣」链接:「${cell}」`);
  }
  return match[1];
}

export function parseBookList(markdown: string): BookGroup[] {
  const entries: BookEntry[] = [];

  for (const rawLine of markdown.split("\n")) {
    const line = rawLine.trim();
    if (!line.startsWith("|")) continue;

    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length !== 8 || !/^\d+$/.test(cells[0])) continue;

    const [indexCell, group, englishTitle, author, chineseCell, doubanCell, recommendation, note] = cells;
    const { status, statusLabel, chineseTitle } = parseChineseCell(chineseCell);

    entries.push({
      index: Number(indexCell),
      group,
      englishTitle,
      author,
      status,
      statusLabel,
      chineseTitle,
      doubanUrl: parseDoubanUrl(doubanCell),
      recommendation,
      note
    });
  }

  if (entries.length === 0) {
    throw new Error("芒格书单:未在内容文件中解析出任何书目行");
  }

  const groups = BOOK_GROUP_DEFINITIONS.map((definition) => ({
    definition,
    books: entries.filter((entry) => entry.group === definition.key)
  }));

  const unknown = entries.filter((entry) => !BOOK_GROUP_DEFINITIONS.some((d) => d.key === entry.group));
  if (unknown.length > 0) {
    throw new Error(`芒格书单:未知归类「${unknown[0].group}」(序号 ${unknown[0].index})`);
  }

  return groups;
}

export function loadBookList(): BookGroup[] {
  const markdown = fs.readFileSync(path.join(ROOT, CONTENT_PATH), "utf8");
  return parseBookList(markdown);
}
