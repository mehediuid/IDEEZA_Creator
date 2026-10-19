# Product map — code area → router → features guide

Start here for any code change: open the area's router, then only the files it names. What exists today is in the features guide; the design intent is in the spec ([DOCS.md](DOCS.md)). Rules: [AGENTS.md](../../AGENTS.md).

| Task | Where | Notes |
|---|---|---|
| Find which route renders what | [src/app/README.md](../../src/app/README.md) | URL-level behaviour: [app-map.md](../guides/app-map.md) |
| Find a component or UI module | [src/components/README.md](../../src/components/README.md) | UI rules: [ui-ux.md](../guides/ui-ux.md) |
| Find a store, model or algorithm | [src/lib/README.md](../../src/lib/README.md) | Stores persist to `localStorage` (`ideeza:*`) |
| Global shell: sidebar, phone drawer, account / wallet popovers, ⌘K, theme | `src/components/dashboard/`, `theme-provider.tsx` | [features/platform-and-projects.md](../guides/features/platform-and-projects.md) › Platform & shell |
| Settings: `/settings` and its pages, frame, side-nav, rows, Find a setting, the preferences record | `src/components/settings/`, `src/lib/settings/`, `src/app/(create)/settings/` | [features/settings.md](../guides/features/settings.md); spec `2026-10-19-settings-design.md` |
| Notifications: the bell (sidebar, phone, editor top bar), the notice model, the toasts' quiet hours and digest | `src/components/notifications/`, `src/lib/notifications/`, `src/components/create/attention-banner.tsx` | [features/settings.md](../guides/features/settings.md) › Notification |
| Privacy & safety: your profile's lock, location and robots; who can message or comment; Take a break; blocked people, hidden words, your reports | `src/components/settings/{privacy-page,blocked-people,hidden-words,your-reports,audience-controls}.tsx`, `blocking-people.ts`, `src/lib/settings/audience.ts` | features/settings.md › Privacy & safety |
| Your data: Personal Data (the information zip), Your activity; the search and watch log | `src/components/settings/{personal-data,activity}-page.tsx`, `download-wizard.tsx`, `src/lib/data/` | features/settings.md › Personal Data, Your activity |
| Report a problem: the dialog, its entry points, `/api/reports` | `src/components/support/`, `src/lib/support/`, `src/lib/server/`, `src/app/api/reports/`, `src/instrumentation-client.ts` | features/platform-and-projects.md › Platform & shell |
| Home prompt, concept chat, build, review card, credits, history, toasts | `src/components/create/`, `src/lib/create/` | [features/ai-create-flow.md](../guides/features/ai-create-flow.md); Part 4 spec |
| Product spec sheet | `src/lib/spec/`, `src/components/create/spec-*.tsx` | features/ai-create-flow.md; spec `2026-09-25-product-spec-sheet-design.md` |
| Build review's 3D tab | `src/components/create/model-panel/`, `src/lib/three/assembly.ts` | features/ai-create-flow.md; spec `2026-09-25-3d-model-review-design.md` |
| My projects, Project page, product page, business plan, Activity | `src/components/projects/`, `src/lib/manual/` | features/platform-and-projects.md; project-details specs (phase 1 + 2) |
| Marketplace: listing, Explore, purchase and bids, editions | `src/components/marketplace/`, `src/components/projects/{listing,editions,earn/sell}/`, `src/lib/market/`, `src/lib/commerce/` | features/platform-and-projects.md › Marketplace; Phase 2 spec; all *Testnet demo* data |
| The commerce boundary: guards, the two status axes, the permission layers, `commerce-split@1` | `src/lib/commerce/`, `src/lib/manual/{guards,public,record-hooks,engineering-state}.ts`, `src/components/commerce/` | spec `2026-10-11-build-earn-p1-design.md` › P1-1; ESLint + `tests/projects/commerce-boundary.test.mjs` |
| The gating ladder, demo identity check, share-sale wording | `src/lib/commerce/{ladder,kyc,payout,license,share-copy,use-commerce}.ts`, `src/components/projects/earn/ladder/` | spec P1-4; features/earn-layer.md › The gating ladder |
| KYC levels, Get Paid: the one earnings balance, withdrawal methods, withdrawals, statement, tax | `src/components/settings/{kyc-page.tsx,get-paid/}`, `src/lib/account/{payout,use-payout,return-to}.ts`, `src/components/projects/earn/project-earnings.tsx` | [features/settings.md](../guides/features/settings.md) › KYC Verification, Get Paid; spec `2026-10-19-settings-design.md` §5.5 |
| Demo wallet, minting (Lazy / Instant) | `src/components/wallet/`, `src/lib/wallet/`, `src/lib/brief/` | features/platform-and-projects.md › Mint |
| Product video clip, readiness gate | `src/components/video-jobs/`, `src/lib/video/`, `src/lib/manual/readiness.ts` | features/platform-and-projects.md › Video |
| Product-scoped editor, BUILDLOAD | `src/components/manual/`, `src/lib/manual/{editor-scope,editor-docs,build-load*}.ts`, `src/lib/pcb/store.tsx` | features/editor-modules.md; [pcb-architecture.md](../guides/pcb-architecture.md) › Persisted state |
| Add Network & Connection Map | `src/components/network/`, `src/lib/network/`; the concept stage's Network section: `src/components/create/network-rail.tsx`, `src/lib/create/concept-network.ts` | features/platform-and-projects.md, features/ai-create-flow.md; specs `2026-09-24-add-network-design.md`, `2026-09-30-concept-network-design.md` |
| Parts library, New Package flow, land patterns | `src/components/parts/`, `src/components/package/`, `src/lib/package/` | [features/parts-package.md](../guides/features/parts-package.md) |
| Schematic + PCB editor | [src/components/pcb/README.md](../../src/components/pcb/README.md) | [pcb-architecture.md](../guides/pcb-architecture.md); features pcb-schematic / pcb-board / pcb-tools-menus-panels |
| Code, 3D, Assembly, Wiring, Preview modules | `src/components/{code,3d,assembly,wiring,preview}/` | [features/editor-modules.md](../guides/features/editor-modules.md) (Assembly not inventoried) |
| The mint flow, the Brief in Earn (choose → details → review and sign → success) | `src/components/brief/`, `src/lib/brief/` | features/editor-modules.md › The mint flow |
| Messages: `/messages`, conversations, Requests, entry points, Acting as | `src/app/(create)/messages/`, `src/components/messages/`, `src/lib/messages/` | [features/messages.md](../guides/features/messages.md); spec `2026-10-13-messages-design.md` |
| Blog: `/blog`, the editor, Send for review, demo review, the article page | `src/app/(create)/blog/`, `src/components/blog/`, `src/lib/blog/` | [features/blog.md](../guides/features/blog.md); spec `2026-10-14-blog-design.md` |
| Creator profile: `/creators/[handle]`, Edit profile, the people layer (handle, skills, time zone) | `src/components/profile/`, `src/lib/people/`, `src/app/api/profile/`; private identity `src/lib/account/identity.ts` | features/platform-and-projects.md › Creator profile; spec `2026-10-14-creator-profile-design.md` |
| Innovations feed, posts, comments | `src/components/newsfeed/`, `src/components/innovations/`, `src/lib/feed.ts`, `src/lib/innovations/`, `src/app/api/feed/` | features/platform-and-projects.md; plan https://claude.ai/artifact/XEhXzAt3kt3YPmaSLxjmxr |
| Voice dictation | `src/lib/voice/use-voice-input.ts`, `src/components/voice/` | features/ai-create-flow.md |
| Design tokens and atoms | `src/styles/` (`tokens.css`, `tailwind-preset.ts`), `src/components/ideeza/` | [ui-ux.md](../guides/ui-ux.md) |
| Static assets that ship (`public/`) | `public/images/`, `public/innovations/` (generated feed art), `public/models/` | [OPERATIONS.md](OPERATIONS.md) › feed images |
| Whole-app folder tree | [STRUCTURE.md](../../STRUCTURE.md) | Annotated tree; the routers above are the task view |
| The full feature inventory | [docs/guides/features/](../guides/features/README.md) | Update in the same change as the feature |
