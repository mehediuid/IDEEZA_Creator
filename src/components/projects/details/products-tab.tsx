"use client";

// The Products tab — spec §5.6 (COR-22…25); Phase 2 P2-EDITOR-10, P2-VIDEO-12,
// P2-TABS-10 and P2-TABS-29. One derivation feeds it (COR-74): the project
// page computes `productsOfProject()` and `productsTabView()` once and passes
// the results down, so this component only renders what it is given.
//
// - Every card is a stretched link to its product page: the h3's link is the
//   card's hit area through an `::after` overlay, so its accessible name is
//   the product's name alone. A hand-made, build-gone or unmatched product
//   has a page too (Media · Contributors · Customers), and its card keeps its
//   note as a line (P2-EDITOR-10 as changed). There is no "Open in editor" on
//   a card: it lives in the product page's header, one click away (C16).
// - The owner's card carries its video line — "No video yet", "Rendering ·
//   40 %", "Video ready", "Render failed" — as text, never a control
//   (P2-VIDEO-12), and any card its stage pill, "Stage: {label}" to a screen
//   reader (P2-TABS-10).
// - The owner's first tile is "Add a product": a link to `/?addTo={id}`
//   (SAVE takes it from there). A live Buy-now listing asks to pause first;
//   a running auction refuses, with its reason (`guard("addProduct")`,
//   P2-LISTING-13). The lock hides it: `can("product.add")` is false.
//
// A built product's Build check is shown twice, on purpose, in two shapes.
// The heading's is the one real disclosure (`ConfidenceBadge`) holding
// TIER_MEANING and the credit note (COR-22); each card's own "Build check:
// {tier}" is a plain label (`BuildCheckPill`), because a disclosure button
// inside a link card would nest interactive content.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Image02Icon, ImageNotFound02Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { ConfidenceBadge } from "@/components/create/confidence-badge";
import { useProjectEditGate } from "@/components/projects/use-edit-gate";
import {
  checkBuild,
  TIER_LABEL,
  type ProductConfidence,
  type Tier,
} from "@/lib/create/confidence";
import { productsOf, type ChatSession } from "@/lib/create/history";
import { partChangesOf, partChangesText, specOfSource } from "@/lib/create/build-artifacts";
import { conceptOf, type ProjectProduct } from "@/lib/manual/project-read";
import { countLabel, formatShortDate } from "@/lib/manual/project-summary";
import {
  displayProductName,
  droppedNoteOf,
  headlineConfidenceOf,
  piecesOfItems,
  productFacts,
  productsHeadingOf,
  type HeadingRow,
  type ProductCardView,
} from "@/lib/manual/products-tab-view";
import { cn } from "@/lib/utils";

const NO_CARD: ProductCardView = { video: null, stage: null };

const UNBUILT_NOTE: Record<Exclude<ProjectProduct["state"], "built">, string> = {
  "build-gone": "Its build isn't in this browser any more.",
  unmatched: "Its build can't be matched to this name.",
  hand: "Made by hand — its work is in the editor.",
};

const CARD =
  "relative flex h-full flex-col overflow-hidden rounded-xl border border-solid border-border bg-bg-surface text-left transition-colors duration-normal ease-decelerate hover:border-border-strong has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-border-focus motion-reduce:transition-none";

