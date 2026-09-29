import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const prerender = true;

const readerPath = resolve(process.cwd(), "output", "munger-qa-book", "芒格问答录.html");

export function GET() {
  const readerHtml = readFileSync(readerPath, "utf8");
  const embeddedCovers = readerHtml.match(/src="data:image\/png;base64,[A-Za-z0-9+/=]+"/g) ?? [];
  if (embeddedCovers.length !== 1) {
    throw new Error(`Expected one embedded book cover, found ${embeddedCovers.length}`);
  }

  const webHtml = readerHtml.replace(
    embeddedCovers[0],
    'src="/books/munger-qa/cover.webp" width="1024" height="1536" fetchpriority="high"'
  );

  return new Response(webHtml, {
    headers: {
      "Content-Type": "text/html; charset=utf-8"
    }
  });
}
