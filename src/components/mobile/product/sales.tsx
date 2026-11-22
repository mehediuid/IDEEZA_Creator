"use client";

// A product's Sales on the phone (CL-015; the web's product Sales tab, which
// is `CustomersPanel` scoped to the product): the owner's only, from the
// object page's Sales row (`…/sales`). Only this product's Physical and
// Virtual copy sales, newest first — Main NFT sales are the project's
// (Earn › Money › Sales). The rows are the project Sales screen's (who, the
// price, the item, the date and benefits), each opening its sale in a sheet
// (the web's detail lines, Message {buyer}); `?sale=<id>` opens one on
// arrival. Above them "{n} sales to {m} people." with the Testnet demo badge,
// the demo note in the ⓘ; under them "To tell everyone who bought at once, add
// to Activity." With none: the web's empty state ("No sales of this product
// yet", its line, Project sales). A sales record this browser can't read:
// "Sales can't be shown". A phone list scrolls, so it has no pages. Anyone but
// the owner is sent back to the product page.

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Copy01Icon, Tick02Icon, UserMultipleIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { buttonVariants } from "@/components/ideeza/button";
import { IconButton } from "@/components/ideeza/icon-button";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { customerRowText, customersEmptyCopy, customersOf, customersSummaryText, type CustomerRow } from "@/lib/manual/customers";
import { can } from "@/lib/manual/permissions";
import { saleFromQuery, saleItemLine, saleWhenLine } from "@/lib/manual/phone-plan-money";
import { phoneHrefOf, phoneProjectHref } from "@/lib/manual/phone-project";
import { startHref } from "@/lib/messages/links";
import { ME } from "@/lib/messages/types";
import { DEMO_BUYERS } from "@/lib/wallet/identities";
import { cn } from "@/lib/utils";
import { Chevron, LIST_ROW, ListCard } from "../kit/list";
import { Sheet } from "../kit/sheet";
import { EmptyState, ErrorState } from "../kit/state";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { T } from "../type";
import { InfoButton } from "./parts";
import { ProductLoading, ProductMissing, ProjectMissing } from "./states";
import { ProductProvider, useProduct, useProductData } from "./use-product";

const DEMO_NOTE = "Demo purchases from Explore marketplace, made in this browser. Nothing is on a blockchain.";

export function ProductSalesScreen({ id, productId }: { id: string; productId: string }) {
  const data = useProductData(id, productId);
  if (data.state === "loading") return <ProductLoading />;
  if (data.state === "missing") return <ProjectMissing />;
  if (data.state === "no-product") return <ProductMissing projectName={data.projectName} back={phoneProjectHref(data.projectId, "products")} />;
  return (
    <ProductProvider value={data.ctx}>
      <SalesScreen />
    </ProductProvider>
  );
}

