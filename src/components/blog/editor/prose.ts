// How a blog's body looks while it is written — the reading view's own rules
// (article-body.tsx), so what the writer sees is what readers get. The type
// itself is the reader's `TYPE` ladder, put on each heading, quote and code
// block by the editor's nodes (extensions.ts): Body MD 16/24 at a reading
// measure, the body's Heading H3 24/32, its Subheading H4 20/28 (line heights
// re-paired on phones), quotes with a left rule and no italic (Manrope has
// none), code in Roboto Mono 14/20 on the subtle ground, bullets that change
// shape with depth, prose links underlined (brand ink alone is under 3:1
// against body text). What stays here is the rhythm, written for the editor's
// flat list of blocks: 16 between blocks, 32 above a heading, 24 around a figure.
// Columns keep the same rhythm inside each column, and sit side by side from 600 px.

export const PROSE = [
  "min-h-40 break-words text-lg leading-lg text-text-primary outline-none [container-type:inline-size]",
  // The reading measure for text; figures, columns and code keep the column's width.
  "[&>p]:max-w-prose [&>h2]:max-w-prose [&>h3]:max-w-prose [&>ul]:max-w-prose [&>ol]:max-w-prose [&>blockquote]:max-w-prose",
  "[&>p.text-center]:mx-auto [&>h2.text-center]:mx-auto [&>h3.text-center]:mx-auto [&>p.text-right]:ml-auto [&>h2.text-right]:ml-auto [&>h3.text-right]:ml-auto",
  "[&>*+*]:mt-8 [&_[data-column]>*+*]:mt-8 [&_[data-column]>*+h2]:mt-12 [&_[data-column]>*+h3]:mt-8",
  "[&>*+h2]:mt-16 [&>*+h3]:mt-12 [&>h2+*]:mt-6 [&>h3+*]:mt-4",
  "[&_ul]:list-disc [&_ul_ul]:list-[circle] [&_ul_ul_ul]:list-[square] [&_ul]:pl-12 [&_ol]:list-decimal [&_ol]:pl-12",
  "[&_li]:pl-2 [&_li+li]:mt-4 [&_li]:marker:text-text-tertiary [&_li>ul]:mt-4 [&_li>ol]:mt-4",
  "[&_blockquote]:border-0 [&_blockquote]:border-l-3 [&_blockquote]:border-solid [&_blockquote]:border-border-strong [&_blockquote]:pl-8 [&_blockquote_p+p]:mt-8",
  "[&_pre]:overflow-x-auto [&_pre]:!whitespace-pre [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-solid [&_pre]:border-border-subtle [&_pre]:bg-bg-subtle [&_pre]:p-8",
  "[&_:not(pre)>code]:rounded-sm [&_:not(pre)>code]:bg-bg-subtle [&_:not(pre)>code]:px-2 [&_:not(pre)>code]:font-mono [&_:not(pre)>code]:text-md",
  "[&_a]:text-text-link [&_a]:underline [&_a]:underline-offset-2",
  "[&>*+hr]:mt-12 [&>hr+*]:mt-12 [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-solid [&_hr]:border-border",
  "[&_hr.ProseMirror-selectednode]:border-border-focus",
  "[&>*+.blog-block]:mt-12 [&>.blog-block+*]:mt-12",
  // The placeholder ProseMirror's Placeholder extension marks on the empty line.
  "[&_.is-empty]:before:pointer-events-none [&_.is-empty]:before:float-left [&_.is-empty]:before:h-0 [&_.is-empty]:before:text-text-tertiary [&_.is-empty]:before:content-[attr(data-placeholder)]",
  "[&_[data-column]>p:has(>br:only-child)]:before:pointer-events-none [&_[data-column]>p:has(>br:only-child)]:before:float-left [&_[data-column]>p:has(>br:only-child)]:before:h-0 [&_[data-column]>p:has(>br:only-child)]:before:text-text-tertiary [&_[data-column]>p:has(>br:only-child)]:before:content-['Write…']",
  "[&_.ProseMirror-gapcursor]:after:border-t-[color:var(--color-text-primary)]",
].join(" ");
