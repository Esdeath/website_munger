export interface ArticleShareInput {
  siteTitle: string;
  title: string;
  url: string;
  markdown: string;
  html: string;
}

export interface ArticleSharePayload {
  markdown: string;
  html: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildArticleSharePayload(input: ArticleShareInput): ArticleSharePayload {
  const markdownAttribution = `[${input.siteTitle}](${input.url}) · [${input.title}](${input.url})`;
  const escapedSiteTitle = escapeHtml(input.siteTitle);
  const escapedTitle = escapeHtml(input.title);
  const escapedUrl = escapeHtml(input.url);
  const htmlAttribution = `<p><strong>${escapedSiteTitle}</strong> · <a href="${escapedUrl}">${escapedTitle}</a></p>`;

  return {
    markdown: `${markdownAttribution}\n\n# ${input.title}\n\n${input.markdown.trim()}\n\n---\n\n${markdownAttribution}`,
    html: `<div>${htmlAttribution}<hr><h1>${escapedTitle}</h1>${input.html.trim()}<hr>${htmlAttribution}</div>`
  };
}
