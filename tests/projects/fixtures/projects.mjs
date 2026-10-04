// The spec's six project fixtures (§5 step 2, LST-32), plus a rebuild that
// drops a product. Plain data in the stored shapes: BuildJob, ChatSession,
// ManualProject — projects saved from now on hold `builds` and product
// sources exactly as attach() (§5.1.8) writes them; legacy ones don't.
// Each fixture: { name, project, builds, chats, draft } — `draft` is the
// StoredDraft the Brief keeps at ideeza:brief:draft:<id>, or null.

import { normalizeBrief } from "../../../.tmp-test/lib/brief/types.js";

export const MIN = 60_000;
export const DAY = 86_400_000;
/** Sep 22, 2026 · 9:00 UTC. */
export const T = Date.UTC(2026, 8, 22, 9, 0);

const KINDS = ["3d", "pcb", "code", "wiring", "parts"];

/** The five pieces, all `status` unless `only` says otherwise per kind. */
export function items(status = "ready", only = {}) {
  return KINDS.map((kind) => {
    const s = only[kind] ?? status;
    return { kind, status: s, progress: s === "ready" ? 100 : 0 };
  });
}

export const part = (name, category = "Microcontroller") => ({ name, role: "", category });

/** A booked spec with the fields specKey() reads; `o` overrides them. */
export function spec(o = {}) {
  return {
    kind: "electronic",
    size: { l: 120, w: 60, h: 25 },
    sizeSource: "calc",
    minSize: { l: 100, w: 50, h: 20 },
    fits: true,
    draftAtSize: false,
    draftChosen: false,
    board: { w: 50, h: 40, parts: 4, layers: 2 },
    battery: "li-1s-400",
    batterySource: "rule",
    noUsbPort: false,
    material: "PLA",
    materialSource: "rule",
    wallMm: 2,
    wallSource: "rule",
    drawMa: 120,
    budgetMa: 500,
    choices: {},
    ...o,
  };
}

export function companion(o) {
  return {
    id: o.id,
    name: o.name,
    conceptImageUrl: o.image ?? `https://img.test/${o.id}.png`,
    conceptPrompt: `${o.name} prompt`,
    title: o.title ?? o.name,
    summary: o.summary ?? "nRF24L01 · 2 x AA holder",
    ...(o.description ? { description: o.description } : {}),
    parts: o.parts ?? [part("nRF24L01", "Connectivity"), part("2 x AA holder", "Power Management")],
    ...(o.spec ? { spec: o.spec } : {}),
    items: o.items ?? items(),
  };
}

export function build(o) {
  return {
    id: o.id,
    chatId: o.chatId,
    conceptImageUrl: o.image ?? `https://img.test/${o.id}.png`,
    conceptPrompt: `${o.title} prompt`,
    title: o.title,
    summary: o.summary ?? "ESP32-WROOM-32 · L298N motor driver",
    ...(o.description ? { description: o.description } : {}),
    parts: o.parts ?? [part("ESP32-WROOM-32"), part("L298N motor driver", "Actuator")],
    ...(o.spec ? { spec: o.spec } : {}),
    ...(o.projectChoiceId ? { projectChoiceId: o.projectChoiceId } : {}),
    conceptNumber: o.conceptNumber ?? "1",
    status: o.status ?? "running",
    estimateMin: 1,
    creditsCharged: true,
    creditsRefunded: false,
    ...(o.projectId ? { projectId: o.projectId } : {}),
    items: o.items ?? items(),
    companions: o.companions ?? [],
    createdAt: o.createdAt,
    updatedAt: o.createdAt,
  };
}

export function chat(id, title, createdAt, turns = []) {
  return { id, title, turns, createdAt, updatedAt: createdAt };
}

export function project(o) {
  return {
    id: o.id,
    slug: o.slug ?? o.id,
    name: o.name,
    productName: o.productName ?? "",
    description: o.description ?? "",
    ...(o.products ? { products: o.products } : {}),
    status: o.status ?? "draft",
    createdAt: o.createdAt,
    updatedAt: o.updatedAt ?? o.createdAt,
    flowState: { pcb: false, code: false, three: false, assembly: false, wiring: false, preview: false, brief: false },
    ...(o.buildId ? { buildId: o.buildId } : {}),
    ...(o.builds ? { builds: o.builds } : {}),
    ...(o.lastOpened ? { lastOpened: o.lastOpened } : {}),
    ...("showcasedAt" in o ? { showcasedAt: o.showcasedAt } : {}),
    ...("cover" in o ? { cover: o.cover } : {}),
  };
}

