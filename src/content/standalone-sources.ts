import type { SourceType } from "../lib/source-types";

export interface StandaloneSourceDefinition {
  slug: string;
  filePath: string;
  title: string;
  type: SourceType;
  year: string;
  excerpt: string;
}

export const STANDALONE_SOURCES = [
  {
    slug: "seeking-wisdom-中文版",
    filePath: "public/sources/seeking-wisdom-中文版/index.html",
    title: "探索智慧：从达尔文到芒格",
    type: "speech",
    year: "2003",
    excerpt: "一本关于人类思维、误判心理学与更好思考方法的智慧读本。"
  }
] satisfies StandaloneSourceDefinition[];
