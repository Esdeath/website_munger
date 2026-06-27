import path from "node:path";

const punctuationPattern = /[：:《》“”"'.?!！？，,、/\\|()[\]{}]+/g;
const whitespacePattern = /\s+/g;
const repeatedDashPattern = /-+/g;

export function textToSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(punctuationPattern, "-")
    .replace(whitespacePattern, "-")
    .replace(repeatedDashPattern, "-")
    .replace(/^-|-$/g, "");
}

export function filePathToSlug(filePath: string): string {
  const parsed = path.parse(filePath);
  return textToSlug(parsed.name);
}
