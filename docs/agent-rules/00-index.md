# Agent rules — index

Rules for any AI agent working in this repository. Written as instructions to
the agent; every rule is enforceable and most are verifiable.

| File | Covers |
|---|---|
| [10-scope-workflow.md](10-scope-workflow.md) | What to touch, when to ask, ticket flow, when to push |
| [20-code.md](20-code.md) | Store discipline, no-stubs, architecture, style |
| [30-verification.md](30-verification.md) | Definition of done: tsc + live-browser proof |
| [40-ui-ux.md](40-ui-ux.md) | Tokens, themes, one-home, menus, accessibility |
| [50-figma-to-code.md](50-figma-to-code.md) | Developing from a Figma file |

**Precedence:** a direct instruction from the user wins over everything; then
`CLAUDE.md` (its §5 is the living feature inventory — treat it as the source of
truth for what exists); then these files; then your defaults. `AGENTS.md`'s
Next.js warning applies to every task.
