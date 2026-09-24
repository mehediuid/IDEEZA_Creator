# Add Network — design spec

Approved by the user on 2026-09-24 ("Ok", all D1–D12 defaults). Published
review page: https://claude.ai/artifact/YXH5GQx9uoioYCAqkwTSB9

**Figma source:** file `HDtWAU2PSbjQKlEWgHI3ev` (User Panel V2), section
`44533:123190` "Add Network" — frames 01–17 + 09b, "All parameters modal"
(`44533:123240`) and "All dropdown" (`44533:123191`), read 2026-09-24.
Requirements and logic come from Figma; the visual style is the app's own
(dark-first tokens, existing controls). Nothing outside the files listed at
the end changes.

## Surfaces

1. **Review card** (`review-outputs.tsx`) — the "Add Network · Soon" header
   action becomes live: unsaved build → disabled with *Save the project
   first — a network belongs to a project*; saved, no network → opens the
   wizard; network exists → **View Network** → Connection Map page. "Create
   Mobile App" is untouched.
2. **Project page** (`/projects/[id]`) — a **Network** section after *Build
   deliverables*: empty state (Figma 01) with **Create Network**, or the
   created summary (Figma 10) with **View Network**, the connections and the
   products with role chips.
3. **Add Network wizard** (modal) — Setup → Method (+ AI suggested map) →
   Connect → Review → Done (Figma 02–09b).
4. **Connection Map page** `/projects/[id]/network` — read, product/link
   selected, edit + unsaved, breaking-change warning, settings, delete
   (Figma 11–17).

## Wizard

| Figma | Step | Content | Gate |
|---|---|---|---|
| 02 | Setup | 4 intents (ctrl · p2p · both · cloud); every project product as a card — concept image, name, MCU + radio chip derived from parts, checkbox; "N selected · M not included" | ≥1 product; p2p/both ≥2 |
| 03 | Method | AI Auto-Map (Recommended) · Manual Canvas (Advanced); the 3-questions note | CTA names the method; busy while AI runs |
| 04 | AI suggested map | banner (goal, counts, nothing saved yet), link list (A ↔/→ B, payload, protocol chip), computed "Roles these links produce", honest fallback banner | Accept and open canvas |
| 05–07 | Connect | toolbar Select/Draw link (V/L), Protocol (12, key code) for new links, Undo · Redo · How to draw; canvas with product cards, Broker (C), App (A), 4 ports, arrows + payload labels, dot grid, pan, zoom −/100%/+/Fit, legend, status line; side panel: no selection / selected link / new link not saved, protocol change, 3 questions, Filled in for you, Save link/Cancel, Delete this link; Clear and draw myself | ≥1 link, no pending new link |
| 08 | Review | network settings (name, cloud collection name, password with eye toggle, cloud type, network type, frequency), All parameters (5 tabs); product accordions + Expand all with Topology, Master, Interfaces (add/remove rows), Add repeater, Sensor type, Agent placement, Shares data with cloud, Bridge, Redundancy — auto-filled, editable | Create network; first missing field named under the CTA |
| 09/09b | Done | Network created, one line, product → role list | Close · View Network |

Back works on every step. Removing a product in Setup drops its links;
adding one adds its node. Closing after progress asks *Discard this network?*.

## Decisions (approved defaults)

- **D1** Add Network disabled until the build is saved as a project; becomes View Network once a network exists.
- **D2** Done has Close · View Network (Figma's duplicate Done dropped).
- **D3** Delete lives in the link panel ("Delete this link") + the Delete key; toolbar is Undo · Redo · How to draw.
- **D4** Copy says *saved*, not *live*; the delete confirm's APK sentence is dropped (no APK is built).
- **D5** Read-mode link panel is read-only with "Edit map to change this link".
- **D6** Cloud name optional (frame 09b); empty network name → "Unnamed Network"; cloud password required when cloud type ≠ None.
- **D7** Master change removes the old master's two-way links and makes the new master's link two-way; the warning lists the computed links and is skipped when none break.
- **D8** "last edited <date>" without a person's name (no accounts).
- **D9** Delete network sits in the Network settings dialog footer (left, danger).
- **D10** No kebab menu on the project page; the Network section's Create Network is the one home.
- **D11** Arrow labels carry the payload; the protocol shows on the product card, the side panel and the legend. How-to-draw copy says so.
- **D12** One network per project; persisted to `localStorage` like the rest of the project.

## Logic

- **Store:** `ideeza:network:<projectId>` in `localStorage`, read through one hook (`useSyncExternalStore`) so every surface agrees and reloads keep it.
- **Products:** the project's products; MCU/radio/sensor derived from the build's parts by name — nothing invented when a part list is missing.
- **Role rules (Figma):** two-way data + setpoint → Master · outgoing only → Independent · incoming only → Slave (master field = master's name) · two-way peer → Peer · links on 2+ protocols → Gateway · no links → Slave (Standby) with Redundancy = Standby.
- **Q2:** Direct → P2P / None · Cloud/MQTT → Star / Pub/Sub (MQTT) · Gateway → Tree.
- **Q3:** Sensor data → the product's sensor type (17 options from its sensor parts); required.
- **Protocol:** filters frequency; repeater hidden for I2C/SPI/CAN/RS-232; 2+ interfaces → Bridge On (read-only); Sensor None → Shares data disabled.
- Undo/redo history on the map; unsaved diff computed; dropdowns and the All parameters tables read one catalog.

## AI Auto-Map

`POST /api/network/automap` sends the intent and each product (name,
description, parts) to the app's existing free text model (Pollinations, as
`/api/ai-chat`), asks for strict JSON links, validates every field, and drops
invalid links. No valid link / error / 20 s timeout → the deterministic rule
planner. The banner states which one drew the map. No credits are charged.

## Files

New: `src/lib/network/{catalog,types,derive,planner,store}.ts`,
`src/app/api/network/automap/route.ts`,
`src/app/(create)/projects/[id]/network/page.tsx`,
`src/components/network/*`.
Edited: `src/components/create/review-outputs.tsx`,
`src/components/projects/project-details.tsx`, `CLAUDE.md` §5, `STRUCTURE.md`.