/** A product row as attach() writes it. */
export const row = (id, name, description, buildId, productId, updatedAt) => ({
  id,
  name,
  description,
  source: { buildId, productId },
  updatedAt,
});

// ── 1. A 4-product build ────────────────────────────────────────────────
const SAVED_FOUR = T + 5 * MIN;
export const four = {
  name: "a 4-product build",
  project: project({
    id: "p-four",
    name: "Survey Drone",
    productName: "Survey Drone",
    description: "A quadcopter that maps a field from 60 m up.",
    buildId: "b-drone",
    createdAt: SAVED_FOUR,
    builds: [{ buildId: "b-drone", chatId: "c-drone", version: 1, savedAt: SAVED_FOUR }],
    products: [
      row("prd_drone001", "Survey Drone", "A quadcopter that maps a field from 60 m up.", "b-drone", "primary", SAVED_FOUR),
      row("prd_drone002", "Remote Controller", "A two-stick 2.4 GHz remote.", "b-drone", "remote-controller", SAVED_FOUR),
      row("prd_drone003", "Battery Charger", "Charges two packs at once.", "b-drone", "battery-charger", SAVED_FOUR),
      row("prd_drone004", "Landing Pad", "A folding pad with a beacon.", "b-drone", "landing-pad", SAVED_FOUR),
    ],
  }),
  builds: [
    build({
      id: "b-drone",
      chatId: "c-drone",
      title: "Survey Drone",
      description: "A quadcopter that maps a field from 60 m up.",
      projectId: "p-four",
      createdAt: T,
      companions: [
        companion({ id: "remote-controller", name: "Remote Controller", description: "A two-stick 2.4 GHz remote." }),
        companion({ id: "battery-charger", name: "Battery Charger", description: "Charges two packs at once." }),
        companion({ id: "landing-pad", name: "Landing Pad", description: "A folding pad with a beacon." }),
      ],
    }),
  ],
  chats: [chat("c-drone", "Survey drone", T - 10 * MIN)],
  draft: null,
};

// ── 2. A legacy hand-made project: no products[], no builds ─────────────
export const legacyHand = {
  name: "a legacy hand-made project",
  project: project({
    id: "p-hand",
    name: "Desk Lamp",
    productName: "Desk Lamp",
    description: "A lamp that dims itself after sunset.",
    createdAt: T - 30 * DAY,
  }),
  builds: [],
  chats: [],
  draft: null,
};

// ── 3. Minted to sell, and showcased (a legacy build-made project) ──────
export const MINT = T + 2 * DAY;
export const mintedSell = {
  name: "a project minted to sell and showcased",
  project: project({
    id: "p-sell",
    name: "Smart Plant Pot",
    productName: "Smart Plant Pot",
    description: "A pot that waters itself.",
    buildId: "b-pot",
    status: "completed",
    createdAt: T - DAY + 3 * MIN,
    updatedAt: MINT,
    showcasedAt: MINT,
    // Legacy: ids from normalizeProjects, no sources, no `builds`.
    products: [{ id: "p1", name: "Smart Plant Pot", description: "A pot that waters itself." }],
  }),
  builds: [
    build({
      id: "b-pot",
      chatId: "c-pot",
      title: "Smart Plant Pot",
      description: "A pot that waters itself.",
      projectId: "p-sell",
      createdAt: T - DAY,
      image: "https://img.test/pot.png",
    }),
  ],
  chats: [chat("c-pot", "Plant pot", T - DAY - 10 * MIN)],
  draft: {
    state: normalizeBrief({
      projectId: "p-sell",
      projectChoice: "p-sell",
      intent: "sell",
      network: "baseSepolia",
      token: "ETH",
      price: "0.05",
      shareToNewsfeed: true,
      mintedAt: MINT,
    }),
    step: "success",
  },
};

