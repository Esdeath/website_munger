#!/usr/bin/env node
/*
 * 芒格站：按「原文」分类与独立阅读页出书（EPUB + PDF）。
 *
 *   npm run book:library                 # 全部 4 本
 *   npm run book:library -- --only=munger-li-lu
 *
 * 产出：
 *   - munger-shareholders   股东会与股东信（shareholders/*.md，69 篇）
 *   - munger-speeches       演讲与访谈（speech/*.md，49 篇）
 *   - munger-li-lu          李录演讲和访谈（li-lu/*.md，15 篇）
 *   - munger-seeking-wisdom 探索智慧：从达尔文到芒格（public/sources/seeking-wisdom-中文版/reader.html）
 *
 * 排版：统一用本站墨韵配色与文楷字体；PDF 由 headless Chrome 打印，EPUB 用 zip 打包。
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const OUTPUT_EPUB = join(ROOT, "output/epub");
const OUTPUT_PDF = join(ROOT, "output/pdf");
const WORK = join(ROOT, "tmp/library-books");
const QR = join(ROOT, "public/images/zsxq-qr.png");
const FONT_DIR = join(ROOT, "public/fonts");

const SITE_LINKS = [
  ["段永平", "https://www.ayaseeri.com/"],
  ["芒格", "https://munger.ayaseeri.com/"],
  ["巴菲特", "https://buffett.ayaseeri.com/"],
  ["帕伯莱", "https://pabrai.ayaseeri.com/"],
];
const PLANET = "滚雪球的小部落";

const BOOKS = [
  {
    slug: "munger-shareholders",
    kind: "sources",
    dirCategory: "股东会与股东信",
    title: "芒格股东会与股东信",
    subtitle: "西科金融、每日期刊与蓝筹印花的股东会与年报，按年份排列",
    dirs: ["shareholders"],
  },
  {
    slug: "munger-speeches",
    kind: "sources",
    dirCategory: "演讲与访谈",
    title: "芒格演讲与访谈",
    subtitle: "历年演讲、访谈与公开对谈，按年份排列",
    dirs: ["speech"],
  },
  {
    slug: "munger-li-lu",
    kind: "sources",
    dirCategory: "李录演讲和访谈",
    title: "李录演讲和访谈",
    subtitle: "李录的公开演讲与访谈，按年份排列",
    dirs: ["li-lu"],
  },
  {
    slug: "munger-seeking-wisdom",
    kind: "reader-html",
    title: "探索智慧：从达尔文到芒格",
    subtitle: "皮特·贝弗林（Peter Bevelin）著 · 4 章 26 节 153 小节",
    html: join(ROOT, "public/sources/seeking-wisdom-中文版/reader.html"),
  },
];

const esc = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const cache = join(homedir(), ".cache/puppeteer/chrome-headless-shell");
  if (!existsSync(cache)) return "chrome";
  const version = readdirSync(cache).find((name) => existsSync(join(cache, name, "chrome-headless-shell-mac-arm64/chrome-headless-shell")));
  return version ? join(cache, version, "chrome-headless-shell-mac-arm64/chrome-headless-shell") : "chrome";
}

const chrome = findChrome();

function fontData(name) {
  const path = join(FONT_DIR, name);
  return existsSync(path) ? `data:font/woff2;base64,${readFileSync(path).toString("base64")}` : null;
}
const wenkai = fontData("lxgw-wenkai-tc-subset.woff2");
const latin = fontData("crimson-pro-latin.woff2");

const BOOK_CSS = `
@font-face { font-family: "W"; src: url("${wenkai ?? ""}") format("woff2"); font-display: swap; }
@font-face { font-family: "L"; src: url("${latin ?? ""}") format("woff2"); font-display: swap; }
:root { --ink:#2c2c2c; --muted:#6d6d6d; --rule:#dddddd; --paper:#f8f5f0; --accent:#b5462a; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #fff; color: var(--ink); }
body { font-family: "W", "Noto Serif SC", "Songti SC", serif; font-size: 16px; line-height: 1.85;
  -webkit-font-smoothing: antialiased; }
.cover { min-height: 96vh; display: flex; flex-direction: column; justify-content: center; align-items: center;
  text-align: center; padding: 12mm 10mm; page-break-after: always; }
.cover .kicker { font-family: "L", serif; letter-spacing: .3em; font-size: 12px; color: var(--muted); text-transform: uppercase; }
.cover h1 { margin: 8mm 0 4mm; font-size: 34px; line-height: 1.3; letter-spacing: .02em; }
.cover .subtitle { margin: 0 0 8mm; font-size: 15px; color: var(--muted); }
.cover .rule { width: 42mm; height: 2px; background: var(--accent); margin: 6mm 0; }
.cover .stats { margin: 0 0 10mm; font-size: 13px; color: var(--muted); }
.cover .sites { font-size: 12.5px; color: var(--muted); line-height: 2; }
.cover .qr { width: 34mm; height: 34mm; margin: 8mm auto 2mm; display: block; }
.cover .planet { font-size: 12.5px; color: var(--accent); }
.toc { page-break-after: always; padding: 4mm 0; }
.toc h2 { font-size: 20px; margin: 0 0 6mm; }
.toc ol { padding-left: 2.6em; margin: 0; }
.toc li { margin: 0 0 2mm; font-size: 13.5px; line-height: 1.6; }
.toc a { color: var(--ink); text-decoration: none; }
.chapter { padding-top: 2mm; }
.chapter + .chapter { page-break-before: always; }
h1, h2, h3, h4 { line-height: 1.45; }
.chapter h1 { font-size: 24px; margin: 0 0 3mm; }
.chapter .meta { margin: 0 0 6mm; padding-bottom: 3mm; border-bottom: 1px solid var(--rule);
  font-size: 12.5px; color: var(--muted); }
p { margin: 0 0 1em; }
blockquote { margin: 1.2em 0; padding: .2em 0 .2em 1em; border-left: 2px solid var(--accent); color: #444; }
table { border-collapse: collapse; width: 100%; margin: 1em 0; font-size: .9em; }
th, td { border: 1px solid var(--rule); padding: .4em; text-align: left; vertical-align: top; }
img { max-width: 100%; height: auto; }
hr { border: 0; border-top: 1px solid var(--rule); margin: 2em 0; }
@page { size: A4; margin: 18mm 16mm 20mm; }
@media print { .chapter { page-break-inside: auto; } }
`;

function coverHtml(book, statsLine) {
  const sites = SITE_LINKS.map(([name, url]) => `<div>${esc(name)}：${esc(url)}</div>`).join("");
  return `<section class="cover">
  <p class="kicker">MUNGER LIBRARY</p>
  <h1>${esc(book.title)}</h1>
  <p class="subtitle">${esc(book.subtitle)}</p>
  <div class="rule"></div>
  <p class="stats">${esc(statsLine)}</p>
  <div class="sites">${sites}</div>
  <img class="qr" src="${esc(QR)}" alt="知识星球二维码" />
  <p class="planet">知识星球：${esc(PLANET)}</p>
</section>`;
}

function tocHtml(chapters) {
  const items = chapters.map((chapter, index) => `<li><a href="#c${index + 1}">${esc(chapter.title)}</a></li>`).join("");
  return `<nav class="toc"><h2>目录</h2><ol>${items}</ol></nav>`;
}

const processor = remark().use(remarkGfm).use(remarkHtml, { sanitize: false });

function readSources(dirs) {
  const files = [];
  for (const dir of dirs) {
    const full = join(ROOT, dir);
    if (!existsSync(full)) continue;
    for (const name of readdirSync(full).filter((entry) => entry.endsWith(".md")).sort((a, b) => a.localeCompare(b, "zh-Hans-CN"))) {
      files.push({ dir, name, path: join(full, name) });
    }
  }
  return files.map((file) => {
    const text = readFileSync(file.path, "utf8");
    const heading = text.match(/^#\s+(.+)$/m)?.[1]?.trim();
    const year = (file.name.match(/(19|20)\d{2}/) ?? heading?.match(/(19|20)\d{2}/) ?? ["未标明"])[0];
    const title = heading ?? file.name.replace(/\.md$/, "");
    const body = text.replace(/^#\s+.+\n/, "");
    return { ...file, title, year, body };
  }).sort((a, b) => String(a.year).localeCompare(String(b.year)) || a.title.localeCompare(b.title, "zh-Hans-CN"));
}

async function buildSourcesBook(book) {
  const sources = readSources(book.dirs);
  const chapters = [];
  for (const [index, source] of sources.entries()) {
    let html = String(await processor.process(source.body));
    html = html.replace(/^\s*<h1[^>]*>[\s\S]*?<\/h1>\s*/i, "");
    chapters.push({ id: `c${index + 1}`, title: source.title, meta: `${source.year} · ${book.dirCategory}`, html });
  }
  return {
    title: book.title,
    subtitle: book.subtitle,
    statsLine: `${sources.length} 篇原文 · ${book.dirCategory}`,
    chapters,
  };
}

