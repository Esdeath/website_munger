import fs from "node:fs";
import path from "node:path";
import { TOPICS, type TopicDefinition } from "../content/site";
import { loadOriginalSources, type OriginalSource } from "./corpus";

export interface StopDoingEntry {
  headline: string;
  quote: string;
  sourceTitle: string;
  sourceYear: string;
  sourceSlug: string | null;
}

export interface StopDoingGroup {
  topic: TopicDefinition;
  entries: StopDoingEntry[];
}

const ROOT = process.cwd();
const CONTENT_PATH = "stop-doing/不可为清单.md";

// 各类引号:CJK 括号 + 中英弯/直引号(与 check_stop_doing.py 对齐)
const QUOTE_CHARS = /[「」『』""''"']/g;

function stripQuoteMarks(value: string): string {
  return value.replace(QUOTE_CHARS, "").trim();
}

// 从 blockquote 文本里拆出引语正文与出处。
// 出处行格式:——《篇名》年份
function splitQuoteAndCitation(lines: string[]): {
  quote: string;
  sourceTitle: string;
  sourceYear: string;
} {
  const joined = lines.join("");
  const dashIndex = joined.lastIndexOf("——");
  const quotePart = dashIndex >= 0 ? joined.slice(0, dashIndex) : joined;
  const citePart = dashIndex >= 0 ? joined.slice(dashIndex + "——".length) : "";

  const quote = stripQuoteMarks(quotePart);

  // 出处:《篇名》年份
  const m = citePart.match(/《(.+?)》\s*((?:19|20)\d{2})?/);
  const sourceTitle = m?.[1]?.trim() ?? citePart.replace(/[《》]/g, "").trim();
  const sourceYear = m?.[2]?.trim() ?? "";

  return { quote, sourceTitle, sourceYear };
}

export function parseStopDoingList(
  markdown: string,
  sources: Pick<OriginalSource, "slug" | "title">[]
): StopDoingGroup[] {
  const lines = markdown.split("\n");
  const groups: StopDoingGroup[] = [];

  let currentTopic: TopicDefinition | null = null;
  let currentEntries: StopDoingEntry[] = [];
  let pendingHeadline: string | null = null;
  let quoteLines: string[] = [];

  const flushEntry = () => {
    if (pendingHeadline !== null && quoteLines.length > 0) {
      const { quote, sourceTitle, sourceYear } = splitQuoteAndCitation(quoteLines);
      currentEntries.push({
        headline: pendingHeadline,
        quote,
        sourceTitle,
        sourceYear,
        sourceSlug: null
      });
    }
    pendingHeadline = null;
    quoteLines = [];
  };

  const flushGroup = () => {
    flushEntry();
    if (currentTopic && currentEntries.length > 0) {
      groups.push({ topic: currentTopic, entries: currentEntries });
    }
    currentEntries = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith("## ")) {
      flushGroup();
      const title = line.slice(3).trim();
      const topic = TOPICS.find((t) => t.title === title);
      if (!topic) {
        throw new Error(`不可为清单:未知主题分组「${title}」(必须等于 site.ts TOPICS 的某个 title)`);
      }
      currentTopic = topic;
    } else if (line.startsWith("### ")) {
      if (currentTopic === null) {
        throw new Error("不可为清单:条目出现在任何主题分组(##)之前");
      }
      flushEntry();
      pendingHeadline = line.slice(4).trim();
    } else if (line.startsWith(">")) {
      quoteLines.push(line.replace(/^>\s?/, "").trim());
    }
  }
  flushGroup();

  return groups;
}

export function loadStopDoingList(): StopDoingGroup[] {
  const markdown = fs.readFileSync(path.join(ROOT, CONTENT_PATH), "utf8");
  const sources = loadOriginalSources().map((s) => ({ slug: s.slug, title: s.title }));
  return parseStopDoingList(markdown, sources);
}
