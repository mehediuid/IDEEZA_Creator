// The projects every account finds in My projects (owner, 2026-11-16: "keep
// data inside My projects that will always be there", as Innovations always
// has its posts). A new account used to start from nothing (work-vault.ts),
// so My projects, the project page, Earn and Explore marketplace were empty
// until someone built, minted and listed by hand.
//
// Four of the maker's own projects, one per outcome, so every tab and every
// page has something real to open:
// - Smart Plant Pot: Listed. Main NFT on Buy now, whole-project Physical and
//   Virtual copies each for Personal use and Business use (owner, 2026-11-16:
//   a buyer chooses the use), a Personal-use Virtual copy of its product,
//   copies of every kind already sold (owner, 2026-11-19: purchases of every
//   kind always there) — Physical for Business use (Sam) and Personal use
//   (Leo), Virtual for Personal use (Leo) and Business use (Mira), and its
//   product's Virtual copy (Mira) — and shared on Innovations (Showcase);
// - Gesture LED Lamp: Sold. Its Main NFT bought in full by Leo;
// - Heart Rate Band: Minted (private), nothing listed;
// - BLE Data Logger: Draft. Built, not minted.
// Each is a finished AI build (all six pieces ready) with its concept image
// from /images/browse-project, so the editors, the 3D view and the pieces
// read as for any build. Times are days before the moment it is planted.
//
// It composes both layers (the projects and builds of engineering, the mint,
// listings and sales of commerce), so it lives outside both (commerce-boundary).
//
// Planted once per account (DEMO_SEED_KEY rides with the account's work, so a
// new account gets its own); after that they are ordinary projects the maker
// may change or delete. Pure: no storage, no clock (the caller passes `now`).
// Relative imports only (node:test loads the compiled module).

import type { BuildItem, BuildItemKind, BuildJob } from "../create/history";
import type { ConceptPart } from "../create/concept";
import { estimateGas } from "../commerce/gas";
import type { Network } from "../brief/types";
import { IDEEZA_FEE_BPS, ideezaFeeOf, payoutOf } from "../market/fee";
import { txHashOf } from "../market/purchase";
import { PROJECT_SCOPE, type EditionTrack, type Listing, type Sale, type SaleItem } from "../market/types";
import { demoAddress, makerId } from "../wallet/demo-wallet";
import type { Coin, DemoBuyerId, MintRecord } from "../wallet/types";
import type { ManualProject } from "../manual/projects";

/** Set once this account's demo projects are planted; parked and restored with its work. */
export const DEMO_SEED_KEY = "ideeza:demo:projects";
export const DEMO_PROJECT_PREFIX = "proj_demo_";
/** The seed's version: 2 added the second use of each whole-project copy; 3 the sales of every kind and the
 *  demo creators' purchases of sample listings (demo-purchases.ts). An older planting is topped up. */
export const DEMO_SEED_VERSION = 3;

const DAY = 86_400_000;
const NETWORK: Network = "baseSepolia";
const COLLECTION = "My IDEEZA Collection";
const ROYALTIES = 10;
const PIECES: BuildItemKind[] = ["3d", "pcb", "code", "assembly", "wiring", "parts"];

type Outcome = "draft" | "minted" | "listed" | "sold";

type Demo = {
  key: string;
  name: string;
  product: string;
  description: string;
  prompt: string;
  image: string;
  parts: ConceptPart[];
  /** Days before planting it was created; its build ended a day later. */
  age: number;
  outcome: Outcome;
  /** The Innovations story, when it is shared there. */
  story?: string;
};

