# Operations map — build, test, deploy, configuration

Commands every change runs are in [AGENTS.md › Running & verifying](../../AGENTS.md#running--verifying). Env files and secret stores are never opened or quoted here: names only.

| Task | Where | Notes |
|---|---|---|
| Local setup | `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` | pnpm; no new dependency without asking the owner |
| Run the app | `npm run dev` → `http://localhost:3000` | `next.config.ts` (turbopack root, dev indicator) |
| Type-check | `npx tsc --noEmit -p tsconfig.json` | Must pass; `src/lib/pcb/data.tsx` is `@ts-nocheck` |
| Lint | `npm run lint` | `eslint.config.mjs` |
| Unit tests | `npm run test:projects` | [tests/projects/](../../tests/projects/) — `node:test` over `src/lib` compiled to `.tmp-test/` (ignored) by `tests/projects/tsconfig.json`; fixtures in `tests/projects/fixtures/` |
| Browser verification | headless Chrome over CDP | Required before "done"; harness scripts live in session scratchpads, not in the repo |
| Before a PR / merge | tsc + lint + `test:projects` + browser verification | Update the features guide in the same change |
| CI | none in the repo | No `.github/` workflows |
| Production build | `npm run build`, `npm run start` | Next 16 (modified): read `node_modules/next/dist/docs/` |
| Deploy (preview / prod) | Vercel CLI from a linked checkout (`.vercel/` is local and ignored) | Plans deploy with `npx vercel deploy --prod --yes`; no deploy config is committed |
| What ships | the Next app: `src/`, `public/` | `docs/`, `tests/`, `scripts/` do not ship |
| Release, rollback, health checks, logs, restarts | none in the repo | No backend service; API routes run inside the Next app |
| Text model (concept summary, companions, refine, assistants, Auto-Map) | `src/app/api/{concept/*,refine,ai-chat,network/automap}/` | Keyless Pollinations text API (`text.pollinations.ai`); each route's header comment says what it does when the model cannot answer |
| Concept images | `src/lib/create/image-gen.ts`, `image-store.ts`, `src/app/api/concept/` | AI Horde by default (optional `AI_HORDE_API_KEY`), Pollinations when `POLLINATIONS_TOKEN` is set; bytes stored in Vercel Blob when `BLOB_READ_WRITE_TOKEN` / `BLOB_STORE_ID` / `VERCEL_OIDC_TOKEN` work, else on disk at `IDEEZA_IMAGE_DIR` (default `.ideeza/concept-images`, ignored) |
| Image → 3D | `src/lib/three/providers.ts`, `src/app/api/three/generate/` | Meshy when `MESHY_API_KEY` is set |
| Gerber / DRC via KiCad | `src/app/api/kicad/route.ts` | Needs `kicad-cli` on the server (`KICAD_CLI`, `PATH`, macOS bundle); 501 otherwise |
| Feed images (generated) | `scripts/generate-feed-images.mjs` → `public/innovations/`, `src/lib/feed-image-manifest.ts` | `IMAGE_PROVIDER` (`pollinations` default, or `openrouter` with `OPENROUTER_API_KEY`, `OPENROUTER_IMAGE_MODEL`); never hand-edit the manifest |
| Data and migrations | each store's sanitizer / migration in `src/lib/**` | Browser `localStorage` only (`ideeza:*`); no database |
| Dev-only failure hooks | `src/components/create/build-simulator.tsx` | `__ideezaFailBuild` / `__ideezaFailItem`, installed only when `NODE_ENV !== "production"` |
