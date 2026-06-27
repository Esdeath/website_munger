export interface TopicDefinition {
  slug: string;
  title: string;
  description: string;
  keywords: string[];
}

export const SITE_TITLE = "查理·芒格知识库";
export const SITE_DESCRIPTION = "一个按主题地图组织的查理·芒格思想知识库。";

export const TOPICS: TopicDefinition[] = [
  {
    slug: "investment-principles",
    title: "投资原则",
    description: "投资判断、资本配置、长期复利和商业质量。",
    keywords: ["能力圈", "护城河", "长期持有", "复利", "内在价值", "机会成本", "资本配置", "定价权"]
  },
  {
    slug: "thinking-methods",
    title: "思维方法",
    description: "多元思维模型、逆向思维、检查清单和跨学科判断。",
    keywords: ["多元思维模型", "跨学科", "普世智慧", "逆向思维", "检查清单", "概率", "赔率", "期望值", "客观与理性"]
  },
  {
    slug: "human-misjudgment",
    title: "人性偏误",
    description: "心理倾向、误判机制、群体行为和 lollapalooza 叠加效应。",
    keywords: ["激励机制", "社会认同", "过度自信", "嫉妒", "承诺一致性倾向", "Lollapalooza", "巴甫洛夫联想"]
  },
  {
    slug: "character-conduct",
    title: "品格处世",
    description: "可靠、诚信、勤奋、好奇心和长期可信度。",
    keywords: ["诚信与声誉", "可靠", "勤奋", "好奇心", "延迟满足", "谦逊", "纪律", "自律", "避免愚蠢"]
  },
  {
    slug: "business-cases",
    title: "商业案例",
    description: "把公司作为理解芒格思想的案例载体。",
    keywords: ["喜诗糖果", "可口可乐", "比亚迪", "GEICO", "蓝筹印花", "西科金融", "每日期刊", "好市多"]
  },
  {
    slug: "people-disciplines",
    title: "人物与学科",
    description: "芒格反复引用的人物、学科和基础模型。",
    keywords: ["富兰克林", "格雷厄姆", "李光耀", "达尔文", "凯恩斯", "心理学", "工程学", "会计学", "历史"]
  }
];

export const READING_PATH_KEYWORDS = ["能力圈", "多元思维模型", "避免愚蠢", "激励机制"];
