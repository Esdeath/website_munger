export interface TopicDefinition {
  slug: string;
  title: string;
  description: string;
  keywords: string[];
}

export const SITE_URL = "https://munger.ayaseeri.com/";
export const SITE_TITLE = "查理·芒格知识库";
export const SITE_AUTHOR = "滚雪球的Star";
export const SITE_DESCRIPTION = "按主题地图组织的查理·芒格思想知识库，连接解释文章、股东会记录、演讲访谈与原文出处。";
export const SITE_KEYWORDS = [
  "查理·芒格",
  "芒格",
  "Charlie Munger",
  "投资",
  "价值投资",
  "多元思维模型",
  "心理学误判",
  "股东会",
  "演讲访谈"
];

export const TOPICS: TopicDefinition[] = [
  {
    slug: "investment-principles",
    title: "投资原则",
    description: "投资判断、资本配置、长期复利和商业质量。",
    keywords: ["能力圈", "护城河", "长期持有", "复利", "内在价值", "机会成本", "资本配置", "定价权"]
  },
  {
    slug: "mental-model-lectures",
    title: "思维模型讲义",
    description: "从多元思维模型到终身学习的十二课，覆盖硬科学、误判心理学、商业判断与行动纪律。",
    keywords: ["多元思维模型", "概率", "会计", "硬科学", "生物学", "误判心理学", "规模效应", "竞争", "技术", "逆向思维", "检查清单", "理性", "终身学习"]
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
    slug: "frequently-cited-people",
    title: "常引用人物",
    description: "芒格反复引用的人物和思想参照。",
    keywords: ["富兰克林", "格雷厄姆", "李光耀", "达尔文", "凯恩斯", "亚当斯密"]
  },
  {
    slug: "company-cases",
    title: "公司案例",
    description: "把公司作为理解芒格思想的案例载体。",
    keywords: ["喜诗糖果", "可口可乐", "比亚迪", "GEICO", "蓝筹印花", "西科金融", "每日期刊", "好市多"]
  },
  {
    slug: "disciplines",
    title: "学科体系",
    description: "心理学、工程学、会计学、历史和基础模型。",
    keywords: ["心理学", "工程学", "会计学", "历史", "物理学", "生物学", "哲学", "数学"]
  },
  {
    slug: "macro-warnings",
    title: "宏观警示",
    description: "通胀、利率、泡沫、杠杆和金融系统风险。",
    keywords: ["通货膨胀", "利率", "泡沫", "金融危机", "衍生品", "杠杆", "监管", "投机", "赌博"]
  }
];

export const READING_PATH_KEYWORDS = ["能力圈", "多元思维模型", "避免愚蠢", "激励机制"];
