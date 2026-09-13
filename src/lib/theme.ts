export type Theme = "light" | "dark" | "green";

export const THEMES: readonly Theme[] = ["light", "dark", "green"];
export const THEME_STORAGE_KEY = "theme";

export const themeMeta: Record<Theme, { label: string; color: string }> = {
  light: { label: "浅色", color: "#f8f5f0" },
  dark: { label: "墨黑", color: "#1a1a1a" },
  green: { label: "护眼绿", color: "#c0edc6" }
};

export function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark" || value === "green";
}

export interface ThemeTargets {
  root: {
    classList: { add(token: string): void; remove(token: string): void };
    style: { colorScheme: string };
  };
  meta: { setAttribute(name: string, value: string): void } | null;
}

export function applyTheme(theme: Theme, targets: ThemeTargets): void {
  const { root, meta } = targets;
  root.classList.remove("dark");
  root.classList.remove("green");
  if (theme !== "light") root.classList.add(theme);
  root.style.colorScheme = theme === "dark" ? "dark" : "light";
  if (meta) meta.setAttribute("content", themeMeta[theme].color);
}
