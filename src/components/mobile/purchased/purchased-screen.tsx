"use client";

// A project the demo creator you shop as bought copies of, on the phone (CL-035 + CL-036; the web's
// /projects/purchased/<id>, its words kept), laid out as a native object page in the order a buyer needs it:
// · Top bar: Back (to My projects › Purchased), the name once the large title scrolls away, and Shopping as
//   (prototype only) as its one action;
// · media first (the project's video, else its picture), then one header: the name with the Purchased chip,
//   "By {creator} · {n} products · {category}", "Bought as {name} (demo creator) · last bought {date}" with the
//   Testnet demo badge; when the Main NFT went to someone else, the line that says so;
// · You own (summary first): {n} NFTs, a row per kind, Paid in all, For sale, Earned selling on, Buy another
//   {kind} ›, and whose demo wallet holds them;
// · the whole project held too: one row, "Open the project" (CL-038);
// · Your NFTs: Physical NFT / Virtual NFT as segmented tabs when both are held (`?nft=`), one kind as a label:
//   · Your products — a row per product the copies cover, saying the pieces this kind opens; it pushes the
//     product's screen, whose rows push each piece (product-screen.tsx);
//   · Your copies — a row per copy (number, use, For sale · price, what was paid, Bought / Bought from, a
//     Physical copy's units); it pushes the copy's screen (copy-screen.tsx);
//   · What you can and can't do, NFT details — rows that open sheets;
//   every copy sold on: "You sold every copy" with See what they earned;
// · Receipts as one row (receipts-screen.tsx), then the creator and Get creator support;
// · the bottom bar's one primary: Earn, its line above it (CL-036).
// A whole project bought only opens as the buyer's own project: an old address here goes there at once.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BubbleChatIcon, Coins01Icon, CrownIcon, Invoice01Icon, LegalDocument01Icon, ShoppingBag01Icon, UserSwitchIcon, ViewIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Avatar } from "@/components/ideeza/avatar";
import { Badge } from "@/components/ideeza/badge";
import { Banner } from "@/components/ideeza/banner";
import { buttonVariants } from "@/components/ideeza/button";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { useUnitsLog } from "@/components/projects/purchased/units-store";
import { usePurchased } from "@/components/projects/purchased/use-purchased";
import { useClipUrl } from "@/components/video-jobs/video-player";
import type { InnovationPost } from "@/lib/innovations/types";
import { phoneMarketHref } from "@/lib/manual/phone-earn";
import { phoneProjectHref } from "@/lib/manual/phone-project";
import { formatDate } from "@/lib/manual/project-summary";
import { useMarket } from "@/lib/market/market-store";
import { KIND_NAME, wholeProjectIdOf, wholeProjectOnly, type PurchaseCopy, type PurchasedProject } from "@/lib/market/purchases";
import type { EditionKind } from "@/lib/market/types";
import { copyUnitsOf, unitsLineOf, type CopyUnits } from "@/lib/market/units";
import { startHref } from "@/lib/messages/links";
import { feedPersonId } from "@/lib/messages/people";
import { ME } from "@/lib/messages/types";
import { profileHrefOf } from "@/lib/people/ids";
import { demoAddress, shortAddress } from "@/lib/wallet/demo-wallet";
import type { DemoBuyer } from "@/lib/wallet/identities";
import { formatAmount } from "@/lib/wallet/money";
import { networkLabelOf } from "@/lib/wallet/request-view";
import { cn } from "@/lib/utils";
import { BottomBar } from "../kit/bottom-bar";
import { Chevron, LIST_CARD, LIST_DIVIDERS, LIST_ROW, ListCard, ListRow } from "../kit/list";
import { Sheet } from "../kit/sheet";
import { EmptyState } from "../kit/state";
import { OfflineBanner } from "../kit/states";
import { MobileTabs, tabPanelProps, useTabParam } from "../kit/tabs";
import { ProductRow } from "../project/parts";
import { MediaHero } from "../project/sample-project";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { T } from "../type";
import { FactRows } from "../project-earn/parts";
import {
  coveredOf,
  earnedOf,
  earnLineOf,
  heldKindsOf,
  holdsWhole,
  LicenceSheet,
  NothingBought,
  numberOf,
  paidOf,
  piecesOf,
  PurchasedChip,
  PurchasedLoading,
  setOfLine,
  ShopAsSheet,
  UnitsMeter,
  useScrolledPast,
  WithPost,
  type PostRead,
} from "./parts";
import { copyPath, productPath, PURCHASED_TAB_HREF, purchasedEarnPath, purchasedPhoneHrefOf, receiptsPath } from "./paths";

