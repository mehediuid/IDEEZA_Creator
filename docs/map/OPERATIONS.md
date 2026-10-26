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
| Text model (concept summary, companions, refine, assistants, Auto-Map, profile headline, business plan, video storyboard) | `src/lib/server/text-model.ts`, used by `src/app/api/{concept/*,refine,ai-chat,network/automap,profile/headline,business-plan/section,video/storyboard}/` | With `GROQ_API_KEY` (server-only, Vercel Production, Sensitive): Groq `openai/gpt-oss-20b`, then `openai/gpt-oss-120b` when the first is full (free plan: 8,000 tokens a minute and 1,000 requests a day per model; an idea uses ~1,500), then keyless Pollinations (`text.pollinations.ai`); without the key, Pollinations alone. `GROQ_TEXT_MODEL` picks the first model. Each failed try is logged `[text-model] <provider> <model>: <why>`; each route's header comment says what it does when no model answers |
| Concept images | `src/lib/create/image-gen.ts`, `image-store.ts`, `src/app/api/concept/` | AI Horde by default (optional `AI_HORDE_API_KEY`), Pollinations when `POLLINATIONS_TOKEN` is set; a request with `pool: "off"` (Settings › AI Properties) never goes to the Horde and is refused `pool-off` (409) when there is no token; bytes stored in Vercel Blob when `BLOB_READ_WRITE_TOKEN` / `BLOB_STORE_ID` / `VERCEL_OIDC_TOKEN` work, else on disk at `IDEEZA_IMAGE_DIR` (default `.ideeza/concept-images`, ignored) |
| Problem reports | `src/lib/server/report-store.ts` (Blob driver: `src/lib/server/blob-store.ts`), `src/app/api/reports/` | The same private Vercel Blob store as concept images, under `problem-reports/<id>/` (`report.json` + images); without working credentials, the disk under `.ideeza/problem-reports/` (`IDEEZA_REPORT_DIR` overrides). Read them in Vercel › Storage. The route is open to anyone: rate-limit it in the Vercel Firewall before launch |
| Usability testing (every browser) | `src/components/research/trackers.ts`, `next.config.ts` (`/ixp` → PostHog) | Set on Vercel **Production** only: `NEXT_PUBLIC_POSTHOG_KEY` (project API key), `NEXT_PUBLIC_POSTHOG_HOST` (`https://us.i.posthog.com` default, or `https://eu.i.posthog.com`), `NEXT_PUBLIC_CLARITY_ID`; redeploy after changing them (they are built in). Share the site's own link: every browser is recorded (the notice has no Turn off; the team opens `?tester=off` once on each of their browsers); `?tester=T01&persona=maker` names a tester for a moderated session. Off on localhost and private IPs; `NEXT_PUBLIC_RESEARCH_LOCAL=on` in `.env.local` turns it on there to check. Both tools on free plans: set PostHog's billing limits to $0 |
| Image → 3D | `src/lib/three/providers.ts`, `src/app/api/three/generate/` | Meshy when `MESHY_API_KEY` is set |
| Gerber / DRC via KiCad | `src/app/api/kicad/route.ts` | Needs `kicad-cli` on the server (`KICAD_CLI`, `PATH`, macOS bundle); 501 otherwise |
| Feed images (generated) | `scripts/generate-feed-images.mjs` → `public/innovations/`, `src/lib/feed-image-manifest.ts` | `IMAGE_PROVIDER` (`pollinations` default, or `openrouter` with `OPENROUTER_API_KEY`, `OPENROUTER_IMAGE_MODEL`); never hand-edit the manifest |
| Sample post videos (generated) | `scripts/generate-feed-videos.mjs` → `public/innovations/videos/<slug>--<productId>.mp4` (one 10 s clip per sample post × product, the app's own three-scene clip plan, from the product image or the cover; ~11 MB for all 48) | `ffmpeg` with libx264 on PATH (or `FFMPEG`), a bold TTF (`VIDEO_FONT`, default macOS Arial Bold); renders missing clips only, `--force` for all; `sampleVideoSrc` in `lib/innovations/sample-posts.ts` names the files |
| Data and migrations | each store's sanitizer / migration in `src/lib/**` | Browser `localStorage` only (`ideeza:*`); no database |
| Dev-only failure hooks | `src/components/create/build-simulator.tsx` | `__ideezaFailBuild` / `__ideezaFailItem`, installed only when `NODE_ENV !== "production"` |
