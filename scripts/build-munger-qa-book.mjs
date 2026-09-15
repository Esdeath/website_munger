import crypto from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  EXPANDED_ANSWER_PARAGRAPH_SELECTIONS,
  EXPANDED_ANSWER_RANGE_SELECTIONS,
  EXPANDED_QUESTION_EXCERPTS,
  READER_CHAPTERS as EXPANDED_READER_CHAPTERS
} from "./munger-qa-book-curation.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..");
const OUTPUT_DIR = path.join(ROOT, "output", "munger-qa-book");
const PDF_DIR = path.join(ROOT, "output", "pdf");
const TMP_DIR = path.join(ROOT, "tmp", "pdfs", "munger-qa-book");
const COVER_PATH = path.join(ROOT, "assets", "munger-qa-book", "cover.png");
const BOOK_JSON_PATH = path.join(TMP_DIR, "book.json");
const HTML_PATH = path.join(OUTPUT_DIR, "芒格问答录.html");
const EPUB_PATH = path.join(OUTPUT_DIR, "芒格问答录.epub");
const PDF_PATH = path.join(PDF_DIR, "芒格问答录.pdf");

const TITLE = "芒格问答录";
const SUBTITLE = "给普通读者与价值投资者的精编 300 问";
const TARGET_QUESTION_COUNT = 300;
const SITE_URL = "https://munger.ayaseeri.com";
const BUILD_DATE = new Date().toISOString().slice(0, 10);

const EXPLICIT_SOURCES = [
  "shareholders/2007年 西科金融股东会讲话.md",
  "shareholders/2023年 每日期刊股东会讲话.md",
  "speech/查理芒格：1996年斯坦福大学演讲—生活的智慧.md",
  "speech/查理芒格：2003年加州大学圣塔巴巴拉经济学系演讲-论学院派经济学的九大缺点.md",
  "speech/查理芒格：2008年《与 Charlie Munger 的对话：杜桥杰出访客讲座》.md",
  "speech/查理芒格：2010年与约瑟夫·格伦菲斯特教授（1978届）探讨当前经济危机.md",
  "speech/查理芒格：2010年哈佛-韦斯特莱克学校演讲.md",
  "speech/查理芒格：2010年密歇根大学演讲.md",
  "speech/查理芒格：2012年接受CNBC贝基·奎克专访全文.md",
  "speech/查理芒格：2017 年 DJCO 年会结束后查理·芒格与投资者亲切交流.md",
  "speech/查理芒格：2017年密歇根大学罗斯商学院演讲.md",
  "speech/查理芒格：2018年 喻见访谈-不赚最后一美元，不会得到更少，而会更多.md",
  "speech/查理芒格：2018年红周刊独家对话-你不需要投资很多东西才会富有.md",
  "speech/查理芒格：2019年 华尔街日报6小时专访.md",
  "speech/查理芒格：2019年 独家专访-我是孔子思想在美国的实践者.md",
  "speech/查理芒格：2019年2月 雅虎财经访谈全文.md",
  "speech/查理芒格：2019年2月接受CNBC采访.md",
  "speech/查理芒格：2020年Dr Sabrina Kay对谈—人性与投资.md",
  "speech/查理芒格：2020年接受加州理工学院校友会采访.md",
  "speech/查理芒格：2020年雷德兰兹论坛对话实录 .md",
  "speech/查理芒格：2022年与托德·科姆斯对话.md",
  "speech/查理芒格：2023年《Acquired》首次长篇播客采访.md",
  "speech/查理芒格：2023年《与查理·芒格的对话》.md",
  "speech/查理芒格：2023年《最后的访谈CNBC》.md"
];

const IMPLICIT_SHAREHOLDER_SOURCES = [
  "shareholders/1994年 西科金融股东会讲话.md",
  "shareholders/1995年 西科金融股东会讲话.md",
  "shareholders/1997年 西科金融股东会讲话.md",
  "shareholders/1998年 西科金融股东会讲话.md",
  "shareholders/1999年 西科金融股东会讲话.md",
  "shareholders/2000年 西科金融股东会讲话.md",
  "shareholders/2003年 西科金融股东会讲话.md",
  "shareholders/2010年 西科金融股东会讲话.md",
  "shareholders/2014年 每日期刊股东会讲话.md",
  "shareholders/2015年 每日期刊股东会讲话.md",
  "shareholders/2016年 每日期刊股东会讲话.md",
  "shareholders/2017年 每日期刊股东会讲话.md",
  "shareholders/2018年 每日期刊股东会讲话.md",
  "shareholders/2019年 每日期刊股东会讲话.md",
  "shareholders/2020年 每日期刊股东会讲话.md",
  "shareholders/2021年 每日期刊股东会讲话.md"
];

const IMPLICIT_HOST_SOURCES = [
  "shareholders/2022年 每日期刊股东会讲话.md"
];

const EDITOR_GUIDE = [
  "把股票看成企业的一部分，价值必须高于付出的价格。",
  "先看生意和管理层，再谈估值；好公司也可能是坏买卖。",
  "能力圈的关键不在于大，而在于知道边界在哪里。",
  "好机会很少；等待、集中和长期持有比频繁行动更重要。",
  "先问‘会怎样失败’，尤其要远离可以让人永久出局的杠杆。",
  "激励解释行为，反证帮助纠错；理性比单纯的聪明更稀缺。",
  "阅读、可信的伙伴和现实的期望，是复利之外的长期主义。"
];

