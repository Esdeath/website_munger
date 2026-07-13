import fs from "node:fs";
import path from "node:path";
import { extractExcerpt, extractHeadings, parseMarkdownDocument } from "./markdown";
import { SOURCE_DEFINITIONS, type SourceDirectory, type SourceType } from "./source-types";
import { filePathToSlug } from "./slug";

const ROOT = process.cwd();

export interface KnowledgeArticle {
  slug: string;
  filePath: string;
  title: string;
  keyword: string;
  category: string;
  order?: number;
  quoteCount: number;
  sources: string[];
  date?: string;
  excerpt: string;
  body: string;
  headings: ReturnType<typeof extractHeadings>;
}

export interface OriginalSource {
  slug: string;
  filePath: string;
  title: string;
  type: SourceType;
  year: string;
  excerpt: string;
  body: string;
  headings: ReturnType<typeof extractHeadings>;
}

export interface CorpusManifestEntry {
  filePath: string;
  year: string;
  title: string;
  type: string;
  sourceUrl: string;
  status: string;
}

function readMarkdownFiles(directory: "articles" | SourceDirectory): string[] {
  return fs
    .readdirSync(path.join(ROOT, directory))
    .filter((fileName) => fileName.endsWith(".md"))
    .sort((a, b) => a.localeCompare(b, "zh-Hans-CN"))
    .map((fileName) => path.join(directory, fileName));
}

function readRepoFile(filePath: string): string {
  return fs.readFileSync(path.join(ROOT, filePath), "utf8");
}

function stripBackticks(value: string): string {
  return value.trim().replace(/^`|`$/g, "");
}

function inferYear(filePath: string, body: string): string {
  const fromPath = filePath.match(/(19|20)\d{2}/)?.[0];
  if (fromPath) {
    return fromPath;
  }
  const fromBody = body.match(/(19|20)\d{2}/)?.[0];
  return fromBody ?? "未标明";
}

function titleFromMarkdown(filePath: string, body: string): string {
  const heading = body.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (heading) {
    return heading;
  }
  return path.parse(filePath).name;
}

function normalizeDate(value: unknown): string | undefined {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "string") {
    return value;
  }
  return undefined;
}

function isExternalOrAbsoluteUrl(url: string): boolean {
  return /^(?:[a-z][a-z0-9+.-]*:|\/|#)/i.test(url);
}

function rewriteRelativeImagePaths(body: string, filePath: string): string {
  const sourceDirectory = path.posix.dirname(filePath.split(path.sep).join(path.posix.sep));
  return body.replace(/(!\[[^\]]*\]\()([^)\s]+)(\))/g, (match, prefix: string, imagePath: string, suffix: string) => {
    if (isExternalOrAbsoluteUrl(imagePath)) {
      return match;
    }
    const publicPath = path.posix.normalize(path.posix.join("/", sourceDirectory, imagePath));
    return `${prefix}${publicPath}${suffix}`;
  });
}

export function parseCorpusManifest(markdown: string): CorpusManifestEntry[] {
  return markdown
    .split("\n")
    .filter((line) => line.startsWith("| `"))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()))
    .filter((cells) => cells.length === 6)
    .map(([filePath, year, title, type, sourceUrl, status]) => ({
      filePath: stripBackticks(filePath),
      year,
      title,
      type,
      sourceUrl,
      status
    }));
}

export function loadCorpusManifest(): CorpusManifestEntry[] {
  return parseCorpusManifest(readRepoFile("docs/article-production/state/corpus-manifest.md"));
}

export function loadArticles(): KnowledgeArticle[] {
  return readMarkdownFiles("articles").map((filePath) => {
    const parsed = parseMarkdownDocument(filePath, readRepoFile(filePath));
    return {
      slug: filePathToSlug(filePath),
      filePath,
      title: parsed.data.title ?? path.parse(filePath).name,
      keyword: parsed.data.keyword ?? path.parse(filePath).name.split("-")[0],
      category: parsed.data.category ?? "未分类",
      order: typeof parsed.data.order === "number" ? parsed.data.order : undefined,
      quoteCount: parsed.data.quote_count ?? 0,
      sources: parsed.data.sources ?? [],
      date: normalizeDate(parsed.data.date),
      excerpt: extractExcerpt(parsed.body),
      body: parsed.body,
      headings: extractHeadings(parsed.body)
    };
  });
}

export function loadOriginalSources(): OriginalSource[] {
  return SOURCE_DEFINITIONS.flatMap(({ directory, type }) =>
    readMarkdownFiles(directory).map((filePath) => {
      const raw = readRepoFile(filePath);
      const parsed = parseMarkdownDocument(filePath, raw);
      const title = titleFromMarkdown(filePath, parsed.body);
      const body = rewriteRelativeImagePaths(parsed.body, filePath);
      return {
        slug: filePathToSlug(filePath),
        filePath,
        title,
        type,
        year: inferYear(filePath, parsed.body),
        excerpt: extractExcerpt(parsed.body),
        body,
        headings: extractHeadings(parsed.body)
      };
    })
  );
}