function stripReaderChrome(html) {
  return html
    .replace(/<div class="bar"[\s\S]*?<\/div>\s*<\/div>/i, "")
    .replace(/<aside[\s\S]*?<\/aside>/i, "")
    .replace(/<div class="drawer"[\s\S]*?<\/div>/i, "");
}

function buildReaderBook(book) {
  const raw = readFileSync(book.html, "utf8");
  const style = raw.match(/<style>([\s\S]*?)<\/style>/i)?.[1] ?? "";
  let body = raw.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? raw;
  body = stripReaderChrome(body);
  const main = body.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? body;

  const chunks = main.split(/(?=<h2[\s>])/i);
  const chapters = [];
  for (const chunk of chunks) {
    const heading = chunk.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)?.[1] ?? "";
    const title = heading.replace(/<[^>]+>/g, "").replace(/\s*p\.?\s*\d+\s*$/i, "").trim();
    if (!title) continue;
    chapters.push({ id: `c${chapters.length + 1}`, title, meta: "探索智慧", html: chunk });
  }
  return { title: book.title, subtitle: book.subtitle, statsLine: `${chapters.length} 章 · 约 490 页`, chapters, legacyStyle: style };
}

function renderBookHtml(model) {
  const legacy = model.legacyStyle ? `<style>${model.legacyStyle}</style>` : "";
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8" /><title>${esc(model.title)}</title>
<style>${BOOK_CSS}</style>${legacy}<style>${model.legacyStyle ? ".bar,.menu-btn,.search,.sidebar,.drawer{display:none!important}" : ""}</style>
</head><body>
${coverHtml(model, model.statsLine)}
${tocHtml(model.chapters)}
${model.chapters.map((chapter) => `<section class="chapter" id="${chapter.id}"><h1>${esc(chapter.title)}</h1><p class="meta">${esc(chapter.meta)}</p>${chapter.html}</section>`).join("\n")}
</body></html>`;
}

function printPdf(htmlPath, pdfPath) {
  execFileSync(chrome, ["--no-sandbox", "--disable-gpu", "--headless", "--no-pdf-header-footer", `--print-to-pdf=${pdfPath}`, `file://${htmlPath}`], { stdio: "pipe" });
  if (!existsSync(pdfPath)) throw new Error(`PDF 未生成：${pdfPath}`);
}

