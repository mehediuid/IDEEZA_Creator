// Purchases that are always there (owner, 2026-11-19: "My projects needs every kind of data, always there; what is
// bought on the marketplace stays too — projects with their Main, Physical and Virtual purchase information").
// My projects › Purchased reads the purchases of the demo creator the prototype shops as (Mira, Leo or Sam), and
// a new account had none until someone bought by hand, so the tab opened empty.
//
// Each demo creator holds purchases of other creators' sample listings (sample-market.ts), between them every
// kind: Mira, the one shopping by default, has a whole project (the Main NFT), Physical and Virtual copies for
// Personal use and for Business use, and two copies of one use; Leo and Sam have a few each. Their copies of this
// browser's own Smart Plant Pot are the demo projects' sales (demo-projects.ts), so its Earn shows every kind sold.
//
// Copies take the next free number of their use when they are planted, and a purchase the listing can't take any
// more (its Main NFT already sold, its use sold out) is left out, so an account that bought by hand keeps a story
// that adds up. Pure: the caller passes the list and `now`. Relative imports only (node:test loads the compiled
// module).

import { txHashOf } from "../market/purchase";
import { makeSampleSale, offerStateOf, type SampleSale } from "../market/phone-sample-sales";
import { copyUseBlockOf, copyUseStateOf, copyUsesOf, sampleMarketOf, type SampleUse } from "../market/sample-market";
import type { Sale } from "../market/types";
import { ownCopyKeyOf, sampleCopyKeyOf, type UnitsEntry } from "../market/units";
import { demoAddress } from "../wallet/demo-wallet";
import type { DemoBuyerId } from "../wallet/types";

const DAY = 86_400_000;

export type DemoSampleBuy = {
  id: string;
  /** The sample's feed id ("p7"). */
  feedId: string;
  kind: "main" | "physical" | "virtual";
  /** A copy's use; none for the Main NFT. */
  use?: SampleUse;
  buyerId: DemoBuyerId;
  daysAgo: number;
};

/** Oldest first, so copies of one use number in the order they were bought. */
export const DEMO_SAMPLE_BUYS: readonly DemoSampleBuy[] = [
  // Mira: every kind.
  { id: "ssale_demo_mira_ring_main", feedId: "p28", kind: "main", buyerId: "buyer-mira", daysAgo: 6 },
  { id: "ssale_demo_mira_air_phys_biz_1", feedId: "p7", kind: "physical", use: "Business use", buyerId: "buyer-mira", daysAgo: 5 },
  { id: "ssale_demo_mira_air_phys_personal", feedId: "p7", kind: "physical", use: "Personal use", buyerId: "buyer-mira", daysAgo: 4 },
  { id: "ssale_demo_mira_air_virt_biz", feedId: "p7", kind: "virtual", use: "Business use", buyerId: "buyer-mira", daysAgo: 4 },
  { id: "ssale_demo_mira_air_phys_biz_2", feedId: "p7", kind: "physical", use: "Business use", buyerId: "buyer-mira", daysAgo: 3 },
  { id: "ssale_demo_mira_pedal_virt_personal", feedId: "p10", kind: "virtual", use: "Personal use", buyerId: "buyer-mira", daysAgo: 2 },
  { id: "ssale_demo_mira_pedal_phys_personal", feedId: "p10", kind: "physical", use: "Personal use", buyerId: "buyer-mira", daysAgo: 1 },
  // Leo and Sam: a few each, so switching who shops still shows purchases.
  { id: "ssale_demo_sam_jump_phys_biz", feedId: "p34", kind: "physical", use: "Business use", buyerId: "buyer-sam", daysAgo: 5 },
  { id: "ssale_demo_leo_hub_virt_biz", feedId: "p12", kind: "virtual", use: "Business use", buyerId: "buyer-leo", daysAgo: 3 },
  { id: "ssale_demo_leo_watch_virt_personal", feedId: "p3", kind: "virtual", use: "Personal use", buyerId: "buyer-leo", daysAgo: 2 },
  { id: "ssale_demo_sam_meter_main", feedId: "p19", kind: "main", buyerId: "buyer-sam", daysAgo: 2 },
];

/** The sample sales with the demo purchases a list lacks, each planted only while its listing can take it. */
export function withDemoSampleSales(existing: readonly SampleSale[], now: number, buys: readonly DemoSampleBuy[] = DEMO_SAMPLE_BUYS): SampleSale[] {
  let sales = [...existing];
  for (const b of buys) {
    if (sales.some((s) => s.id === b.id)) continue;
    const m = sampleMarketOf(b.feedId);
    if (!m) continue;
    const at = Math.min(now - 60_000, Math.max(now - b.daysAgo * DAY, m.post.sharedAt + DAY));
    const base = { projectId: b.feedId, buyerId: b.buyerId, buyerAddress: demoAddress(b.buyerId), txHash: txHashOf(b.id), at, id: b.id };
    if (b.kind === "main") {
      const main = m.offers.find((o) => o.kind === "main");
      if (!main || offerStateOf(main, b.feedId, sales).soldTo) continue;
      sales = [...sales, makeSampleSale({ ...base, offer: main, serial: null })];
      continue;
    }
    const offer = copyUsesOf(m, b.kind).find((o) => o.use === b.use);
    if (!offer || copyUseBlockOf(offer, b.feedId, sales) !== null) continue;
    const serial = copyUseStateOf(offer, b.feedId, sales).count + 1;
    sales = [...sales, makeSampleSale({ ...base, offer, serial })];
  }
  return sales;
}

/** Manufacturing already done with some demo copies (units.ts), so a copy's units read made and left: Mira made 10
 *  of her 50 with Air quality #7; Sam made all 50 with his jump pack copy; on the Smart Plant Pot, Leo made his one
 *  Personal-use unit and Sam 12 of 50. Keyed by the sale that holds the copy. */
export const DEMO_UNITS: readonly { id: string; saleId: string; units: number; daysAgo: number }[] = [
  { id: "units_demo_mira_air", saleId: "ssale_demo_mira_air_phys_biz_1", units: 10, daysAgo: 2 },
  { id: "units_demo_sam_jump", saleId: "ssale_demo_sam_jump_phys_biz", units: 50, daysAgo: 3 },
  { id: "units_demo_leo_plant", saleId: "sale_demo_plant_phys_private", units: 1, daysAgo: 4 },
  { id: "units_demo_sam_plant", saleId: "sale_demo_plant_1", units: 12, daysAgo: 6 },
];

/** The units log with the demo orders it lacks, each on the copy its sale holds (by that copy's key). */
export function withDemoUnits(
  log: readonly UnitsEntry[],
  sampleSales: readonly SampleSale[],
  ownSales: readonly Sale[],
  now: number,
): UnitsEntry[] {
  const out = [...log];
  for (const d of DEMO_UNITS) {
    if (out.some((e) => e.id === d.id)) continue;
    const s = sampleSales.find((x) => x.id === d.saleId);
    const o = ownSales.find((x) => x.id === d.saleId);
    let key: string | null = null;
    let holder: DemoBuyerId | null = null;
    if (s && s.kind === "physical" && s.serial !== null) {
      key = sampleCopyKeyOf(s.projectId, s.kind, /business/i.test(s.name) ? "Business use" : "Personal use", s.serial);
      holder = s.buyerId;
    } else if (o && o.item.nft === "physical") {
      key = ownCopyKeyOf(o.projectId, o.item.trackId, o.item.serial);
      holder = o.buyerId;
    }
    if (!key || !holder) continue;
    out.push({ id: d.id, copyKey: key, holder, units: d.units, at: now - d.daysAgo * DAY });
  }
  return out;
}
