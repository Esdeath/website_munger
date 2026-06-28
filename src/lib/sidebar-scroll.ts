export const SIDEBAR_SCROLL_KEY = "website-munger:archive-sidebar-scroll";

export interface ScrollableElement {
  scrollTop: number;
}

export interface SidebarStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface SidebarScrollElement extends ScrollableElement {
  addEventListener(type: "scroll", listener: () => void, options?: AddEventListenerOptions): void;
}

interface SidebarScrollWindow {
  addEventListener(type: "pagehide", listener: () => void): void;
  requestAnimationFrame?: (callback: () => void) => number;
}

export function saveSidebarScroll(sidebar: ScrollableElement, storage: SidebarStorage): void {
  storage.setItem(SIDEBAR_SCROLL_KEY, String(sidebar.scrollTop));
}

export function restoreSidebarScroll(sidebar: ScrollableElement, storage: SidebarStorage): void {
  const savedScrollTop = Number(storage.getItem(SIDEBAR_SCROLL_KEY));
  if (!Number.isFinite(savedScrollTop)) {
    return;
  }
  sidebar.scrollTop = savedScrollTop;
}

export function setupSidebarScrollPersistence(
  sidebar: SidebarScrollElement,
  storage: SidebarStorage = sessionStorage,
  win: SidebarScrollWindow = window
): void {
  const restore = () => restoreSidebarScroll(sidebar, storage);
  if (win.requestAnimationFrame) {
    win.requestAnimationFrame(restore);
  } else {
    restore();
  }

  const save = () => saveSidebarScroll(sidebar, storage);
  sidebar.addEventListener("scroll", save, { passive: true });
  win.addEventListener("pagehide", save);
}
