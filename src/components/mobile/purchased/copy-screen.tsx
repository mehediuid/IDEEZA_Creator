"use client";

// One bought copy, on the phone (CL-035 › Your copies, CL-036; the web's copy row, its words kept), as its own screen:
// · the head: the kind and use ("Physical NFT · Business use"), the number large, For sale · {price} when it is
//   listed, and what it is a copy of (the whole project's products, or one product);
// · a Physical copy's units: the bar, "10 of 50 units made · 40 left" and what a sale would hand over ("If you
//   sell #7, the buyer gets the 40 units left; the 10 you made stay yours.");
// · its facts: Paid, Bought (or Bought from {holder}), Collection, Blockchain;
// · Download files (owner, 2026-11-25): one .zip of what the copy's kind opens for every product it covers;
//   a Physical copy's download takes 1 of its units, asked first in the kit's confirm sheet, and waits while the
//   copy is for sale or has no units left; Send to manufacturing, greyed with the web's reason (its flow comes
//   next); What you can and can't do for this copy's use (a sheet);
// · the title says what the number is ("Copy #7 of 50"), its ⓘ sheet what it means;
// · the bottom bar's one primary: Sell this copy, or Manage the listing while it is for sale — both open its
//   screen on Earn › Sell.
// A copy the buyer doesn't hold any more (sold on, or another demo creator picked) says so, with Back.

