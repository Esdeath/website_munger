export const SOURCE_DEFINITIONS = [
  {
    directory: "shareholders",
    type: "shareholder",
    label: "股东会与股东信",
    mark: "会",
    description: "历年股东会、股东信与问答记录"
  },
  {
    directory: "speech",
    type: "speech",
    label: "演讲与访谈",
    mark: "访",
    description: "公开演讲、访谈、文章与声明"
  },
  {
    directory: "li-lu",
    type: "li-lu",
    label: "李录演讲和访谈",
    mark: "录",
    description: "李录的演讲、访谈、交流与文章"
  }
] as const;

export type SourceDefinition = (typeof SOURCE_DEFINITIONS)[number];
export type SourceDirectory = SourceDefinition["directory"];
export type SourceType = SourceDefinition["type"];

export const SOURCE_DIRECTORIES = SOURCE_DEFINITIONS.map((source) => source.directory);

export function sourceTypeLabel(source: { type: SourceType }): string {
  return SOURCE_DEFINITIONS.find((definition) => definition.type === source.type)?.label ?? source.type;
}
