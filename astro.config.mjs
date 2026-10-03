import { defineConfig } from "astro/config";
import { LEGACY_ARTICLE_REDIRECTS } from "./src/content/legacy-article-redirects";
import { LEGACY_SOURCE_REDIRECTS } from "./src/content/legacy-source-redirects";

export default defineConfig({
  output: "static",
  site: "https://munger.ayaseeri.com",
  redirects: { ...LEGACY_ARTICLE_REDIRECTS, ...LEGACY_SOURCE_REDIRECTS }
});
