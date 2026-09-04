import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const src = readFileSync("src/components/ThemePicker.astro", "utf8");

describe("ThemePicker component", () => {
  it("imports the shared theme module", () => {
    expect(src).toContain('from "../lib/theme"');
  });
  it("renders an accessible menu with radio options", () => {
    expect(src).toContain('aria-haspopup="menu"');
    expect(src).toContain('role="menu"');
    expect(src).toContain('role="menuitemradio"');
  });
  it("tags the picker root and each option's theme value", () => {
    expect(src).toContain("data-theme-picker");
    expect(src).toContain("data-theme-value");
  });
  it("applies and persists the selected theme on the client", () => {
    expect(src).toContain("applyTheme(");
    expect(src).toContain('localStorage.setItem("theme"');
  });
});