export function PurchasedScreen({ id }: { id: string }) {
  const { ready, buyer, purchases } = usePurchased();
  if (!ready) return <PurchasedLoading back={PURCHASED_TAB_HREF} />;
  const p = purchases.find((x) => x.id === id);
  if (!p) return <NothingBought buyerName={buyer.name} />;
  if (wholeProjectOnly(p)) return <OpensAsProject href={purchasedPhoneHrefOf(p)} />;
  return (
    <WithPost p={p} loading={<PurchasedLoading back={PURCHASED_TAB_HREF} />} missing={<NothingBought buyerName={buyer.name} />}>
      {(read) => <PurchasedBody p={p} buyer={buyer} read={read} />}
    </WithPost>
  );
}

/** A whole project bought is the buyer's own project: an old link here opens it, as every link to it does. */
function OpensAsProject({ href }: { href: string }) {
  const router = useRouter();
  React.useEffect(() => router.replace(href), [router, href]);
  return <PurchasedLoading back={PURCHASED_TAB_HREF} />;
}

function PurchasedBody({ p, buyer, read }: { p: PurchasedProject; buyer: DemoBuyer; read: PostRead }) {
  const { post } = read;
  const held = heldKindsOf(p);
  const [kind, setKind] = useTabParam<EditionKind>("nft", held.length ? held : ["physical", "virtual"], held[0] ?? "physical");
  const shown = held.includes(kind) ? kind : held[0];
  const titleRef = React.useRef<HTMLHeadingElement>(null);
  const gone = useScrolledPast(titleRef);
  const [shopAs, setShopAs] = React.useState(false);
  const meta = [post.products.length === 1 ? "1 product" : `${post.products.length} products`, post.category].filter(Boolean).join(" · ");

  return (
    <Screen
      top={
        <TopBar
          back={PURCHASED_TAB_HREF}
          titleAs="p"
          title={gone ? p.name : undefined}
          actions={[{ icon: UserSwitchIcon, label: `Shopping as ${buyer.name}`, onClick: () => setShopAs(true) }]}
        />
      }
      footer={
        <BottomBar>
          <p className={cn(T.meta, "text-center")}>{earnLineOf(p)}</p>
          <Link href={purchasedEarnPath(p.id)} className={cn(buttonVariants({ size: "xl" }), "w-full")}>
            <Icon icon={Coins01Icon} size={20} />
            Earn
          </Link>
        </BottomBar>
      }
    >
      <OfflineBanner />
      <PurchaseHero post={post} cover={p.cover} />
      <div className="flex flex-col gap-12 px-8 pb-12">
        <header className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <h1 ref={titleRef} className={cn(T.title, "min-w-0 break-words")}>
              {p.name}
            </h1>
            <PurchasedChip />
          </div>
          <p className={T.meta}>
            By {p.creator}
            {meta ? ` · ${meta}` : ""}
          </p>
          <p className={T.meta}>
            Bought as {buyer.name} (demo creator) · last bought {formatDate(p.lastAt)}
          </p>
          {p.soldInFullTo && (
            <Banner tone="info" className="mt-4">
              {`The project was sold in full to ${p.soldInFullTo}. Your copies stay yours, with their units and files.`}
            </Banner>
          )}
        </header>

        <YouOwn p={p} buyer={buyer} />

        {holdsWhole(p) && (
          <ListCard label="The whole project">
            <ListRow
              icon={CrownIcon}
              title="Open the project"
              meta="The whole project is yours too: it opens as one of your projects."
              href={phoneProjectHref(wholeProjectIdOf(p))}
            />
          </ListCard>
        )}

        <section aria-labelledby="your-nfts" className="flex flex-col gap-6">
          <h2 id="your-nfts" className={T.section}>
            Your NFTs
          </h2>
          {!shown ? (
            <EmptyState
              icon={ShoppingBag01Icon}
              title="You sold every copy"
              body={`${p.sold.length === 1 ? "Your copy is" : `All ${p.sold.length} copies are`} someone else's now, with their licence. What they paid you is in Earn, and each sale is in the receipts below.`}
              action={{ label: "See what they earned", href: purchasedEarnPath(p.id) }}
            />
          ) : (
            <>
              {held.length > 1 ? (
                <MobileTabs<EditionKind>
                  label="Your NFTs"
                  idBase="purchased-nft"
                  tabs={held.map((k) => ({ value: k, label: KIND_NAME[k] }))}
                  value={shown}
                  onChange={setKind}
                />
              ) : (
                <p className={T.overline}>{KIND_NAME[shown]}</p>
              )}
              <div {...(held.length > 1 ? tabPanelProps("purchased-nft", shown) : {})} className="flex flex-col gap-12 outline-none">
                <KindPanel key={shown} p={p} kind={shown} read={read} buyer={buyer} />
              </div>
            </>
          )}
        </section>

        <ListCard label="Receipts">
          <ListRow icon={Invoice01Icon} title="Receipts" meta={receiptsLineOf(p)} href={receiptsPath(p.id)} />
        </ListCard>

        <CreatorSection p={p} post={post} buyer={buyer} />
      </div>
      <ShopAsSheet open={shopAs} onClose={() => setShopAs(false)} />
    </Screen>
  );
}