const XHTML = `<?xml version="1.0" encoding="utf-8"?>`;
const xhtmlPage = (title, bodyHtml) =>
  `${XHTML}<html xmlns="http://www.w3.org/1999/xhtml" lang="zh-CN" xml:lang="zh-CN"><head><meta charset="utf-8"/><title>${esc(title)}</title><link rel="stylesheet" type="text/css" href="../styles/book.css"/></head><body>${bodyHtml}</body></html>`;

function writeEpub(model, slug) {
  const epubRoot = join(WORK, slug, "epub");
  rmSync(epubRoot, { recursive: true, force: true });
  mkdirSync(join(epubRoot, "META-INF"), { recursive: true });
  mkdirSync(join(epubRoot, "OEBPS/text"), { recursive: true });
  mkdirSync(join(epubRoot, "OEBPS/styles"), { recursive: true });
  mkdirSync(join(epubRoot, "OEBPS/images"), { recursive: true });

  writeFileSync(join(epubRoot, "mimetype"), "application/epub+zip");
  writeFileSync(join(epubRoot, "META-INF/container.xml"), `${XHTML}<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`);
  writeFileSync(join(epubRoot, "OEBPS/styles/book.css"), BOOK_CSS);
  writeFileSync(join(epubRoot, "OEBPS/images/zsxq-qr.png"), readFileSync(QR));
  writeFileSync(join(epubRoot, "OEBPS/text/cover.xhtml"), xhtmlPage("封面", `<section class="cover"><p class="kicker">MUNGER LIBRARY</p><h1>${esc(model.title)}</h1><p class="subtitle">${esc(model.subtitle)}</p><div class="rule"></div><p class="stats">${esc(model.statsLine)}</p><div class="sites">${SITE_LINKS.map(([n, u]) => `<div>${esc(n)}：${esc(u)}</div>`).join("")}</div><img class="qr" src="../images/zsxq-qr.png" alt="知识星球二维码"/><p class="planet">知识星球：${esc(PLANET)}</p></section>`));

  const files = model.chapters.map((chapter, index) => {
    const name = `text/ch-${String(index + 1).padStart(2, "0")}.xhtml`;
    writeFileSync(join(epubRoot, "OEBPS", name), xhtmlPage(chapter.title, `<section class="chapter"><h1>${esc(chapter.title)}</h1><p class="meta">${esc(chapter.meta)}</p>${chapter.html}</section>`));
    return { name, title: chapter.title, id: `ch${index + 1}` };
  });

  writeFileSync(join(epubRoot, "OEBPS/nav.xhtml"), xhtmlPage("目录", `<nav epub:type="toc" xmlns:epub="http://www.idpf.org/2007/ops"><h1>目录</h1><ol><li><a href="text/cover.xhtml">封面</a></li>${files.map((f) => `<li><a href="${f.name}">${esc(f.title)}</a></li>`).join("")}</ol></nav>`));
  writeFileSync(join(epubRoot, "OEBPS/toc.ncx"), `${XHTML}<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><head><meta name="dtb:uid" content="${esc(slug)}"/><meta name="dtb:depth" content="1"/></head><docTitle><text>${esc(model.title)}</text></docTitle><navMap>${files.map((f, i) => `<navPoint id="n${i + 1}" playOrder="${i + 1}"><navLabel><text>${esc(f.title)}</text></navLabel><content src="${f.name}"/></navPoint>`).join("")}</navMap></ncx>`);

  const manifest = files.map((f) => `<item id="${f.id}" href="${f.name}" media-type="application/xhtml+xml"/>`).join("");
  const spine = files.map((f) => `<itemref idref="${f.id}"/>`).join("");
  writeFileSync(join(epubRoot, "OEBPS/content.opf"), `${XHTML}<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="bookid">${esc(slug)}</dc:identifier><dc:title>${esc(model.title)}</dc:title><dc:language>zh-CN</dc:language><dc:description>${esc(model.subtitle)}</dc:description><meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d{3}Z$/, "Z")}</meta></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/><item id="css" href="styles/book.css" media-type="text/css"/><item id="qr" href="images/zsxq-qr.png" media-type="image/png"/><item id="cover" href="text/cover.xhtml" media-type="application/xhtml+xml"/>${manifest}</manifest><spine toc="ncx"><itemref idref="cover"/>${spine}</spine></package>`);

  const epubPath = join(OUTPUT_EPUB, `${slug}.epub`);
  rmSync(epubPath, { force: true });
  execFileSync("zip", ["-X0", epubPath, "mimetype"], { cwd: epubRoot, stdio: "ignore" });
  execFileSync("zip", ["-Xr9", epubPath, "META-INF", "OEBPS"], { cwd: epubRoot, stdio: "ignore" });
  execFileSync("unzip", ["-tqq", epubPath], { stdio: "ignore" });
  return epubPath;
}

