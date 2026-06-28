import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";
import { defaultSchema } from "hast-util-sanitize";
import type { Node } from "unist";
import { visit } from "unist-util-visit";
import { textToSlug } from "./slug";

export interface KeywordLink {
  keyword: string;
  href: string;
}

export interface RenderMarkdownOptions {
  keywordLinks?: KeywordLink[];
  currentHref?: string;
}

interface MarkdownNode {
  type: string;
  value?: string;
  url?: string;
  children?: MarkdownNode[];
}

function nodeText(node: { value?: unknown; children?: unknown[] }): string {
  if (typeof node.value === "string") {
    return node.value;
  }
  if (Array.isArray(node.children)) {
    return node.children.map((child) => nodeText(child as { value?: unknown; children?: unknown[] })).join("");
  }
  return "";
}

function remarkHeadingIds() {
  return (tree: Node) => {
    visit(tree, "heading", (node) => {
      const text = nodeText(node as { value?: unknown; children?: unknown[] }).trim();
      if (!text) {
        return;
      }

      const headingNode = node as { data?: { hProperties?: Record<string, string> } };
      headingNode.data ??= {};
      headingNode.data.hProperties ??= {};
      headingNode.data.hProperties.id = textToSlug(text);
    });
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildKeywordPattern(keywordLinks: KeywordLink[], currentHref?: string): RegExp | null {
  const keywords = keywordLinks
    .filter((link) => link.href !== currentHref)
    .map((link) => link.keyword.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  if (keywords.length === 0) {
    return null;
  }

  return new RegExp(keywords.map(escapeRegExp).join("|"), "g");
}

function linkKeywordText(value: string, keywordLinks: Map<string, string>, pattern: RegExp): MarkdownNode[] {
  const nodes: MarkdownNode[] = [];
  let lastIndex = 0;

  for (const match of value.matchAll(pattern)) {
    const keyword = match[0];
    const index = match.index ?? 0;
    const href = keywordLinks.get(keyword);
    if (!href) {
      continue;
    }

    if (index > lastIndex) {
      nodes.push({ type: "text", value: value.slice(lastIndex, index) });
    }
    nodes.push({
      type: "link",
      url: href,
      children: [{ type: "text", value: keyword }]
    });
    lastIndex = index + keyword.length;
  }

  if (lastIndex < value.length) {
    nodes.push({ type: "text", value: value.slice(lastIndex) });
  }

  return nodes.length > 0 ? nodes : [{ type: "text", value }];
}

function applyKeywordLinks(node: MarkdownNode, keywordLinks: Map<string, string>, pattern: RegExp, insideLink = false): void {
  if (!node.children || node.children.length === 0) {
    return;
  }

  const nextChildren: MarkdownNode[] = [];
  const childInsideLink = insideLink || node.type === "link";

  for (const child of node.children) {
    if (child.type === "text" && typeof child.value === "string" && !childInsideLink) {
      nextChildren.push(...linkKeywordText(child.value, keywordLinks, pattern));
      continue;
    }

    applyKeywordLinks(child, keywordLinks, pattern, childInsideLink);
    nextChildren.push(child);
  }

  node.children = nextChildren;
}

function remarkKeywordLinks(options: RenderMarkdownOptions) {
  return (tree: Node) => {
    const pattern = buildKeywordPattern(options.keywordLinks ?? [], options.currentHref);
    if (!pattern) {
      return;
    }

    const keywordLinks = new Map(
      (options.keywordLinks ?? [])
        .filter((link) => link.href !== options.currentHref)
        .map((link) => [link.keyword.trim(), link.href] as const)
    );
    applyKeywordLinks(tree as MarkdownNode, keywordLinks, pattern);
  };
}

export async function renderMarkdownToHtml(body: string, options: RenderMarkdownOptions = {}): Promise<string> {
  const processor = remark()
    .use(remarkGfm)
    .use(remarkHeadingIds);

  if (options.keywordLinks?.length) {
    processor.use(remarkKeywordLinks, options);
  }

  const rendered = await processor.use(remarkHtml, { sanitize: { ...defaultSchema, clobberPrefix: "" } }).process(body);
  return rendered.toString();
}
