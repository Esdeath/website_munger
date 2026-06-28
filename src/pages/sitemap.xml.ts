import { TOPICS } from "../content/site";
import { loadArticles, loadOriginalSources } from "../lib/corpus";
import { buildSitemapEntries, buildSitemapXml } from "../lib/seo";

export function GET() {
  const entries = buildSitemapEntries({
    topics: TOPICS,
    articles: loadArticles(),
    sources: loadOriginalSources()
  });

  return new Response(buildSitemapXml(entries), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8"
    }
  });
}