const DEMOS: Demo[] = [
  {
    key: "plant",
    name: "Smart Plant Pot",
    product: "PlantPal",
    description:
      "A self-watering pot that reads soil moisture and light, waters the plant from its own tank and tells your phone when to refill it.",
    prompt: "A smart plant pot that waters itself and tells my phone when the tank is low",
    image: "/images/browse-project/smart-plant.png",
    parts: [
      { name: "ESP32-C3", role: "Reads the sensors, runs the pump and talks Wi-Fi", category: "Microcontroller" },
      { name: "Capacitive soil moisture sensor", role: "Knows when the soil is dry", category: "Sensor" },
      { name: "BH1750 light sensor", role: "Measures how much light the plant gets", category: "Sensor" },
      { name: "Water level float switch", role: "Warns before the tank runs dry", category: "Sensor" },
      { name: "5 V peristaltic pump", role: "Moves water from the tank to the soil", category: "Actuator" },
      { name: "USB-C power input", role: "Powers the pot from any phone charger", category: "Power Management" },
    ],
    age: 12,
    outcome: "listed",
    story:
      "I kept killing my basil on long weekends, so I built a pot that looks after it for me. It waters only when the soil is dry and pings my phone when the tank needs a refill.",
  },
  {
    key: "lamp",
    name: "Gesture LED Lamp",
    product: "WaveLight",
    description: "A desk lamp you dim and recolour with a wave of your hand over its base. No buttons, no app needed.",
    prompt: "A desk lamp I can dim and change colour by waving my hand over it",
    image: "/images/browse-project/gesture-led.png",
    parts: [
      { name: "RP2040", role: "Reads the gestures and drives the LEDs", category: "Microcontroller" },
      { name: "APDS-9960 gesture sensor", role: "Sees a hand move over the base", category: "Sensor" },
      { name: "WS2812B LED ring", role: "Gives the light and its colours", category: "Display & I/O" },
      { name: "5 V 3 A buck converter", role: "Feeds the LED ring steadily", category: "Power Management" },
      { name: "USB-C PD trigger", role: "Asks the charger for enough power", category: "Power Management" },
      { name: "Aluminium heat spreader", role: "Keeps the LEDs cool", category: "Connector & mech" },
    ],
    age: 20,
    outcome: "sold",
  },
  {
    key: "band",
    name: "Heart Rate Band",
    product: "PulseBand",
    description: "A soft wrist band that tracks heart rate and steps all day and syncs to your phone over Bluetooth.",
    prompt: "A comfortable fitness band that tracks heart rate and steps and syncs over Bluetooth",
    image: "/images/browse-project/heart-band.png",
    parts: [
      { name: "nRF52832", role: "Runs the band and its Bluetooth link", category: "Microcontroller" },
      { name: "MAX30102 pulse sensor", role: "Reads heart rate from the wrist", category: "Sensor" },
      { name: "BMA400 accelerometer", role: "Counts steps at very low power", category: "Sensor" },
      { name: "Vibration motor", role: "Buzzes for alerts", category: "Actuator" },
      { name: "100 mAh LiPo with charger", role: "Lasts about five days a charge", category: "Power Management" },
      { name: "Silicone strap", role: "Holds the sensor against the skin", category: "Connector & mech" },
    ],
    age: 7,
    outcome: "minted",
  },
  {
    key: "logger",
    name: "BLE Data Logger",
    product: "LogTag",
    description: "A coin-cell tag that logs temperature and humidity for months and hands the data to your phone over Bluetooth.",
    prompt: "A small tag that logs temperature and humidity for months on a coin cell and sends it to my phone",
    image: "/images/browse-project/ble-logger.png",
    parts: [
      { name: "nRF52810", role: "Logs on a schedule and sends over Bluetooth", category: "Microcontroller" },
      { name: "SHT40 sensor", role: "Measures temperature and humidity", category: "Sensor" },
      { name: "2 MB SPI flash", role: "Keeps months of readings", category: "Passive" },
      { name: "Status LED", role: "Blinks while it logs", category: "Display & I/O" },
      { name: "CR2032 holder", role: "Holds the coin cell", category: "Power Management" },
    ],
    age: 2,
    outcome: "draft",
  },
];

export type DemoSeed = {
  projects: ManualProject[];
  builds: BuildJob[];
  listings: Listing[];
  sales: Sale[];
  /** Each project's copy tracks, by project id. */
  editions: Record<string, EditionTrack[]>;
};

const idOf = (d: Demo) => `${DEMO_PROJECT_PREFIX}${d.key}`;
const productIdOf = (d: Demo) => `prd_demo_${d.key}`;

function buildOf(d: Demo, now: number): BuildJob {
  const start = now - d.age * DAY + 2 * 3_600_000;
  const end = start + 18 * 60_000;
  const items: BuildItem[] = PIECES.map((kind) => ({ kind, status: "ready", progress: 100, startedAt: start, endedAt: end }));
  return {
    id: `build_demo_${d.key}`,
    chatId: `chat_demo_${d.key}`,
    conceptImageUrl: d.image,
    conceptPrompt: d.prompt,
    title: d.product,
    summary: d.parts.map((p) => p.name).join(" · "),
    description: d.description,
    parts: d.parts,
    projectChoiceName: d.name,
    conceptNumber: "1",
    status: "ready",
    startedAt: start,
    endedAt: end,
    estimateMin: 18,
    creditsCharged: true,
    creditsRefunded: false,
    projectId: idOf(d),
    items,
    companions: [],
    createdAt: start,
    updatedAt: end,
    modelGlbUrl: "/models/sample.glb",
  };
}