// ── 4. A hand-made project a build joined ───────────────────────────────
const SAVED_GARDEN = T + DAY + 5 * MIN;
export const handJoined = {
  name: "a hand-made project a build joined",
  project: project({
    id: "p-garden",
    name: "Garden Kit",
    productName: "Rain Gauge",
    description: "Sensors for a raised bed.",
    createdAt: T,
    updatedAt: SAVED_GARDEN,
    // No buildId: a join never stamps the origin.
    builds: [{ buildId: "b-garden", chatId: "c-garden", version: 1, savedAt: SAVED_GARDEN }],
    products: [
      { id: "p1", name: "Rain Gauge", description: "A tipping-bucket gauge." },
      row("prd_gard0001", "Garden Hub", "A hub that reads every sensor in the bed.", "b-garden", "primary", SAVED_GARDEN),
      row("prd_gard0002", "Soil Sensor", "A probe that reads moisture.", "b-garden", "soil-sensor", SAVED_GARDEN),
    ],
  }),
  builds: [
    build({
      id: "b-garden",
      chatId: "c-garden",
      title: "Garden Hub",
      description: "A hub that reads every sensor in the bed.",
      projectChoiceId: "p-garden",
      projectId: "p-garden",
      createdAt: T + DAY,
      companions: [companion({ id: "soil-sensor", name: "Soil Sensor", description: "A probe that reads moisture." })],
    }),
  ],
  chats: [chat("c-garden", "Garden hub", T + DAY - 10 * MIN)],
  draft: null,
};

// ── 5. A project whose build was purged ─────────────────────────────────
export const purged = {
  name: "a project whose build was purged",
  project: project({
    id: "p-purged",
    name: "Pocket Weather Station",
    productName: "Pocket Weather Station",
    description: "Reads temperature, humidity and pressure.",
    buildId: "b-purged",
    createdAt: T - 10 * DAY,
    builds: [{ buildId: "b-purged", chatId: "c-weather", version: 1, savedAt: T - 10 * DAY }],
    products: [
      row("prd_wthr0001", "Pocket Weather Station", "Reads temperature, humidity and pressure.", "b-purged", "primary", T - 10 * DAY),
      row("prd_wthr0002", "Display Dock", "A dock with an e-ink screen.", "b-purged", "display-dock", T - 10 * DAY),
    ],
  }),
  builds: [], // the builds store no longer has it
  chats: [chat("c-weather", "Weather station", T - 10 * DAY - 10 * MIN)],
  draft: null,
};

// ── 6. A chat rebuilt twice: versions 1, 2 and 3 of one lineage ─────────
const botParts1 = [part("ESP32-WROOM-32"), part("TCRT5000 sensor (x4)", "Sensor"), part("N20 gear motor (x2)", "Actuator")];
const botParts2 = [...botParts1, part("HC-SR04 ultrasonic sensor", "Sensor")];
export const rebuiltTwice = {
  name: "a chat rebuilt twice",
  project: project({
    id: "p-bot",
    name: "Line Follower",
    productName: "Line Follower",
    description: "A robot that follows a taped line.",
    buildId: "b-bot-1",
    createdAt: T + 5 * MIN,
    updatedAt: T + 2 * DAY + 5 * MIN,
    builds: [
      { buildId: "b-bot-1", chatId: "c-bot", version: 1, savedAt: T + 5 * MIN },
      { buildId: "b-bot-2", chatId: "c-bot", version: 2, savedAt: T + DAY + 5 * MIN },
      { buildId: "b-bot-3", chatId: "c-bot", version: 3, savedAt: T + 2 * DAY + 5 * MIN },
    ],
    products: [
      row("prd_bot00001", "Line Follower", "A robot that follows a taped line.", "b-bot-3", "primary", T + 2 * DAY + 5 * MIN),
      row("prd_bot00002", "Charging Dock", "A dock it drives onto to charge.", "b-bot-3", "charging-dock", T + 2 * DAY + 5 * MIN),
    ],
  }),
  builds: [
    build({ id: "b-bot-1", chatId: "c-bot", title: "Line Follower", description: "A robot that follows a taped line.", projectId: "p-bot", createdAt: T, parts: botParts1, spec: spec() }),
    build({
      id: "b-bot-2",
      chatId: "c-bot",
      title: "Line Follower",
      description: "A robot that follows a taped line.",
      projectId: "p-bot",
      createdAt: T + DAY,
      parts: botParts2,
      spec: spec(),
      companions: [companion({ id: "charging-dock", name: "Charging Dock", description: "A dock it drives onto to charge.", spec: spec() })],
    }),
    build({
      id: "b-bot-3",
      chatId: "c-bot",
      title: "Line Follower",
      description: "A robot that follows a taped line.",
      projectId: "p-bot",
      createdAt: T + 2 * DAY,
      parts: botParts2,
      spec: spec(),
      companions: [
        companion({
          id: "charging-dock",
          name: "Charging Dock",
          description: "A dock it drives onto to charge.",
          spec: spec({ size: { l: 140, w: 80, h: 30 }, sizeSource: "you" }),
        }),
      ],
    }),
  ],
  chats: [chat("c-bot", "Line-following robot", T - 10 * MIN)],
  draft: null,
};