import * as React from "react";
import { Download04Icon, Factory01Icon, LegalDocument01Icon, ShoppingBag01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { buttonVariants } from "@/components/ideeza/button";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { KIND_ICON } from "@/components/marketplace/kind-icon";
import { appendUnits, useUnitsLog } from "@/components/projects/purchased/units-store";
import { copyZipName, useCopyDownload, type CopyProduct } from "@/components/projects/purchased/nft-download";
import { usePurchased } from "@/components/projects/purchased/use-purchased";
import { tileKeyOfCopy } from "@/lib/market/resale-desk";
import { formatDate } from "@/lib/manual/project-summary";
import { copyNumberHelpOf, copyTitleOf, KIND_NAME, wholeProjectOnly, type PurchaseCopy, type PurchaseLine, type PurchasedProject } from "@/lib/market/purchases";
import type { EditionKind } from "@/lib/market/types";
import { copyUnitsOf, unitsLineOf, unitsOnResale, type CopyUnits } from "@/lib/market/units";
import type { DemoBuyerId } from "@/lib/wallet/types";
import type { DemoBuyer } from "@/lib/wallet/identities";
import { formatAmount } from "@/lib/wallet/money";
import { networkLabelOf } from "@/lib/wallet/request-view";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { BottomBar } from "../kit/bottom-bar";
import { LIST_CARD, ListCard, ListRow } from "../kit/list";
import { EmptyState } from "../kit/state";
import { OfflineBanner } from "../kit/states";
import { FactRows } from "../project-earn/parts";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { T } from "../type";
import { andList, copyOf, LicenceSheet, NothingBought, PurchasedLoading, UnitsMeter, useScrolledPast, WithPost, type PostRead } from "./parts";
import { ConfirmSheet } from "../kit/confirm-sheet";
import { InfoButton } from "../project-earn/parts";
import { PURCHASED_TAB_HREF, purchasedKindHref, purchasedPhoneHrefOf, resaleItemPath } from "./paths";

/** The web's reasons a Physical copy's files wait (purchased-page.tsx). */
const NO_UNITS_LEFT = "No units left on this copy, so its files can't be downloaded again.";
const ON_SALE = "Take the copy off sale first: no units are used while it's for sale.";

const MANUFACTURING_LATER = "Sending a copy to manufacturing comes in the next step of the prototype. No units are made with a copy while it's for sale.";

export function CopyScreen({ id, copyKey }: { id: string; copyKey: string }) {
  const { ready, buyer, purchases } = usePurchased();
  if (!ready) return <PurchasedLoading back={PURCHASED_TAB_HREF} />;
  const p = purchases.find((x) => x.id === id);
  if (!p || wholeProjectOnly(p)) return <NothingBought buyerName={buyer.name} back={p ? purchasedPhoneHrefOf(p) : PURCHASED_TAB_HREF} />;
  const found = copyOf(p, copyKey);
  if (!found) {
    return (
      <Screen top={<TopBar back={purchasedKindHref(id, null)} />} className="px-8 pb-8">
        <EmptyState
          icon={ShoppingBag01Icon}
          title="This copy isn’t yours now"
          body={`${buyer.name} doesn’t hold it: it was sold on, or it belongs to another demo creator.`}
          action={{ label: `Back to ${p.name}`, href: purchasedKindHref(id, null) }}
        />
      </Screen>
    );
  }
  return <CopyBody p={p} buyer={buyer} {...found} />;
}

function CopyBody({ p, buyer, line, copy: c }: { p: PurchasedProject; buyer: DemoBuyer } & NonNullable<ReturnType<typeof copyOf>>) {
  const log = useUnitsLog();
  const [rules, setRules] = React.useState(false);
  const titleRef = React.useRef<HTMLHeadingElement>(null);
  const gone = useScrolledPast(titleRef);
  const kind = line.kind as EditionKind;
  const number = copyTitleOf(c.serial, c.of);
  const units = line.unitsPerCopy !== null ? copyUnitsOf(c.key, line.unitsPerCopy, buyer.id, log) : null;
  const resale = units ? unitsOnResale(units) : null;
  const of = line.product ? `A copy of ${line.product}, from ${p.name}.` : p.products.length > 1 ? `A copy of the whole project: ${andList(p.products)}.` : `A copy of ${p.name}.`;
  const back = purchasedKindHref(p.id, kind);
  return (
    <Screen
      top={<TopBar back={back} titleAs="p" title={gone ? number : undefined} />}
      footer={
        <BottomBar>
          <Link href={resaleItemPath(p.id, tileKeyOfCopy(c.key))} className={cn(buttonVariants({ size: "xl" }), "w-full")}>
            {c.listing ? "Manage the listing" : "Sell this copy"}
          </Link>
        </BottomBar>
      }
    >
      <OfflineBanner />
      <div className="flex flex-col gap-12 px-8 pb-12 pt-2">
        <header className="flex flex-col gap-3">
          <p className={cn(T.meta, "flex items-center gap-2")}>
            <span aria-hidden className="inline-flex text-[color:var(--color-icon-default)]">
              <Icon icon={KIND_ICON[kind]} size={16} />
            </span>
            {[KIND_NAME[kind], line.use].filter(Boolean).join(" · ")}
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <h1 ref={titleRef} className={cn(T.display, "tabular-nums")}>
              {number}
            </h1>
            <InfoButton title={number} label={`What ${number} means`}>
              <p className={T.body}>{copyNumberHelpOf(c.serial, c.of, kind, line.use)}</p>
            </InfoButton>
            {c.listing && <Badge tone="brand">For sale · {formatAmount(c.listing.price, c.listing.token)}</Badge>}
          </div>
          <p className={T.body}>{of}</p>
        </header>

        {units && (
          <section aria-labelledby="copy-units" className={cn(LIST_CARD, "gap-4 p-8")}>
            <h2 id="copy-units" className={T.section}>
              Units
            </h2>
            <UnitsMeter units={units} label={`Units made with ${number}`} />
            <p className={cn(T.rowTitle, "tabular-nums")}>{unitsLineOf(units)}</p>
            {resale && (
              <p className={T.meta}>
                If you sell {c.serial !== null ? `copy #${c.serial}` : "this copy"}, the buyer gets {resale.buyerGets === 0 ? "no units" : `the ${resale.buyerGets} ${resale.buyerGets === 1 ? "unit" : "units"}`} left
                {resale.sellerKeeps > 0 ? `; the ${resale.sellerKeeps} you made stay yours.` : "."}
              </p>
            )}
          </section>
        )}

        <section aria-labelledby="copy-facts" className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <h2 id="copy-facts" className={T.section}>
              Your copy
            </h2>
            <TestnetDemoBadge />
          </div>
          <FactRows
            label="Your copy"
            rows={[
              { label: "Paid", value: formatAmount(c.price, c.token) },
              { label: c.from ? `Bought from ${c.from}` : "Bought", value: formatDate(c.at) },
              { label: "Use", value: line.use ?? "—" },
              { label: "Collection", value: c.collection || "—" },
              { label: "Blockchain", value: networkLabelOf(c.network) },
            ]}
          />
        </section>

        <ListCard label="What you can do with it">
          <WithPost p={p} loading={null} missing={null}>
            {(read) => <DownloadRow p={p} kind={kind} line={line} copy={c} units={units} buyerId={buyer.id} read={read} title={number} />}
          </WithPost>
          {units && <ListRow icon={Factory01Icon} title="Send to manufacturing" disabled reason={MANUFACTURING_LATER} onClick={() => undefined} />}
          <ListRow icon={LegalDocument01Icon} title="What you can and can't do" meta={line.use ?? undefined} onClick={() => setRules(true)} />
        </ListCard>
      </div>
      <LicenceSheet open={rules} onClose={() => setRules(false)} kind={kind} lines={[line]} />
    </Screen>
  );
}

/** Download files: the copy's .zip (nft-download.ts). A Physical copy's download takes 1 unit, so it asks first and
 *  waits while the copy is for sale or has none left (the web's words). */
function DownloadRow({
  p,
  kind,
  line,
  copy: c,
  units,
  buyerId,
  read,
  title,
}: {
  p: PurchasedProject;
  kind: EditionKind;
  line: PurchaseLine;
  copy: PurchaseCopy;
  units: CopyUnits | null;
  buyerId: DemoBuyerId;
  read: PostRead;
  title: string;
}) {
  const products = React.useMemo<CopyProduct[]>(
    () =>
      read.post.products
        .map((x, i) => ({ x, i }))
        .filter(({ x }) => !line.product || x.name === line.product)
        .map(({ x, i }) => ({ name: x.name, image: x.image, build: read.buildOf(i) })),
    [read, line.product],
  );
  const download = useCopyDownload(kind, products, copyZipName(p.name, c.serial, kind));
  const [asking, setAsking] = React.useState(false);
  if (!download.what) return null;
  const blocked = units ? (c.listing ? ON_SALE : units.left === 0 ? NO_UNITS_LEFT : null) : null;
  const take = () =>
    download.run(
      units
        ? () => {
            appendUnits({ id: `dl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`, copyKey: c.key, holder: buyerId, units: 1, at: Date.now() });
          }
        : undefined,
    );
  const left = units ? units.left - 1 : 0;
  const meta = download.state === "busy" ? "Making the .zip…" : download.note || `${download.what}, in one .zip${units ? " · uses 1 unit" : ""}`;
  return (
    <>
      <ListRow
        icon={Download04Icon}
        title="Download files"
        meta={meta}
        disabled={!!blocked}
        reason={blocked ?? undefined}
        onClick={() => {
          if (blocked || download.state === "busy") return;
          if (units) setAsking(true);
          else take();
        }}
      />
      {units && (
        <ConfirmSheet
          open={asking}
          onClose={() => setAsking(false)}
          title="Download the files for 1 unit?"
          body={`${title} has ${units.left} ${units.left === 1 ? "unit" : "units"} left. Downloading its files uses 1, so ${
            left === 0 ? "none will be left" : `${left} will be left`
          }. A unit used doesn't come back.`}
          verb="Download"
          onConfirm={() => {
            setAsking(false);
            take();
          }}
        />
      )}
    </>
  );
}
