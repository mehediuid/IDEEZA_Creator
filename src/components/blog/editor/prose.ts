// How a blog's body looks while it is written — the reading view's own
// element styles (U-ui-ds §5), so what the writer sees is what readers get:
// Body/MD 16/24, Heading H2 = DS H4 20/28, Subheading H3 = DS H5 18/26 (both
// re-paired on phones, where the size tokens shrink but line heights don't),
// lists with quiet markers, a quote with a left rule and no italic (Manrope has
// none), code in Roboto Mono 14/20 on the subtle ground, prose links
// underlined (brand ink alone is under 3:1 against body text). Spacing is the
// DS rhythm: 16 between blocks, 32 above a heading, 24 around a figure. Columns
// keep the same rhythm inside each column, and sit side by side from 600 px.

export const PROSE = [
  "min-h-[160px] break-words text-lg leading-lg text-text-primary outline-none [container-type:inline-size]",
  "[&>*+*]:mt-8 [&_[data-column]>*+*]:mt-8 [&_[data-column]>*+h2]:mt-12 [&_[data-column]>*+h3]:mt-8",
  "[&>*+h2]:mt-16 [&>*+h3]:mt-12 [&>h2+*]:mt-6 [&>h3+*]:mt-4",
  "[&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:leading-2xl max-md:[&_h2]:leading-xl",
  "[&_h3]:text-xl [&_h3]:font-semibold [&_h3]:leading-xl max-md:[&_h3]:leading-lg",
  "[&_ul]:list-disc [&_ul]:pl-12 [&_ol]:list-decimal [&_ol]:pl-12",
  "[&_li]:pl-2 [&_li+li]:mt-2 [&_li]:marker:text-text-tertiary [&_li>ul]:mt-2 [&_li>ol]:mt-2",
  "[&_blockquote]:border-0 [&_blockquote]:border-l-3 [&_blockquote]:border-solid [&_blockquote]:border-border-strong [&_blockquote]:pl-8",
  "[&_blockquote]:text-xl [&_blockquote]:leading-2xl max-md:[&_blockquote]:leading-lg [&_blockquote_p+p]:mt-6",
  "[&_pre]:overflow-x-auto [&_pre]:!whitespace-pre [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-solid [&_pre]:border-border [&_pre]:bg-bg-subtle [&_pre]:p-8",
  "[&_pre]:font-mono [&_pre]:text-md [&_pre]:leading-md",
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