const QUESTION_EXCERPTS = new Map([
  ["shareholders/2022年 每日期刊股东会讲话.md#127", "传统的本·格雷厄姆式价值投资是否消亡了？"],
  ["shareholders/2019年 每日期刊股东会讲话.md#328", "为什么不预测苹果股价的短期涨跌？"],
  ["speech/查理芒格：1996年斯坦福大学演讲—生活的智慧.md#291", "你认为刚入门的投资者应该采用哪种模型呢？"],
  ["speech/查理芒格：2012年接受CNBC贝基·奎克专访全文.md#153", "不具备选股能力的普通投资者，应该怎么做？"],
  ["shareholders/2016年 每日期刊股东会讲话.md#126", "在给一家公司估值时，该参考国债收益率，还是机会成本？"],
  ["speech/查理芒格：2018年红周刊独家对话-你不需要投资很多东西才会富有.md#243", "格雷厄姆的烟头理论和你主张的以合理价格买入优秀公司的理念有如此大的实质差别吗？"],
  ["shareholders/2023年 每日期刊股东会讲话.md#473", "您为什么愿意花更多的钱，买好公司呢？您的这种想法从何而来？"],
  ["shareholders/1994年 西科金融股东会讲话.md#22", "您是怎样认识到好生意的重要性的？"],
  ["shareholders/1998年 西科金融股东会讲话.md#270", "以‘漂亮五十’为例，长期投资时资本回报率和买入价格各有多重要？"],
  ["shareholders/2015年 每日期刊股东会讲话.md#298", "为什么知道哪些公司好，还远远不够？"],
  ["shareholders/1999年 西科金融股东会讲话.md#678", "伯克希尔是如何帮助喜诗糖果取得成功的？"],
  ["shareholders/2021年 每日期刊股东会讲话.md#238", "为什么开市客值得买入，而且不怕亚马逊？"],
  ["speech/查理芒格：2023年《与查理·芒格的对话》.md#825", "伯克希尔文化的秘密是什么？"],
  ["shareholders/1997年 西科金融股东会讲话.md#236", "好公司值得以高于内在价值的价格买入吗？"],
  ["shareholders/2018年 每日期刊股东会讲话.md#278", "在今天的投资环境中，小资金还有可能实现很高的收益率吗？"],
  ["speech/查理芒格：2023年《Acquired》首次长篇播客采访.md#188", "年轻投资者寻找伟大投资机会时，有哪些需要注意的事项？"],
  ["speech/查理芒格：2018年红周刊独家对话-你不需要投资很多东西才会富有.md#15", "很多投资人知道长期投资的道理，却耐不住寂寞。怎么才能做到知行合一？"],
  ["shareholders/2021年 每日期刊股东会讲话.md#224", "请问一只股票，该继续持有，还是卖出一些，您如何决定？"],
  ["shareholders/2000年 西科金融股东会讲话.md#506", "投资者为什么总会因别人赚钱更快而犯错？"],
  ["shareholders/2022年 每日期刊股东会讲话.md#397", "空仓持有现金，等未来十二个月出现好机会再进场，这个想法可行吗？"],
  ["shareholders/2019年 每日期刊股东会讲话.md#172", "未来长期投资的收益率可能下降，投资者应该怎么办？"],
  ["shareholders/2019年 每日期刊股东会讲话.md#218", "如何判断好机会已经过头了？"],
  ["speech/查理芒格：2020年雷德兰兹论坛对话实录 .md#99", "面对股票腰斩，长期投资者该如何保持心态？"],
  ["shareholders/2003年 西科金融股东会讲话.md#304", "您如何看待投资顾问用贝塔系数衡量风险？"],
  ["shareholders/1994年 西科金融股东会讲话.md#154", "您认为，在资产负债表以外，还有哪些负债是需要我们注意的？"],
  ["shareholders/2016年 每日期刊股东会讲话.md#218", "普通投资者应该如何看待银行股？"],
  ["shareholders/1999年 西科金融股东会讲话.md#542", "会计政策和奖金激励，为什么会让衍生品交易反复引发危机？"],
  ["shareholders/2010年 西科金融股东会讲话.md#368", "为什么 2008 年金融危机会险些摧毁整个系统？"],
  ["shareholders/2000年 西科金融股东会讲话.md#308", "你们真的完全不关注、不在乎美联储政策和利率吗？"],
  ["speech/查理芒格：2022年与托德·科姆斯对话.md#405", "投资者能从通胀中获利吗？"],
  ["shareholders/1995年 西科金融股东会讲话.md#198", "投机泛滥会怎样伤害社会？"],
  ["shareholders/2021年 每日期刊股东会讲话.md#96", "市场时不时地发疯，投资者应该如何应对？"],
  ["shareholders/2021年 每日期刊股东会讲话.md#116", "人性的贪婪和券商激励，为什么会反复制造泡沫？"],
  ["shareholders/1998年 西科金融股东会讲话.md#342", "您犯过什么错误？从中得到了哪些经验教训？"],
  ["speech/查理芒格：2018年红周刊独家对话-你不需要投资很多东西才会富有.md#33", "为什么理性对投资者最重要？"],
  ["shareholders/1997年 西科金融股东会讲话.md#174", "为什么需要掌握多元思维模型？"],
  ["shareholders/2020年 每日期刊股东会讲话.md#376", "您有什么好办法或好习惯，能帮助自己理性思考？"],
  ["shareholders/2007年 西科金融股东会讲话.md#176", "哪种心理倾向对判断的危害最严重？"],
  ["shareholders/2016年 每日期刊股东会讲话.md#188", "日常生活中，有哪些习惯能帮助我们少犯错？"],
  ["shareholders/2017年 每日期刊股东会讲话.md#214", "在您改变的所有成见中，哪个成见的改变最难？"],
  ["shareholders/2017年 每日期刊股东会讲话.md#374", "怎样才能和优秀的人共事？"],
  ["speech/查理芒格：2022年与托德·科姆斯对话.md#303", "一个系统的结果，是否反映了背后的激励机制？"],
  ["shareholders/2003年 西科金融股东会讲话.md#190", "您觉得哪些东西是投资者必须读的？"],
  ["shareholders/2007年 西科金融股东会讲话.md#300", "检查清单如何帮助我们解决难题？"],
  ["speech/查理芒格：2023年《最后的访谈CNBC》.md#457", "故事为什么能帮助人学习？"],
  ["speech/查理芒格：2023年《与查理·芒格的对话》.md#45", "探求跨学科理念，是为了好奇心，还是为了实际用途？"],
  ["shareholders/2017年 每日期刊股东会讲话.md#148", "您认为一个人应该如何选择自己的职业？"],
  ["shareholders/2015年 每日期刊股东会讲话.md#514", "对希望创业、急于致富的年轻人，您有什么建议？"],
  ["speech/查理芒格：2023年《最后的访谈CNBC》.md#621", "人生遭遇挣扎时，应该怎样坚持下去？"],
  ["shareholders/2017年 每日期刊股东会讲话.md#390", "逆境有什么价值，我们应以什么态度面对困难？"],
  ["speech/查理芒格：2012年接受CNBC贝基·奎克专访全文.md#205", "您希望后人怎样记住您？"],
  ["speech/查理芒格：2023年《与查理·芒格的对话》.md#585", "与优秀、正直的伙伴长期共事，是什么体验？"]
]);

const ANSWER_PARAGRAPH_SELECTIONS = new Map([
  ["shareholders/1994年 西科金融股东会讲话.md#22", [0, 1, 3, 12, 14]],
  ["shareholders/1998年 西科金融股东会讲话.md#270", [0, 10, 12]],
  ["shareholders/2021年 每日期刊股东会讲话.md#238", [1]],
  ["speech/查理芒格：2023年《与查理·芒格的对话》.md#825", [0, 1, 2]],
  ["shareholders/1997年 西科金融股东会讲话.md#236", [0, 1, 2, 3, 6]],
  ["shareholders/1995年 西科金融股东会讲话.md#230", [0, 1, 2, 4]],
  ["shareholders/2000年 西科金融股东会讲话.md#506", [0, 1, 2]],
  ["shareholders/2003年 西科金融股东会讲话.md#304", [0, 1, 2, 3]],
  ["shareholders/1994年 西科金融股东会讲话.md#154", [0, 1, 2]],
  ["shareholders/2016年 每日期刊股东会讲话.md#218", [2]],
  ["shareholders/1999年 西科金融股东会讲话.md#542", [3, 4]],
  ["shareholders/2010年 西科金融股东会讲话.md#368", [0, 1]],
  ["shareholders/2000年 西科金融股东会讲话.md#308", [0, 13, 14, 15]],
  ["speech/查理芒格：2022年与托德·科姆斯对话.md#405", [0]],
  ["shareholders/1995年 西科金融股东会讲话.md#198", [0, 1, 3]],
  ["shareholders/1998年 西科金融股东会讲话.md#342", [0, 1, 2, 4]],
  ["shareholders/1997年 西科金融股东会讲话.md#174", [0, 1, 2, 3, 4]],
  ["shareholders/2020年 每日期刊股东会讲话.md#376", [1, 2, 5]],
  ["shareholders/2007年 西科金融股东会讲话.md#176", [0, 1]],
  ["shareholders/2016年 每日期刊股东会讲话.md#188", [0, 1, 2, 3]],
  ["shareholders/2015年 每日期刊股东会讲话.md#188", [0, 1, 2, 4]],
  ["shareholders/2017年 每日期刊股东会讲话.md#214", [0, 3]],
  ["shareholders/2016年 每日期刊股东会讲话.md#232", [0, 1, 2]],
  ["shareholders/2017年 每日期刊股东会讲话.md#374", [1]],
  ["shareholders/2015年 每日期刊股东会讲话.md#144", [1, 2, 3]],
  ["shareholders/1998年 西科金融股东会讲话.md#206", [0, 1]],
  ["speech/查理芒格：2019年 华尔街日报6小时专访.md#133", [0]],
  ["shareholders/2003年 西科金融股东会讲话.md#190", [0, 1, 2]],
  ["shareholders/2007年 西科金融股东会讲话.md#300", [0, 1]],
  ["speech/查理芒格：2023年《与查理·芒格的对话》.md#45", [0]],
  ["shareholders/2017年 每日期刊股东会讲话.md#148", [0, 1]],
  ["shareholders/2015年 每日期刊股东会讲话.md#514", [2, 3]],
  ["shareholders/2016年 每日期刊股东会讲话.md#242", [0, 1, 4]],
  ["shareholders/2023年 每日期刊股东会讲话.md#659", [0]],
  ["shareholders/2017年 每日期刊股东会讲话.md#390", [3]],
  ["speech/查理芒格：2023年《与查理·芒格的对话》.md#585", [1]]
]);

