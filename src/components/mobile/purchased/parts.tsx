"use client";

// What every phone screen about a purchase shares (the web's components/projects/purchased/**, its words kept):
// · the project read as its Innovations post — a sample's own post with its sample builds, or this browser's project
//   read as one with its own builds (WithPost) — for the media, the products and their pieces;
// · the pieces each kind opens (Physical: 3D model, PCB, Firmware, Wiring, Assembly, Parts; Virtual: 3D model and
//   Parts), only those the product's build has;
// · the small words: a copy's number, "A and B", what was paid, Earn's line and status pill;
// · the Purchased chip, the units bar, the loading and "nothing bought" states, the Shopping as sheet and the
//   rules sheet (What you can and can't do).

import * as React from "react";
import { Cancel01Icon, ShoppingBag01Icon, Tick02Icon, UserSwitchIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Skeleton } from "@/components/ideeza/skeleton";
import { Tag } from "@/components/ideeza/tag";
import type { BadgeTone } from "@/components/ideeza/badge";
import { useProjectPageData } from "@/components/projects/details/use-project-page-data";
import { productsOf, useCreateHistory, type BuildItemKind, type BuildJob, type BuildProduct } from "@/lib/create/history";
import { sampleBuildsOf } from "@/lib/demo/acquired-projects";
import { minePostOf } from "@/lib/innovations/mine-post";
import type { InnovationPost, PostProduct } from "@/lib/innovations/types";
import { LICENCE, type PurchaseCopy, type PurchaseLine, type PurchasedProject } from "@/lib/market/purchases";
import { perTokenText } from "@/lib/market/resale-desk";
import { sampleMarketOf } from "@/lib/market/sample-market";
import type { CopyUnits } from "@/lib/market/units";
import type { EditionKind } from "@/lib/market/types";
import type { Token } from "@/lib/brief/types";
import { useMe } from "@/lib/people/profile-store";
import { addAmounts, formatAmount } from "@/lib/wallet/money";
import type { Amount, DemoBuyerId } from "@/lib/wallet/types";
import { DEMO_BUYERS } from "@/lib/wallet/identities";
import { useActiveBuyer } from "@/lib/wallet/use-demo-wallet";
import { cn } from "@/lib/utils";
import { ListCard, ListRow } from "../kit/list";
import { PickSheet } from "../kit/pick-list";
import { Sheet } from "../kit/sheet";
import { EmptyState } from "../kit/state";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { T } from "../type";
import { PURCHASED_TAB_HREF } from "./paths";

// ─────────────────────────── the project as a post ───────────────────────────

export type ProductBuild = { job: BuildJob; bp: BuildProduct } | null;
export type PostRead = { post: InnovationPost; buildOf: (i: number) => ProductBuild };

type WithPostProps = {
  p: PurchasedProject;
  loading: React.ReactNode;
  missing: React.ReactNode;
  children: (read: PostRead) => React.ReactNode;
};

/** The purchase's project as a post (its media, products and pieces): a sample's own, or this browser's read as one. */
export function WithPost(props: WithPostProps) {
  return props.p.source === "sample" ? <SamplePost {...props} /> : <OwnPost {...props} />;
}

function SamplePost({ p, missing, children }: WithPostProps) {
  const m = sampleMarketOf(p.id);
  const jobs = React.useMemo(() => (m ? sampleBuildsOf(m) : []), [m]);
  const read = React.useMemo<PostRead | null>(
    () =>
      m
        ? {
            post: m.post,
            buildOf: (i) => {
              const job = jobs[i];
              const bp = job ? productsOf(job)[0] : undefined;
              return job && bp ? { job, bp } : null;
            },
          }
        : null,
    [m, jobs],
  );
  return <>{read ? children(read) : missing}</>;
}

