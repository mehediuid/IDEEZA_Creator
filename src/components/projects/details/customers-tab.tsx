"use client";

// The Customers tab (P2-CUSTOMERS-1…11, 18; spec §4.8) and its product-scoped
// twin (product/product-customers.tsx passes the same panel a narrower
// `scope`). One `CustomersPanel` for both, so the product page's rows can
// never disagree with the project's own (P2-CUSTOMERS-10, PR-4141): both
// read the same `customersOf` derivation, and this file only turns its rows
// into the table (from a 600 px panel width) or the stacked list below it.
//
// No display string is joined here but "Message {first name}" — every other
// word comes from `customerRowText` (`../../../lib/manual/customers.ts`, T05)
// or is one of this panel's own fixed lines (the demo disclaimer, the footer,
// the Activity line; the empty/error copy is `customersEmptyCopy`). The
// sale-details disclosure is this file's own addition (P2-CUSTOMERS-8): the
// Figma has no row action, and the benefit names and the wallet need a home.
// It ends with "Message Mira", the row's way into Messages about that sale;
// telling every customer at once is Activity's job, so a line above the rows
// points there (Messages spec §6).

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertCircleIcon,
  ArrowDown01Icon,
  Copy01Icon,
  Tick02Icon,
  UserMultipleIcon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { IconButton, StateCard, TestnetDemoBadge } from "@/components/ideeza";
import {
  CUSTOMERS_PAGE_SIZE,
  customerRowText,
  customersEmptyCopy,
  customersSummaryText,
  pageOfSale,
  type CustomerRow,
  type CustomerRowText,
  type CustomerScope,
  type Customers,
} from "@/lib/manual/customers";
import type { ProjectStatus } from "@/lib/manual/project-summary";
import { startHref } from "@/lib/messages/links";
import { ME } from "@/lib/messages/types";
import { DEMO_BUYERS } from "@/lib/wallet/identities";
import { cn } from "@/lib/utils";
import { Pagination } from "../pagination";
import { When } from "../product/when";

/** A quiet link at reading size; 44 px at phone width and on a coarse pointer. */
const QUIET_LINK =
  "inline-flex min-h-[24px] items-center self-start rounded-sm text-md font-medium leading-md text-text-brand outline-none hover:text-text-brand-hover focus-visible:ring-2 focus-visible:ring-border-focus max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia(REDUCED_MOTION).matches;

