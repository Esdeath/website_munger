import matter from "gray-matter";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import type { Node } from "unist";
import { visit } from "unist-util-visit";
import { textToSlug } from "./slug";

export interface ArticleFrontMatter {
  title?: string;
  keyword?: string;
  aliases?: string[];
  category?: string;
  order?: number;
  quote_count?: number;
  sources?: string[];
  date?: string;
}

export interface ParsedMarkdownDocument {
  filePath: string;
  data: ArticleFrontMatter;
  body: string;
}

export interface MarkdownHeading {
  depth: number;
  text: string;
  slug: string;
}

export function markdownNodeText(node: { value?: unknown; children?: unknown[] }): string {
  if (typeof node.value === "string") {
    return node.value;
  }
  if (Array.isArray(node.children)) {
    return node.children.map((child) => markdownNodeText(child as { value?: unknown; children?: unknown[] })).join("");
  }
  return "";
}

export function parseMarkdownDocument(filePath: string, raw: string): ParsedMarkdownDocument {
  const parsed = matter(raw);
  return {
    filePath,
    data: parsed.data as ArticleFrontMatter,
    body: parsed.content.trim()
  };
}

export function extractHeadings(body: string): MarkdownHeading[] {
  const headings: MarkdownHeading[] = [];
  const tree = remark().use(remarkGfm).parse(body);

  visit(tree as Node, "heading", (node) => {
    const heading = node as { depth?: number; value?: unknown; children?: unknown[] };
    if (heading.depth !== 2 && heading.depth !== 3) {
      return;
    }

    const text = markdownNodeText(heading).trim();
    if (text) {
      headings.push({ depth: heading.depth, text, slug: textToSlug(text) });
    }
  });

  return headings;
}

export function extractExcerpt(body: string, maxLength = 96): string {
  const paragraph =
    body
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .find((block) => block && !block.startsWith("#") && !block.startsWith(">")) ?? "";

  const singleLine = paragraph.replace(/\s+/g, " ");
  if (singleLine.length <= maxLength) {
    return singleLine;
  }
  return `${singleLine.slice(0, maxLength).replace(/[，。；、\s]+$/u, "")}...`;
}