function OwnPost({ p, loading, missing, children }: WithPostProps) {
  const data = useProjectPageData(p.id, "project");
  const me = useMe();
  const { builds } = useCreateHistory();
  const read = React.useMemo<PostRead | null>(() => {
    if (data.state !== "ready") return null;
    const base = minePostOf(data.project, data.view);
    const post = { ...base, creator: { ...base.creator, name: me.name, initials: me.initials } };
    return {
      post,
      buildOf: (i) => {
        const ref = post.products[i]?.build;
        const job = ref ? builds.find((b) => b.id === ref.buildId) : undefined;
        const bp = job ? productsOf(job).find((x) => x.id === ref?.productId) : undefined;
        return job && bp ? { job, bp } : null;
      },
    };
  }, [data, me, builds]);
  if (data.state === "missing") return <>{missing}</>;
  return <>{read ? children(read) : loading}</>;
}

/** The products a kind's copies cover: a product's own copies that product, the whole project's every product. */
export function coveredOf(p: PurchasedProject, kind: EditionKind, post: InnovationPost): { x: PostProduct; i: number }[] {
  const lines = p.lines.filter((l) => l.kind === kind);
  const scoped = lines.length > 0 && lines.every((l) => l.product !== null);
  const names = new Set(lines.map((l) => l.product));
  return post.products.map((x, i) => ({ x, i })).filter(({ x }) => !scoped || names.has(x.name));
}

/** Copies of the whole project over several products: one unit is one set of them; null otherwise. */
export function setOfLine(p: PurchasedProject, kind: EditionKind, post: InnovationPost): string | null {
  const lines = p.lines.filter((l) => l.kind === kind);
  const scoped = lines.length > 0 && lines.every((l) => l.product !== null);
  if (scoped || post.products.length < 2) return null;
  const names = andList(post.products.map((x) => x.name));
  return kind === "physical" ? `Each copy covers the whole project, so one unit is one set: ${names}.` : `Each copy covers the whole project: ${names}.`;
}

// ─────────────────────────── the pieces each kind opens ───────────────────────────

export type PieceWord = { id: BuildItemKind; label: string };

/** The web purchased page's piece tabs: what each kind opens of a product. */
export const PIECES_OF: Record<EditionKind, PieceWord[]> = {
  physical: [
    { id: "3d", label: "3D model" },
    { id: "pcb", label: "PCB" },
    { id: "code", label: "Firmware" },
    { id: "wiring", label: "Wiring" },
    { id: "assembly", label: "Assembly" },
    { id: "parts", label: "Parts" },
  ],
  virtual: [
    { id: "3d", label: "3D model" },
    { id: "parts", label: "Parts" },
  ],
};

/** Only the pieces this product's build has. */
export function piecesOf(kind: EditionKind, build: ProductBuild): PieceWord[] {
  return build ? PIECES_OF[kind].filter((t) => build.bp.items.some((it) => it.kind === t.id)) : [];
}

/** The Virtual tab's one note: what it leaves out (the tabs say what a kind opens). */
export const VIRTUAL_NOTE =
  "Your copy licenses this product’s 3D model and renders; its parts are open to everyone. Its PCB, firmware, wiring and assembly, and making units, come with a Physical NFT.";

// ─────────────────────────── the words ───────────────────────────

/** "#7 of 50" · "#7" · "—". */
export function numberOf(serial: number | null, of: number | null): string {
  return serial === null ? "—" : of !== null ? `#${serial} of ${of}` : `#${serial}`;
}

