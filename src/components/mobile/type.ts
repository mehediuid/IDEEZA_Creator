// One mobile type scale: the 16 text roles every /m screen uses, so a role
// reads the same size and weight in every area. Use `className={cn(T.section,
// "…layout only…")}`; the only override a call site may add is another
// semantic colour (`cn(T.meta, "text-text-tertiary")`), never a size, leading,
// weight or tracking. A raw `text-<size>` outside this file is a smell the
// guard test (tests/projects/mobile-type-scale.test.mjs) counts down.
//
// The mobile Figma (fKXxJ25dXvxWWa0kCKeSF4) draws its text styles in the DS
// variables' default mode; inside /m the font tokens take their phone values,
// so each role names the class whose PHONE value is the Figma px:
//
//   hero         Heading/H2            28/36 semibold, tracking near   (AI home headline, 10706:1368)
//   amountHero   Heading/H2 size       28/36 semibold, tabular         (the one balance on a money screen)
//   display      Heading/H3            24/32 semibold, tracking slight (empty/error title M48/M49, plan price)
//   title        Heading/H4            20/28 semibold                  (project, product, creator name; sheet title)
//   screenTitle  Heading/H6            16/24 semibold                  (the top bar's title only)
//   section      Heading/H6            16/24 semibold                  (section heading, card title)
//   bodyStrong   Body/MD Medium        16/24 medium                    (toast title, alert title)
//   bodyLg       Body/MD               16/24 regular                   (M12 rows, pick-one rows, a 44 px field's value)
//   body         Body/SM               14/20 regular, secondary        (paragraphs, sheet description, settings row)
//   rowTitle     Body/SM Medium        14/20 medium                    (row title over a meta line, M14 tab, A03 Link MD)
//   name         Label/LG              14/20 semibold, tracking wide   (a name in a dense card)
//   meta         Body/XS               12/18 regular, secondary        (meta line, timestamp, group label)
//   caption      Caption/MD            12/16 regular, secondary        (chip, helper, error, A03 Link SM)
//   micro        Caption/SM            11/16 regular, secondary        (badge, tab-bar label, duration)
//   label        Label/MD              12/16 semibold, tracking wide   (a field's label)
//   overline     Label/SM              11/16 semibold caps, wider      (CONCEPT, BUILDING, REWARD — see Eyebrow)
//
// DS atoms (Button, TextInput, Tag, Badge, Avatar, StateCard) own their text
// and are never restyled at the call site.

export const T = {
  hero: "text-5xl leading-5xl font-semibold tracking-near text-text-primary",
  amountHero: "text-5xl leading-5xl font-semibold tabular-nums text-text-primary",
  display: "text-4xl leading-4xl font-semibold tracking-slight text-text-primary",
  title: "text-3xl leading-3xl font-semibold text-text-primary",
  screenTitle: "text-lg leading-lg font-semibold text-text-primary",
  section: "text-lg leading-lg font-semibold text-text-primary",
  bodyStrong: "text-lg leading-lg font-medium text-text-primary",
  bodyLg: "text-lg leading-lg text-text-primary",
  body: "text-md leading-md text-text-secondary",
  rowTitle: "text-md leading-md font-medium text-text-primary",
  name: "text-md leading-md font-semibold tracking-wide text-text-primary",
  meta: "text-sm leading-sm text-text-secondary",
  caption: "text-sm leading-xs text-text-secondary",
  micro: "text-xs leading-xs text-text-secondary",
  label: "text-sm leading-xs font-semibold tracking-wide text-[color:var(--color-input-label)]",
  overline: "text-xs leading-xs font-semibold tracking-wider uppercase text-text-brand",
} as const;

export type TypeRole = keyof typeof T;