function mintOf(d: Demo, tokenId: number, now: number): MintRecord {
  return {
    v: 1,
    demo: true,
    type: "lazy",
    network: NETWORK,
    collection: COLLECTION,
    tokenId,
    wallet: { account: 1, address: demoAddress(makerId(1)) },
    at: now - (d.age - 2) * DAY,
  };
}

function projectOf(d: Demo, now: number, mint: MintRecord | null): ManualProject {
  const created = now - d.age * DAY;
  const build = buildOf(d, now);
  const shared = d.story ? now - (d.age - 3) * DAY : undefined;
  return {
    id: idOf(d),
    slug: d.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name: d.name,
    productName: d.product,
    description: d.description,
    products: [
      { id: productIdOf(d), name: d.product, description: d.description, source: { buildId: build.id, productId: "primary" }, updatedAt: build.endedAt },
    ],
    status: "draft",
    createdAt: created,
    updatedAt: mint ? mint.at : (build.endedAt ?? created),
    flowState: { pcb: false, code: false, three: false, assembly: false, wiring: false, preview: false, brief: false },
    buildId: build.id,
    builds: [{ buildId: build.id, chatId: build.chatId, version: 1, savedAt: build.endedAt ?? created }],
    descriptionHint: { dismissedAt: created, productCount: 1 },
    ...(mint ? { mint, ownerConfirmedAt: mint.at } : null),
    ...(shared !== undefined ? { showcasedAt: shared, post: { story: d.story as string } } : null),
  };
}

function listingOf(d: Demo, price: string, at: number): Listing {
  return {
    id: `lst_demo_${d.key}`,
    projectId: idOf(d),
    slot: "main",
    source: "page",
    listedAt: at,
    updatedAt: at,
    type: "buyNow",
    token: "ETH",
    price,
    percentSelling: 100,
    royaltiesPct: ROYALTIES,
    mintingType: "lazy",
    network: NETWORK,
    collection: COLLECTION,
    benefits: [],
    metadata: { name: d.name, description: d.description, products: [{ id: productIdOf(d), name: d.product }], cover: null, at },
    status: "live",
    events: [{ kind: "listed", at }],
  };
}

function saleOf(input: {
  id: string;
  listingId: string;
  projectId: string;
  at: number;
  buyerId: DemoBuyerId;
  item: SaleItem;
  price: string;
  mint: MintRecord;
}): Sale {
  const gas = estimateGas(NETWORK);
  const main = input.item.nft === "main";
  return {
    id: input.id,
    listingId: input.listingId,
    projectId: input.projectId,
    at: input.at,
    buyerId: input.buyerId,
    buyerAddress: demoAddress(input.buyerId),
    sellerAddress: input.mint.wallet.address,
    item: input.item,
    via: "buyNow",
    token: "ETH",
    price: input.price,
    fees: { ideezaBps: IDEEZA_FEE_BPS, ideeza: ideezaFeeOf(input.price), network: { coin: gas.native as Coin, amount: String(gas.fee) } },
    payout: payoutOf(input.price),
    royaltiesPct: ROYALTIES,
    mint: "lazy",
    mintedAtSale: true,
    tokenId: main ? input.mint.tokenId : null,
    network: NETWORK,
    collection: COLLECTION,
    benefits: [],
    txHash: txHashOf(input.id),
    demo: true,
  };
}

function trackOf(
  d: Demo,
  key: string,
  scope: string,
  kind: EditionTrack["kind"],
  use: EditionTrack["use"],
  total: number,
  price: string,
  at: number,
): EditionTrack {
  return {
    id: `trk_demo_${d.key}_${key}`,
    projectId: idOf(d),
    productId: scope,
    kind,
    use,
    supply: { total },
    createdAt: at,
    lazy: true,
    listing: { token: "ETH", regular: price, extended: price, royaltyPct: ROYALTIES, listedAt: at, updatedAt: at },
    demo: true,
  };
}

