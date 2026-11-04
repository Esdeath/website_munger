import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const prerender = true;

const readerPath = resolve(process.cwd(), "output", "munger-qa-book", "芒格问答录.html");

export function GET() {
  const readerHtml = readFileSync(readerPath, "utf8");
  const embeddedCovers = readerHtml.match(/class="cover-image" src="data:image\/png;base64,[A-Za-z0-9+/=]+"/g) ?? [];
  if (embeddedCovers.length !== 1) {
    throw new Error(`Expected one embedded book cover, found ${embeddedCovers.length}`);
  }

  // 封面上的作者微信二维码改用站点已有的 /images/wechat-qr.png，网页版不内联任何 data URI 图片
  const webHtml = readerHtml
    .replace(
      embeddedCovers[0],
      'class="cover-image" src="/books/munger-qa/cover.webp" width="1024" height="1536" fetchpriority="high"'
    )
    .replace(/class="cover-qr" src="data:image\/png;base64,[A-Za-z0-9+/=]+"/g, 'class="cover-qr" src="/images/wechat-qr.png"');

  return new Response(webHtml, {
    headers: {
      "Content-Type": "text/html; charset=utf-8"
    }
  });
}
