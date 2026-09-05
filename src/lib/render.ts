import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";
import { defaultSchema } from "hast-util-sanitize";
import type { Node } from "unist";
import { visit } from "unist-util-visit";
import { markdownNodeText } from "./markdown";
import { textToSlug } from "./slug";

export interface KeywordLink {
  keyword: string;
  href: string;
}

export interface RenderMarkdownOptions {
  keywordLinks?: KeywordLink[];
  currentHref?: string;
  relativeLinkResolver?: (url: string) => string | null | undefined;
  /** Resolve `[[模型名]]` / `[[模型名|显示文字]]` through relativeLinkResolver. */
  wikiLinks?: boolean;
}

interface MarkdownNode {
  type: string;
  value?: string;
  url?: string;
  children?: MarkdownNode[];
}

function remarkHeadingIds() {
  return (tree: Node) => {
    visit(tree, "heading", (node) => {
      const text = markdownNodeText(node as { value?: unknown; children?: unknown[] }).trim();
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

function repairLiteralStrongMarkers(node: MarkdownNode): void {
  if (!node.children?.length) {
    return;
  }

  const nextChildren: MarkdownNode[] = [];

  for (const child of node.children) {
    if (child.type === "text" && typeof child.value === "string" && child.value.includes("**")) {
      const repaired: MarkdownNode[] = [];
      let lastIndex = 0;

      for (const match of child.value.matchAll(/\*\*([^*\n]+?)\*\*/g)) {
        const index = match.index ?? 0;
        if (index > lastIndex) {
          repaired.push({ type: "text", value: child.value.slice(lastIndex, index) });
        }
        repaired.push({
          type: "strong",
          children: [{ type: "text", value: match[1] }]
        });
        lastIndex = index + match[0].length;
      }

      if (lastIndex > 0) {
        if (lastIndex < child.value.length) {
          repaired.push({ type: "text", value: child.value.slice(lastIndex) });
        }
        nextChildren.push(...repaired);
        continue;
      }
    }

    repairLiteralStrongMarkers(child);
    nextChildren.push(child);
  }

  node.children = nextChildren;
}

function remarkLiteralStrongMarkers() {
  return (tree: Node) => repairLiteralStrongMarkers(tree as MarkdownNode);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function resolveKeywordLinks(keywordLinks: KeywordLink[], currentHref?: string): Map<string, string> {
  const resolved = new Map<string, string>();

  for (const link of keywordLinks) {
    const keyword = link.keyword.trim();
    if (keyword && !resolved.has(keyword)) {
      resolved.set(keyword, link.href);
    }
  }

  for (const [keyword, href] of resolved) {
    if (href === currentHref) {
      resolved.delete(keyword);
    }
  }

  return resolved;
}

function buildKeywordPattern(keywordLinks: Map<string, string>): RegExp | null {
  const keywords = [...keywordLinks.keys()].sort((a, b) => b.length - a.length);

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
    const keywordLinks = resolveKeywordLinks(options.keywordLinks ?? [], options.currentHref);
    const pattern = buildKeywordPattern(keywordLinks);
    if (!pattern) {
      return;
    }
    applyKeywordLinks(tree as MarkdownNode, keywordLinks, pattern);
  };
}

function remarkRelativeLinks(resolve: NonNullable<RenderMarkdownOptions["relativeLinkResolver"]>) {
  return (tree: Node) => {
    visit(tree, "link", (node) => {
      const link = node as MarkdownNode;
      const resolved = resolve(link.url ?? "");
      if (resolved === undefined) {
        return;
      }
      if (resolved === null) {
        link.type = "text";
        link.value = markdownNodeText(link);
        delete link.url;
        delete link.children;
        return;
      }
      link.url = resolved;
    });
  };
}

const WIKI_LINK_PATTERN = /\[\[([^\]|\n]+?)(?:\|([^\]\n]+?))?\]\]/g;

function wikiLinkNodes(
  value: string,
  resolve: NonNullable<RenderMarkdownOptions["relativeLinkResolver"]>
): MarkdownNode[] {
  const nodes: MarkdownNode[] = [];
  let lastIndex = 0;

  for (const match of value.matchAll(WIKI_LINK_PATTERN)) {
    const index = match.index ?? 0;
    const target = match[1].trim();
    const label = (match[2] ?? match[1]).trim();

    if (index > lastIndex) {
      nodes.push({ type: "text", value: value.slice(lastIndex, index) });
    }

    const href = resolve(`${target}.md`);
    nodes.push(
      typeof href === "string"
        ? { type: "link", url: href, children: [{ type: "text", value: label }] }
        : { type: "text", value: label }
    );
    lastIndex = index + match[0].length;
  }

  if (nodes.length === 0) {
    return [{ type: "text", value }];
  }
  if (lastIndex < value.length) {
    nodes.push({ type: "text", value: value.slice(lastIndex) });
  }

  return nodes;
}

function applyWikiLinks(
  node: MarkdownNode,
  resolve: NonNullable<RenderMarkdownOptions["relativeLinkResolver"]>,
  insideLink = false
): void {
  if (!node.children?.length) {
    return;
  }

  const nextChildren: MarkdownNode[] = [];
  const childInsideLink = insideLink || node.type === "link";

  for (const child of node.children) {
    if (child.type === "text" && typeof child.value === "string" && child.value.includes("[[")) {
      if (childInsideLink) {
        child.value = child.value.replace(WIKI_LINK_PATTERN, (_, target: string, label?: string) =>
          (label ?? target).trim()
        );
      } else {
        nextChildren.push(...wikiLinkNodes(child.value, resolve));
        continue;
      }
    }

    applyWikiLinks(child, resolve, childInsideLink);
    nextChildren.push(child);
  }

  node.children = nextChildren;
}

function remarkWikiLinks(resolve: NonNullable<RenderMarkdownOptions["relativeLinkResolver"]>) {
  return (tree: Node) => applyWikiLinks(tree as MarkdownNode, resolve);
}

export async function renderMarkdownToHtml(body: string, options: RenderMarkdownOptions = {}): Promise<string> {
  const processor = remark()
    .use(remarkGfm)
    .use(remarkLiteralStrongMarkers)
    .use(remarkHeadingIds);

  if (options.relativeLinkResolver) {
    processor.use(remarkRelativeLinks, options.relativeLinkResolver);
    if (options.wikiLinks) {
      processor.use(remarkWikiLinks, options.relativeLinkResolver);
    }
  }

  if (options.keywordLinks?.length) {
    processor.use(remarkKeywordLinks, options);
  }

  const rendered = await processor.use(remarkHtml, { sanitize: { ...defaultSchema, clobberPrefix: "" } }).process(body);
  return rendered.toString();
}
