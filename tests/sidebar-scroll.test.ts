import { describe, expect, it } from "vitest";
import { restoreSidebarScroll, saveSidebarScroll, SIDEBAR_SCROLL_KEY } from "../src/lib/sidebar-scroll";

function createStorage(initialValue?: string) {
  const values = new Map<string, string>();
  if (initialValue !== undefined) {
    values.set(SIDEBAR_SCROLL_KEY, initialValue);
  }
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    }
  };
}

describe("sidebar scroll persistence", () => {
  it("saves the current sidebar scroll position", () => {
    const storage = createStorage();
    const sidebar = { scrollTop: 248 };

    saveSidebarScroll(sidebar, storage);

    expect(storage.getItem(SIDEBAR_SCROLL_KEY)).toBe("248");
  });

  it("restores a saved sidebar scroll position", () => {
    const storage = createStorage("512");
    const sidebar = { scrollTop: 0 };

    restoreSidebarScroll(sidebar, storage);

    expect(sidebar.scrollTop).toBe(512);
  });

  it("ignores invalid saved scroll positions", () => {
    const storage = createStorage("not-a-number");
    const sidebar = { scrollTop: 32 };

    restoreSidebarScroll(sidebar, storage);

    expect(sidebar.scrollTop).toBe(32);
  });
});