async function main() {
  const only = process.argv.find((arg) => arg.startsWith("--only="))?.slice(7).split(",").map((v) => v.trim()).filter(Boolean);
  mkdirSync(OUTPUT_EPUB, { recursive: true });
  mkdirSync(OUTPUT_PDF, { recursive: true });
  mkdirSync(WORK, { recursive: true });

  for (const book of BOOKS) {
    if (only && !only.includes(book.slug)) continue;
    console.log(`\n=== ${book.title} ===`);
    const model = book.kind === "sources" ? await buildSourcesBook(book) : buildReaderBook(book);
    const html = renderBookHtml(model);
    const workDir = join(WORK, book.slug);
    mkdirSync(workDir, { recursive: true });
    const htmlPath = join(workDir, `${book.slug}.html`);
    writeFileSync(htmlPath, html);

    const pdfPath = join(OUTPUT_PDF, `${book.slug}.pdf`);
    printPdf(htmlPath, pdfPath);
    const pdfSize = (readFileSync(pdfPath).length / 1024 / 1024).toFixed(1);
    const epubPath = writeEpub(model, book.slug);
    const epubSize = (readFileSync(epubPath).length / 1024 / 1024).toFixed(1);
    console.log(`✓ ${model.chapters.length} 章 | PDF ${pdfSize} MB | EPUB ${epubSize} MB`);
    console.log(`  ${epubPath}\n  ${pdfPath}`);
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
