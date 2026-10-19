// The readable pages inside a "Download your information" zip in HTML format:
// one index.html per category and one at the root. A stored record is drawn
// as headings, label/value lists and plain lists; every string from storage
// is escaped, so nothing stored can become markup. These pages are files on
// the person's disk, not app screens, so their small stylesheet is their own.
// Pure; relative imports only.

const MS_FROM = Date.UTC(2000, 0, 1);
const MS_TO = Date.UTC(2100, 0, 1);
const MAX_DEPTH = 7;

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** "createdAt" → "Created at", "productName" → "Product name". */
export function humanKey(key: string): string {
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase();
  const words = spaced.replace(/\b(ai|pcb|id|nft|url|kyc)\b/g, (w) => w.toUpperCase());
  return words ? words[0].toUpperCase() + words.slice(1) : key;
}

const DATE_KEY = /(^at$|At$|^date$|Date$|^since$)/;
const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

function isDateValue(key: string | null, v: number): boolean {
  return key !== null && DATE_KEY.test(key) && v > MS_FROM && v < MS_TO;
}

function renderValue(v: unknown, key: string | null, depth: number): string {
  if (v === null || v === undefined || v === "") return `<span class="none">None</span>`;
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "number") return isDateValue(key, v) ? escapeHtml(DATE_FORMAT.format(v).replace("Sept", "Sep")) : escapeHtml(String(v));
  if (typeof v === "string") {
    if (/^data:image\//.test(v)) return `<span class="none">An image (${Math.round(v.length / 1365)} KB)</span>`;
    if (v.length > 120 || v.includes("\n")) return `<pre>${escapeHtml(v)}</pre>`;
    return escapeHtml(v);
  }
  if (depth >= MAX_DEPTH) return `<pre>${escapeHtml(JSON.stringify(v, null, 2))}</pre>`;
  if (Array.isArray(v)) {
    if (!v.length) return `<span class="none">None</span>`;
    if (v.every((x) => x === null || typeof x !== "object")) return v.map((x) => renderValue(x, key, depth + 1)).join(", ");
    return `<ol>${v.map((x) => `<li>${renderValue(x, null, depth + 1)}</li>`).join("")}</ol>`;
  }
  if (typeof v === "object") {
    const entries = Object.entries(v as Record<string, unknown>);
    if (!entries.length) return `<span class="none">None</span>`;
    return `<dl>${entries.map(([k, x]) => `<dt>${escapeHtml(humanKey(k))}</dt><dd>${renderValue(x, k, depth + 1)}</dd>`).join("")}</dl>`;
  }
  return escapeHtml(String(v));
}

const STYLE = `
:root{color-scheme:light dark;--ink:#1f1f29;--soft:#5d5d6e;--line:#e4e4ea;--page:#ffffff;--tint:#f6f6f9;--brand:#6b2fd6}
@media (prefers-color-scheme:dark){:root{--ink:#ececf1;--soft:#a7a7b5;--line:#33333f;--page:#14141a;--tint:#1d1d25;--brand:#b18cff}}
body{margin:0;background:var(--page);color:var(--ink);font:15px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:960px;margin:0 auto;padding:32px 20px 64px}
h1{font-size:26px;line-height:1.3;margin:0 0 4px}h2{font-size:19px;margin:32px 0 8px;border-top:1px solid var(--line);padding-top:24px}
p.meta{color:var(--soft);margin:0 0 24px}a{color:var(--brand)}
dl{display:grid;grid-template-columns:minmax(120px,max-content) 1fr;gap:4px 16px;margin:4px 0}
dt{color:var(--soft)}dd{margin:0;min-width:0;overflow-wrap:anywhere}
ol,ul{margin:4px 0;padding-left:22px}li{margin:6px 0;padding:8px 12px;background:var(--tint);border-radius:8px}
ul.files li,ul.cats li{background:none;padding:0}
pre{white-space:pre-wrap;overflow-wrap:anywhere;background:var(--tint);padding:8px 12px;border-radius:8px;margin:0;font:13px/1.5 ui-monospace,Menlo,monospace}
.none{color:var(--soft)}`;

function page(title: string, meta: string, body: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${escapeHtml(title)}</title><style>${STYLE}</style></head>
<body><main><h1>${escapeHtml(title)}</h1><p class="meta">${escapeHtml(meta)}</p>${body}</main></body></html>
`;
}

export type HtmlRecord = { name: string; value: unknown };

/** A category's index.html: each record under its own heading, then the files beside it. */
export function categoryPage(title: string, meta: string, records: readonly HtmlRecord[], files: readonly string[]): string {
  const parts = records.map((r) => `<h2>${escapeHtml(humanKey(r.name))}</h2>${renderValue(r.value, null, 0)}`);
  if (files.length) {
    parts.push(
      `<h2>Files</h2><ul class="files">${files.map((f) => `<li><a href="${escapeHtml(encodeURI(f))}">${escapeHtml(f)}</a></li>`).join("")}</ul>`,
    );
  }
  if (!parts.length) parts.push(`<p class="none">Nothing in this category for the dates you chose.</p>`);
  return page(title, meta, parts.join("\n"));
}

/** The root index.html: what the file holds, with a link to each category. */
export function rootPage(meta: string, cats: readonly { label: string; href: string; note: string }[]): string {
  const list = cats.length
    ? `<ul class="cats">${cats.map((c) => `<li><a href="${escapeHtml(encodeURI(c.href))}">${escapeHtml(c.label)}</a> <span class="none">${escapeHtml(c.note)}</span></li>`).join("")}</ul>`
    : `<p class="none">Nothing was chosen.</p>`;
  return page("Your IDEEZA information", meta, list);
}
