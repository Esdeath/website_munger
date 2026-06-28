import { TOPICS } from "../content/site";
import { loadArticles, loadOriginalSources } from "../lib/corpus";
import { buildLlmsTxt } from "../lib/seo";

export function GET() {
  const text = buildLlmsTxt({
    topics: TOPICS,
    articleCount: loadArticles().length,
    sourceCount: loadOriginalSources().length
  });

  return new Response(`${text}\n`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8"
    }
  });
}
