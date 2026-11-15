"use client";

// The product's own Activity (Product Details 10, 10h, 10r, 10s, 26a–26d;
// decision D3: the project's Activity screens, scoped to this product):
// - `ActivitySection` — the object page's section (the owner's, and a
//   contributor preview's read-only): + as an icon button beside the heading,
//   then rows — the newest entry (a tap opens the history), History (n), and
//   once the product has an NFT, NFT activity in Earn › Sell (its Physical and
//   Virtual NFTs keep their own activity there) with how many are on sale;
// - `HeaderActivity` — what everyone else reads in the header (10h, 10x,
//   31b): "{product} activity", Now with its type, the description, its proof,
//   and Earlier (n) opening the rest in place (Hide earlier);
// - `ProductActivityScreen` — the full history (10r), newest first, ⋮ Edit
//   Activity · Delete Activity · Open link (26d; Planning is made
//   automatically, so it has none), the prices an entry was added at (26a, a
//   tap opens 26b / 26c; one Testnet demo badge for the screen), the proof
//   viewer and links that ask first. One line under the bar ("{product} ·
//   newest first" and the Testnet demo badge), NFT activity as a row, and
//   "Add New Activity" in the Bottom action bar opening the project's form for
//   this product (10s). Back is the top bar's: it never pushes.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity01Icon,
  Add01Icon,
  ArrowRight01Icon,
  Delete02Icon,
  HelpCircleIcon,
  Link01Icon,
  MoreVerticalIcon,
  PencilEdit01Icon,
  Store01Icon,
  WorkHistoryIcon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { buttonVariants } from "@/components/ideeza/button";
import { iconButtonVariants } from "@/components/ideeza/icon-button";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { earnHref } from "@/lib/manual/earn-route";
import { activitiesOf, helpOf, historyOf, labelOf, shortOf, type JourneyEntry, type MediaRef, type ProjectJourney } from "@/lib/manual/journey";
import { productAddedAt } from "@/lib/manual/journey-dates";
import { removeActivity, useJourney } from "@/lib/manual/journey-store";
import { can } from "@/lib/manual/permissions";
import { formatDate } from "@/lib/manual/project-summary";
import { phoneHrefOf } from "@/lib/manual/phone-project";
import { productPricesOf, type ProductPrices } from "@/lib/manual/phone-product";
import { USE_LABEL } from "@/lib/market/sell-flow";
import { formatAmount } from "@/lib/wallet/money";
import type { Token } from "@/lib/brief/types";
import { cn } from "@/lib/utils";
import { ConfirmSheet } from "../kit/confirm-sheet";
import { ActionSheet, Sheet } from "../kit/sheet";
import { useToast } from "../kit/toast";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { BottomBar } from "../kit/bottom-bar";
import { Chevron, LIST_CARD, LIST_ROW, ListCard, ListRow } from "../kit/list";
import { PRESSED_SECONDARY } from "../kit/press";
import { T } from "../type";
import { ProofTile, ProofViewer } from "../project/activity-tab";
import { useListedCopies } from "./overview";
import { CARD, LinkButton, SectionHead } from "./parts";
import { ProductProvider, useProduct, useProductData } from "./use-product";
import { ProductLoading, ProductMissing, ProjectMissing } from "./states";

type Viewing = { media: MediaRef[]; index: number } | null;

/** This product's history, newest first, its default Planning last. */
export function useProductHistory(journey?: ProjectJourney): JourneyEntry[] {
  const { project, view, product } = useProduct();
  const stored = useJourney(journey ? null : project.id);
  const record = journey ?? stored.record;
  return React.useMemo(
    () => historyOf(record, project.id, { kind: "product", productId: product.id }, productAddedAt(project, view.refs, product)),
    [record, project, view.refs, product],
  );
}

/** Where this product's NFTs keep their activity: Earn › Sell at its copies (the web's
 *  `earnHref(id, "copies")`), once it has one. */
function useNftLine(): string | null {
  const { project, view, product } = useProduct();
  const hasNft = view.editions.some((t) => t.productId === product.id);
  return hasNft ? (phoneHrefOf(earnHref(project.id, "copies")) ?? null) : null;
}

// ─────────────────────────── the object page's Activity section (10) ───────────────────────────

/** The owner's (and a contributor preview's) Activity: + as a 44 px icon button beside the heading,
 *  then rows — the newest entry (a whole-row tap opens the history), History (n), and once the
 *  product has an NFT, NFT activity in Earn › Sell with how many of its copies are on sale. */
