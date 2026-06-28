import { SITE_URL } from "../content/site";

export function GET() {
  return new Response(`User-agent: *\nAllow: /\nSitemap: ${SITE_URL}sitemap.xml\n`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8"
    }
  });
}