// ── 7. A rebuild that drops a product (the spec's "Car", §3.3) ──────────
const SAVED_CAR_1 = T + 5 * MIN;
const SAVED_CAR_2 = T + 4 * DAY + 5 * MIN;
export const dropsOne = {
  name: "a rebuild that drops a product",
  project: project({
    id: "p-car",
    name: "Car",
    productName: "RC Car Controller",
    description: "A two-motor RC car with an ESP32 brain and a 2.4 GHz remote.",
    buildId: "b-car-1",
    createdAt: SAVED_CAR_1,
    updatedAt: SAVED_CAR_2,
    builds: [
      { buildId: "b-car-1", chatId: "c-car", version: 1, savedAt: SAVED_CAR_1 },
      { buildId: "b-car-2", chatId: "c-car", version: 2, savedAt: SAVED_CAR_2 },
    ],
    products: [
      row("prd_car00001", "RC Car Controller", "Drives two motors from the remote's commands.", "b-car-2", "primary", SAVED_CAR_2),
      row("prd_car00002", "Remote Controller", "A handheld 2.4 GHz remote with two thumb sticks.", "b-car-2", "remote-controller", SAVED_CAR_2),
      // Version 2 dropped it: its source still names version 1 (COR-108).
      row("prd_car00003", "Battery Charger", "Charges the car's pack from USB.", "b-car-1", "battery-charger", SAVED_CAR_1),
      row("prd_car00004", "Spare Battery Pack", "A second pack that swaps in.", "b-car-2", "spare-battery-pack", SAVED_CAR_2),
    ],
  }),
  builds: [
    build({
      id: "b-car-1",
      chatId: "c-car",
      title: "RC Car Controller",
      description: "Drives two motors from the remote's commands.",
      projectId: "p-car",
      createdAt: T,
      companions: [
        companion({ id: "remote-controller", name: "Remote Controller", description: "A handheld 2.4 GHz remote with two thumb sticks." }),
        companion({ id: "battery-charger", name: "Battery Charger", description: "Charges the car's pack from USB." }),
      ],
    }),
    build({
      id: "b-car-2",
      chatId: "c-car",
      title: "RC Car Controller",
      description: "Drives two motors from the remote's commands.",
      projectId: "p-car",
      createdAt: T + 4 * DAY,
      companions: [
        companion({
          id: "remote-controller",
          name: "Remote Controller",
          description: "A handheld 2.4 GHz remote with two thumb sticks.",
          parts: [part("nRF24L01", "Connectivity"), part("2 x AA holder", "Power Management"), part("HC-SR04 ultrasonic sensor", "Sensor")],
        }),
        companion({ id: "spare-battery-pack", name: "Spare Battery Pack", description: "A second pack that swaps in." }),
      ],
    }),
  ],
  chats: [chat("c-car", "Car", T - 10 * MIN)],
  draft: null,
};

/** The spec's six (§5 build order, step 2). */
export const SIX = [four, legacyHand, mintedSell, handJoined, purged, rebuiltTwice];
/** The six plus the rebuild that drops a product. */
export const ALL = [...SIX, dropsOne];
