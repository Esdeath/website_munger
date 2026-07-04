import matter from "gray-matter";
import { textToSlug } from "./slug";

export interface ArticleFrontMatter {
  title?: string;
  keyword?: string;
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

export function parseMarkdownDocument(filePath: string, raw: string): ParsedMarkdownDocument {
  const parsed = matter(raw);
  return {
    filePath,
    data: parsed.data as ArticleFrontMatter,
    body: parsed.content.trim()
  };
}

export function extractHeadings(body: string): MarkdownHeading[] {
  return body
    .split("\n")
    .map((line) => line.match(/^(#{2,3})\s+(.+)$/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => {
      const text = match[2].trim();
      return {
        depth: match[1].length,
        text,
        slug: textToSlug(text)
      };
    });
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