export function ActivitySection() {
  const { project, view, viewer, product, path } = useProduct();
  const { record } = useJourney(project.id);
  const entries = useProductHistory();
  const nft = useNftLine();
  const onSale = useListedCopies().length;
  const now = entries[0];
  const stored = activitiesOf(record, { kind: "product", productId: product.id }).length;
  const canAdd = can(viewer, "activity.write", view.canCtx);
  if (!now) return null;
  return (
    <section aria-labelledby="pd-activity" className="flex flex-col gap-4">
      <SectionHead
        id="pd-activity"
        title="Activity"
        action={
          canAdd ? (
            <Link href={path("activity/new")} aria-label="Add activity" className={cn(iconButtonVariants({ hierarchy: "secondary", size: "xl" }), PRESSED_SECONDARY, "-my-4")}>
              <Icon icon={Add01Icon} size={22} />
            </Link>
          ) : undefined
        }
      />
      <ListCard label="Activity">
        <li>
          <Link href={path("activity")} className={cn(LIST_ROW, "items-start")}>
            <span aria-hidden className="mt-1 shrink-0 text-[color:var(--color-icon-default)]">
              <Icon icon={Activity01Icon} size={24} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-2">
              <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <Badge tone="brand-outline">{shortOf(now)}</Badge>
                <span className={T.meta}>{formatDate(now.createdAt)}</span>
              </span>
              <span className={cn(T.body, "line-clamp-2 text-text-primary")}>{now.description}</span>
            </span>
            <Chevron className="self-center" />
          </Link>
        </li>
        {stored > 0 && <ListRow href={path("activity")} icon={WorkHistoryIcon} title="History" value={String(stored + 1)} />}
        {nft && <ListRow href={nft} icon={Store01Icon} title="NFT activity" meta="Earn › Sell" value={onSale > 0 ? `${onSale} on sale` : undefined} />}
      </ListCard>
    </section>
  );
}

// ─────────────────────────── the header block (10h, 10x, 31b) ───────────────────────────

export function HeaderActivity({ journey }: { journey?: ProjectJourney }) {
  const { name } = useProduct();
  const entries = useProductHistory(journey);
  return <ActivityCardBlock name={name} entries={entries} />;
}

/** The read-only block itself, for a stored journey or a Feed sample's. */
export function ActivityCardBlock({ name, entries }: { name: string; entries: JourneyEntry[] }) {
  const [open, setOpen] = React.useState(false);
  const [viewing, setViewing] = React.useState<Viewing>(null);
  const listId = React.useId();
  const [now, ...earlier] = entries;
  if (!now) return null;
  return (
    <section aria-labelledby="pd-now" className={cn(LIST_CARD, "gap-3 p-6")}>
      <h2 id="pd-now" className={T.name}>
        {name} activity
      </h2>
      <span className="flex flex-wrap items-center gap-3">
        <span className={T.meta}>Now</span>
        <Badge tone="brand-outline">{labelOf(now)}</Badge>
        <span className={T.meta}>{formatDate(now.createdAt)}</span>
      </span>
      <p className={cn(T.body, "line-clamp-3 whitespace-pre-line break-words text-text-primary")}>{now.description}</p>
      <div className="flex items-center gap-4">
        {now.media.slice(0, 3).map((m, i) => (
          <ProofTile key={m.id} media={m} onOpen={() => setViewing({ media: now.media, index: i })} />
        ))}
        <span className="flex-1" />
        {earlier.length > 0 && (
          <LinkButton aria-expanded={open} aria-controls={listId} onClick={() => setOpen((v) => !v)}>
            {open ? "Hide earlier" : `Earlier (${earlier.length})`}
          </LinkButton>
        )}
      </div>
      {open && (
        <ol id={listId} className="flex flex-col">
          {earlier.map((e) => (
            <li key={e.id} className="flex flex-col gap-2 border-t-[length:var(--border-width-1)] border-solid border-border py-4 last:pb-0">
              <span className="flex items-center gap-3">
                <Badge tone="brand-outline">{labelOf(e)}</Badge>
                <span className={T.meta}>{formatDate(e.createdAt)}</span>
              </span>
              <p className={cn(T.body, "whitespace-pre-line break-words text-text-primary")}>{e.description}</p>
              {e.media.length > 0 && (
                <span className="flex flex-wrap gap-4">
                  {e.media.map((m, i) => (
                    <ProofTile key={m.id} media={m} onOpen={() => setViewing({ media: e.media, index: i })} />
                  ))}
                </span>
              )}
            </li>
          ))}
        </ol>
      )}
      <ProofViewer viewing={viewing} onIndex={(index) => setViewing((v) => (v ? { ...v, index } : v))} onClose={() => setViewing(null)} />
    </section>
  );
}

