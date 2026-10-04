# UI/UX rules

## Tokens & theming
1. **Tokens only** — never hardcode color, spacing, radius, shadow or font
   size. Use `--color-*`, `--spacing-*`, `--radius-*`, `--font-size-*`,
   `--elevation-*`, `--border-width-*` from `src/styles/tokens.css`.
2. Every surface works in **both themes** (`data-theme` +
   `prefers-color-scheme`). A new token gets values for both — and a new
   token exists only with the design-system owner's / user's approval; an
   agent never mints one on its own (see 50-figma-to-code.md HARD RULES).
3. Brand violet (`--color-violet-600`) marks **selection / active / primary
   only** — never decoration. Restrained palette (product register).

## Structure
4. **One control, one home.** Never duplicate a control across surfaces
   (DRC lives in the bottom panel, arrange in the right sidebar Position
   panel, tools in the left palette, checks on the top toolbar). If a row
   moves, its old home is removed in the same change.
5. **Menus, dropdowns and flyouts never clip** — portal to `<body>` with
   `position: fixed`, clamp into the viewport (flip left near the right edge,
   lift near the bottom). Context menus anchor at the cursor.
6. Reuse the shared classes — `.ix-tool`, `.ix-row`, `.ix-mi`, `.ix-menu`,
   `.ix-tab`, `.ix-pill`, `.ix-btn`, `.ix-seg` — instead of reinventing
   hover/active states. Reuse `components/ideeza/` controls (Button,
   Checkbox, SearchInput…) before writing new ones.
7. Icons via `<DsIcon>`; **one glyph per meaning** — two controls that do
   different things never share an icon.

## Behaviour
8. **Earned familiarity** — behave like Figma / EasyEDA / KiCad / Linear;
   no invented affordances for standard actions. But never copy EasyEDA's
   wording or dialog structure verbatim — use IDEEZA's own vocabulary.
9. **Contextual disable, not stubs** — grey a control with a reason when its
   precondition isn't met; light it up when it is. Empty states teach
   ("No nets yet — convert to PCB to generate").
10. Motion 150–250 ms ease-out, state feedback only, honour
    `prefers-reduced-motion`. No decorative choreography.
11. Every control keyboard-operable (focus + Space/Enter), hit targets
    ≥ 24 px, text contrast ≥ 4.5:1. Wide content scrolls in its own
    container; clipped text is a bug.
12. UI work goes through the `/impeccable` and `/ui-ux-pro-max` skills —
    never self-decide a layout for a new surface.
13. Deliberate product decisions stand until the user reverses them: the
    "Continue to Code" pill's destination, demo-only items (Load Sample
    Circuit) staying until the production cut, theme owned by
    Setting ▸ System.
