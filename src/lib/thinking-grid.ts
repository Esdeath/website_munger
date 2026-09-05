import fs from "node:fs";
import path from "node:path";
import { extractExcerpt, extractHeadings, type MarkdownHeading } from "./markdown";
import { filePathToSlug } from "./slug";

const ROOT = process.cwd();
const DEFAULT_DIRECTORY = path.join(ROOT, "thinking-grids");
const INDEX_FILE_NAME = "思维格栅.md";
const SUPPORTING_FILE_NAMES = new Set([INDEX_FILE_NAME, "README.md"]);

export const THINKING_GRID_GROUP_COUNT = 7;

export function bodyWithoutExcerpt(body: string): string {
  const withoutTitle = body.replace(/^#\s+.+(?:\r?\n|$)/, "").trimStart();
  const firstParagraphEnd = withoutTitle.search(/\r?\n\s*\r?\n/);

  return firstParagraphEnd === -1 ? "" : withoutTitle.slice(firstParagraphEnd).trim();
}

export interface ThinkingGridDocument {
  slug: string;
  filePath: string;
  title: string;
  excerpt: string;
  body: string;
  headings: MarkdownHeading[];
}

export interface ThinkingGridLayerModel {
  slug: string;
  title: string;
  href: string;
}

export interface ThinkingGridLayer {
  number: number;
  title: string;
  question: string;
  purpose: string;
  models: ThinkingGridLayerModel[];
}

export interface ThinkingGridSnapshot {
  index: ThinkingGridDocument;
  models: ThinkingGridDocument[];
  layers: ThinkingGridLayer[];
}

function isExternalOrAbsoluteUrl(url: string): boolean {
  return /^(?:[a-z][a-z0-9+.-]*:|\/|#)/i.test(url);
}

function markdownLinks(body: string): string[] {
  return Array.from(body.matchAll(/\[[^\]]+\]\(([^)\s]+)(?:\s+[^)]*)?\)/g), (match) => match[1]);
}

function markdownLinkEntries(body: string): Array<{ title: string; url: string }> {
  return Array.from(
    body.matchAll(/\[([^\]]+)\]\(([^)\s]+)(?:\s+[^)]*)?\)/g),
    (match) => ({ title: match[1], url: match[2] })
  );
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
  snapshot: Pick<ThinkingGridSnapshot, "models">
): string | null | undefined {
  if (isExternalOrAbsoluteUrl(url) || !url.endsWith(".md")) {
    return undefined;
  }

  const slug = filePathToSlug(path.posix.basename(url));
  return snapshot.models.some((model) => model.slug === slug) ? thinkingGridHref(slug) : null;
}

function parseThinkingGridLayers(body: string, models: ThinkingGridDocument[]): ThinkingGridLayer[] {
  const modelBySlug = new Map(models.map((model) => [model.slug, model]));
  const sections = Array.from(body.matchAll(/^##[ \t]+(.+)\n([\s\S]*?)(?=^##[ \t]+|$(?![\s\S]))/gm))
    .filter((match) => !["7 组导航", "使用顺序"].includes(match[1]))
    .map((match) => ({ title: match[1], body: match[2] }));

  if (sections.length !== THINKING_GRID_GROUP_COUNT) {
    throw new Error(
      `思维格栅索引应包含 ${THINKING_GRID_GROUP_COUNT} 组，实际解析到 ${sections.length} 组`
    );
  }

  const layers = sections.map((section, index) => {
    const question = section.body.match(/^先问：\s*(.+)$/m)?.[1]?.trim();
    const purpose = section.body.match(/^用途：\s*(.+)$/m)?.[1]?.trim();
    const layerModels = markdownLinkEntries(section.body)
      .filter((link) => isModelLink(link.url))
      .map((link) => {
        const slug = filePathToSlug(path.posix.basename(link.url));
        if (!modelBySlug.has(slug)) {
          throw new Error(`思维格栅组“${section.title}”包含不存在的模型链接: ${link.url}`);
        }

        return { slug, title: link.title, href: thinkingGridHref(slug) };
      });

    if (!question || !purpose || layerModels.length === 0) {
      throw new Error(`思维格栅组“${section.title}”缺少先问、用途或模型链接`);
    }

    return {
      number: index + 1,
      title: section.title,
      question,
      purpose,
      models: layerModels
    };
  });

  const modelSlugs = layers.flatMap((layer) => layer.models.map((model) => model.slug));
  if (new Set(modelSlugs).size !== modelSlugs.length) {
    throw new Error("思维格栅索引包含重复的模型链接");
  }
  if (modelSlugs.length !== models.length) {
    throw new Error(`思维格栅索引包含 ${modelSlugs.length} 个模型链接，应为 ${models.length} 个`);
  }

  return layers;
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

  return { ...snapshot, layers: parseThinkingGridLayers(index.body, models) };
}
