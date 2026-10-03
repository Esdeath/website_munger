import { describe, expect, it } from "vitest";
import { LEGACY_SOURCE_REDIRECTS } from "../src/content/legacy-source-redirects";
import { loadSiteCorpus } from "../src/lib/corpus";

describe("replaced summary URLs", () => {
  it("keeps every retired URL linked directly to its full translation", () => {
    const translations = loadSiteCorpus().sources.filter(source => source.sourceKind === "translation");
    const destinations = new Set(translations.map(source => `/sources/${source.slug}/`));
    expect(Object.keys(LEGACY_SOURCE_REDIRECTS)).toHaveLength(34);
    for (const [from, to] of Object.entries(LEGACY_SOURCE_REDIRECTS)) {
      expect(from).toMatch(/中文摘要\/$/);
      expect(to).toMatch(/中文全文\/$/);
      expect(destinations.has(to)).toBe(true);
      expect(LEGACY_SOURCE_REDIRECTS[to]).toBeUndefined();
    }
  });
});
