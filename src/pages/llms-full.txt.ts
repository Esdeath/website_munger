import { TOPICS } from "../content/site";
import { loadArticles, loadOriginalSources } from "../lib/corpus";
import { buildLlmsFullTxt } from "../lib/seo";

export function GET() {
  const text = buildLlmsFullTxt({
    topics: TOPICS,
    articles: loadArticles(),
    sources: loadOriginalSources()
  });

  return new Response(`${text}\n`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8"
    }
  });
}
