import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const prerender = true;

const readerPath = resolve(process.cwd(), "output", "munger-qa-book", "芒格问答录.html");

export function GET() {
  return new Response(readFileSync(readerPath, "utf8"), {
    headers: {
      "Content-Type": "text/html; charset=utf-8"
    }
  });
}