/** The four projects and everything their outcomes hold, timed against `now`. */
export function demoSeedOf(now: number): DemoSeed {
  const seed: DemoSeed = { projects: [], builds: [], listings: [], sales: [], editions: {} };
  let tokenId = 0;
  for (const d of DEMOS) {
    const mint = d.outcome === "draft" ? null : mintOf(d, (tokenId += 1), now);
    const project = projectOf(d, now, mint);
    seed.projects.push(project);
    seed.builds.push(buildOf(d, now));
    if (!mint) continue;
    const listedAt = mint.at + DAY;
    if (d.outcome === "listed") {
      seed.listings.push(listingOf(d, "0.2", listedAt));
      const physical = trackOf(d, "phys", PROJECT_SCOPE, "physical", "commercial", 20, "0.04", listedAt);
      seed.editions[project.id] = [
        trackOf(d, "phys_private", PROJECT_SCOPE, "physical", "private", 30, "0.03", listedAt),
        physical,
        trackOf(d, "virt", PROJECT_SCOPE, "virtual", "private", 100, "0.01", listedAt),
        trackOf(d, "virt_commercial", PROJECT_SCOPE, "virtual", "commercial", 50, "0.02", listedAt),
        trackOf(d, "prod_virt", productIdOf(d), "virtual", "private", 50, "0.005", listedAt),
      ];
      const tracks = seed.editions[project.id];
      // Copies of every kind already sold, one each, oldest first (Sam's is the first planting's).
      const copySales: { id: string; key: string; buyerId: DemoBuyerId; days: number }[] = [
        { id: `sale_demo_${d.key}_1`, key: "phys", buyerId: "buyer-sam", days: 2 },
        { id: `sale_demo_${d.key}_phys_private`, key: "phys_private", buyerId: "buyer-leo", days: 3 },
        { id: `sale_demo_${d.key}_virt`, key: "virt", buyerId: "buyer-leo", days: 4 },
        { id: `sale_demo_${d.key}_virt_commercial`, key: "virt_commercial", buyerId: "buyer-mira", days: 5 },
        { id: `sale_demo_${d.key}_prod_virt`, key: "prod_virt", buyerId: "buyer-mira", days: 6 },
      ];
      for (const c of copySales) {
        const t = tracks.find((x) => x.id === `trk_demo_${d.key}_${c.key}`) as EditionTrack;
        seed.sales.push(
          saleOf({
            id: c.id,
            listingId: t.id,
            projectId: project.id,
            at: listedAt + c.days * DAY,
            buyerId: c.buyerId,
            item: {
              nft: t.kind,
              trackId: t.id,
              productId: t.productId,
              productName: t.productId === PROJECT_SCOPE ? d.name : d.product,
              use: t.use,
              tier: "extended",
              serial: 1,
            },
            price: t.listing?.regular ?? "0",
            mint,
          }),
        );
      }
    }
    if (d.outcome === "sold") {
      const listing = listingOf(d, "0.12", listedAt);
      seed.listings.push(listing);
      seed.sales.push(
        saleOf({
          id: `sale_demo_${d.key}_main`,
          listingId: listing.id,
          projectId: project.id,
          at: listedAt + 3 * DAY,
          buyerId: "buyer-leo",
          item: { nft: "main", sharePct: 100 },
          price: "0.12",
          mint,
        }),
      );
    }
  }
  return seed;
}

/**
 * The sales a list lacks from a later seed, for an older planting: each only while what it sold is still there
 * (the project's Main NFT not sold to anyone else, the copy's track still held), and a copy takes the next free
 * number of its track. Nothing already in the list changes.
 */
export function withDemoSales(existing: readonly Sale[], add: readonly Sale[], tracksOf: (projectId: string) => readonly EditionTrack[] | null): Sale[] {
  let sales = [...existing];
  for (const s of add) {
    if (sales.some((x) => x.id === s.id)) continue;
    const item = s.item;
    if (item.nft === "main") {
      if (sales.some((x) => x.projectId === s.projectId && x.item.nft === "main")) continue;
      sales = [...sales, s];
      continue;
    }
    const tracks = tracksOf(s.projectId);
    if (!tracks?.some((t) => t.id === item.trackId)) continue;
    const taken = sales.flatMap((x) => (x.item.nft !== "main" && x.item.trackId === item.trackId ? [x.item.serial] : []));
    const serial = taken.includes(item.serial) ? Math.max(...taken) + 1 : item.serial;
    sales = [...sales, { ...s, item: { ...item, serial } }];
  }
  return sales;
}

/** The demo projects' ids, for a check that they are there. */
export const DEMO_PROJECT_IDS: readonly string[] = DEMOS.map(idOf);
