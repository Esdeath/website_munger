import { TOPICS } from "../content/site";
import { loadSiteCorpus } from "../lib/corpus";
import { buildLlmsTxt } from "../lib/seo";

export function GET() {
  const { articles, sources } = loadSiteCorpus();
  const text = buildLlmsTxt({
    topics: TOPICS,
    articleCount: articles.length,
    sourceCount: sources.length
  });

  return new Response(`${text}\n`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8"
    }
  });
}
