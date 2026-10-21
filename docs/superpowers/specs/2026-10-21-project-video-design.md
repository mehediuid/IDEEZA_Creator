# Project video — design

Owner request (2026-10-21, Bengali): selling a project needs an AI video for every product **and** one video for the project, based on the products. A project with 3 products has 4 videos. The product videos come first. The project-video option appears after them. Only once the project video is made can the remaining steps be finished.

Study, 30 modeled intents and the clickable mockup: https://claude.ai/artifact/2FMrKxyqKdNnmuLEEYe4iQ. The owner approved every recommendation, D1–D10 ("সুপারিশ মতো").

## Decisions

| # | Decision |
|---|---|
| D1 | The project video is a **join** of the products' in-use clips: a 2 s intro card (the project name and one line), then each current product's cut in order, then a 2 s outro card. It is made in the browser and is silent, like product videos. The intro, order, labels and sound prompt are kept for the AI model. |
| D2 | The project row shows **from the start**, under its own group "Project video". While any product video is missing, it says why and how far along things are, with no button and no greyed control. "Make project video" appears once every current product has a ready video. |
| D3 | A 1-product project still has 2 videos. The project video is one click: its single product gets its whole clip. |
| D4 | The project video is needed for showcase, sell, give, relist and project-scope copies, which all use the "sell" readiness. It is not needed for product copies ("edition") or a private mint. |
| D5 | **Out of date and blocking**: a current product isn't in the in-use take, or the take shows a product that is no longer current. **Out of date, not blocking**: a product's in-use take differs from the take the cut used. This shows the note "Made from an older X video" with Update. |
| D6 | Each product's cut = `min(10 s, max(2 s, 15 s / n))`, taken from the **end** of its clip, so the product's title band shows. Total = 2 s + n·cut + 2 s. |
| D7 | The order can change (↑ ↓). Products can't be left out. |
| D8 | Quality follows the product-video rule: 480p for everyone, 720p on Disruptor (`qualityOpen`). |
| D9 | A project already listed without a project video keeps its listing. The project video is needed at the next commit that reads the gate (relist, share, new listing). |
| D10 | "Make all with AI" is out of scope. |

## Model

- The project video lives in the same `ideeza:video:<projectId>` record, under the reserved key `PROJECT_VIDEO_KEY = "project"`. This follows the market's `PROJECT_SCOPE` spelling. Product ids are `prd_…` or the legacy `p1`, so the two can't collide. Takes, in use, jobs, clip store, lost-file checks and cancel all work unchanged.
- A project take carries `join: JoinPlan`, which holds the intro lines, the cuts (`productId`, `takeId`, `fromMs`, `ms`, `label`) and the outro. Its `lines` are `[intro title, intro line, outro]`.
- `projectVideoStatusOf(...)` gives one state: `waiting | make | rendering | ready | outdated | failed`. It also gives `ok` for the gate and the names it is missing, still shows, or was made from older takes of.
- Readiness gains the rule `projectVideo`, with `fixedIn` the same as `videos`, and a `project` field (null for edition). The ladder step becomes "Videos ready". It is ok only when both the product videos and the project video are ready.

## Rows and copy

These follow the approved mockup.

- Waiting: "Opens when every product has a video · 1 of 3 ready" (one product: "Opens when your product video is ready").
- Make: "Every product video is ready." → **Make project video**.
- Rendering: the product rendering copy.
- Ready: "Project video ready · 0:19". With older takes: "Made from an older Remote Controller video." → **Update**.
- Outdated: "Propeller Guard Set isn't in it yet." → **Update project video**. It says "… Make its video first." while that product has no video.
- Failed: the failure copy → **Try again**.
- Reason lines:
  - "2 products still need an AI video. The project video comes next."
  - "Every product has its video. Make the project video to continue."
  - "Waiting for the project video — under a minute left."
  - "The project video is missing X. Update it to continue."
- The count is "x of N+1 ready".