const ANSWER_RANGE_SELECTIONS = new Map([
  ["speech/查理芒格：2020年雷德兰兹论坛对话实录 .md#99", { end: "这都是游戏的一部分。" }],
  ["shareholders/2021年 每日期刊股东会讲话.md#96", { end: "别看见股票涨起来了，就去赌，就削尖了脑袋抢着买。" }],
  ["shareholders/2019年 每日期刊股东会讲话.md#172", { end: "得到的收益率是6%，你们应该感到高兴才对。" }],
  ["speech/查理芒格：2012年接受CNBC贝基·奎克专访全文.md#205", { end: "但如果华尔街有更多人能效仿我曾祖父，这个行业会不会运转得更好呢？" }]
]);

for (const [key, question] of EXPANDED_QUESTION_EXCERPTS) QUESTION_EXCERPTS.set(key, question);
for (const [key, paragraphs] of EXPANDED_ANSWER_PARAGRAPH_SELECTIONS) {
  ANSWER_PARAGRAPH_SELECTIONS.set(key, paragraphs);
}
for (const [key, range] of EXPANDED_ANSWER_RANGE_SELECTIONS) ANSWER_RANGE_SELECTIONS.set(key, range);

const QUESTION_LABEL_RE = /^(?:问(?:题)?\s*\d*|Q\s*\d*|提问(?:者)?\s*\d*|股\s*东\s*\d*|主持人|采访者|观众(?:提问者)?\s*\d*(?:[（(][^）)]+[）)])?|贝基(?:·奎克)?|贝琪(?:·奎克)?|罗森塔尔|Sabrina|Richard|Stewart|傅喻|CITIC|约翰|本|大卫|安德鲁|托德(?:·科姆斯)?|斯科特[-·・]?德鲁|Scott\s+DeRue|汤姆(?:·汤布雷洛)?|《红周刊》|某人|杰克|拉里|帕特里克|盖瑞(?:·萨尔兹曼)?|Gary|史蒂文|彼得(?:·考夫曼)?|丹尼斯·尼尔|巴菲特(?:先生)?|沃伦|盖茨(?:先生)?|李录)$/i;
const QUESTION_WORD_RE = /[？?]|请|谈谈|怎么看|如何|为什么|什么|是否|能否|有没有|想问|想知道|解释|评价|建议|观点|看法|对吧|吗[？。]?|呢[？。]?/;
const CONTINUED_QUESTION_RE = /请\s*(?:问|您)|我(?:还)?想请|我(?:的)?(?:第[一二三四五六七八九十]+个)?问题|您(?:如何|怎么|为什么|是否|能否|认为|觉得|怎么看|会不会|有没有)/;
const SECONDARY_RESPONDER_RE = /^(?:Stewart|Richard|史蒂文|盖瑞(?:·萨尔兹曼)?|Gary|彼得(?:·考夫曼)?|丹尼斯·尼尔|李录)$/i;
const NOTE_RE = /译者注|编者注|听不清|根据上下文补|转录错误|可能偏离|备注/;

function normalizePath(filePath) {
  return filePath.split(path.sep).join("/");
}