/** The project's video, as the Feed played it; else its picture. */
function PurchaseHero({ post, cover }: { post: InnovationPost; cover: string | null }) {
  const first = post.products[0]?.video ?? post.media.find((m) => m.kind === "video" || m.kind === "clip") ?? null;
  const lead = first && (first.kind === "video" || first.kind === "clip") ? first : null;
  const clip = useClipUrl(lead?.kind === "clip" ? lead.takeId : null);
  const image = post.media.find((m) => m.kind === "image");
  const picture = (lead?.kind === "video" ? lead.poster : null) ?? post.products[0]?.image ?? (image?.kind === "image" ? image.src : null) ?? cover;
  if (lead?.kind === "video") return <MediaHero video={{ src: lead.src, alt: lead.alt }} picture={picture} name={post.title} />;
  if (lead?.kind === "clip" && clip.state === "ready") return <MediaHero video={{ src: clip.url, alt: lead.alt }} picture={clip.posterUrl ?? picture} name={post.title} />;
  return <MediaHero video={null} picture={picture} name={post.title} />;
}

/** You own: what is held, what it cost, what is for sale and what selling on paid. */
function YouOwn({ p, buyer }: { p: PurchasedProject; buyer: DemoBuyer }) {
  const kinds = (["main", "physical", "virtual"] as const).filter((k) => p.lines.some((l) => l.kind === k));
  const earned = earnedOf(p);
  return (
    <section aria-labelledby="you-own" className={cn(LIST_CARD, LIST_DIVIDERS)}>
      <div className="flex items-start justify-between gap-4 px-8 py-6">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id="you-own" className={T.meta}>
            You own
          </h2>
          <p className={cn(T.display, "tabular-nums")}>
            {p.count} {p.count === 1 ? "NFT" : "NFTs"}
          </p>
        </div>
        <TestnetDemoBadge />
      </div>
      <dl className={LIST_DIVIDERS}>
        {kinds.map((k) => {
          const lines = p.lines.filter((l) => l.kind === k);
          const n = lines.reduce((x, l) => x + l.copies.length, 0);
          return <Fact key={k} label={KIND_NAME[k]} value={k === "main" ? `${lines[0].sharePct ?? 0}%` : `${n} ${n === 1 ? "copy" : "copies"}`} />;
        })}
        {p.lines.length > 0 && <Fact label="Paid in all" value={paidOf(p.lines)} />}
        {p.forSale > 0 && <Fact label="For sale" value={p.forSale === 1 ? "1 copy" : `${p.forSale} copies`} />}
        {earned && <Fact label="Earned selling on" value={earned} success />}
      </dl>
      {p.buyable.map((k) => (
        <Link key={k} href={phoneMarketHref(p.id)} className={LIST_ROW}>
          <span className={cn(T.body, "min-w-0 flex-1 text-text-brand")}>Buy another {KIND_NAME[k]}</span>
          <Chevron />
        </Link>
      ))}
      <p className={cn(T.meta, "px-8 py-6")}>
        In {buyer.name}&apos;s demo wallet · <span className="font-mono">{shortAddress(p.lines[0]?.copies[0]?.buyerAddress ?? demoAddress(buyer.id))}</span>
      </p>
    </section>
  );
}

