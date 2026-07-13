import fs from "node:fs";
import path from "node:path";
import { extractExcerpt, extractHeadings, type MarkdownHeading } from "./markdown";
import { filePathToSlug } from "./slug";

const ROOT = process.cwd();
const DEFAULT_DIRECTORY = path.join(ROOT, "thinking-grids");
const INDEX_FILE_NAME = "思维格栅.md";
const SUPPORTING_FILE_NAMES = new Set([INDEX_FILE_NAME, "README.md"]);

export interface ThinkingGridDocument {
  slug: string;
  filePath: string;
  title: string;
  excerpt: string;
  body: string;
  headings: MarkdownHeading[];
}

export interface ThinkingGridSnapshot {
  index: ThinkingGridDocument;
  models: ThinkingGridDocument[];
}

function isExternalOrAbsoluteUrl(url: string): boolean {
  return /^(?:[a-z][a-z0-9+.-]*:|\/|#)/i.test(url);
}

function markdownLinks(body: string): string[] {
  return Array.from(body.matchAll(/\[[^\]]+\]\(([^)\s]+)(?:\s+[^)]*)?\)/g), (match) => match[1]);
}

function isModelLink(url: string): boolean {
  return url.endsWith(".md") && !url.startsWith("../") && url !== "README.md";
}

function toDocument(directory: string, fileName: string): ThinkingGridDocument {
  const absolutePath = path.join(directory, fileName);
  const body = fs.readFileSync(absolutePath, "utf8").trim();
  const title = body.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? path.parse(fileName).name;

  return {
    slug: filePathToSlug(fileName),
    filePath: path.relative(ROOT, absolutePath),
    title,
    excerpt: extractExcerpt(body),
    body,
    headings: extractHeadings(body)
  };
}

export function thinkingGridHref(slug: string): string {
  return `/thinking-grids/${slug}/`;
}

export function resolveThinkingGridMarkdownLink(
  url: string,
  snapshot: ThinkingGridSnapshot
): string | null | undefined {
  if (isExternalOrAbsoluteUrl(url) || !url.endsWith(".md")) {
    return undefined;
  }

  const slug = filePathToSlug(path.posix.basename(url));
  return snapshot.models.some((model) => model.slug === slug) ? thinkingGridHref(slug) : null;
}

export function loadThinkingGridSnapshot(directory = DEFAULT_DIRECTORY): ThinkingGridSnapshot {
  if (!fs.existsSync(directory)) {
    throw new Error(`思维格栅快照目录不存在: ${directory}`);
  }

  const fileNames = fs.readdirSync(directory).filter((fileName) => fileName.endsWith(".md"));
  if (!fileNames.includes(INDEX_FILE_NAME)) {
    throw new Error(`思维格栅索引不存在: ${path.join(directory, INDEX_FILE_NAME)}`);
  }

  const index = toDocument(directory, INDEX_FILE_NAME);
  const models = fileNames
    .filter((fileName) => !SUPPORTING_FILE_NAMES.has(fileName))
    .sort((a, b) => a.localeCompare(b, "zh-Hans-CN"))
    .map((fileName) => toDocument(directory, fileName));

  if (models.length === 0) {
    throw new Error(`思维格栅快照没有模型文章: ${directory}`);
  }

  const snapshot = { index, models };
  const missingModels = markdownLinks(index.body).filter(
    (url) => isModelLink(url) && resolveThinkingGridMarkdownLink(url, snapshot) === null
  );
  if (missingModels.length > 0) {
    throw new Error(`思维格栅索引包含不存在的模型链接: ${missingModels.join(", ")}`);
  }

  return snapshot;
}