/** "A and B", "A, B and C". */
export function andList(names: readonly string[]): string {
  return names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** What was paid over these lines, per token: "0.08 ETH", "0.1 ETH + 5 USDC". */
export function paidOf(lines: readonly PurchaseLine[]): string {
  const byToken = new Map<Token, Amount>();
  for (const l of lines) for (const x of l.paid) byToken.set(x.token, byToken.has(x.token) ? addAmounts(byToken.get(x.token) as Amount, x.amount) : x.amount);
  return [...byToken].map(([token, amount]) => formatAmount(amount, token)).join(" + ");
}

/** What selling on paid, per token; null before the first sale. */
export function earnedOf(p: Pick<PurchasedProject, "sold">): string | null {
  return perTokenText(p.sold.map((s) => ({ amount: s.payout, token: s.token })));
}

/** Earn's one line: what is for sale and what selling on paid (the web header's). */
export function earnLineOf(p: PurchasedProject): string {
  const earned = earnedOf(p);
  const parts = [
    p.forSale > 0 ? `${p.forSale === 1 ? "1 copy" : `${p.forSale} copies`} for sale` : null,
    earned ? `${earned} earned from ${p.sold.length} sold` : null,
  ].filter(Boolean);
  if (parts.length) return parts.join(" · ");
  return p.count > 0 && p.lines.some((l) => l.kind !== "main") ? "Sell a copy on, set its price, see what it earned" : "The whole project sells from its own Earn";
}

/** Earn's one status pill, in a holder's words. */
export function statusOf(p: PurchasedProject): { word: string; tone: BadgeTone } {
  if (p.forSale > 0) return { word: p.forSale === 1 ? "1 copy for sale" : `${p.forSale} copies for sale`, tone: "brand" };
  if (p.count === 0 && p.sold.length > 0) return { word: "Sold every copy", tone: "success" };
  return { word: "Not selling", tone: "neutral" };
}

/** The copy kinds held (a whole project held is the buyer's own project, opened from its page). */
export function heldKindsOf(p: PurchasedProject): EditionKind[] {
  return (["physical", "virtual"] as EditionKind[]).filter((k) => p.lines.some((l) => l.kind === k));
}

/** The whole project is held too. */
export function holdsWhole(p: PurchasedProject): boolean {
  return p.lines.some((l) => l.kind === "main" && (l.sharePct ?? 0) >= 100);
}

/** One copy held, by its key, with its line. */
export function copyOf(p: PurchasedProject, key: string): { line: PurchaseLine; copy: PurchaseCopy } | null {
  for (const line of p.lines) {
    if (line.kind === "main") continue;
    const copy = line.copies.find((c) => c.key === key);
    if (copy) return { line, copy };
  }
  return null;
}

export function buyerNameOf(id: DemoBuyerId): string {
  return DEMO_BUYERS.find((b) => b.id === id)?.name ?? "A demo creator";
}

// ─────────────────────────── the pieces of UI ───────────────────────────

/** The Purchased chip, where a project's status chip goes (the status chip's own size). */
export function PurchasedChip() {
  return (
    <Tag size="md" selected icon={<Icon icon={ShoppingBag01Icon} size={12} />} className="shrink-0">
      Purchased
    </Tag>
  );
}

/** A Physical copy's units: the sold meter's bar (6 px, violet on the subtle ground). */
export function UnitsMeter({ units, label, className }: { units: CopyUnits; label: string; className?: string }) {
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={units.allowance}
      aria-valuenow={units.made}
      className={cn("h-[6px] w-full overflow-hidden rounded-full bg-bg-subtle", className)}
    >
      <div className="h-full rounded-full bg-[color:var(--color-violet-500)]" style={{ width: `${units.allowance ? (units.made / units.allowance) * 100 : 0}%` }} />
    </div>
  );
}

/** Bones under the screen's own top bar while the stores are read. */
export function PurchasedLoading({ back, title }: { back: string; title?: string }) {
  return (
    <Screen top={<TopBar back={back} title={title} />}>
      <div role="status" aria-label="Loading" className="flex flex-col gap-8 px-8 pb-8">
        <Skeleton shape="block" className="aspect-video h-auto w-full" />
        <Skeleton shape="text" size="lg" />
        <Skeleton shape="text" size="md" />
        <Skeleton shape="block" className="h-[168px] w-full" />
      </div>
    </Screen>
  );
}