function SalesScreen() {
  const { project, view, viewer, product, name, mode, path, now } = useProduct();
  const router = useRouter();
  const search = useSearchParams();
  const customers = React.useMemo(() => customersOf(project, view.sales, { scope: { kind: "product", productId: product.id } }), [project, view.sales, product.id]);
  const rows = customers.rows;
  // Read once, on arrival (the web's P2-CUSTOMERS-11).
  const [initialSale] = React.useState(() => search.get("sale"));
  const [openId, setOpenId] = React.useState<string | null>(() => saleFromQuery(rows, initialSale)?.saleId ?? null);
  const opened = openId ? (rows.find((r) => r.saleId === openId) ?? null) : null;
  const close = () => {
    setOpenId(null);
    if (search.get("sale")) router.replace(path("sales"), { scroll: false });
  };
  const owner = mode === "owner" && can(viewer, "customers.see");
  // Sales are the owner's (the web's tab is theirs only): anyone else lands on the product page.
  React.useEffect(() => {
    if (!owner) router.replace(path(""));
  }, [owner, router, path]);
  const empty = customersEmptyCopy({ scope: { kind: "product", productId: product.id }, status: view.summary.status, projectId: project.id, productName: name });

  return (
    <Screen top={<TopBar back={path("")} title="Sales" />}>
      <div className="flex flex-col gap-6 px-8 pb-12 pt-2">
        {!owner ? null : view.marketUnreadable ? (
          <ErrorState title="Sales can't be shown" body="This browser's sales record couldn't be read. It's been left as it is." />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={UserMultipleIcon}
            title={empty.title}
            body={empty.body}
            action={empty.link ? { label: empty.link.label, href: phoneHrefOf(empty.link.href) ?? path("") } : undefined}
          />
        ) : (
          <>
            <div className="flex min-h-[44px] items-center gap-2">
              <p className={cn(T.rowTitle, "min-w-0")}>{customersSummaryText(customers)}</p>
              <InfoButton label="About these sales" title="Sales">
                <p>{DEMO_NOTE}</p>
              </InfoButton>
              <span className="ml-auto shrink-0">
                <TestnetDemoBadge />
              </span>
            </div>
            <ListCard label={`Sales of ${project.name}, newest first`}>
              {rows.map((row) => {
                const text = customerRowText(row, { projectName: project.name, now });
                return (
                  <li key={row.saleId}>
                    <button
                      type="button"
                      aria-label={`${text.buyer}, ${text.price}, sale details`}
                      aria-haspopup="dialog"
                      className={LIST_ROW}
                      onClick={() => setOpenId(row.saleId)}
                    >
                      <span className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="flex items-baseline justify-between gap-4">
                          <span className={cn(T.rowTitle, "min-w-0 truncate")}>{text.buyer}</span>
                          <span className={cn(T.rowTitle, "shrink-0 tabular-nums")}>{text.price}</span>
                        </span>
                        <span className={cn(T.meta, "flex items-baseline justify-between gap-4")}>
                          <span className="min-w-0 truncate">{saleItemLine(text)}</span>
                          <span className="shrink-0">{saleWhenLine(row.at, text.benefits)}</span>
                        </span>
                      </span>
                      <Chevron />
                    </button>
                  </li>
                );
              })}
            </ListCard>
            <p className={T.meta}>
              To tell everyone who bought at once,{" "}
              <Link href={phoneProjectHref(project.id, "activity")} className="font-medium text-text-brand outline-none hover:underline focus-visible:underline">
                add to Activity
              </Link>
              .
            </p>
          </>
        )}
      </div>
      {opened && <SaleSheet row={opened} onClose={close} />}
    </Screen>
  );
}

/** One sale, in the web's detail words (Earn › Money › Sales' sheet, for this product). */
function SaleSheet({ row, onClose }: { row: CustomerRow; onClose: () => void }) {
  const { project, now } = useProduct();
  const text = customerRowText(row, { projectName: project.name, now });
  const buyerName = DEMO_BUYERS.find((b) => b.id === row.buyerId)?.name ?? "the buyer";
  const [copied, setCopied] = React.useState(false);
  const copy = () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    navigator.clipboard
      .writeText(row.buyerAddress)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  };
  const lines = [{ term: "Bought by", value: text.buyer }, ...text.detail];
  return (
    <Sheet
      open
      onClose={onClose}
      title={`Sale · ${text.item}`}
      actions={
        <>
          <Link
            href={`/m${startHref({ kind: "direct", to: row.buyerId, projectId: project.id, about: { kind: "purchase", saleId: row.saleId } }, ME)}`}
            className={cn(buttonVariants({ size: "xl" }), "w-full")}
          >
            {`Message ${buyerName}`}
          </Link>
        </>
      }
    >
      <dl className="flex flex-col">
        {lines.map((d, i) => (
          <div key={`${d.term}-${i}`} className="flex min-h-[44px] items-center justify-between gap-6 border-b-[length:var(--border-width-1)] border-solid border-border py-3 last:border-b-0">
            <dt className={cn(T.body, "shrink-0")}>{d.term}</dt>
            <dd className={cn(T.body, "flex min-w-0 items-center justify-end gap-2 text-right text-text-primary")}>
              {d.term === "Wallet" ? (
                <>
                  <span className="min-w-0 truncate font-mono">{d.value}</span>
                  <IconButton
                    hierarchy="ghost"
                    size="xl"
                    aria-label={copied ? "Wallet address copied" : "Copy wallet address"}
                    icon={<Icon icon={copied ? Tick02Icon : Copy01Icon} size={16} />}
                    onClick={copy}
                    className="-my-3 shrink-0"
                  />
                </>
              ) : (
                <span className="min-w-0 break-words">{d.value}</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
      <p className={T.meta}>Testnet demo: bought with a demo wallet in this browser. No transaction was sent.</p>
    </Sheet>
  );
}
