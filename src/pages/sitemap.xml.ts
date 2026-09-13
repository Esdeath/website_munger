import { TOPICS } from "../content/site";
import { loadSiteCorpus } from "../lib/corpus";
import { buildSitemapEntries, buildSitemapXml } from "../lib/seo";

export function GET() {
  const { articles, sources } = loadSiteCorpus();
  const entries = buildSitemapEntries({
    topics: TOPICS,
    articles,
    sources
  });

  return new Response(buildSitemapXml(entries), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8"
    }
  });
}
