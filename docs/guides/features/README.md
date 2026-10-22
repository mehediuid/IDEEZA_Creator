# Features done

> This folder is the living inventory (see [AGENTS.md › Keeping docs current](../../../AGENTS.md#keeping-docs-current-required)). It spans the **platform** and every
> **editor module**; the PCB module is documented deepest because it's the
> largest surface.

Moved verbatim from `CLAUDE.md` §5 on 2026-09-29 and split by area; each section keeps its original heading and order. Add, revise or delete the entry in the same change as the feature, and never list something that isn't working and browser-verified. Back to [docs/map/PRODUCT.md](../../map/PRODUCT.md).

| Area | Guide | Sections |
|---|---|---|
| Global shell, `/parts` home, Add Network & Connection Map, My projects / Project details, History, Innovations, minting | [platform-and-projects.md](platform-and-projects.md) | Platform & shell · Add Network & Connection Map · Projects, history & community |
| Settings: `/settings` and its pages, the side-nav, Find a setting, the preferences store | [settings.md](settings.md) | Shell · pages |
| Messages: `/messages`, the conversations between the demo people, Requests, entry points, the sidebar badge | [messages.md](messages.md) | Messages |
| Blog: `/blog`, the editor, Send for review, the demo review, the article page, review results in the bell | [blog.md](blog.md) | Blog |
| Tutorials: `/tutorials`, the topic pages, video rewards paid into the demo wallet | [tutorials.md](tutorials.md) | Tutorials |
| Tour Guide: the Welcome, the step-by-step chapters, the Tour Guide panel | [tour-guide.md](tour-guide.md) | Tour Guide |
| The Earn area: `/projects/<id>/earn` and its tabs (Overview, Sell, Business plan, Money) | [earn-layer.md](earn-layer.md) | Earn area · Tabs |
| Home prompt → concept chat → build → review, credits, companions, spec sheet, 3D tab, voice | [ai-create-flow.md](ai-create-flow.md) | AI create & build flow |
| `/parts`, `/parts/[id]`, the New Package flow, land patterns | [parts-package.md](parts-package.md) | Part authoring — New Package flow |
| Schematic canvas, palette, sheets, connectivity, ERC, netlist, annotation, sheet export | [pcb-schematic.md](pcb-schematic.md) | PCB module — schematic editor · Schematic connectivity, ERC, netlist & annotation |
| Board canvas, 3D view, board areas, teardrops, pour, authoring + Move, Schematic → PCB, routing, DRC | [pcb-board.md](pcb-board.md) | PCB 2D canvas — visualisation · PCB editor · Board areas · Teardrops · Copper pour · Board-document authoring · Native Schematic → PCB · Interactive routing · Native PCB DRC engine |
| Toolbars, exports, library window, menus, 3D menus, right/left/bottom panels, boolean geometry, context menus | [pcb-tools-menus-panels.md](pcb-tools-menus-panels.md) | Top toolbar · Right panel · Boolean / Combine geometry · Menu leaves · Right-click context menus · Left panel · Bottom panel · PCB module — misc |
| Code, 3D Module, Assembly (with its Wiring mode), Product Preview, the mint flow (the Brief) | [editor-modules.md](editor-modules.md) | Other editor modules |

*Not yet inventoried:* the **Assembly** module (`src/components/assembly/`, step `assembly` in `FLOW_STEPS`) has no entry; add one once it is browser-verified.
