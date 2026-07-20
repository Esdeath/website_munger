import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const reader = readFileSync("public/sources/seeking-wisdom-中文版/reader.html", "utf8");

describe("Seeking Wisdom standalone reader", () => {
  it("uses the knowledge-base paper and orange theme", () => {
    expect(reader).toContain("--bg: #f4f0e8;");
    expect(reader).toContain("--bg-panel: #fffaf4;");
    expect(reader).toContain("--text: #2f2a24;");
    expect(reader).toContain("--accent: #d89138;");
    expect(reader).not.toContain('id="theme-toggle"');
    expect(reader).not.toContain("wisdom-theme");
  });

  it("keeps the desktop table of contents on the right", () => {
    expect(reader).toMatch(/#sidebar \{[\s\S]*?right:0;[\s\S]*?left:auto;/);
    expect(reader).toContain("border-left:1px solid var(--border);");
    expect(reader).toContain("#sidebar.collapsed { transform: translateX(100%); }");
    expect(reader).toMatch(/#main \{[\s\S]*?margin-right: var\(--sidebar-w\);/);
    expect(reader).toContain("#main.full { margin-right:0; }");
  });

  it("opens the mobile table of contents from the right", () => {
    const mobile = reader.slice(reader.indexOf("@media (max-width: 860px)"));

    expect(mobile).toContain("#sidebar { transform: translateX(100%); }");
    expect(mobile).toContain("#main { margin-right:0;");
  });
});
