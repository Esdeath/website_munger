import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";
import { defaultSchema } from "hast-util-sanitize";
import type { Node } from "unist";
import { visit } from "unist-util-visit";
import { textToSlug } from "./slug";

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

export async function renderMarkdownToHtml(body: string): Promise<string> {
  const rendered = await remark()
    .use(remarkGfm)
    .use(remarkHeadingIds)
    .use(remarkHtml, { sanitize: { ...defaultSchema, clobberPrefix: "" } })
    .process(body);
  return rendered.toString();
}
