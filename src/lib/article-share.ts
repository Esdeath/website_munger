export interface ArticleShareSource {
  title: string;
  url: string;
}

export interface ArticleSelection {
  html: string;
  text: string;
}

export interface ArticleCopyContent {
  html: string;
  text: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function buildArticleShareText(source: ArticleShareSource): string {
  return `${source.title}\n原文链接：${source.url}`;
}

export function buildFullArticleCopyText(source: ArticleShareSource, bodyText: string): string {
  return `${source.title}\n\n${bodyText.trim()}\n\n原文链接：${source.url}`;
}

export function buildFullArticleCopyHtml(source: ArticleShareSource, bodyHtml: string): string {
  const safeTitle = escapeHtml(source.title);
  const safeUrl = escapeHtml(source.url);

  return `<article style="color:#222;background-color:#fff"><h1>${safeTitle}</h1>${bodyHtml}<p>原文链接：<a href="${safeUrl}">${safeUrl}</a></p></article>`;
}

// 读者在正文里选中文字复制时，把标题 + 原文链接接在选区后面。
export function buildArticleCopyContent(
  source: ArticleShareSource,
  selection: ArticleSelection
): ArticleCopyContent {
  const safeTitle = escapeHtml(source.title);
  const safeUrl = escapeHtml(source.url);

  return {
    html: `${selection.html}<p>${safeTitle}<br>原文链接：<a href="${safeUrl}">${safeUrl}</a></p>`,
    text: `${selection.text}\n\n${buildArticleShareText(source)}`
  };
}

// 选区里的注释节点（Markdown 渲染的锚点、Vue 的 fragment 锚点）粘到别处是噪音。
function stripComments(root: HTMLElement): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT);
  const comments: Comment[] = [];
  while (walker.nextNode()) comments.push(walker.currentNode as Comment);
  for (const comment of comments) comment.remove();
}

const INLINE_STYLE_PROPERTIES = [
  "font-size",
  "font-weight",
  "font-style",
  "line-height",
  "text-align",
  "text-decoration-line",
  "white-space",
  "margin-top",
  "margin-bottom",
  "padding-left",
  "padding-right",
  "padding-top",
  "padding-bottom",
  "list-style-type",
  "border-collapse"
];

// 剪贴板拿不到站点 CSS，只保留排版样式，避免把深色主题的文字颜色带到白底编辑器。
export function buildStyledArticleBody(source: ArticleShareSource, root: HTMLElement): string {
  const body = root.cloneNode(true) as HTMLElement;
  const originals = [root, ...root.querySelectorAll<HTMLElement>("*")];
  const copies = [body, ...body.querySelectorAll<HTMLElement>("*")];

  copies.forEach((copy, index) => {
    const original = originals[index]!;
    const computed = getComputedStyle(original);
    for (const attribute of [...copy.attributes]) {
      if (
        attribute.name === "id" ||
        attribute.name === "class" ||
        attribute.name === "style" ||
        attribute.name.startsWith("data-")
      ) {
        copy.removeAttribute(attribute.name);
      }
    }
    for (const property of INLINE_STYLE_PROPERTIES) {
      copy.style.setProperty(property, computed.getPropertyValue(property));
    }
    if (copy.matches("td, th")) copy.style.border = "1px solid #ccc";
    if (copy.matches("blockquote")) copy.style.borderLeft = "3px solid #aaa";
    if (copy.matches("img")) copy.style.maxWidth = "100%";
    for (const attribute of ["href", "src"]) {
      const value = copy.getAttribute(attribute);
      if (value) copy.setAttribute(attribute, new URL(value, source.url).href);
    }
  });
  stripComments(body);

  return body.outerHTML;
}

export function buildFullArticleCopyContent(
  source: ArticleShareSource,
  root: HTMLElement
): ArticleCopyContent {
  return {
    html: buildFullArticleCopyHtml(source, buildStyledArticleBody(source, root)),
    text: buildFullArticleCopyText(source, root.innerText)
  };
}

// 只接管落在正文容器内的选区；选区跨出正文（比如连侧边栏一起框选）就返回 null 让浏览器默认复制。
export function buildSelectionCopyContent(
  source: ArticleShareSource,
  root: HTMLElement,
  selection: Selection
): ArticleCopyContent | null {
  if (selection.isCollapsed || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) return null;

  const text = selection.toString().trim();
  if (!text) return null;

  const holder = document.createElement("div");
  holder.append(range.cloneContents());
  stripComments(holder);

  return buildArticleCopyContent(source, { html: holder.innerHTML, text });
}