export function CustomersPanel({
  customers,
  scope,
  projectId,
  projectName,
  status,
  productName,
  unreadable,
  now,
  announce,
  embedded = false,
}: {
  customers: Customers;
  scope: CustomerScope;
  projectId: string;
  projectName: string;
  status: ProjectStatus;
  /** Required (and used) only for `scope.kind === "product"`: the empty copy's
   *  "{product}'s physical or virtual NFTs" and the "Project customers" link. */
  productName?: string;
  /** A market key is present but unparsable (`ProjectView.marketUnreadable`). */
  unreadable: boolean;
  now: number;
  announce: (message: string) => void;
  /** Inside a section that has its own heading and explanation (Earn › Money › Customers): no
   *  h2 of its own, and the empty state is one plain line, "No customers yet." */
  embedded?: boolean;
}) {
  const search = useSearchParams();
  // Read once, on arrival: P2-CUSTOMERS-11. A later render of this panel (a
  // manual page turn, a row toggled) never re-reads the URL.
  const [initialSaleId] = React.useState(() => search.get("sale"));
  const [page, setPage] = React.useState(() => pageOfSale(customers.rows, initialSaleId));

  const pageCount = Math.max(1, Math.ceil(customers.rows.length / CUSTOMERS_PAGE_SIZE));
  const pageRows = customers.rows.slice((page - 1) * CUSTOMERS_PAGE_SIZE, page * CUSTOMERS_PAGE_SIZE);

  // Both shapes are always in the DOM — a container query on the panel picks
  // which one is visible (P2-CUSTOMERS-4) — so the same saleId's trigger
  // exists twice. Kept in two maps and resolved by `offsetParent` (null for
  // the `display:none` clone), so the deep link focuses the one shape the
  // viewer can actually see.
  const tableRefs = React.useRef(new Map<string, HTMLButtonElement | null>());
  const listRefs = React.useRef(new Map<string, HTMLButtonElement | null>());
  const deepLinked = React.useRef(false);
  React.useEffect(() => {
    if (deepLinked.current || !initialSaleId) return;
    const candidates = [tableRefs.current.get(initialSaleId), listRefs.current.get(initialSaleId)];
    const btn = candidates.find((el): el is HTMLButtonElement => !!el && el.offsetParent !== null);
    if (!btn) return;
    deepLinked.current = true;
    btn.scrollIntoView({ block: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" });
    // A frame later: the page's arrival focus (usePageArrival) is a parent's effect, which runs
    // after this one and would otherwise take the focus back to the h1.
    requestAnimationFrame(() => {
      if (btn.isConnected) btn.focus();
    });
  });

  const wideCols = scope.kind === "project" ? 6 : 5;
  const captionText = `Sales of ${projectName}, newest first`;

  return (
    <div className={cn("flex flex-col", embedded ? "gap-8" : "gap-16")}>
      {!embedded && (
        <div className="flex flex-wrap items-center gap-8">
          <h2 className="text-lg font-bold text-text-primary">Sales</h2>
          <TestnetDemoBadge />
        </div>
      )}

      {unreadable ? (
        <StateCard
          tone="error"
          icon={<Icon icon={AlertCircleIcon} size={32} />}
          title="Sales can't be shown"
          body="This browser's sales record couldn't be read. It's been left as it is."
          className="mx-auto"
        />
      ) : customers.rows.length === 0 ? (
        embedded ? (
          <p className="m-0 max-w-[62ch] text-md leading-md text-text-secondary">
            {`${customersEmptyCopy({ scope, status, projectId, productName }).title}.`}
          </p>
        ) : (
          <EmptyState scope={scope} status={status} projectId={projectId} productName={productName} />
        )
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <p className="text-md font-medium text-text-secondary">{customersSummaryText(customers)}</p>
            <p className="text-sm text-text-tertiary">
              Demo purchases from Explore marketplace, made in this browser. Nothing is on a blockchain.
            </p>
            <p className="m-0 max-w-[62ch] text-md leading-md text-text-secondary">
              To tell everyone who bought at once,{" "}
              <Link
                href={`/projects/${projectId}`}
                className="rounded-sm font-medium text-text-brand outline-none hover:text-text-brand-hover focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                add to Activity
              </Link>
              .
            </p>
          </div>

          <div className="[container-type:inline-size]">
            <div className="hidden overflow-x-auto [@container(min-width:600px)]:block">
              <table className="w-full border-collapse text-left text-md">
                <caption className="sr-only">{captionText}</caption>
                <thead>
                  <tr className="border-b border-solid border-border">
                    <Th>Bought by</Th>
                    <Th>Item</Th>
                    <Th>Price</Th>
                    <Th>Date</Th>
                    {scope.kind === "project" && <Th>Share</Th>}
                    <Th>Benefits</Th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row) => (
                    <TableRow
                      key={row.saleId}
                      projectId={projectId}
                      row={row}
                      text={customerRowText(row, { projectName, now })}
                      scope={scope}
                      colSpan={wideCols}
                      initialOpen={row.saleId === initialSaleId}
                      registerRef={(el) => tableRefs.current.set(row.saleId, el)}
                      announce={announce}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <ul aria-label="Sales" className="flex flex-col gap-8 [@container(min-width:600px)]:hidden">
              {pageRows.map((row) => (
                <ListRow
                  key={row.saleId}
                  projectId={projectId}
                  row={row}
                  text={customerRowText(row, { projectName, now })}
                  initialOpen={row.saleId === initialSaleId}
                  registerRef={(el) => listRefs.current.set(row.saleId, el)}
                  announce={announce}
                />
              ))}
            </ul>

            {pageCount > 1 && <Pagination page={page} pageCount={pageCount} onChange={setPage} />}
          </div>
        </>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th scope="col" className="px-8 py-6 text-sm font-semibold text-text-secondary">
      {children}
    </th>
  );
}

function EmptyState({
  scope,
  status,
  projectId,
  productName,
}: {
  scope: CustomerScope;
  status: ProjectStatus;
  projectId: string;
  productName?: string;
}) {
  const copy = customersEmptyCopy({ scope, status, projectId, productName });
  return (
    <StateCard
      tone="empty"
      icon={<Icon icon={UserMultipleIcon} size={32} />}
      title={copy.title}
      body={copy.body}
      action={
        copy.link ? (
          <a
            href={copy.link.href}
            className="min-h-[24px] rounded-sm text-sm font-semibold text-text-link outline-none transition-colors duration-normal ease-decelerate hover:text-text-link-hover focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            {copy.link.label}
          </a>
        ) : undefined
      }
      className="mx-auto"
    />
  );
}

// ─────────────────────────── the buyer avatar ───────────────────────────

function BuyerAvatar({ buyerId }: { buyerId: CustomerRow["buyerId"] }) {
  const initials = DEMO_BUYERS.find((b) => b.id === buyerId)?.initials ?? null;
  return (
    <span
      aria-hidden
      className="inline-flex size-[28px] shrink-0 items-center justify-center rounded-full bg-bg-subtle text-sm font-semibold text-text-secondary"
    >
      {initials ?? <Icon icon={Wallet01Icon} size={14} />}
    </span>
  );
}

function NoneCell() {
  return <span aria-label="None">—</span>;
}

// ─────────────────────────── the disclosure (P2-CUSTOMERS-8) ───────────────────────────

/** Grid-rows + opacity, 200 ms ease-out; instant under reduced motion
 *  (`transition-none` reverts `transition-duration` to its 0s initial
 *  value). The row stays mounted the whole time so it can animate both
 *  ways; once fully collapsed it is `aria-hidden` and out of the tab order,
 *  so "the region is gone" is true of the accessibility tree at once even
 *  though the node lingers a moment for the close transition. */
function DisclosureBody({
  id,
  labelledBy,
  open,
  projectId,
  row,
  text,
  announce,
}: {
  id: string;
  labelledBy: string;
  open: boolean;
  projectId: string;
  row: CustomerRow;
  text: CustomerRowText;
  announce: (message: string) => void;
}) {
  const [copied, setCopied] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const buyerName = DEMO_BUYERS.find((b) => b.id === row.buyerId)?.name ?? "the buyer";

  const copyWallet = () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    navigator.clipboard
      .writeText(row.buyerAddress)
      .then(() => {
        announce("Wallet address copied");
        setCopied(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  };

  return (
    <div
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none motion-reduce:duration-0",
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
      )}
    >
      <div className="overflow-hidden">
        <div
          id={id}
          role="region"
          aria-labelledby={labelledBy}
          aria-hidden={!open}
          className={cn("flex flex-col gap-8 py-8", !open && "pointer-events-none")}
        >
          <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-16 gap-y-6 text-sm">
            {text.detail.map((d, i) => (
              <React.Fragment key={`${d.term}-${i}`}>
                <dt className="font-medium text-text-secondary">{d.term}</dt>
                <dd className="m-0 min-w-0 break-words text-text-primary">
                  {d.term === "Wallet" ? (
                    <span className="inline-flex flex-wrap items-center gap-4">
                      <span className="break-all font-mono text-sm">{d.value}</span>
                      <IconButton
                        type="button"
                        size="sm"
                        hierarchy="ghost"
                        aria-label="Copy wallet address"
                        icon={<Icon icon={copied ? Tick02Icon : Copy01Icon} size={14} />}
                        onClick={copyWallet}
                        tabIndex={open ? 0 : -1}
                      />
                    </span>
                  ) : (
                    d.value
                  )}
                </dd>
              </React.Fragment>
            ))}
          </dl>
          <p className="m-0 text-sm text-text-tertiary">
            Testnet demo: bought with a demo wallet in this browser. No transaction was sent.
          </p>
          <Link
            href={startHref(
              { kind: "direct", to: row.buyerId, projectId, about: { kind: "purchase", saleId: row.saleId } },
              ME,
            )}
            tabIndex={open ? 0 : -1}
            className={QUIET_LINK}
          >
            Message {buyerName}
          </Link>
        </div>
      </div>
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "ml-auto inline-flex shrink-0 text-text-tertiary transition-transform duration-normal ease-decelerate motion-reduce:transition-none",
        open && "rotate-180",
      )}
    >
      <Icon icon={ArrowDown01Icon} size={16} />
    </span>
  );
}

// ─────────────────────────── the wide table row ───────────────────────────

function TableRow({
  projectId,
  row,
  text,
  scope,
  colSpan,
  initialOpen,
  registerRef,
  announce,
}: {
  projectId: string;
  row: CustomerRow;
  text: CustomerRowText;
  scope: CustomerScope;
  colSpan: number;
  initialOpen: boolean;
  registerRef: (el: HTMLButtonElement | null) => void;
  announce: (message: string) => void;
}) {
  const [open, setOpen] = React.useState(initialOpen);
  const regionId = React.useId();
  const buttonId = React.useId();

  return (
    <>
      <tr className="border-b border-solid border-border-subtle align-top">
        <th scope="row" className="px-8 py-10 font-normal">
          <button
            ref={registerRef}
            id={buttonId}
            type="button"
            aria-expanded={open}
            aria-controls={regionId}
            aria-label={`${text.buyer}, sale details`}
            onClick={() => setOpen((v) => !v)}
            className="flex min-h-[36px] w-full items-center gap-8 rounded-md text-left outline-none transition-colors duration-normal ease-decelerate hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus [@media(pointer:coarse)]:min-h-[44px]"
          >
            <BuyerAvatar buyerId={row.buyerId} />
            <span className="min-w-0 truncate font-semibold text-text-primary">{text.buyer}</span>
            <Chevron open={open} />
          </button>
        </th>
        <td className="px-8 py-10">
          <div className="text-text-primary">{text.item}</div>
          {text.itemSub && <div className="text-sm text-text-secondary">{text.itemSub}</div>}
        </td>
        <td className="px-8 py-10">
          <div className="text-text-primary">{text.price}</div>
          {text.priceSub && <div className="text-sm text-text-secondary">{text.priceSub}</div>}
        </td>
        <td className="px-8 py-10 text-text-secondary">
          <When at={row.at} />
        </td>
        {scope.kind === "project" && <td className="px-8 py-10 text-text-secondary">{text.share ?? <NoneCell />}</td>}
        <td className="px-8 py-10 text-text-secondary">{text.benefits ?? <NoneCell />}</td>
      </tr>
      <tr>
        <td colSpan={colSpan} className="p-0">
          <DisclosureBody
            id={regionId}
            labelledBy={buttonId}
            open={open}
            projectId={projectId}
            row={row}
            text={text}
            announce={announce}
          />
        </td>
      </tr>
    </>
  );
}

// ─────────────────────────── the narrow list item ───────────────────────────

function ListRow({
  projectId,
  row,
  text,
  initialOpen,
  registerRef,
  announce,
}: {
  projectId: string;
  row: CustomerRow;
  text: CustomerRowText;
  initialOpen: boolean;
  registerRef: (el: HTMLButtonElement | null) => void;
  announce: (message: string) => void;
}) {
  const [open, setOpen] = React.useState(initialOpen);
  const regionId = React.useId();
  const buttonId = React.useId();
  const itemLine = text.share ? `${text.item} · ${text.share} share` : text.item;

  return (
    <li className="rounded-lg border border-solid border-border p-10">
      <div className="flex items-center gap-8">
        <BuyerAvatar buyerId={row.buyerId} />
        <button
          ref={registerRef}
          id={buttonId}
          type="button"
          aria-expanded={open}
          aria-controls={regionId}
          aria-label={`${text.buyer}, sale details`}
          onClick={() => setOpen((v) => !v)}
          className="flex min-h-[44px] min-w-0 flex-1 items-center gap-8 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          <span className="min-w-0 truncate font-semibold text-text-primary">{text.buyer}</span>
          <Chevron open={open} />
        </button>
        <span className="shrink-0 text-right text-sm font-semibold text-text-primary">{text.price}</span>
      </div>
      <p className="mt-4 truncate text-sm text-text-secondary">{itemLine}</p>
      <p className="mt-2 flex items-center gap-4 text-sm text-text-tertiary">
        <When at={row.at} /> <span aria-hidden>·</span> {text.benefits ?? <NoneCell />}
      </p>
      <DisclosureBody
        id={regionId}
        labelledBy={buttonId}
        open={open}
        projectId={projectId}
        row={row}
        text={text}
        announce={announce}
      />
    </li>
  );
}
