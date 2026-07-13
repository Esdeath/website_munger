import { defineConfig } from "astro/config";
import { LEGACY_ARTICLE_REDIRECTS } from "./src/content/legacy-article-redirects";

export default defineConfig({
  output: "static",
  site: "https://munger.ayaseeri.com",
  redirects: LEGACY_ARTICLE_REDIRECTS
});