function Fact({ label, value, success }: { label: string; value: string; success?: boolean }) {
  return (
    <div className="flex min-h-[44px] items-center justify-between gap-6 px-8 py-4">
      <dt className={T.body}>{label}</dt>
      <dd className={cn(T.rowTitle, "min-w-0 break-words text-right tabular-nums", success && "text-text-success")}>{value}</dd>
    </div>
  );
}

// ─────────────────────────── one kind ───────────────────────────

function KindPanel({ p, kind, read, buyer }: { p: PurchasedProject; kind: EditionKind; read: PostRead; buyer: DemoBuyer }) {
  const log = useUnitsLog();
  const [sheet, setSheet] = React.useState<"rules" | "details" | null>(null);
  const lines = p.lines.filter((l) => l.kind === kind);
  const copies = lines.flatMap((l) => l.copies);
  const covered = coveredOf(p, kind, read.post);
  const setOf = setOfLine(p, kind, read.post);
  const first = copies[0];
  return (
    <>
      {covered.length > 0 && (
        <section aria-labelledby={`products-${kind}`} className="flex flex-col gap-4">
          <h3 id={`products-${kind}`} className={T.section}>
            {covered.length === 1 ? "Your product" : `Your products · ${covered.length}`}
          </h3>
          <ListCard label={covered.length === 1 ? "Your product" : "Your products"}>
            {covered.map(({ x, i }) => {
              const pieces = piecesOf(kind, read.buildOf(i));
              return (
                <ProductRow
                  key={x.id}
                  href={productPath(p.id, x.id, kind)}
                  thumb={x.image}
                  name={x.name}
                  meta={pieces.length ? pieces.map((t) => t.label).join(" · ") : "Overview and specs"}
                />
              );
            })}
          </ListCard>
        </section>
      )}

      <section aria-labelledby={`copies-${kind}`} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 id={`copies-${kind}`} className={T.section}>
            {copies.length === 1 ? "Your copy" : `Your copies · ${copies.length}`}
          </h3>
          {setOf && <p className={T.meta}>{setOf}</p>}
        </div>
        <ul aria-label={copies.length === 1 ? "Your copy" : "Your copies"} className={cn(LIST_CARD, LIST_DIVIDERS)}>
          {lines.flatMap((l) =>
            l.copies.map((c) => (
              <CopyRow
                key={c.id}
                href={copyPath(p.id, c.key)}
                copy={c}
                use={[l.use, l.product].filter(Boolean).join(" · ")}
                units={l.unitsPerCopy !== null ? copyUnitsOf(c.key, l.unitsPerCopy, buyer.id, log) : null}
              />
            )),
          )}
        </ul>
      </section>

      <ListCard label="The rules and the token">
        <ListRow icon={LegalDocument01Icon} title="What you can and can't do" meta={lines.map((l) => l.use).filter(Boolean).join(" · ")} onClick={() => setSheet("rules")} />
        <ListRow icon={ViewIcon} title="NFT details" meta={`${KIND_NAME[kind]} · ${networkLabelOf(first.network)}`} onClick={() => setSheet("details")} />
      </ListCard>

      <LicenceSheet open={sheet === "rules"} onClose={() => setSheet(null)} kind={kind} lines={lines} />
      <Sheet open={sheet === "details"} onClose={() => setSheet(null)} title="NFT details" description="Each copy is one licence. Minted when you bought it.">
        <div className="pb-8">
          <FactRows
            label="NFT details"
            rows={[
              { label: "Collection", value: first.collection || "—" },
              { label: "Blockchain", value: networkLabelOf(first.network) },
              { label: "NFT type", value: KIND_NAME[kind] },
              { label: "Copies", value: String(copies.length) },
              { label: "Paid", value: paidOf(lines) },
              { label: "Purchased from", value: p.creator },
            ]}
          />
        </div>
      </Sheet>
    </>
  );
}

