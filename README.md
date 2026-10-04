# IDEEZA Creator

A browser-based, AI-driven hardware-creation platform. A maker describes an
electronics idea; the AI drafts a **schematic, parts list and build steps**,
which the maker refines in a suite of editor modules, then mints the design
on-chain as a **Utility NFT** and shares or sells it through the community
feed and marketplace.

The deepest module is an EasyEDA-inspired **schematic + PCB editor** with a
native (KiCad-less) Schematic → PCB pipeline: pin-level netlist, footprints,
ratsnest, auto-placement, interactive and automatic routing, copper pour,
ERC/DRC engines and real manufacturing exports.

This is a real product, not a prototype. Every control does verified work.

## Quick start

Requirements: **Node 22** and **pnpm**. (npm also works with the same scripts.)

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

Other scripts:

```bash
pnpm build        # production build
pnpm start        # serve the production build
pnpm lint         # eslint
npx tsc --noEmit -p tsconfig.json   # type-check (must pass before any change is done)
```

There is no database. Project documents persist to the browser's
`localStorage` (keys are prefixed `ideeza:`), so a fresh browser profile
starts empty and the demo circuit seeds a new board.

## Optional environment

Everything runs with **no configuration**. The AI features use the free,
keyless Pollinations API by default and fall back to local rule-based replies
when it is unreachable. Create `.env.local` only to unlock the extras below.

| Variable | Effect |
|---|---|
| `KICAD_CLI` | Path to `kicad-cli`. Enables real Gerber and KiCad DRC export via `/api/kicad`. Also found on `PATH` and in the macOS app bundle automatically. Without it the route answers 501 with an install hint. |
| `MESHY_API_KEY` | Enables real AI-generated 3D models in the 3D module. Without it the module shows a sample mesh in demo mode. |
| `IMAGE_PROVIDER` | `pollinations` (default, free) or `openrouter` for the feed-thumbnail script. |
| `OPENROUTER_API_KEY`, `OPENROUTER_IMAGE_MODEL` | Only when `IMAGE_PROVIDER=openrouter`. |

Feed thumbnails for the Innovations page are pre-generated once and cached
under `public/innovations/`:

```bash
node scripts/generate-feed-images.mjs          # generate missing only
node scripts/generate-feed-images.mjs --force  # regenerate everything
```

## Tech stack

- **Next.js 16.2.9** (App Router) · **React 19** · **TypeScript**
- Styling: design tokens (`src/styles/tokens.css`), a Tailwind preset, per-module CSS
- Icons: `@hugeicons/react` with a raw-SVG fallback dictionary
- 3D: `three` + `@react-three/fiber` / `drei`
- Code module: `@monaco-editor/react` and `blockly`

> **This is a modified Next.js.** Next 16 has breaking changes relative to
> most training data and prior experience. Read `node_modules/next/dist/docs/`
> before writing Next-specific code. See [AGENTS.md](AGENTS.md).

## App map

**Platform**

| Route | What it is |
|---|---|
| `/` | Dashboard home. "What will you build today?" AI prompt: Generate with AI or Build manually. |
| `/projects` | My projects, with filters (All · Public · Contributed · Private · Draft · Utility NFT). |
| `/history` | Model generations and project/product generations. |
| `/innovations`, `/innovations/[slug]` | Community feed and project detail. |
| `/chat/[chatId]`, `/build/[jobId]` | AI concept chat and the build job it produces. |

**Per-project editor** at `/project/[projectSlug]/[step]`, where the step is
one of:

| Step | Module |
|---|---|
| `pcb` | Schematic + PCB editor (the largest module) |
| `code` | Firmware: Monaco IDE and Blockly visual editor |
| `3d` | Enclosure modelling with AI generation |
| `assembly` | Assembly |
| `wiring` | Peripheral wiring |
| `preview` | Product preview: three.js assembly with mates |
| `brief` | Add Brief: idea → video → mint → success |

**Server routes** under `src/app/api/`: `kicad` (Gerber/DRC via kicad-cli),
`ai-chat` (module assistants), `concept/generate` and `three/generate`
(image and 3D generation), `refine` (prompt enhancement), `build/*`,
`projects/*`, `feed`, `generate`.

## Repository layout

```
src/
  app/              Next App Router routes, layouts and API routes
  components/       UI grouped by module: pcb · code · 3d · preview · wiring ·
                    brief · create · dashboard · projects · newsfeed · ideeza (DS primitives)
  lib/              Logic and data with no heavy UI
    pcb/            The PCB engine: store, types, nets/ERC, DRC, schematic→PCB,
                    routing, copper pour, boolean geometry, exporters
  styles/           tokens.css · reset.css · Tailwind preset
scripts/            One-off maintenance scripts
docs/agent-rules/   Binding rules for AI agents working in this repo
```

The full annotated tree lives in [STRUCTURE.md](STRUCTURE.md).

## Documentation

- [CLAUDE.md](CLAUDE.md): the project guide. Section 5 is the **living feature
  inventory** and the source of truth for what exists and works. Sections 6 and 7
  hold the coding and UI/UX conventions.
- [STRUCTURE.md](STRUCTURE.md): where everything lives.
- [AGENTS.md](AGENTS.md) and [docs/agent-rules/](docs/agent-rules/00-index.md):
  scope, code, verification, UI/UX and Figma-to-code rules.

## Contributing

- **Real logic, never stubs.** No control that only shows a toast or sets a
  dead flag. Grey a control with a reason when its precondition is not met.
- **Tokens only.** Never hardcode colour, spacing, radius or shadow. Every
  surface works in both light and dark themes.
- **Store discipline** in the PCB module: `merge` for view state,
  `mergeWithHistory` for model changes that belong in undo/redo. New persisted
  state goes into the document type, the sanitizer and the save effect.
- **Menus never clip.** Flyouts portal to `<body>` with `position: fixed` and
  clamp into the viewport.
- **Definition of done:** `tsc --noEmit` passes **and** the behaviour is
  verified in a real browser. Update the feature inventory in `CLAUDE.md` in
  the same change.
- Keep diffs minimal and scoped to the task. No new dependencies without asking.
