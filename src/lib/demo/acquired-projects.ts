// A bought Main NFT is the whole project, so it becomes the buyer's project (owner, 2026-11-19: "when I buy a
// Main NFT I get full control of the project — I browse it the way I browse my own private project, no
// downloads"). Another creator's sample has no project in this browser, so buying its Main NFT makes one from its
// Innovations post: one product per post product, each a finished build (its picture, its parts, a 3D model), the
// mint moved to the buyer, and where it came from. In My projects it is a project like any other: its page, its
// products, its editors, Earn to sell it again.
//
// Made when the app starts (the planter, demo-projects-seed.tsx), ahead of the stores, for every sample Main NFT
// bought and not made before — once each: a project the maker deletes stays deleted. Pure: the caller passes the
// lists and `now`. Relative imports only (node:test loads the compiled module).

import type { ConceptPart, ConceptPartCategory } from "../create/concept";
import type { BuildItem, BuildItemKind, BuildJob } from "../create/history";
import type { ManualProject } from "../manual/projects";
import type { SampleSale } from "../market/phone-sample-sales";
import { SAMPLE_COLLECTION, sampleMarketOf, type SampleMarket } from "../market/sample-market";
import { demoAddress, makerId } from "../wallet/demo-wallet";
import type { MintRecord } from "../wallet/types";

export const ACQUIRED_PREFIX = "proj_bought_";
/** The ids made so far: a project made once is never made again, even after the maker deletes it. */
export const ACQUIRED_KEY = "ideeza:acquired:projects";

const PIECES: BuildItemKind[] = ["3d", "pcb", "code", "assembly", "wiring", "parts"];

export const acquiredIdOf = (feedId: string) => `${ACQUIRED_PREFIX}${feedId}`;

/** A part's family, from its name and what it does. */
function categoryOf(name: string, use: string): ConceptPartCategory {
  const t = `${name} ${use}`.toLowerCase();
  if (/(esp32|nrf5|rp2040|stm32|mcu|microcontroller|atmega|samd)/.test(t)) return "Microcontroller";
  if (/(lora|ble|bluetooth|wi-?fi|radio|antenna|nfc|zigbee|gsm)/.test(t)) return "Connectivity";
  if (/(sensor|imu|accelerometer|gyro|thermistor|microphone|camera|ppg|ecg)/.test(t)) return "Sensor";
  if (/(motor|pump|servo|speaker|buzzer|relay|vibration|solenoid|haptic)/.test(t)) return "Actuator";
  if (/(battery|lipo|li-po|charger|regulator|buck|boost|usb-c|power|supercap|pmic|solar)/.test(t)) return "Power Management";
  if (/(display|led|oled|e-ink|eink|lcd|button|knob|encoder|jack)/.test(t)) return "Display & I/O";
  if (/(resistor|capacitor|inductor|crystal|flash|eeprom|diode)/.test(t)) return "Passive";
  return "Connector & mech";
}

/** A sample's products as finished builds, one per product: what its project is made from, and what a copy
 *  holder's product view reads (the PCB, firmware, wiring, assembly and 3D a copy unlocks). */
export function sampleBuildsOf(m: SampleMarket): BuildJob[] {
  return buildsOf(m, m.post.createdAt);
}

function buildsOf(m: SampleMarket, startedAt: number): BuildJob[] {
  const end = startedAt + 18 * 60_000;
  const cover = m.post.media.find((x) => x.kind === "image")?.src ?? null;
  return m.post.products.map((p, i) => {
    const parts: ConceptPart[] = p.parts.map((x) => ({ name: x.qty > 1 ? `${x.name} × ${x.qty}` : x.name, role: x.use, category: categoryOf(x.name, x.use) }));
    const items: BuildItem[] = PIECES.map((kind) => ({ kind, status: "ready", progress: 100, startedAt, endedAt: end }));
    return {
      id: `build_bought_${m.feedId}_${i + 1}`,
      chatId: `chat_bought_${m.feedId}_${i + 1}`,
      conceptImageUrl: p.image ?? cover ?? "",
      conceptPrompt: m.post.description,
      title: p.name,
      summary: parts.map((x) => x.name).join(" · "),
      description: p.summary,
      parts,
      projectChoiceName: m.post.title,
      conceptNumber: "1",
      status: "ready",
      startedAt,
      endedAt: end,
      estimateMin: 18,
      creditsCharged: true,
      creditsRefunded: false,
      projectId: acquiredIdOf(m.feedId),
      items,
      companions: [],
      createdAt: startedAt,
      updatedAt: end,
      modelGlbUrl: "/models/sample.glb",
    } satisfies BuildJob;
  });
}

/** The project a bought sample Main NFT makes, with its builds and the mint now the buyer's. */
export function acquiredProjectOf(m: SampleMarket, sale: SampleSale): { project: ManualProject; builds: BuildJob[] } {
  const created = Math.min(m.post.createdAt, sale.at);
  const builds = buildsOf(m, created);
  const mint: MintRecord = {
    v: 1,
    demo: true,
    type: "lazy",
    network: sale.network,
    collection: SAMPLE_COLLECTION,
    // The sample's token: a stable number from its feed id (no chain behind the prototype).
    tokenId: 1000 + Number(m.feedId.replace(/\D/g, "") || 0),
    wallet: { account: 1, address: demoAddress(makerId(1)) },
    at: sale.at,
  };
  const project: ManualProject = {
    id: acquiredIdOf(m.feedId),
    slug: `${m.post.slug}-bought`,
    name: m.post.title,
    productName: m.post.products[0]?.name ?? m.post.title,
    description: m.post.description,
    products: m.post.products.map((p, i) => ({
      id: `prd_bought_${m.feedId}_${i + 1}`,
      name: p.name,
      description: p.summary,
      source: { buildId: builds[i].id, productId: "primary" },
      updatedAt: sale.at,
    })),
    status: "draft",
    createdAt: created,
    updatedAt: sale.at,
    flowState: { pcb: false, code: false, three: false, assembly: false, wiring: false, preview: false, brief: false },
    buildId: builds[0]?.id,
    builds: builds.map((b) => ({ buildId: b.id, chatId: b.chatId, version: 1, savedAt: sale.at })),
    descriptionHint: { dismissedAt: sale.at, productCount: m.post.products.length },
    mint,
    ownerConfirmedAt: sale.at,
    acquired: { from: m.post.creator.name, feedId: m.feedId, saleId: sale.id, at: sale.at, price: sale.price, token: sale.token },
  };
  return { project, builds };
}

/** What the planter adds: a project for every sample Main NFT bought that was never made. */
export function acquiredToPlant(sales: readonly SampleSale[], made: ReadonlySet<string>): { project: ManualProject; builds: BuildJob[] }[] {
  const out: { project: ManualProject; builds: BuildJob[] }[] = [];
  for (const s of sales) {
    if (s.kind !== "main" || made.has(acquiredIdOf(s.projectId))) continue;
    const m = sampleMarketOf(s.projectId);
    if (m) out.push(acquiredProjectOf(m, s));
  }
  return out;
}