function readSource(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);
  const raw = fs.readFileSync(absolutePath, "utf8").replace(/\r\n?/g, "\n");
  const lines = raw.split("\n");
  let bodyStart = 0;
  const data = {};

  if (lines[0]?.trim() === "---") {
    const end = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
    if (end > 0) {
      for (const line of lines.slice(1, end)) {
        const match = line.match(/^([a-z_]+):\s*(.*)$/i);
        if (match) data[match[1]] = match[2].trim();
      }
      bodyStart = end + 1;
    }
  }

  const bodyLines = lines.slice(bodyStart);
  const heading = bodyLines.find((line) => /^#\s+/.test(line));
  const title = data.title || heading?.replace(/^#\s+/, "").trim() || path.parse(relativePath).name;
  const year = relativePath.match(/(?:19|20)\d{2}/)?.[0] || "未标明";
  const type = relativePath.startsWith("shareholders/")
    ? "股东会"
    : /演讲/.test(title)
      ? "演讲问答"
      : "访谈";

  return {
    path: normalizePath(relativePath),
    absolutePath,
    raw,
    lines,
    bodyStart,
    title,
    year,
    type,
    sha256: crypto.createHash("sha256").update(raw).digest("hex")
  };
}

function stripLinePrefix(line) {
  return line
    .replace(/^\s*>\s?/, "")
    .replace(/^\s*#{1,6}\s*/, "")
    .trim();
}

function cleanInline(value) {
  return value
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/<https?:\/\/[^>]+>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\*\*/g, "")
    .replace(/__+/g, "")
    .replace(/`+/g, "")
    .replace(/^\s*[-+*]\s+/, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function cleanText(value) {
  const paragraphs = value
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph
      .split("\n")
      .map((line) => cleanInline(stripLinePrefix(line)))
      .filter(Boolean)
      .join(""))
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  return paragraphs.join("\n\n");
}

function parseSpeakerLine(line) {
  const value = stripLinePrefix(line);
  const patterns = [
    /^\*\*([^*：:]{1,50})\*\*\s*[：:]\s*(.*)$/,
    /^\*\*([^*：:]{1,50})\s*[：:]\*\*\s*(.*)$/,
    /^\*\*([^*：:]{1,50})\s*[：:]\s*(.*?)\*\*\s*$/,
    /^【([^】]{1,50})】\s*[：:]\s*(.*)$/,
    /^([^：:*]{1,40})\s*[：:]\s*(.*)$/
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (!match) continue;
    const label = cleanInline(match[1]).replace(/\s+/g, " ");
    if (!isMungerLabel(label) && !QUESTION_LABEL_RE.test(label.replace(/\s+/g, ""))) continue;
    return { label, content: cleanInline(match[2]) };
  }
  return null;
}

function isMungerLabel(label) {
  return /^(?:查理(?:[·・\-\s]?芒格)?|芒格|Charlie(?:\s+Munger)?)(?:先生)?(?:[（(].*)?$/i.test(label.trim());
}

function isStructuralLine(line) {
  const trimmed = line.trim();
  return !trimmed
    || /^!\[[^\]]*]\([^)]*\)$/.test(trimmed)
    || /^<img\b/i.test(trimmed)
    || /^[-*_]{3,}$/.test(trimmed)
    || (/^\s*>\s*\*\*[^*]+\*\*\s*$/.test(trimmed) && !/[:：]/.test(trimmed))
    || (/^#{1,6}\s+/.test(trimmed) && !parseSpeakerLine(line));
}

function appendTurnLine(turn, line) {
  if (isStructuralLine(line)) {
    if (!line.trim()) turn.lines.push("");
    return;
  }
  turn.lines.push(line);
}

function explicitTurns(source) {
  const turns = [];
  let current = null;

  for (let index = source.bodyStart; index < source.lines.length; index += 1) {
    const line = source.lines[index];
    const speaker = parseSpeakerLine(line);
    if (speaker) {
      if (current) turns.push(current);
      current = {
        label: speaker.label,
        lines: speaker.content ? [speaker.content] : [],
        lineStart: index + 1,
        lineEnd: index + 1
      };
      continue;
    }
    if (/^\s*(?:#{1,6}\s+|[-*_]{3,}\s*$)/.test(line)) {
      if (current) turns.push(current);
      current = null;
      continue;
    }
    if (current) {
      appendTurnLine(current, line);
      current.lineEnd = index + 1;
    }
  }
  if (current) turns.push(current);
  return turns;
}

function isQuestionTurn(turn) {
  const text = cleanText(turn.lines.join("\n"));
  if (text.length < 8) return false;
  const compactLabel = turn.label.replace(/\s+/g, "");
  if (SECONDARY_RESPONDER_RE.test(compactLabel) && !/[？?]/.test(text)) return false;
  if (/^(?:问|问题|Q\d*|提问)/i.test(compactLabel)) return true;
  return QUESTION_WORD_RE.test(text) || text.length >= 28;
}

function makeQa(source, mode, asker, question, answer, questionLine, answerLine, answerEnd) {
  const cleanedQuestion = cleanText(question);
  const cleanedAnswer = cleanText(answer);
  const noteFlag = NOTE_RE.test(`${cleanedQuestion}\n${cleanedAnswer}`);
  return {
    sourcePath: source.path,
    sourceTitle: source.title,
    sourceYear: source.year,
    sourceType: source.type,
    sourceSha256: source.sha256,
    mode,
    confidence: noteFlag ? "需复核" : mode === "explicit" ? "高" : "中",
    noteFlag,
    asker: cleanInline(asker),
    question: cleanedQuestion,
    answer: cleanedAnswer,
    questionLine,
    answerLine,
    answerEnd
  };
}

function parseExplicitSource(source) {
  const turns = explicitTurns(source);
  const pairs = [];

  for (let index = 1; index < turns.length; index += 1) {
    const answerTurn = turns[index];
    const questionTurn = turns[index - 1];
    if (!isMungerLabel(answerTurn.label) || isMungerLabel(questionTurn.label) || !isQuestionTurn(questionTurn)) continue;
    pairs.push(makeQa(
      source,
      "explicit",
      questionTurn.label,
      questionTurn.lines.join("\n"),
      answerTurn.lines.join("\n"),
      questionTurn.lineStart,
      answerTurn.lineStart,
      answerTurn.lineEnd
    ));
  }
  return pairs;
}

function normalizeSpeakerLabel(label) {
  return label.replace(/[·・\s]/g, "");
}

function isQuestionMarker(line, labelPattern) {
  const parsed = parseSpeakerLine(line);
  return parsed && labelPattern.test(normalizeSpeakerLabel(parsed.label)) ? parsed : null;
}

function looksLikeMungerBridge(speaker) {
  return /查理|芒格/.test(speaker.content) && /讲讲|回答|来说|交给|请/.test(speaker.content) && speaker.content.length < 60;
}

function implicitSegments(source, labelPattern) {
  const starts = [];
  for (let index = source.bodyStart; index < source.lines.length; index += 1) {
    const marker = isQuestionMarker(source.lines[index], labelPattern);
    if (marker) starts.push({ index, marker });
  }

  const pairs = [];
  for (let position = 0; position < starts.length; position += 1) {
    const { index, marker } = starts[position];
    const end = starts[position + 1]?.index ?? source.lines.length;
    let question = marker.content;
    let cursor = index + 1;
    let scanCursor = cursor;
    let scannedParagraphs = 0;
    let lastQuestionLine = null;
    let sawTextInParagraph = false;
    if (!/[？?]/.test(marker.content)) {
      for (; scanCursor < end && scannedParagraphs < 3; scanCursor += 1) {
        const line = source.lines[scanCursor];
        if (parseSpeakerLine(line) || /^\s*#{1,6}\s+/.test(line)) break;
        if (!line.trim()) {
          if (sawTextInParagraph) scannedParagraphs += 1;
          sawTextInParagraph = false;
          continue;
        }
        sawTextInParagraph = true;
        if (CONTINUED_QUESTION_RE.test(cleanInline(line))) lastQuestionLine = scanCursor + 1;
      }
    }
    if (lastQuestionLine !== null) {
      question = `${question}\n\n${source.lines.slice(index + 1, lastQuestionLine).join("\n")}`;
      cursor = lastQuestionLine;
    }

    const answerLines = [];
    let answerStart = cursor + 1;
    let answerEnd = cursor + 1;
    let unsafeResponder = false;
    let seenAnswerText = false;

    for (; cursor < end; cursor += 1) {
      const line = source.lines[cursor];
      const speaker = parseSpeakerLine(line);
      if (speaker) {
        if (isMungerLabel(speaker.label)) {
          if (speaker.content) answerLines.push(speaker.content);
          if (!seenAnswerText) answerStart = cursor + 1;
          seenAnswerText ||= Boolean(speaker.content);
          continue;
        }
        if (!seenAnswerText && looksLikeMungerBridge(speaker)) continue;
        unsafeResponder = true;
        break;
      }
      if (isStructuralLine(line)) {
        if (!line.trim() && answerLines.length) answerLines.push("");
        continue;
      }
      if (!seenAnswerText) answerStart = cursor + 1;
      seenAnswerText = true;
      answerEnd = cursor + 1;
      answerLines.push(line);
    }

    if (unsafeResponder && !seenAnswerText) continue;
    pairs.push(makeQa(
      source,
      "implicit",
      marker.label,
      question,
      answerLines.join("\n"),
      index + 1,
      answerStart,
      answerEnd
    ));
  }
  return pairs;
}

function isUsableQa(qa) {
  const chineseQuestion = qa.question.match(/[\u3400-\u9fff]/g)?.length ?? 0;
  const chineseAnswer = qa.answer.match(/[\u3400-\u9fff]/g)?.length ?? 0;
  if (qa.question.length < 8 || qa.question.length > 1600) return false;
  if (qa.answer.length < 24 || qa.answer.length > 10000) return false;
  if (chineseQuestion < 4 || chineseAnswer < 12) return false;
  if (/�|(?:^|\s)(?:undefined|null|TODO)(?:\s|$)/i.test(`${qa.question}\n${qa.answer}`)) return false;
  if (/^(?:这个问题)?(?:请|让|还是让).{0,24}(?:回答|来说|来答)[。！!]?$/u.test(qa.answer)) return false;
  return true;
}

function qaKey(qa) {
  return `${qa.sourcePath}#${qa.questionLine}`;
}

function readerAnswer(qa, key) {
  const range = ANSWER_RANGE_SELECTIONS.get(key);
  const paragraphIndexes = ANSWER_PARAGRAPH_SELECTIONS.get(key);
  if (range && paragraphIndexes) throw new Error(`Answer excerpt methods overlap for ${key}`);
  if (range) {
    const start = range.start ? qa.answer.indexOf(range.start) : 0;
    if (start < 0) throw new Error(`Missing answer excerpt start for ${key}`);
    const endAt = range.end ? qa.answer.indexOf(range.end, start) : qa.answer.length;
    if (endAt < 0) throw new Error(`Missing answer excerpt end for ${key}`);
    const end = range.end ? endAt + range.end.length : endAt;
    const answer = qa.answer.slice(start, end).trim();
    if (!answer || !qa.answer.includes(answer)) throw new Error(`Answer excerpt is not verbatim for ${key}`);
    return { answer, answerExcerpted: true };
  }
  if (!paragraphIndexes) return { answer: qa.answer, answerExcerpted: false };

  const paragraphs = qa.answer.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean);
  for (let index = 1; index < paragraphIndexes.length; index += 1) {
    if (paragraphIndexes[index] <= paragraphIndexes[index - 1]) {
      throw new Error(`Answer paragraph indexes are not strictly increasing for ${key}`);
    }
  }
  const selected = paragraphIndexes.map((index) => {
    if (!paragraphs[index]) throw new Error(`Missing answer paragraph ${index} for ${key}`);
    return paragraphs[index];
  });
  const answer = selected.join("\n\n");
  if (!selected.every((paragraph) => qa.answer.includes(paragraph))) {
    throw new Error(`Answer excerpt is not verbatim for ${key}`);
  }
  return { answer, answerExcerpted: true };
}

function buildBookModel() {
  const sourceModes = [
    ...EXPLICIT_SOURCES.map((sourcePath) => ({ sourcePath, mode: "explicit" })),
    ...IMPLICIT_SHAREHOLDER_SOURCES.map((sourcePath) => ({ sourcePath, mode: "shareholder" })),
    ...IMPLICIT_HOST_SOURCES.map((sourcePath) => ({ sourcePath, mode: "host" }))
  ];
  const missing = sourceModes.filter(({ sourcePath }) => !fs.existsSync(path.join(ROOT, sourcePath)));
  if (missing.length) throw new Error(`Missing source files:\n${missing.map(({ sourcePath }) => sourcePath).join("\n")}`);

  const sources = sourceModes.map(({ sourcePath, mode }) => ({ ...readSource(sourcePath), mode }));
  const candidates = sources.flatMap((source) => {
    if (source.mode === "explicit") return parseExplicitSource(source);
    if (source.mode === "host") return implicitSegments(source, /^贝琪(?:奎克)?$/);
    return implicitSegments(source, /^股东\d*$/);
  });

  const usable = candidates.filter(isUsableQa);
  const seen = new Set();
  const deduped = [];
  for (const qa of usable) {
    const fingerprint = `${qa.question}\n${qa.answer}`.replace(/[\s\p{P}\p{S}]/gu, "").toLowerCase();
    const hash = crypto.createHash("sha256").update(fingerprint).digest("hex");
    if (seen.has(hash)) continue;
    seen.add(hash);
    deduped.push({ ...qa, fingerprint: hash });
  }

  if (process.env.MUNGER_QA_DUMP_CANDIDATES === "1") {
    fs.mkdirSync(TMP_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(TMP_DIR, "candidates.json"),
      `${JSON.stringify(deduped.map((qa) => ({ ...qa, selectionKey: qaKey(qa) })), null, 2)}\n`
    );
  }

  const qaByKey = new Map(deduped.map((qa) => [qaKey(qa), qa]));
  if (EXPANDED_READER_CHAPTERS.length !== 12) {
    throw new Error(`Reader edition must contain 12 chapters, found ${EXPANDED_READER_CHAPTERS.length}`);
  }
  for (const chapter of EXPANDED_READER_CHAPTERS) {
    if (chapter.sections.length !== 5) {
      throw new Error(`Chapter ${chapter.title} must contain 5 sections, found ${chapter.sections.length}`);
    }
    for (const section of chapter.sections) {
      if (section.itemKeys.length !== 5) {
        throw new Error(`Section ${chapter.title} / ${section.title} must contain 5 questions`);
      }
    }
  }
  const selectedKeys = EXPANDED_READER_CHAPTERS.flatMap((chapter) =>
    chapter.sections.flatMap((section) => section.itemKeys)
  );
  if (selectedKeys.length !== TARGET_QUESTION_COUNT) {
    throw new Error(`Reader edition must contain ${TARGET_QUESTION_COUNT} questions, found ${selectedKeys.length}`);
  }
  if (new Set(selectedKeys).size !== selectedKeys.length) throw new Error("Reader edition contains duplicate question keys");
  const missingSelections = selectedKeys.filter((key) => !qaByKey.has(key));
  if (missingSelections.length) throw new Error(`Selected questions were not extracted:\n${missingSelections.join("\n")}`);

  let globalNumber = 0;
  const chapters = EXPANDED_READER_CHAPTERS.map((chapter, chapterIndex) => {
    let chapterNumber = 0;
    const sections = chapter.sections.map((section, sectionIndex) => {
      const items = section.itemKeys.map((key, sectionNumber) => {
        const qa = qaByKey.get(key);
        const question = QUESTION_EXCERPTS.get(key) ?? qa.question;
        const { answer, answerExcerpted } = readerAnswer(qa, key);
        chapterNumber += 1;
        return {
          ...qa,
          originalQuestion: qa.question,
          question,
          questionCondensed: question !== qa.question,
          answer,
          answerExcerpted,
          noteFlag: NOTE_RE.test(`${question}\n${answer}`),
          selectionKey: key,
          id: `q-${String(globalNumber + 1).padStart(4, "0")}`,
          number: ++globalNumber,
          chapterNumber,
          sectionNumber: sectionNumber + 1,
          sectionIndex: sectionIndex + 1,
          sectionTitle: section.title
        };
      });
      const { itemKeys, ...sectionMetadata } = section;
      return { ...sectionMetadata, number: sectionIndex + 1, items };
    });
    const { sections: _sections, ...chapterMetadata } = chapter;
    return {
      ...chapterMetadata,
      number: chapterIndex + 1,
      sections,
      items: sections.flatMap((section) => section.items)
    };
  });
  const selectedItems = chapters.flatMap((chapter) => chapter.items);

  const sourceStats = sources
    .map((source, index) => {
      const items = selectedItems.filter((qa) => qa.sourcePath === source.path);
      return {
        id: `source-${String(index + 1).padStart(2, "0")}`,
        path: source.path,
        title: source.title,
        year: source.year,
        type: source.type,
        mode: source.mode === "explicit" ? "说话人明确标注" : "股东会隐式回答",
        confidence: source.mode === "explicit" ? "高" : "中",
        sha256: source.sha256,
        count: items.length
      };
    })
    .filter((source) => source.count > 0)
    .sort((left, right) => left.year.localeCompare(right.year) || left.title.localeCompare(right.title, "zh-Hans-CN"));
  const sourceIdByPath = new Map(sourceStats.map((source) => [source.path, source.id]));
  for (const chapter of chapters) {
    for (const item of chapter.items) item.sourceId = sourceIdByPath.get(item.sourcePath);
  }

  const stats = {
    corpusMarkdownFiles: [...fs.readdirSync(path.join(ROOT, "shareholders")), ...fs.readdirSync(path.join(ROOT, "speech"))]
      .filter((fileName) => fileName.endsWith(".md")).length,
    candidatePairs: candidates.length,
    filteredPairs: candidates.length - usable.length,
    duplicatePairs: usable.length - deduped.length,
    selectedFromCount: deduped.length,
    questionCount: selectedItems.length,
    sourceCount: sourceStats.length,
    explicitCount: selectedItems.filter((qa) => qa.mode === "explicit").length,
    implicitCount: selectedItems.filter((qa) => qa.mode === "implicit").length,
    reviewFlagCount: selectedItems.filter((qa) => qa.noteFlag).length,
    excerptCount: selectedItems.filter((qa) => qa.answerExcerpted).length,
    condensedQuestionCount: selectedItems.filter((qa) => qa.questionCondensed).length,
    startYear: sourceStats[0]?.year ?? "未标明",
    endYear: sourceStats.at(-1)?.year ?? "未标明"
  };

  return {
    metadata: {
      title: TITLE,
      subtitle: SUBTITLE,
      language: "zh-CN",
      creator: "查理·芒格",
      editor: "website_munger 语料库",
      siteUrl: SITE_URL,
      buildDate: BUILD_DATE,
      edition: "精编 300 问",
      identifier: `urn:sha256:${crypto.createHash("sha256").update(selectedItems.map((qa) => `${qa.selectionKey}\n${qa.question}\n${qa.answer}`).join("\n")).digest("hex")}`
    },
    stats,
    chapters,
    sources: sourceStats,
    guide: EDITOR_GUIDE
  };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderParagraphs(value) {
  return value.split(/\n\s*\n/).map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`).join("\n");
}

function coverDataUri() {
  const data = fs.readFileSync(COVER_PATH).toString("base64");
  return `data:image/png;base64,${data}`;
}

function renderHtml(book) {
  const coverUri = coverDataUri();
  const toc = book.chapters.map((chapter) => `
          <li><a href="#chapter-${chapter.slug}"><span>${String(chapter.number).padStart(2, "0")}</span>${escapeHtml(chapter.title)}<small>${chapter.items.length} 问</small></a></li>`).join("");
  const chapters = book.chapters.map((chapter) => `
      <section class="chapter" id="chapter-${chapter.slug}" data-chapter>
        <header class="chapter-header">
          <p class="chapter-number">${String(chapter.number).padStart(2, "0")}</p>
          <div><h2>${escapeHtml(chapter.title)}</h2><p class="chapter-kicker">${escapeHtml(chapter.kicker)}</p></div>
          <p class="chapter-description">${escapeHtml(chapter.description)}</p>
        </header>
        ${chapter.sections.map((section) => `
        <section class="chapter-section" id="chapter-${chapter.slug}-section-${section.number}" data-section>
          <header class="section-header">
            <p>${String(chapter.number).padStart(2, "0")}.${section.number}</p>
            <div><h3>${escapeHtml(section.title)}</h3><span>${escapeHtml(section.description)}</span></div>
          </header>
          <div class="qa-list">
          ${section.items.map((qa) => `
          <article class="qa" id="${qa.id}" data-qa data-search="${escapeHtml(`${qa.question} ${qa.answer} ${qa.sourceTitle}`.toLowerCase())}">
            <h4><span class="q-mark">问 ${String(qa.number).padStart(3, "0")}</span><span>${escapeHtml(qa.question)}</span></h4>
            <div class="answer"><span class="a-mark">答</span><div>${renderParagraphs(qa.answer)}</div></div>
            <footer><a href="#${qa.sourceId}">${escapeHtml(qa.sourceYear)} · ${escapeHtml(qa.sourceTitle)}</a><span>原文件第 ${qa.questionLine} 行</span>${qa.answerExcerpted ? "<span class=\"excerpt-flag\">回答为本版节选</span>" : ""}${qa.noteFlag ? "<span class=\"review-flag\">含编者或译者提示</span>" : ""}</footer>
          </article>`).join("")}
          </div>
        </section>`).join("")}
      </section>`).join("");
  const sources = book.sources.map((source) => `
          <li id="${source.id}"><div><strong>${escapeHtml(source.year)} · ${escapeHtml(source.title)}</strong><span>${source.count} 问 · ${escapeHtml(source.type)}</span></div><code>${escapeHtml(source.path)}</code></li>`).join("");

  const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="description" content="${escapeHtml(SUBTITLE)}">
  <meta name="generator" content="website_munger QA book builder">
  <title>${TITLE}</title>
  <style>
    :root{--paper:#f2f5f3;--sheet:#fff;--ink:#17201d;--muted:#61706a;--green:#174c3d;--green-dark:#0d2d25;--red:#a63b32;--rule:#cbd5d0;--sans:"Hiragino Sans GB","PingFang SC","Microsoft YaHei",sans-serif;--serif:"Songti SC","STSong","SimSun",serif;color-scheme:light}
    *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--serif);font-size:18px;line-height:1.86;letter-spacing:0;text-rendering:optimizeLegibility}a{color:inherit;text-decoration-color:#8a9d95;text-underline-offset:.22em}a:hover{color:var(--red)}:focus-visible{outline:3px solid var(--red);outline-offset:4px}code{font-family:var(--sans);font-size:.72rem;overflow-wrap:anywhere}
    .cover{min-height:90svh;position:relative;display:grid;align-items:end;background:#0b1713;color:#fff;padding:clamp(2rem,7vw,7rem);isolation:isolate;overflow:hidden}.cover-image{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 15%;z-index:-2}.cover:after{content:"";position:absolute;inset:0;background:rgba(4,16,13,.18);z-index:-1}.cover-copy{max-width:42rem;border-left:8px solid var(--red);padding-left:clamp(1rem,3vw,2.4rem);text-shadow:0 2px 18px #000}.cover h1{font-size:clamp(3.4rem,10vw,7.6rem);line-height:.98;margin:0 0 1.2rem;font-weight:700;letter-spacing:0}.cover .subtitle{font-family:var(--sans);font-size:clamp(1rem,2vw,1.35rem);margin:0 0 2.5rem}.cover .edition{font-family:var(--sans);font-size:.82rem;line-height:1.6;margin:0;color:#eef4f1}.cover .edition span{display:block}
    .shell{display:grid;grid-template-columns:minmax(15rem,20rem) minmax(0,52rem);gap:clamp(2rem,6vw,7rem);max-width:82rem;margin:0 auto;padding:clamp(3rem,6vw,7rem) clamp(1.25rem,4vw,4rem)}.rail{position:sticky;top:1.5rem;align-self:start;max-height:calc(100svh - 3rem);overflow:auto;padding-right:1rem}.rail h2{font:700 1rem/1.4 var(--sans);margin:0 0 1rem}.search label{font:600 .72rem/1.4 var(--sans);display:block;color:var(--muted);margin-bottom:.3rem}.search input{width:100%;border:0;border-bottom:2px solid var(--green);background:transparent;border-radius:0;padding:.65rem 0;font:1rem/1.4 var(--sans);color:var(--ink)}.search-status{font:.7rem/1.5 var(--sans);color:var(--muted);min-height:1.1rem}.toc{list-style:none;margin:2.5rem 0 0;padding:0}.toc li{border-top:1px solid var(--rule)}.toc a{display:grid;grid-template-columns:2.1rem 1fr auto;gap:.35rem;align-items:center;padding:.75rem 0;text-decoration:none;font:600 .82rem/1.3 var(--sans)}.toc a span{color:var(--red)}.toc a small{font-weight:400;color:var(--muted)}
    .frontmatter{padding-bottom:4rem;border-bottom:2px solid var(--green)}.frontmatter h2,.sources h2{font:700 clamp(2rem,5vw,3.4rem)/1.15 var(--sans);margin:0 0 1.5rem;color:var(--green-dark)}.lede{font-size:1.22rem;line-height:1.8}.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--rule);border-block:1px solid var(--rule);margin:2.5rem 0}.stats div{background:var(--sheet);padding:1.4rem}.stats strong{font:700 2rem/1 var(--sans);display:block;color:var(--green)}.stats span{font:.7rem/1.4 var(--sans);color:var(--muted)}.guide{counter-reset:guide;list-style:none;padding:0;margin:2rem 0}.guide li{counter-increment:guide;display:grid;grid-template-columns:2.1rem 1fr;gap:.8rem;padding:.8rem 0;border-top:1px solid var(--rule)}.guide li:before{content:counter(guide,decimal-leading-zero);font:700 .72rem/1.9 var(--sans);color:var(--red)}.note{border-left:4px solid var(--red);padding-left:1.3rem;color:#33403b}.frontmatter h3{font:700 1rem/1.4 var(--sans);margin-top:2.2rem}
    .chapter{padding-top:6rem}.chapter-header{display:grid;grid-template-columns:auto 1fr;column-gap:1.3rem;align-items:start;padding-bottom:2rem;border-bottom:4px solid var(--green)}.chapter-number{font:700 1rem/1 var(--sans);color:var(--red);margin:.55rem 0 0}.chapter-header h2{font:700 clamp(2rem,5vw,3.7rem)/1.05 var(--sans);letter-spacing:0;margin:0;color:var(--green-dark)}.chapter-kicker{font:600 .9rem/1.5 var(--sans);color:var(--red);margin:.6rem 0 0}.chapter-description{grid-column:2;margin:1.4rem 0 0;color:var(--muted);max-width:36rem}.chapter-section{padding-top:4rem;scroll-margin-top:1.5rem}.section-header{display:grid;grid-template-columns:5.8rem 1fr;gap:1rem;padding-bottom:1.2rem;border-bottom:2px solid var(--green)}.section-header>p{margin:.2rem 0 0;font:700 .76rem/1.4 var(--sans);color:var(--red)}.section-header h3{margin:0;font:700 1.45rem/1.35 var(--sans);color:var(--green-dark)}.section-header span{display:block;margin-top:.45rem;font:.78rem/1.6 var(--sans);color:var(--muted);max-width:38rem}.qa{padding:3rem 0;border-bottom:1px solid var(--rule);scroll-margin-top:2rem}.qa[hidden],.chapter-section[hidden]{display:none}.qa h4{display:grid;grid-template-columns:5.8rem 1fr;gap:1rem;margin:0 0 1.8rem;font:700 1.15rem/1.75 var(--sans);letter-spacing:0}.q-mark,.a-mark{font:700 .72rem/1.5 var(--sans);color:var(--red);white-space:nowrap;padding-top:.38rem}.answer{display:grid;grid-template-columns:5.8rem 1fr;gap:1rem}.answer p{margin:0 0 1em}.answer p:last-child{margin-bottom:0}.qa footer{display:flex;flex-wrap:wrap;gap:.35rem 1rem;margin:1.6rem 0 0 6.8rem;font:.68rem/1.5 var(--sans);color:var(--muted)}.qa footer a{color:var(--green)}.review-flag,.excerpt-flag{color:var(--red)}
    .sources{padding:7rem 0 3rem}.source-list{list-style:none;padding:0;margin:2rem 0}.source-list li{display:grid;grid-template-columns:minmax(14rem,1fr) minmax(12rem,1fr);gap:1rem;padding:1.2rem 0;border-top:1px solid var(--rule);scroll-margin-top:2rem}.source-list strong,.source-list span{display:block}.source-list strong{font:700 .85rem/1.5 var(--sans)}.source-list span{font:.68rem/1.5 var(--sans);color:var(--muted)}.colophon{font-size:.85rem;color:var(--muted);border-top:4px solid var(--green);padding-top:2rem}
    @media(max-width:850px){body{font-size:17px}.cover{min-height:88svh}.cover-image{object-position:60% center}.shell{display:block;padding-top:2rem}.rail{position:relative;top:auto;max-height:none;overflow:visible;padding:0 0 3rem}.toc{columns:2;column-gap:1.5rem}.toc li{break-inside:avoid}.stats{grid-template-columns:1fr}.qa h4,.answer,.section-header{grid-template-columns:1fr;gap:.5rem}.q-mark,.a-mark{padding:0}.qa footer{margin-left:0}.source-list li{grid-template-columns:1fr}.chapter{padding-top:4.5rem}.chapter-section{padding-top:3rem}}
    @media(max-width:520px){.cover{padding:1.5rem;min-height:86svh}.cover h1{font-size:3.4rem}.toc{columns:1}.chapter-header{column-gap:.7rem}.chapter-header h2{font-size:2.2rem}.qa{padding:2.4rem 0}.qa h4{font-size:1.05rem}.section-header h3{font-size:1.28rem}}
    @media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
    @media print{@page{size:160mm 240mm;margin:18mm 17mm 20mm}body{background:#fff;font-size:10.5pt}.cover{height:240mm;min-height:0;margin:-18mm -17mm -20mm;padding:24mm;break-after:page}.shell{display:block;max-width:none;margin:0;padding:0}.rail{display:none}.frontmatter{break-after:page}.chapter{break-before:page;padding-top:0}.chapter-header,.section-header{break-after:avoid}.chapter-section{padding-top:9mm}.qa{break-inside:auto;padding:8mm 0}.qa h4{break-after:avoid}.qa footer{margin-left:0}.sources{break-before:page}.source-list li{break-inside:avoid}.stats,.guide{break-inside:avoid}a{text-decoration:none;color:inherit}}
  </style>
</head>
<body>
  <header class="cover" id="top">
    <img class="cover-image" src="${coverUri}" alt="" aria-hidden="true">
    <div class="cover-copy">
      <h1>芒格<br>问答录</h1>
      <p class="subtitle">${escapeHtml(SUBTITLE)}</p>
      <p class="edition"><span>${book.metadata.edition} · ${book.stats.startYear}-${book.stats.endYear}</span><span>据 website_munger 中文语料整理</span></p>
    </div>
  </header>
  <div class="shell">
    <nav class="rail" aria-label="全书目录">
      <h2>${TITLE}</h2>
      <div class="search"><label for="book-search">搜索全书</label><input id="book-search" type="search" autocomplete="off" placeholder="问题、答案或来源"><p class="search-status" aria-live="polite">共 ${book.stats.questionCount} 问</p></div>
      <ol class="toc">${toc}</ol>
    </nav>
    <main>
      <section class="frontmatter" id="editorial-note">
        <h2>给读者的话</h2>
        <p class="lede">这一版从 ${book.stats.selectedFromCount} 组可用问答中精选 ${book.stats.questionCount} 组。全书按普通读者理解价值投资的顺序，重编为 ${book.chapters.length} 章、${book.chapters.reduce((total, chapter) => total + chapter.sections.length, 0)} 个递进小节；重复观点、过时时评、公司琐事和现场闲话均不收入正文。</p>
        <div class="stats"><div><strong>${book.stats.questionCount}</strong><span>组精选问答</span></div><div><strong>${book.stats.sourceCount}</strong><span>篇原始材料</span></div><div><strong>${book.chapters.length}</strong><span>个阅读章节</span></div></div>
        <h3>七句编者提要</h3>
        <ol class="guide">${book.guide.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>
        <p class="note"><strong>编辑边界：</strong>回答保留本仓库中文语料的原句。对少数长回答，只删去旁支故事、重复铺陈或其他说话人的内容，并标明“回答为本版节选”。冗长提问删去寒暄与时事背景，个别访谈提示改成简短问句。每条均保留来源与行号。这里的“原文”指本仓库保存的中文翻译或整理文本，不等于出版机构校订的英文权威译本。</p>
      </section>
      ${chapters}
      <section class="sources" id="sources">
        <h2>来源索引</h2>
        <p>行号以本版生成时的仓库文件为准。</p>
        <ol class="source-list">${sources}</ol>
        <p class="colophon">整理日期：${book.metadata.buildDate}。封面为生成式编辑插画，不是历史照片。内容来自本地 website_munger 语料库。</p>
      </section>
    </main>
  </div>
  <script>
    const search = document.querySelector('#book-search');
    const status = document.querySelector('.search-status');
    const items = [...document.querySelectorAll('[data-qa]')];
    const sections = [...document.querySelectorAll('[data-section]')];
    const chapters = [...document.querySelectorAll('[data-chapter]')];
    search.addEventListener('input', () => {
      const query = search.value.trim().toLocaleLowerCase('zh-CN');
      let visible = 0;
      for (const item of items) {
        const show = !query || item.dataset.search.includes(query);
        item.hidden = !show;
        if (show) visible += 1;
      }
      for (const section of sections) section.hidden = !section.querySelector('[data-qa]:not([hidden])');
      for (const chapter of chapters) chapter.hidden = !chapter.querySelector('[data-section]:not([hidden])');
      status.textContent = query ? '找到 ' + visible + ' 问' : '共 ' + items.length + ' 问';
    });
  </script>
</body>
</html>`;
  return html.replace(/[ \t]+$/gm, "");
}

function xhtmlPage(title, body, cssHref = "../styles/book.css") {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="zh-CN" lang="zh-CN">
<head><meta charset="utf-8"/><title>${escapeHtml(title)}</title><link rel="stylesheet" type="text/css" href="${cssHref}"/></head>
<body>${body}</body>
</html>`;
}

function writeEpub(book) {
  const epubRoot = path.join(TMP_DIR, "epub");
  fs.rmSync(epubRoot, { recursive: true, force: true });
  fs.mkdirSync(path.join(epubRoot, "META-INF"), { recursive: true });
  fs.mkdirSync(path.join(epubRoot, "OEBPS", "text"), { recursive: true });
  fs.mkdirSync(path.join(epubRoot, "OEBPS", "styles"), { recursive: true });
  fs.mkdirSync(path.join(epubRoot, "OEBPS", "images"), { recursive: true });
  fs.writeFileSync(path.join(epubRoot, "mimetype"), "application/epub+zip");
  fs.writeFileSync(path.join(epubRoot, "META-INF", "container.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`);
  fs.copyFileSync(COVER_PATH, path.join(epubRoot, "OEBPS", "images", "cover.png"));

  const css = `body{font-family:"Songti SC","STSong","Noto Serif CJK SC",serif;line-height:1.75;color:#17201d;margin:5%;letter-spacing:0}h1,h2,h3,h4,.label,.source,.kicker,.section-number{font-family:"Hiragino Sans GB","PingFang SC",sans-serif}h1{font-size:2.4em;color:#0d2d25}h2{font-size:1.55em;color:#0d2d25;border-bottom:.14em solid #174c3d;padding-bottom:.3em;margin-top:2.6em}h3{font-size:1.05em;line-height:1.65}.section-kicker{color:#61706a;font-size:.86em}.kicker,.label,.excerpt,.section-number{color:#a63b32}.qa{margin:2.2em 0;padding-bottom:2em;border-bottom:1px solid #cbd5d0}.answer{margin-left:1em}.source{font-size:.7em;color:#61706a}.note{border-left:.25em solid #a63b32;padding-left:1em}.guide li{margin:.65em 0}.cover{margin:0;text-align:center}.cover img{max-width:100%;max-height:95vh}.toc li{margin:.6em 0}.sources li{margin:1em 0}.sources code{font-size:.75em;overflow-wrap:anywhere}`;
  fs.writeFileSync(path.join(epubRoot, "OEBPS", "styles", "book.css"), css);

  fs.writeFileSync(path.join(epubRoot, "OEBPS", "text", "cover.xhtml"), xhtmlPage("封面", `<div class="cover"><img src="../images/cover.png" alt="${TITLE}封面插画"/></div>`));
  const titleBody = `<section><h1>${TITLE}</h1><p class="kicker">${escapeHtml(SUBTITLE)}</p><p>${book.stats.startYear}-${book.stats.endYear} · ${book.stats.questionCount} 问 · ${book.stats.sourceCount} 篇来源</p><h2>给读者的话</h2><p>这一版从 ${book.stats.selectedFromCount} 组可用问答中精选 ${book.stats.questionCount} 组，按普通读者理解价值投资的顺序，重编为 ${book.chapters.length} 章、${book.chapters.reduce((total, chapter) => total + chapter.sections.length, 0)} 个递进小节。重复观点、过时时评、公司琐事和现场闲话均不收入正文。</p><h2>七句编者提要</h2><ol class="guide">${book.guide.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol><p class="note">回答保留本仓库中文语料的原句。少数长回答只删去旁支故事、重复铺陈或其他说话人的内容，并标明“回答为本版节选”。冗长提问删去寒暄与时事背景，个别访谈提示改成简短问句。“原文”指本仓库保存的中文翻译或整理文本。</p></section>`;
  fs.writeFileSync(path.join(epubRoot, "OEBPS", "text", "title.xhtml"), xhtmlPage("给读者的话", titleBody));

  const chapterItems = [];
  for (const chapter of book.chapters) {
    const fileName = `chapter-${String(chapter.number).padStart(2, "0")}.xhtml`;
    const sectionBodies = chapter.sections.map((section) => `<section><h2><span class="section-number">${chapter.number}.${section.number}</span> ${escapeHtml(section.title)}</h2><p class="section-kicker">${escapeHtml(section.description)}</p>${section.items.map((qa) => `<article class="qa" id="${qa.id}"><h3><span class="label">问 ${String(qa.number).padStart(3, "0")}</span> ${escapeHtml(qa.question)}</h3><div class="answer"><p class="label">答</p>${renderParagraphs(qa.answer).replace(/<br>/g, "<br/>")}</div><p class="source">${escapeHtml(qa.sourceYear)} · ${escapeHtml(qa.sourceTitle)} · 原文件第 ${qa.questionLine} 行${qa.answerExcerpted ? " · 回答为本版节选" : ""}${qa.noteFlag ? " · 含编者或译者提示" : ""}</p></article>`).join("")}</section>`).join("");
    const body = `<section><h1>${chapter.number}. ${escapeHtml(chapter.title)}</h1><p class="kicker">${escapeHtml(chapter.kicker)}</p><p>${escapeHtml(chapter.description)}</p>${sectionBodies}</section>`;
    fs.writeFileSync(path.join(epubRoot, "OEBPS", "text", fileName), xhtmlPage(chapter.title, body));
    chapterItems.push({ id: `chapter-${chapter.number}`, fileName, title: chapter.title });
  }

  const sourcesBody = `<section><h1>来源索引</h1><p>行号以本版生成时的仓库文件为准。</p><ol class="sources">${book.sources.map((source) => `<li id="${source.id}"><strong>${escapeHtml(source.year)} · ${escapeHtml(source.title)}</strong><br/><span>${source.count} 问 · ${escapeHtml(source.type)}</span><br/><code>${escapeHtml(source.path)}</code></li>`).join("")}</ol><p>整理日期：${book.metadata.buildDate}。封面为生成式编辑插画，不是历史照片。</p></section>`;
  fs.writeFileSync(path.join(epubRoot, "OEBPS", "text", "sources.xhtml"), xhtmlPage("来源索引", sourcesBody));

  const navLinks = chapterItems.map((item) => `<li><a href="text/${item.fileName}">${escapeHtml(item.title)}</a></li>`).join("");
  fs.writeFileSync(path.join(epubRoot, "OEBPS", "nav.xhtml"), xhtmlPage("目录", `<nav epub:type="toc" xmlns:epub="http://www.idpf.org/2007/ops"><h1>目录</h1><ol><li><a href="text/title.xhtml">给读者的话</a></li>${navLinks}<li><a href="text/sources.xhtml">来源索引</a></li></ol></nav>`, "styles/book.css"));

  const navPoints = [
    { id: "title", file: "title.xhtml", title: "给读者的话" },
    ...chapterItems.map((item) => ({ id: item.id, file: item.fileName, title: item.title })),
    { id: "sources", file: "sources.xhtml", title: "来源索引" }
  ];
  fs.writeFileSync(path.join(epubRoot, "OEBPS", "toc.ncx"), `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><head><meta name="dtb:uid" content="${escapeHtml(book.metadata.identifier)}"/></head><docTitle><text>${TITLE}</text></docTitle><navMap>${navPoints.map((item, index) => `<navPoint id="${item.id}" playOrder="${index + 1}"><navLabel><text>${escapeHtml(item.title)}</text></navLabel><content src="text/${item.file}"/></navPoint>`).join("")}</navMap></ncx>`);

  const modified = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const manifestChapters = chapterItems.map((item) => `<item id="${item.id}" href="text/${item.fileName}" media-type="application/xhtml+xml"/>`).join("");
  const spineChapters = chapterItems.map((item) => `<itemref idref="${item.id}"/>`).join("");
  fs.writeFileSync(path.join(epubRoot, "OEBPS", "content.opf"), `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id" xml:lang="zh-CN">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="book-id">${escapeHtml(book.metadata.identifier)}</dc:identifier><dc:title>${TITLE}</dc:title><dc:creator>查理·芒格</dc:creator><dc:contributor>website_munger 语料库</dc:contributor><dc:language>zh-CN</dc:language><dc:date>${book.metadata.buildDate}</dc:date><dc:description>${escapeHtml(SUBTITLE)}</dc:description><meta property="dcterms:modified">${modified}</meta><meta name="cover" content="cover-image"/></metadata>
<manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/><item id="css" href="styles/book.css" media-type="text/css"/><item id="cover-image" href="images/cover.png" media-type="image/png" properties="cover-image"/><item id="cover" href="text/cover.xhtml" media-type="application/xhtml+xml"/><item id="title" href="text/title.xhtml" media-type="application/xhtml+xml"/>${manifestChapters}<item id="sources" href="text/sources.xhtml" media-type="application/xhtml+xml"/></manifest>
<spine toc="ncx"><itemref idref="cover" linear="yes"/><itemref idref="title"/>${spineChapters}<itemref idref="sources"/></spine>
</package>`);

  fs.rmSync(EPUB_PATH, { force: true });
  execFileSync("zip", ["-X0", EPUB_PATH, "mimetype"], { cwd: epubRoot, stdio: "ignore" });
  execFileSync("zip", ["-Xr9", EPUB_PATH, "META-INF", "OEBPS"], { cwd: epubRoot, stdio: "ignore" });
}

function findPdfPython() {
  const candidates = [
    process.env.MUNGER_QA_PDF_PYTHON,
    "/Users/ruimin/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3",
    "python3"
  ].filter(Boolean);
  for (const candidate of candidates) {
    const result = spawnSync(candidate, ["-c", "import reportlab"], { stdio: "ignore" });
    if (result.status === 0) return candidate;
  }
  throw new Error("Python with reportlab was not found. Set MUNGER_QA_PDF_PYTHON.");
}

function main() {
  if (!fs.existsSync(COVER_PATH)) throw new Error(`Missing cover image: ${COVER_PATH}`);
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(PDF_DIR, { recursive: true });
  fs.mkdirSync(TMP_DIR, { recursive: true });

  const book = buildBookModel();
  fs.writeFileSync(BOOK_JSON_PATH, `${JSON.stringify(book, null, 2)}\n`);
  fs.writeFileSync(HTML_PATH, renderHtml(book));
  writeEpub(book);

  const pdfPython = findPdfPython();
  execFileSync(pdfPython, [path.join(SCRIPT_DIR, "render-munger-qa-pdf.py"), BOOK_JSON_PATH, COVER_PATH, PDF_PATH], {
    cwd: ROOT,
    stdio: "inherit"
  });

  console.log(JSON.stringify({
    ...book.stats,
    html: normalizePath(path.relative(ROOT, HTML_PATH)),
    epub: normalizePath(path.relative(ROOT, EPUB_PATH)),
    pdf: normalizePath(path.relative(ROOT, PDF_PATH))
  }, null, 2));
}

main();
