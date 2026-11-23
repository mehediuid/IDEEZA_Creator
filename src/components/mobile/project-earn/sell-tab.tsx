"use client";

// Earn › Sell on the phone (mobile UX pass 2026-11-15; Figma 14, 14b–14m,
// 15–15i; the web's sell.tsx and editions.tsx, the owner's selling rules
// 2026-10-11). Earn's frame gives it the top bar "‹ Sell"; this is its content:
// · Whole project, with ⓘ (What you can sell: the three rules, the Main-sale
//   note) and the Testnet demo chip; the product names on one line;
// · its rows — Main NFT, Physical NFT, Virtual NFT — each with its live state;
//   a row opens what comes next (the mint, the item's screen, the sell sheet).
//   Before the mint the copies fold into one line: they use the project's
//   collection and blockchain;
// · One product at a time (`#copies`): each product's Physical and Virtual
//   rows, or the one folded line before the mint. The web desk's rule
//   (`deskProductsOf`, CL-028): in a one-product project the whole project's
//   copies are that product's, so it gets no second row unless it already has
//   copy tracks of its own — and the section isn't there.
// Each row is listed on its own, never asking the Main listing.

import * as React from "react";
import { PackageIcon } from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ideeza/badge";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { phoneProjectHref } from "@/lib/manual/phone-project";
import { displayProductName } from "@/lib/manual/products-tab-view";
import { deskProductsOf } from "@/lib/market/sell-desk";
import { PROJECT_SCOPE } from "@/lib/market/types";
import { preMintCopiesLine } from "@/lib/market/phone-sell";
import { MAIN_SALE_DETAIL, MAIN_SALE_NOTE, SELL_RULES, SELL_RULES_LEAD } from "@/lib/market/sell-flow";
import { cn } from "@/lib/utils";
import { useEarn } from "./context";
import { CopyRow } from "./sell/copy-row";
import { MainRow } from "./sell/main-row";
import { InfoButton, KIND_ICON, ROWS_CARD, SellListRow } from "./sell/parts";
import type { CopyScope } from "./sell/sell-copies";
import { EmptyState } from "../kit/state";
import { Icon } from "@/components/dashboard/icon";
import { T } from "../type";

const COPY_KINDS = ["physical", "virtual"] as const;
const PRODUCTS_LINE = "Products sell copies only, not a Main NFT.";

export function EarnSellTab() {
  return (
    <div className="flex flex-col gap-12">
      <WholeProject />
      <EachProduct />
    </div>
  );
}

/** ⓘ What you can sell: the web's rule cards and notes, as rows in a sheet. */
function SellRulesInfo() {
  return (
    <InfoButton label="What you can sell" title="What you can sell">
      <p className={T.body}>{SELL_RULES_LEAD}</p>
      <ul className={ROWS_CARD}>
        {SELL_RULES.map((r) => (
          <li key={r.id} className="flex items-start gap-6 px-8 py-6">
            <span aria-hidden className="mt-1 shrink-0 text-[color:var(--color-icon-default)]">
              <Icon icon={KIND_ICON[r.id]} size={20} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-2">
              <span className={T.rowTitle}>{r.title}</span>
              <span className={T.meta}>{r.line}</span>
              <span className="flex">
                <Badge tone="neutral">{r.where}</Badge>
              </span>
            </span>
          </li>
        ))}
      </ul>
      <p className={T.body}>{`${MAIN_SALE_NOTE} ${MAIN_SALE_DETAIL}`}</p>
      <p className={T.body}>{PRODUCTS_LINE}</p>
    </InfoButton>
  );
}

function useMinted(): boolean {
  const { view } = useEarn();
  return view.summary.status !== "draft" && view.mint.status !== "notMinted";
}

/** A folded row before the mint: what it is and why it waits. */
function WaitingRow({ label, line }: { label: string; line: string }) {
  return <SellListRow icon={KIND_ICON.physical} title={label} state={[line]} disabled />;
}

function WholeProject() {
  const { project, view } = useEarn();
  const minted = useMinted();
  const products = view.products.filter((p) => p.dropped === null).map((p) => displayProductName(p.name));
  const scope: CopyScope = { id: PROJECT_SCOPE, name: "Whole project", product: null };
  return (
    <section aria-labelledby="sell-whole" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex min-h-[44px] items-center gap-2">
          <h2 id="sell-whole" className={cn(T.section, "min-w-0")}>
            Whole project
          </h2>
          <SellRulesInfo />
          <span className="flex-1" />
          <TestnetDemoBadge />
        </div>
        {products.length > 0 && <p className={cn(T.meta, "line-clamp-2 break-words")}>{products.join(" + ")}</p>}
      </div>
      <ul aria-label={`Whole project · ${project.name}`} className={ROWS_CARD}>
        <MainRow />
        {minted ? (
          COPY_KINDS.map((kind) => <CopyRow key={kind} kind={kind} scope={scope} />)
        ) : (
          <WaitingRow label="Physical and Virtual copies" line={preMintCopiesLine(project.name, "project")} />
        )}
      </ul>
    </section>
  );
}

function EachProduct() {
  const { project, view } = useEarn();
  const minted = useMinted();
  const products = deskProductsOf(view.products, view.editions);
  const current = view.products.filter((p) => p.dropped === null).length;
  // One product and no copies of its own: the Whole project rows above are its copies.
  if (current > 0 && products.length === 0) return null;
  return (
    <section id="copies" aria-labelledby="sell-products" className="flex scroll-mt-8 flex-col gap-4">
      <h2 id="sell-products" className={T.section}>
        One product at a time
      </h2>
      {products.length === 0 ? (
        <EmptyState
          icon={PackageIcon}
          title="No products yet"
          body="Add one to the project to sell its copies."
          action={{ label: "Open products", href: phoneProjectHref(project.id, "products") }}
        />
      ) : !minted ? (
        <ul className={ROWS_CARD}>
          <WaitingRow label="Copies of each product" line={preMintCopiesLine(project.name, "products")} />
        </ul>
      ) : (
        products.map((product) => {
          const name = displayProductName(product.name);
          const scope: CopyScope = { id: product.id, name, product };
          return (
            <section key={product.id} id={`editions-${product.id}`} aria-label={name} className="flex scroll-mt-8 flex-col gap-3">
              <h3 className={cn(T.rowTitle, "break-words px-2 text-text-secondary")}>{name}</h3>
              <ul className={ROWS_CARD}>
                {COPY_KINDS.map((kind) => (
                  <CopyRow key={kind} kind={kind} scope={scope} />
                ))}
              </ul>
            </section>
          );
        })
      )}
    </section>
  );
}
