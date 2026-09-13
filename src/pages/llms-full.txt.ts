import { TOPICS } from "../content/site";
import { loadSiteCorpus } from "../lib/corpus";
import { buildLlmsFullTxt } from "../lib/seo";

export function GET() {
  const { articles, sources } = loadSiteCorpus();
  const text = buildLlmsFullTxt({
    topics: TOPICS,
    articles,
    sources
  });

  return new Response(`${text}\n`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8"
    }
  });
}