export function ProductsTab({
  projectId,
  projectName,
  products,
  cards,
  chats,
  showOwnerOnlyFacts,
  canAddProduct,
  now,
  productHref,
}: {
  projectId: string;
  projectName: string;
  /** `view.products` — current version plus any product a later version
   *  dropped (COR-42), in `products[]` order (COR-23). */
  products: ProjectProduct[];
  /** `productsTabView(view, …)` by row id: each card's video line and stage pill. */
  cards: Record<string, ProductCardView>;
  /** For the part-changes line's `conceptOf()` lookup. */
  chats: ChatSession[];
  /** `can(viewer, "facts.seeOwnerOnly")` — the only owner-only fact on a card is part changes (PPL-7). */
  showOwnerOnlyFacts: boolean;
  /** `can(viewer, "product.add", view.canCtx)`: the "Add a product" tile (P2-TABS-29). */
  canAddProduct: boolean;
  /** SlotProps.now — the minute clock `view` was derived at. */
  now: number;
  /** A product page's address, with the viewer's preview carried (COR-37). */
  productHref: (productId: string) => string;
}) {
  const heading = React.useMemo(() => {
    const rows: HeadingRow[] = products.map((pp) => ({
      dropped: pp.dropped !== null,
      version: pp.dropped ? pp.dropped.current : (pp.version?.current ?? null),
      pieces: pp.built ? piecesOfItems(pp.built.product.items) : null,
    }));
    return productsHeadingOf(rows);
  }, [products]);

  const headlineConfidence = React.useMemo(() => {
    const current: ProductConfidence[] = [];
    for (const pp of products) {
      const built = pp.built;
      if (pp.dropped || !built || !built.ref.job) continue;
      const job = built.ref.job;
      const entry = checkBuild(job, productsOf(job)).byProduct.find(
        (c) => c.productId === built.product.id,
      );
      if (entry) current.push(entry);
    }
    return headlineConfidenceOf(current);
  }, [products]);

  const piecesLine = heading.pieces
    ? `${heading.pieces.ready} of ${heading.pieces.total} pieces ready${
        heading.version !== null ? ` in version ${heading.version}` : ""
      }`
    : null;

  return (
    <div className="[container-type:inline-size]">
      <div className="mb-8 flex flex-col gap-2">
        <h2 className="text-lg font-bold text-text-primary">Products</h2>
        {/* A `<p>` here would be invalid HTML: ConfidenceBadge's open panel
            (ConfidenceIssuesPanel) renders block content — div/section/ul —
            and a <p> can't contain block children (breaks hydration). */}
        <div className="flex flex-wrap items-center gap-3 text-sm text-text-secondary">
          <span>
            {countLabel(heading.count)}
            {piecesLine ? ` · ${piecesLine}` : ""}
          </span>
          {headlineConfidence && (
            <span className="inline-flex flex-wrap items-center gap-3">
              <span aria-hidden>·</span>
              Build check:
              <ConfidenceBadge confidence={headlineConfidence} />
            </span>
          )}
        </div>
      </div>

      {(canAddProduct || products.length > 0) && (
        <ul
          role="list"
          aria-label="Products"
          className="grid grid-cols-1 gap-8 [@container(min-width:520px)]:grid-cols-2 [@container(min-width:880px)]:grid-cols-3"
        >
          {canAddProduct && <AddProductTile projectId={projectId} projectName={projectName} />}
          {products.map((pp) => (
            <ProductCard
              key={pp.id}
              pp={pp}
              card={cards[pp.id] ?? NO_CARD}
              chats={chats}
              href={productHref(pp.id)}
              showOwnerOnlyFacts={showOwnerOnlyFacts}
              now={now}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

/** P2-TABS-29: the grid's first tile. Its link name is "Add a product"; the sub-line describes it. */
function AddProductTile({ projectId, projectName }: { projectId: string; projectName: string }) {
  const router = useRouter();
  const gate = useProjectEditGate(projectId);
  const reason = gate.reasonOf("addProduct");
  const [refused, setRefused] = React.useState<string | null>(null);
  const [leaving, setLeaving] = React.useState(false);
  const subId = React.useId();
  const reasonId = React.useId();
  const href = `/?addTo=${encodeURIComponent(projectId)}`;
  const shown = reason ?? refused;

  const onClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // A modified click opens a tab and leaves this page as it was; Save still runs the gate.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    if (leaving) return;
    const out = gate.guard("addProduct", () => {
      setLeaving(true);
      router.push(href);
    });
    setRefused(out.kind === "refused" ? out.reason : null);
  };

  return (
    <li>
      <div
        className={cn(
          CARD,
          "min-h-[160px] items-center justify-center gap-3 border-dashed p-7 text-center",
          shown && "hover:border-border",
        )}
      >
        <span aria-hidden className="inline-flex size-[40px] items-center justify-center rounded-full bg-bg-subtle text-text-secondary">
          <Icon icon={PlusSignIcon} size={20} />
        </span>
        <h3 className="text-md font-semibold text-text-primary">
          <Link
            href={href}
            onClick={onClick}
            aria-disabled={shown ? true : undefined}
            aria-busy={leaving || undefined}
            aria-describedby={shown ? `${subId} ${reasonId}` : subId}
            className="rounded-sm outline-none after:absolute after:inset-0 after:content-[''] focus-visible:ring-0 [@media(pointer:coarse)]:inline-flex [@media(pointer:coarse)]:min-h-[var(--touch-min)] [@media(pointer:coarse)]:items-center"
          >
            {leaving ? "Opening…" : "Add a product"}
          </Link>
        </h3>
        <p id={subId} className="text-sm text-text-secondary">
          Describe it in a new chat — its build joins {projectName}.
        </p>
        {shown && (
          <p id={reasonId} className="text-sm font-medium text-text-primary">
            {shown}
          </p>
        )}
      </div>
      {gate.dialog}
    </li>
  );
}

function ProductCard({
  pp,
  card,
  chats,
  href,
  showOwnerOnlyFacts,
  now,
}: {
  pp: ProjectProduct;
  card: ProductCardView;
  chats: ChatSession[];
  href: string;
  showOwnerOnlyFacts: boolean;
  now: number;
}) {
  const name = displayProductName(pp.name);
  const built = pp.built;
  const job = built?.ref.job ?? null;

  const confidence = React.useMemo(() => {
    if (!job || !built) return null;
    return (
      checkBuild(job, productsOf(job)).byProduct.find(
        (c) => c.productId === built.product.id,
      ) ?? null
    );
  }, [job, built]);

  const facts = React.useMemo(() => {
    if (!built) return [];
    return productFacts(specOfSource(built.product), built.product.parts);
  }, [built]);

  const pieces = built ? piecesOfItems(built.product.items) : null;

  const partChangesLine = React.useMemo(() => {
    if (!showOwnerOnlyFacts || !job || !built) return null;
    const chat = chats.find((c) => c.id === built.ref.chatId);
    const concept = conceptOf(chat, job, built.product);
    const changes = concept ? partChangesOf(built.product, concept) : null;
    return changes ? partChangesText(changes) : null;
  }, [showOwnerOnlyFacts, job, built, chats]);

  const versionLine = !built
    ? null
    : pp.dropped
      ? droppedNoteOf(pp.dropped.current, pp.dropped.lastIn)
      : pp.version && pp.version.count > 1
        ? `v${pp.version.current}${
            built.ref.savedAt !== null ? ` · ${formatShortDate(built.ref.savedAt, now)}` : ""
          }`
        : null;

  const note = pp.state === "built" ? null : UNBUILT_NOTE[pp.state];

  return (
    <li>
      <div className={CARD}>
        <ProductImage url={built?.product.conceptImageUrl ?? null} name={name} />
        <div className="flex flex-1 flex-col gap-4 p-7">
          <div className="flex min-w-0 items-start gap-4">
            <h3 title={name} className="line-clamp-2 min-w-0 flex-1 text-md font-semibold text-text-primary">
              <Link
                href={href}
                className="rounded-sm outline-none after:absolute after:inset-0 after:content-[''] focus-visible:ring-0"
              >
                {name}
              </Link>
            </h3>
            {card.stage && (
              <span className="inline-flex shrink-0 items-center rounded-full bg-bg-subtle px-4 py-1 text-sm font-medium leading-sm text-text-secondary">
                <span aria-hidden>{card.stage.short}</span>
                <span className="sr-only">{card.stage.ariaLabel}</span>
              </span>
            )}
          </div>
          {confidence && <BuildCheckPill tier={confidence.tier} />}
          {note && <p className="text-sm text-text-secondary">{note}</p>}
          {!built && pp.description && (
            <p className="line-clamp-3 text-sm text-text-tertiary">{pp.description}</p>
          )}
          {facts.length > 0 && (
            <dl className="mt-1 grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
              {facts.map((f) => (
                <React.Fragment key={f.label}>
                  <dt className="font-medium text-text-tertiary">{f.label}</dt>
                  <dd className="min-w-0 text-text-secondary">{f.value}</dd>
                </React.Fragment>
              ))}
            </dl>
          )}
          {pieces && pieces.ready < pieces.total && (
            <p className="text-sm text-text-secondary">
              {pieces.ready} of {pieces.total} pieces ready
            </p>
          )}
          {card.video && <p className="text-sm text-text-secondary">{card.video}</p>}
          {versionLine && <p className="text-sm text-text-tertiary">{versionLine}</p>}
          {partChangesLine && (
            <p className="text-sm text-text-secondary">
              Built with your part changes: {partChangesLine}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

function BuildCheckPill({ tier }: { tier: Tier }) {
  const draft = tier === "draft";
  return (
    <span
      className={[
        "inline-flex w-fit items-center rounded-full px-4 py-1 text-sm font-semibold leading-sm",
        draft ? "bg-bg-subtle text-text-secondary" : "bg-bg-success-subtle text-text-success",
      ].join(" ")}
    >
      Build check: {TIER_LABEL[tier]}
    </span>
  );
}

function ProductImage({ url, name }: { url: string | null; name: string }) {
  const [ok, setOk] = React.useState(true);
  const broken = Boolean(url) && !ok;
  return (
    <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-bg-surface-raised">
      {url && ok ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={`${name} concept image`}
          loading="lazy"
          decoding="async"
          onError={() => setOk(false)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div
          aria-hidden={!broken}
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-text-tertiary"
        >
          <Icon icon={broken ? ImageNotFound02Icon : Image02Icon} size={22} />
          {broken && <span className="text-sm">Image didn&apos;t load</span>}
        </div>
      )}
    </div>
  );
}
