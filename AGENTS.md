<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Agent rules

Binding rules for AI agents working in this repo — read the ones that match
your task before starting (index: [docs/agent-rules/00-index.md](docs/agent-rules/00-index.md)):

- [Scope & workflow](docs/agent-rules/10-scope-workflow.md) — what to touch, when to ask, tickets, push policy
- [Code](docs/agent-rules/20-code.md) — no stubs, store discipline, architecture, style
- [Verification](docs/agent-rules/30-verification.md) — definition of done: `tsc` + live-browser proof
- [UI/UX](docs/agent-rules/40-ui-ux.md) — tokens, both themes, one-home, menus never clip
- [Figma → code](docs/agent-rules/50-figma-to-code.md) — developing from a Figma file

On conflict: the user's direct instruction wins, then `CLAUDE.md`
(§5 = the living feature inventory), then these files.