// ─────────────────────────── the history screen (10r, 26a–26d) ───────────────────────────

export function ProductActivityScreen({ id, productId }: { id: string; productId: string }) {
  const data = useProductData(id, productId);
  if (data.state === "loading") return <ProductLoading />;
  if (data.state === "missing") return <ProjectMissing />;
  if (data.state === "no-product") return <ProductMissing projectName={data.projectName} back={`/m/projects/${encodeURIComponent(data.projectId)}?tab=products`} />;
  return (
    <ProductProvider value={data.ctx}>
      <ActivityHistory />
    </ProductProvider>
  );
}

const KIND_TITLE = { physical: "Physical NFT price", virtual: "Virtual NFT price" } as const;
/** The web activity entry's price rows (details/activity/entry.tsx): "Personal use · Regular". */
const PRICE_TIER = { regular: "Regular", extended: "Extended" } as const;

function ActivityHistory() {
  const { project, product, view, viewer, name, path } = useProduct();
  const router = useRouter();
  const toast = useToast();
  const entries = useProductHistory();
  const nft = useNftLine();
  const canWrite = can(viewer, "activity.write", view.canCtx);
  const [actions, setActions] = React.useState<JourneyEntry | null>(null);
  const [deleting, setDeleting] = React.useState<JourneyEntry | null>(null);
  const [help, setHelp] = React.useState<JourneyEntry | null>(null);
  const [link, setLink] = React.useState<string | null>(null);
  const [prices, setPrices] = React.useState<{ p: ProductPrices; token: Token } | null>(null);
  const [viewing, setViewing] = React.useState<Viewing>(null);
  const priced = entries.some((e) => e.pricing && productPricesOf(e.pricing, product.id).length > 0);

  return (
    <Screen
      top={<TopBar back={path("")} title="Activity" />}
      footer={
        canWrite ? (
          <BottomBar>
            <Link href={path("activity/new")} className={cn(buttonVariants({ size: "xl" }), "w-full")}>
              <Icon icon={Add01Icon} size={20} />
              Add New Activity
            </Link>
          </BottomBar>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-6 px-8 pb-12">
        {/* One line under the bar: whose history, its order, and the demo prices' badge beside it. */}
        <div className="flex min-h-[28px] items-center gap-4">
          <p className={cn(T.meta, "min-w-0 flex-1")}>{name} · newest first</p>
          {priced && <TestnetDemoBadge />}
        </div>
        <ul aria-label="Activity" className={CARD}>
          {entries.map((e) => {
            const pills = productPricesOf(e.pricing, product.id);
            return (
              <li key={e.id} className="flex flex-col gap-4 p-8">
                <div className="flex items-center gap-2">
                  <span className={T.name}>{labelOf(e)}</span>
                  {helpOf(e) && (
                    <button
                      type="button"
                      aria-label={`What is ${labelOf(e)}?`}
                      aria-haspopup="dialog"
                      onClick={() => setHelp(e)}
                      className="-my-6 inline-flex size-[44px] items-center justify-center rounded-full text-[color:var(--color-icon-default)] outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
                    >
                      <Icon icon={HelpCircleIcon} size={20} />
                    </button>
                  )}
                  <span className="flex-1" />
                  {canWrite && !e.isDefault && (
                    <button
                      type="button"
                      aria-label={`Actions for ${labelOf(e)}`}
                      aria-haspopup="dialog"
                      onClick={() => setActions(e)}
                      className="-my-6 -mr-4 inline-flex size-[44px] items-center justify-center rounded-full text-[color:var(--color-icon-default)] outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
                    >
                      <Icon icon={MoreVerticalIcon} size={20} />
                    </button>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <time dateTime={new Date(e.createdAt).toISOString()} className={T.meta}>
                    {formatDate(e.createdAt)}
                  </time>
                  <p className={cn(T.body, "whitespace-pre-line break-words text-text-primary")}>{e.description}</p>
                </div>
                {pills.length > 0 && e.pricing && (
                  <div className="flex flex-wrap items-center gap-2">
                    {pills.map((p) => (
                      <button
                        key={p.kind}
                        type="button"
                        aria-haspopup="dialog"
                        onClick={() => setPrices({ p, token: e.pricing!.token })}
                        className="-my-4 inline-flex min-h-[44px] items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                      >
                        <Badge tone="blue">
                          {p.kind === "physical" ? "Physical" : "Virtual"} from {formatAmount(p.from, e.pricing!.token)}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
                {e.media.length > 0 && (
                  <ul className="flex flex-wrap gap-4">
                    {e.media.map((m, i) => (
                      <li key={m.id}>
                        <ProofTile media={m} onOpen={() => setViewing({ media: e.media, index: i })} />
                      </li>
                    ))}
                  </ul>
                )}
                {e.urls.length > 0 && (
                  <ul className="flex flex-col">
                    {e.urls.map((u, i) => (
                      <li key={i}>
                        <button
                          type="button"
                          aria-haspopup="dialog"
                          onClick={() => setLink(u)}
                          className="flex min-h-[44px] w-full items-center gap-6 text-left outline-none hover:bg-bg-subtle focus-visible:bg-bg-subtle"
                        >
                          <span className={cn(T.body, "w-[56px] shrink-0")}>Link</span>
                          <span className={cn(T.body, "min-w-0 flex-1 truncate text-text-primary")}>{u.replace(/^https:\/\//i, "")}</span>
                          <Icon icon={ArrowRight01Icon} size={24} className="shrink-0 text-[color:var(--color-icon-default)]" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
        {nft && (
          <ListCard label="NFT activity">
            <ListRow href={nft} icon={Store01Icon} title="NFT activity" meta="Earn › Sell" />
          </ListCard>
        )}
      </div>

      <ActionSheet
        open={actions !== null}
        onClose={() => setActions(null)}
        title={actions ? `${labelOf(actions)} · ${name} · ${formatDate(actions.createdAt)}` : undefined}
        items={
          actions
            ? [
                { label: "Edit Activity", icon: PencilEdit01Icon, onSelect: () => router.push(path(`activity/${encodeURIComponent(actions.id)}`)) },
                // 26d: Open link, for an entry that has one (it asks first, as the row's link does).
                ...(actions.urls.length ? [{ label: "Open link", icon: Link01Icon, onSelect: () => setLink(actions.urls[0]) }] : []),
                { label: "Delete Activity", icon: Delete02Icon, destructive: true, onSelect: () => setDeleting(actions) },
              ]
            : []
        }
      />
      <ConfirmSheet
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Delete this activity?"
        body={
          deleting
            ? `“${labelOf(deleting)}” (${formatDate(deleting.createdAt)}). Its files, links and prices are removed from this browser. This can't be undone.`
            : null
        }
        verb="Delete Activity"
        destructive
        onConfirm={async () => {
          const e = deleting;
          if (!e) return;
          const out = await removeActivity(project.id, e.id);
          toast(out.ok ? { title: `${labelOf(e)} deleted` } : { title: "Couldn't delete it — this browser's storage refused.", lead: "error" });
        }}
      />
      <Sheet open={help !== null} onClose={() => setHelp(null)} title={help ? `What is ${labelOf(help)}?` : ""}>
        {help && <p className={cn(T.body, "pb-8")}>{helpOf(help)}</p>}
      </Sheet>
      <ConfirmSheet
        open={link !== null}
        onClose={() => setLink(null)}
        title="Open this link in a new tab?"
        body={
          <>
            <span className={cn(T.rowTitle, "block break-all")}>{link}</span>
            <span className="mt-2 block">It leaves IDEEZA — only open links you trust.</span>
          </>
        }
        verb="Open link"
        onConfirm={() => {
          if (link) window.open(link, "_blank", "noopener,noreferrer");
        }}
      />
      <Sheet
        open={prices !== null}
        onClose={() => setPrices(null)}
        title={prices ? KIND_TITLE[prices.p.kind] : ""}
        description="Listed prices when this entry was added — Testnet demo."
      >
        {prices && (
          <dl className="flex flex-col pb-8">
            {prices.p.rows.flatMap((r) =>
              (["regular", "extended"] as const).map((tier) => (
                <div key={`${r.use}-${tier}`} className="flex items-center justify-between gap-6 border-b-[length:var(--border-width-1)] border-solid border-border py-6 last:border-b-0">
                  <dt className={T.body}>
                    {USE_LABEL[r.use]} · {PRICE_TIER[tier]}
                  </dt>
                  <dd className={cn(T.body, "text-text-primary")}>{formatAmount(tier === "regular" ? r.regular : r.extended, prices.token)}</dd>
                </div>
              )),
            )}
          </dl>
        )}
      </Sheet>
      <ProofViewer viewing={viewing} onIndex={(index) => setViewing((v) => (v ? { ...v, index } : v))} onClose={() => setViewing(null)} />
    </Screen>
  );
}
