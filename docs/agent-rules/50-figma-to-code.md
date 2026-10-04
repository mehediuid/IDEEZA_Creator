# Figma → code

How to develop a screen, component or flow from a Figma file.

## HARD RULES — no exceptions, no judgment calls
- **The design system is mandatory.** Every visual value on the built screen —
  color, spacing, radius, shadow, font size/weight, border — resolves to a
  design-system token (`src/styles/tokens.css`) or a design-system component.
  There is no "just this once" inline value.
- **Every token comes FROM the design system. You never write a token
  yourself.** No new `--*` variable, no local CSS variable standing in for
  one, no hex/px/rem literal doing a token's job — regardless of what the
  Figma file shows.
- **A Figma value with no matching token is a STOP, not a workaround.** Stop,
  report exactly which frame/node needs which value, and wait. Only the
  design-system owner / the user decides whether the DS gains a token or the
  design snaps to an existing one. Building the rest of the screen may
  continue; that value may not be approximated in the meantime.
- Violation check before claiming done: `grep` the diff for hex colors,
  `px` literals outside token definitions, and new `--` declarations — the
  diff must introduce **zero** of each.

## Source of truth
1. **Measure, never eyeball.** Get exact spacing/size/radius/weight from the
   Figma MCP (`get_design_context`, `get_screenshot`, `get_variable_defs`) or
   Inspect — no guessed pixels.
2. Keep the **node id in the code** near what it produced
   (`// Figma 445:204996`), so a design change can be traced to its code.
3. Design vs spec-doc conflict → **flag and ask**; never silently deviate.
4. States Figma doesn't draw (hover, focus, disabled, error, empty, loading)
   are still required — derive them from the register conventions or ask;
   never ship a control missing its states because "the design didn't show
   it".

## Translation
5. **No raw hex/px from Figma lands in code** (see HARD RULES). Map every
   colour to its design-system token. No token fits → stop and flag; a new
   token exists only after the DS owner approves it, and then it is defined
   in `tokens.css` with values for both themes — by that decision, never by
   your own initiative.
6. Spacing/radius/type map to the token scales; snap odd values to the
   nearest step. Minting a one-off value or a private variable is a hard-rule
   violation, not a shortcut.
7. Figma auto-layout → flex/grid with `gap`, not per-element margins.
8. Repeated elements in a frame → one component + data, never copy-pasted
   markup.
9. Prefer an existing design-system component over rebuilding what the frame
   shows; if the frame differs slightly from the component, reconcile with
   the designer instead of forking it.

## Behaviour
10. A Figma picture is not a product: every drawn control gets real logic
    (see 20-code.md rule 1), or a reasoned disabled state.
11. If an interactive prototype exists, its flow is the wiring spec. If not,
    write the state flow down and confirm it before building.
12. Replace placeholder/lorem copy with real copy — ask when content is
    unknown; never ship lorem.

## Fidelity verification (on top of 30-verification.md)
13. Compare the implemented screen against the Figma frame **side by side** —
    CDP screenshot vs `get_screenshot` — at each breakpoint and in both
    themes. Measure the diffs; "looks close" is not a check.
14. Responsive behaviour isn't in the file: decide wrap/scroll/fold in the
    design's spirit, then verify narrow widths. Overflowing or clipped text
    is a bug.
15. Deliver the screenshot pair (implementation vs Figma) with the report /
    ticket, so review doesn't require re-measuring.
16. Record which Figma file + version the work was built against (plan doc
    and commit body).