/** The active demo creator holds nothing of this project (the web's words). */
export function NothingBought({ buyerName, back = PURCHASED_TAB_HREF }: { buyerName: string; back?: string }) {
  return (
    <Screen top={<TopBar back={back} />} className="px-8 pb-8">
      <EmptyState
        icon={ShoppingBag01Icon}
        title={`${buyerName} hasn't bought anything of this project`}
        body="Purchases show under My projects › Purchased for the demo creator you shop as. Switch Shopping as on Explore marketplace to see another's."
        action={{ label: "Back to Purchased", href: PURCHASED_TAB_HREF }}
      />
    </Screen>
  );
}

/** Shopping as (prototype only): which demo creator's purchases show; a pick applies at once. */
export function ShopAsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { buyer, setActiveBuyer } = useActiveBuyer();
  return (
    <PickSheet
      open={open}
      onClose={onClose}
      title="Shopping as"
      description="Testnet demo: a demo creator does the buying, with test tokens in a test wallet."
      value={buyer.id}
      options={DEMO_BUYERS.map((b) => ({ value: b.id as DemoBuyerId, label: `${b.name} · demo creator` }))}
      onPick={(id) => setActiveBuyer(id)}
    />
  );
}

/** The slim Shopping as strip (prototype only) as one row: whose purchases these are; a tap switches them. */
export function ShopAsRow() {
  const { buyer } = useActiveBuyer();
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <ListCard label="Testnet demo">
        <ListRow icon={UserSwitchIcon} title={`Shopping as ${buyer.name}`} meta="Testnet demo · test tokens in a test wallet" onClick={() => setOpen(true)} />
      </ListCard>
      <ShopAsSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/** What each use held allows and doesn't (one copy is one licence): You can / You can't, per use. */
export function LicenceSheet({ open, onClose, kind, lines }: { open: boolean; onClose: () => void; kind: EditionKind; lines: readonly PurchaseLine[] }) {
  return (
    <Sheet open={open} onClose={onClose} title="What you can and can't do">
      <div className="flex flex-col gap-8 pb-8">
        {lines.map((l) => {
          const licence = LICENCE[kind][l.use ?? "Personal use"];
          return (
            <section key={`${l.use}|${l.product}`} className="flex flex-col gap-4">
              {lines.length > 1 && <h3 className={T.section}>{[l.use, l.product].filter(Boolean).join(" · ")}</h3>}
              <RuleList can items={licence.can} />
              {licence.cant.length > 0 && <RuleList can={false} items={licence.cant} />}
            </section>
          );
        })}
      </div>
    </Sheet>
  );
}

function RuleList({ can, items }: { can: boolean; items: readonly string[] }) {
  return (
    <div className="flex flex-col gap-3">
      <p className={cn(T.label, can ? "text-text-success" : "text-text-error")}>{can ? "You can" : "You can't"}</p>
      <ul className="flex flex-col gap-3">
        {items.map((t) => (
          <li key={t} className={cn(T.body, "flex items-start gap-3 text-text-primary")}>
            <span aria-hidden className={cn("mt-1 inline-flex shrink-0", can ? "text-text-success" : "text-text-error")}>
              <Icon icon={can ? Tick02Icon : Cancel01Icon} size={16} />
            </span>
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** True once `target` has scrolled up out of the screen's scroller (the top bar takes the name then). */
export function useScrolledPast(target: React.RefObject<HTMLElement | null>): boolean {
  const [gone, setGone] = React.useState(false);
  React.useEffect(() => {
    const el = target.current;
    const scroller = el?.closest<HTMLElement>(".overflow-y-auto");
    if (!el || !scroller) return;
    const io = new IntersectionObserver(([e]) => setGone(!e.isIntersecting && e.boundingClientRect.top < (e.rootBounds?.top ?? 0)), { root: scroller });
    io.observe(el);
    return () => io.disconnect();
  }, [target]);
  return gone;
}