/** One copy: its number, use, For sale · price, what it cost and when, a Physical copy's units. */
function CopyRow({ href, copy: c, use, units }: { href: string; copy: PurchaseCopy; use: string; units: CopyUnits | null }) {
  const number = numberOf(c.serial, c.of);
  return (
    <li>
      <Link href={href} className={LIST_ROW} aria-label={`${number}${use ? ` · ${use}` : ""}${c.listing ? ` · For sale · ${formatAmount(c.listing.price, c.listing.token)}` : ""}`}>
        <span className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className={cn(T.rowTitle, "font-mono tabular-nums")}>{number}</span>
            {use && <Badge tone="neutral">{use}</Badge>}
            {c.listing && <Badge tone="brand">For sale · {formatAmount(c.listing.price, c.listing.token)}</Badge>}
          </span>
          <span className={cn(T.meta, "tabular-nums")}>
            {formatAmount(c.price, c.token)} · Bought {c.from ? `from ${c.from} ` : ""}
            {formatDate(c.at)}
          </span>
          {units && (
            <span className="flex flex-col gap-2 pt-1">
              <UnitsMeter units={units} label={`Units made with ${number}`} />
              <span className={cn(T.meta, "tabular-nums text-text-primary")}>{unitsLineOf(units)}</span>
            </span>
          )}
        </span>
        <Chevron />
      </Link>
    </li>
  );
}

// ─────────────────────────── receipts and the creator ───────────────────────────

function receiptsLineOf(p: PurchasedProject): string {
  const n = p.lines.reduce((x, l) => x + l.copies.length, 0) + p.sold.length;
  const newest = Math.max(...p.lines.flatMap((l) => l.copies.map((c) => c.at)), ...p.sold.map((s) => s.at));
  return `${n} ${n === 1 ? "receipt" : "receipts"} · newest ${formatDate(newest)}`;
}

function CreatorSection({ p, post, buyer }: { p: PurchasedProject; post: InnovationPost; buyer: DemoBuyer }) {
  const { data } = useMarket();
  const sample = p.source === "sample";
  const profile = sample ? profileHrefOf(post.creator.id, "innovations") : null;
  const latest = data.sales.filter((s) => s.projectId === p.id && s.buyerId === buyer.id).reduce<(typeof data.sales)[number] | null>((a, s) => (!a || s.at > a.at ? s : a), null);
  const ask = sample
    ? `/m${startHref({ kind: "post", to: feedPersonId(post.creator.id), slug: post.slug }, ME)}`
    : `/m${startHref({ kind: "direct", to: ME, projectId: p.id, about: latest ? { kind: "purchase", saleId: latest.id } : { kind: "listing" } }, buyer.id)}`;
  const avatar = <Avatar initials={post.creator.initials} color={post.creator.color} size="sm" />;
  const line = `Questions about what you bought go to ${p.creator}.`;
  return (
    <section aria-labelledby="the-creator" className="flex flex-col gap-4">
      <h2 id="the-creator" className={T.section}>
        Creator
      </h2>
      <ListCard label="Creator">
        {profile ? (
          <ListRow leading={avatar} title={p.creator} meta={line} href={`/m${profile}`} />
        ) : (
          <ListRow leading={avatar} title={p.creator} meta={line} />
        )}
        <ListRow icon={BubbleChatIcon} title="Get creator support" href={ask} />
      </ListCard>
    </section>
  );
}
