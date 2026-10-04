# Concept-stage Network: design

**Status:** owner decisions taken 2026-09-30 (below). This supersedes decisions **D1** (the review card's Add Network) and **D10** (Create Network lives only in the project page's Network section) of `2026-09-24-add-network-design.md`. The project page's Network tab, Create Network, and the Connection Map at `/projects/<id>/network` all stay.

## Owner decisions

> **2026-10-04 (owner): the network is optional.** The section offers it (*Add network*) instead of filling it in; until added, Wireless stays editable and Save writes nothing. *Remove network* resets it (link edits cleared, Change link's radios put back). *Back to suggested* only on a changed link. A controller companion's link is always controller → product commands.

1. Remove **Add Network** from the build review (`review-outputs.tsx`), on both `/chat/<id>` and `/build/<jobId>`.
2. The network is **project level**. Add one **Network** section to the concept stage's **left Project panel** (`ProjectRail`, `src/components/create/chat-rail.tsx`), directly under **Products**.
   - It is filled in **from the prompt**. For "I want a remote control and car" it shows Remote controller → Car.
3. **Light edit** at the concept stage:
   - The maker can change the protocol, who sends to whom, and what travels.
   - A protocol change moves **both** linked products' radio parts.
   - Full canvas editing stays on the project page's Connection Map.
4. **On Save**, the concept network becomes the project's network (`ideeza:network:<projectId>`), so the Network tab arrives filled in.
5. **One product:** if it has a radio, show its link to a phone app or the cloud (for example "Lamp ↔ Phone app · BLE"). If no product has a radio, hide the section.
6. **One control, one home.** Once a product is on a network link, its radio is chosen only in the Network section.
   - The spec sheet's Wireless section then shows the radio read-only, with a "Change it in Network" jump.
   - A product that is on no link, such as a charging dock with a radio, keeps the Wireless select as it is today.

## Surfaces

### S1: Build review
- Delete `<NetworkAction>` from the review header (`review-outputs.tsx:~323`) and its import.
- If nothing else imports `src/components/network/network-action.tsx`, delete that file.
- The disabled "Create Mobile App" header action is not part of this change. Leave it alone.

### S2: Network section in the Project panel
- **Placement.** It sits under `ProductList`, before `SuggestedLine`. Use the same heading level and style as "Products".
- **When it shows.** The section appears once the setup is answered and at least one product has concept parts. While the links are being worked out it shows one quiet line: "Working out how the products talk…". It never shows a spinner-only state.

**What each link shows.** One compact row per link, reading top to bottom:
- **Endpoints:** `Remote controller → Car`. Use `↔` for two-way, and name the app or cloud endpoint as "Phone app" or "Cloud".
- **How it connects:** `nRF24 · 2.4 GHz · Direct`. The middle part is Direct, Through cloud, or Through a gateway.
- **What travels:** plain words, for example "Steering and throttle commands".
- **Roles:** `Remote controller: Master · Car: Slave`, from the existing role rules in `src/lib/network/derive.ts`.

**Problem states.** Each shows one line on the link, with the fix inside Change link:
- If two linked products carry **different radios**: "These two can't talk yet — pick one protocol".
- If a linked product has **no radio**: "Car has no radio yet — pick a protocol to add one".

**Change link (the light edit).**
- A secondary or ghost button per link, never violet. It opens a small `ModalFrame` dialog with three fields:
  - **Protocol:** a `SelectMenu` over the spec radio choices both products can carry.
  - **Direction:** A → B, B → A, or Both ways.
  - **What travels:** Commands, Sensor readings, Events, or Data and commands.
- Saving the dialog writes the protocol as `SpecEdits.radio` on **both** linked products, through the existing spec-edit path, so their radio parts, cost and power move exactly as a Wireless change does today. Direction and what-travels go into the chat's network edits (S4).
- Each link has "Back to suggested", which clears that link's edits.

**Locked and phone behaviour.**
- **Locked** (building or built): the section is read-only, with no Change link. When the build is a saved project that has a network, it shows an "Open network" link to `/projects/<id>/network`.
- **Phone:** every target is at least 44 px (`max-md:` or coarse-pointer heights, as elsewhere). The section lives in the Chat tab's panel, where the rail already is.

### S3: The spec sheet's Wireless section
- **When the product is on a link:** replace the Radio select with the read-only radio value and a "Change it in Network" button.
  - The button closes the overlay sheet if one is open, moves focus to the rail's Network section heading, and switches the phone to the Chat tab.
  - The existing `LinkNotes` stay.
- **Otherwise:** no change.

## Derivation (S4)

This is a pure lib, for example `src/lib/create/concept-network.ts`, with node tests.

**Primary source: the AI call we already make.**
- Extend `/api/concept/companions` (the same request, with no extra model call). Its reply adds `links: [{ from, to, carries, twoWay }]`:
  - `from` and `to` are the product names it returned, or the primary product's name;
  - `carries` is one of commands, sensor, events, data;
  - `twoWay` is a boolean.
- For a one-product reply it adds `app: "phone" | "cloud" | null`.
- Parse strictly. Drop any link whose names don't match a product. The rule fallback answers whatever is left.

**Rule fallback: deterministic, and also used for products added later from the composer.**
- A companion named like remote, controller, transmitter or handheld: `companion → primary`, carrying commands (with telemetry back when two-way).
- A companion named like base station, hub, gateway or receiver: `primary → companion`, carrying sensor readings.
- A companion with no radio, or a charger, dock, case or spare pack: no link.
- One product with a radio: a link to the phone app over its radio. It goes to the cloud (Wi-Fi) when the prompt mentions cloud, internet, anywhere or remote access.

**Protocol.**
- The protocol always comes from the products' effective radio: `radioKeyOf` over the parts after edits.
- It is never stored separately, so the spec sheet and the network cannot disagree.

**Storage.**
- The derived links live on the setup turn, beside `companions`, so a reload shows the same thing.
- The maker's edits live in `SetupAnswer.network?: { links: Record<linkId, { direction?, carries? }> }`.
- `linkId` is stable: the two product ids, sorted.

**Radio vocabulary gap.**
- The network lib's `ProtocolKey` has no nRF24 and no cellular.
- Add both to `src/lib/network/types.ts` and `catalog.ts`, with a label, a frequency (nRF24: 2.4 GHz) and a use case. Add a single mapping `radioKey → ProtocolKey` that both worlds use.
- Also extend `RADIO_RULES` in `derive.ts` to recognise nRF24.

## On Save (S5)

When the save step creates the project, or saves a rebuild as its next version, and `ideeza:network:<projectId>` does **not** exist, write a `Network` built from the concept network:
- the products from `networkProducts(project, refs)`, matched by name;
- the links with the mapped `ProtocolKey`;
- the nodes from the planner's layout;
- the per-product settings from `autoSettings`;
- `intent`: p2p for product-to-product, ctrl for the app link, cloud for the cloud link;
- `method` and `mapSource`: "ai" or "rules";
- `name`: the project name.

The result must pass `sanitizeNetwork`. When a network already exists, it is kept untouched: the Connection Map is the maker's.

## Copy rules
- Sentence case.
- No "successfully", no "please", and no exclamation marks.
- One violet (primary) control per page. Nothing in this section is primary.

## Tests and docs
- **Node tests (`npm run test:projects`):**
  - the rule fallback: car + remote, drone + controller, sensor node + base station, a lamp alone, and no radio at all;
  - AI link parsing: invalid names dropped;
  - the radio → protocol mapping;
  - the concept → `Network` conversion, which must pass `sanitizeNetwork`;
  - save writes only when no network exists;
  - a protocol change edits both products' `SpecEdits.radio`.
- **Docs:** update `docs/guides/features/ai-create-flow.md` (the review header line, the rail and the Wireless section) and `docs/guides/features/platform-and-projects.md` (Add Network). Add a "Superseded 2026-09-30" note on D1 and D10 in the add-network spec.
