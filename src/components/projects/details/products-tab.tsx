"use client";

// The Products tab — spec §5.6 (COR-22…25). One derivation feeds it
// (COR-74): the project page computes `productsOfProject()` once and
// passes the result down as `products`, so this component only ever
// renders what it is given — it never re-derives project state on its
// own.
//
// A built product's Build check is shown twice, on purpose, in two
// different shapes. The header's is the one real disclosure
// (`ConfidenceBadge`, reused as-is) holding TIER_MEANING, the "not
// checked yet" reading and the credit note (COR-22) — because the whole
// tab is a grid of link cards, and a `<button>` disclosure inside a card
// that is itself an `<a>` would nest interactive content inside
// interactive content, which is invalid and breaks keyboard/AT behaviour.
// Each card's own "Build check: {tier}" is therefore a plain,
// non-interactive label (`BuildCheckPill`); the header's disclosure
// already satisfies "must be on screen wherever Draft is" for the tab as
// a whole.
//
// Deviation from the task brief: project-read.ts (A2) already exports a
// job-wide `piecesOf(job)`. Per the plan's C3 amendment, this file's own
// per-product counter is named `piecesOfItems` instead of `piecesOf`, to
// avoid clashing with that name — C4's `productPiecesOf` didn't exist in
// this tree at the time this landed, so `piecesOfItems` stays as written.
//
// Also deviates from the brief's "assumed signatures" note: A3's actual
// `countLabel(n)` takes no singular/plural args, and `formatShortDate(at,
// now)` requires `now` — a bare `Date.now()` at the call site trips the
// react-hooks/purity rule (an impure call during render), so `now` is
// threaded down from the page's own minute clock (SlotProps.now) as an
// extra prop instead, the same value every other slot renders from.

import * as React from "react";
import Link from "next/link";
import { Image02Icon, ImageNotFound02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { ConfidenceBadge } from "@/components/create/confidence-badge";
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
} from "@/lib/manual/products-tab-view";

export function ProductsTab({
  projectId,
  products,
  chats,
  showOwnerOnlyFacts,
  now,
  linkQuery = "",
}: {
  projectId: string;
  /** `productsOfProject(project, buildsOf(project, builds))` — computed
   *  once by the project page (COR-74), current version plus any product
   *  a later version dropped (COR-42), in `products[]` order (COR-23). */
  products: ProjectProduct[];
  /** For the part-changes line's `conceptOf()` lookup. */
  chats: ChatSession[];
  /** `can(viewer, "facts.seeOwnerOnly")` — decided by the page, not here
   *  (PPL-7): the only owner-only fact on this tab is part changes. */
  showOwnerOnlyFacts: boolean;
  /** SlotProps.now — the minute clock `view` was derived at. Passed
   *  through to `formatShortDate`, which A3 requires (not optional). */
  now: number;
  /** Appended to every card's href: `?view=buyer` in Preview as buyer, so
   *  the preview carries into the product page (COR-37). */
  linkQuery?: string;
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

      {products.length > 0 && (
        <ul
          role="list"
          aria-label="Products"
          className="grid grid-cols-1 gap-8 [@container(min-width:520px)]:grid-cols-2 [@container(min-width:880px)]:grid-cols-3"
        >
          {products.map((pp) => (
            <ProductCard
              key={pp.id}
              pp={pp}
              chats={chats}
              projectId={projectId}
              showOwnerOnlyFacts={showOwnerOnlyFacts}
              now={now}
              linkQuery={linkQuery}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ProductCard({
  pp,
  chats,
  projectId,
  showOwnerOnlyFacts,
  now,
  linkQuery,
}: {
  pp: ProjectProduct;
  chats: ChatSession[];
  projectId: string;
  showOwnerOnlyFacts: boolean;
  now: number;
  linkQuery: string;
}) {
  const name = displayProductName(pp.name);
  const built = pp.built;
  const job = built?.ref.job ?? null;
  const isLink = pp.state === "built";
  const href = `/projects/${projectId}/products/${pp.id}${linkQuery}`;

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

  const note =
    pp.state === "build-gone"
      ? "Its build isn't in this browser any more."
      : pp.state === "unmatched"
        ? "Its build can't be matched to this name."
        : pp.state === "hand"
          ? "Made by hand — its work is in the editor."
          : null;

  const cardClass = [
    "group flex h-full flex-col overflow-hidden rounded-xl border border-solid border-border bg-bg-surface text-left outline-none transition-colors duration-normal ease-decelerate motion-reduce:transition-none",
    isLink ? "hover:border-border-strong focus-visible:ring-2 focus-visible:ring-border-focus" : "",
  ].join(" ");

  const body = (
    <>
      <ProductImage url={built?.product.conceptImageUrl ?? null} name={name} />
      <div className="flex flex-1 flex-col gap-4 p-7">
        <h3 title={name} className="line-clamp-2 text-md font-semibold text-text-primary">
          {name}
        </h3>
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
        {versionLine && <p className="text-sm text-text-tertiary">{versionLine}</p>}
        {partChangesLine && (
          <p className="text-sm text-text-secondary">
            Built with your part changes: {partChangesLine}
          </p>
        )}
      </div>
    </>
  );

  return <li>{isLink ? <Link href={href} className={cardClass}>{body}</Link> : <div className={cardClass}>{body}</div>}</li>;
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
