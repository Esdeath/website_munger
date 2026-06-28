import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const root = process.cwd();
const articlesDir = path.join(root, "articles");

const articleFiles = fs
  .readdirSync(articlesDir)
  .filter((fileName) => fileName.endsWith(".md"))
  .sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));

const errors = [];

for (const fileName of articleFiles) {
  const filePath = path.join(articlesDir, fileName);
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = matter(raw);
  const required = ["title", "keyword", "category", "quote_count", "sources"];

  for (const key of required) {
    if (parsed.data[key] === undefined) {
      errors.push(`${path.relative(root, filePath)} missing front matter field: ${key}`);
    }
  }

  if (!Array.isArray(parsed.data.sources) || parsed.data.sources.length === 0) {
    errors.push(`${path.relative(root, filePath)} must include at least one source`);
  }

  if (typeof parsed.data.quote_count !== "number" || parsed.data.quote_count < 1) {
    errors.push(`${path.relative(root, filePath)} must include positive quote_count`);
  }
}

if (articleFiles.length < 70) {
  errors.push(`expected at least 70 articles, found ${articleFiles.length}`);
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Validated ${articleFiles.length} article files.`);
