"use client";

// The Contributors tab (P2-CONTRIB-1, -2, -3, -7, -8, -13): the roster, its
// empty state, removal, and the buyer preview's team credit. The add/edit
// dialog is `contributor-dialog.tsx`; the preview banner is
// `contributor-preview-banner.tsx`.
//
// Every row comes from `rosterOf()` (contributors.ts, T05), fed by
// `view.ownership` — no derivation happens here (COR-74). `can()` decides
// what a viewer may do, always with `view.canCtx`, so a locked project loses
// Add/Edit/Remove the same way every other write control does.
//
// The roster renders twice — once as a real `<table>`, once as a list of
// cards — and CSS (a container query on the page, not JS) shows exactly one
// at a time, so "table is not displayed" at 400 px is a real computed style,
// not a simulation. Both draw from the same filtered rows.

import * as React from "react";
import { PlusSignIcon, UserGroupIcon, UserIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Banner, Button, ConfirmDialog, SearchInput, StateCard, TestnetDemoBadge } from "@/components/ideeza";
import { isPreview } from "@/lib/manual/buyer-preview";
import {
  CONTRIBUTORS_MAX,
  initialsOf,
  removeCopy,
  removedMessage,
  rosterOf,
  teamOf,
  type RosterRow,
} from "@/lib/manual/contributors";
import type { Contributor } from "@/lib/manual/p2-types";
import { can } from "@/lib/manual/permissions";
import { useManualProjects } from "@/lib/manual/projects";
import { cn } from "@/lib/utils";
import { contributorPreviewEntry, useFocusAfterPreview } from "./buyer-preview";
import { ContributorDialog } from "./contributor-dialog";
import { useEnterContributorPreview } from "./contributor-preview-banner";
import type { SlotProps } from "./slots";

/** ≥ 24 px on a fine pointer, ≥ 44 px on a coarse one (P2-CONTRIB-2's row
 *  actions, in the wide table). The stacked card always uses 44 px. */
const ROW_ACTION = "min-h-[24px] px-2 -mx-2 [@media(pointer:coarse)]:min-h-[var(--touch-min)]";
const CARD_ACTION = "min-h-[var(--touch-min)] px-2 -mx-2";

type DialogState = { mode: "add" } | { mode: "edit"; contributor: Contributor };

/** Two DOM buttons can carry the same contributor's Edit (or Preview) — one
 *  in the table, one in the card — since both render at once and CSS picks
 *  which shows. Focus-after-remove/after-preview needs whichever is
 *  actually visible, so each id is tracked under both variants. */
function useVariantButtonRefs() {
  const map = React.useRef(new Map<string, HTMLButtonElement>());
  const set = React.useCallback((variant: "table" | "card", id: string, el: HTMLButtonElement | null) => {
    const key = `${variant}:${id}`;
    if (el) map.current.set(key, el);
    else map.current.delete(key);
  }, []);
  const find = React.useCallback((id: string): HTMLButtonElement | null => {
    for (const variant of ["table", "card"] as const) {
      const el = map.current.get(`${variant}:${id}`);
      if (el && el.offsetParent !== null) return el;
    }
    return map.current.get(`table:${id}`) ?? map.current.get(`card:${id}`) ?? null;
  }, []);
  return { set, find };
}

export function ContributorsTab({ project, view, viewer, announce }: SlotProps) {
  const { removeContributor } = useManualProjects();
  const contributors = project.contributors ?? [];

  const canSeeRoster = can(viewer, "people.seeRoster", view.canCtx);
  const canInvite = can(viewer, "people.invite", view.canCtx);
  const canManage = can(viewer, "people.manage", view.canCtx);
  const canPreviewAs = can(viewer, "preview.enter", view.canCtx);

  const [query, setQuery] = React.useState("");
  const [dialog, setDialog] = React.useState<DialogState | null>(null);
  const [removing, setRemoving] = React.useState<Contributor | null>(null);

  const addBtnRef = React.useRef<HTMLButtonElement>(null);
  const emptyAddRef = React.useRef<HTMLButtonElement>(null);
  const editRefs = useVariantButtonRefs();
  const previewRefs = useVariantButtonRefs();
  // Declared before the team-credit early return below (Rules of Hooks).
  const limitId = React.useId();

  const enterContributorPreview = useEnterContributorPreview();
  // Exit preview hands focus back to the row's "Preview as" that entered it,
  // and to nothing else: the header's fallback covers a row that's gone.
  useFocusAfterPreview(
    !isPreview(viewer),
    (from) => {
      const c = contributors.find((x) => from === contributorPreviewEntry(x.id));
      return c ? previewRefs.find(c.id) : null;
    },
    { claims: (from) => contributors.some((c) => from === contributorPreviewEntry(c.id)), fallback: false },
  );

  const openEdit = (c: Contributor) => setDialog({ mode: "edit", contributor: c });
  const openPreview = (c: Contributor) => enterContributorPreview(c.id);

  const focusAfterRemoval = (removedId: string) => {
    const ordered = [...contributors].sort((a, b) => a.addedAt - b.addedAt);
    const idx = ordered.findIndex((c) => c.id === removedId);
    const nextId = ordered[idx + 1]?.id ?? ordered[idx - 1]?.id ?? null;
    requestAnimationFrame(() => {
      const target = (nextId !== null ? editRefs.find(nextId) : null) ?? emptyAddRef.current ?? addBtnRef.current;
      target?.focus();
    });
  };

  const confirmRemove = () => {
    if (!removing) return;
    const outcome = removeContributor(project.id, removing.id);
    setRemoving(null);
    if (outcome.ok) {
      announce(removedMessage(outcome.contributor));
      focusAfterRemoval(outcome.contributor.id);
    }
  };

  // ─────────────────────── buyer preview / demo buyer: team credit ───────────────────────
  if (!canSeeRoster) {
    if (!contributors.length) return null;
    return (
      <div className="flex flex-col gap-6">
        <h2 className="text-lg font-bold text-text-primary">Contributors</h2>
        <ul className="flex flex-col gap-4">
          {teamOf(contributors).map((t) => (
            <li key={t.id} className="flex items-center gap-3">
              <Avatar name={t.name} />
              <span className="text-md text-text-primary">
                {t.name} <span className="text-text-secondary">· {t.role}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const trimmedQuery = query.trim();
  const filteredContributors = trimmedQuery
    ? contributors.filter((c) => c.name.toLowerCase().includes(trimmedQuery.toLowerCase()))
    : contributors;
  const rows = rosterOf({
    createdAt: project.createdAt,
    contributors: filteredContributors,
    ownership: view.ownership,
    viewer,
  });
  const noMatch = trimmedQuery !== "" && filteredContributors.length === 0 && contributors.length > 0 ? trimmedQuery : null;
  const atLimit = contributors.length >= CONTRIBUTORS_MAX;

  return (
    <div className="flex flex-col gap-8">
      <h2 className="text-lg font-bold text-text-primary">Contributors</h2>

      {contributors.length === 0 ? (
        <StateCard
          tone="empty"
          icon={<Icon icon={UserGroupIcon} size={32} />}
          title="Just you so far"
          body="Add the people on this project — as viewers, editors, or co-owners with a share of its ownership."
          action={
            canInvite ? (
              <Button
                ref={emptyAddRef}
                hierarchy="secondary"
                iconLeading={<Icon icon={PlusSignIcon} size={16} />}
                onClick={() => setDialog({ mode: "add" })}
              >
                Add contributor
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {canInvite && (
            <div className="flex flex-wrap items-start justify-between gap-4">
              <p className="max-w-[52ch] text-sm text-text-secondary">
                Kept in this browser. Adding someone doesn&apos;t invite or notify them.
              </p>
              <div className="flex flex-col items-end gap-2">
                <Button
                  ref={addBtnRef}
                  hierarchy="secondary"
                  size="sm"
                  iconLeading={<Icon icon={PlusSignIcon} size={14} />}
                  aria-disabled={atLimit || undefined}
                  aria-describedby={atLimit ? limitId : undefined}
                  onClick={() => {
                    if (!atLimit) setDialog({ mode: "add" });
                  }}
                >
                  Add contributor
                </Button>
                {atLimit && (
                  <span id={limitId} className="text-sm text-text-secondary">
                    A project can have up to 50 contributors.
                  </span>
                )}
              </div>
            </div>
          )}

          {view.ownership.overAllocated && (
            <Banner tone="error">
              {`Shares add up to ${view.ownership.total}% — more than 100%. Lower a co-owner's share to fix it.`}
            </Banner>
          )}

          {canInvite && contributors.length > 10 && (
            <SearchInput
              value={query}
              onValueChange={setQuery}
              placeholder="Search contributors"
              aria-label="Search contributors"
            />
          )}

          <RosterTable
            rows={rows}
            projectName={project.name}
            noMatch={noMatch}
            canManage={canManage}
            canPreview={canPreviewAs}
            onEdit={(row) => {
              const c = contributors.find((x) => x.id === row.contributorId);
              if (c) openEdit(c);
            }}
            onRemove={(row) => {
              const c = contributors.find((x) => x.id === row.contributorId);
              if (c) setRemoving(c);
            }}
            onPreview={(row) => {
              const c = contributors.find((x) => x.id === row.contributorId);
              if (c) openPreview(c);
            }}
            editRefs={editRefs}
            previewRefs={previewRefs}
          />
        </>
      )}

      {dialog && (
        <ContributorDialog
          key={dialog.mode === "edit" ? dialog.contributor.id : "add"}
          project={project}
          ownership={view.ownership}
          editing={dialog.mode === "edit" ? dialog.contributor : null}
          onClose={() => setDialog(null)}
          announce={announce}
        />
      )}

      {removing && (
        <ConfirmDialog
          open
          title={removeCopy(removing).title}
          confirmLabel="Remove"
          onConfirm={confirmRemove}
          onCancel={() => setRemoving(null)}
        >
          {removeCopy(removing).body}
        </ConfirmDialog>
      )}
    </div>
  );
}

function Avatar({ name, kind = "contributor" }: { name: string; kind?: "maker" | "contributor" }) {
  return (
    <span
      aria-hidden
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-bg-subtle text-xs font-semibold text-text-secondary"
    >
      {kind === "maker" ? <Icon icon={UserIcon} size={16} /> : initialsOf(name)}
    </span>
  );
}

function PersonCell({ row }: { row: RosterRow }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar name={row.name} kind={row.kind === "maker" ? "maker" : "contributor"} />
      <span className="min-w-0">
        <span className="block font-medium text-text-primary">
          {row.name}
          {row.demo && <TestnetDemoBadge className="ml-2 align-middle" />}
        </span>
        {row.sub && <span className="block text-sm text-text-secondary">{row.sub}</span>}
      </span>
    </div>
  );
}

function ShareCell({ row }: { row: RosterRow }) {
  return <span aria-label={row.share.label !== row.share.text ? row.share.label : undefined}>{row.share.text}</span>;
}

function RowActions({
  row,
  canManage,
  canPreview,
  onEdit,
  onRemove,
  onPreview,
  editRefs,
  previewRefs,
  variant,
}: {
  row: RosterRow;
  canManage: boolean;
  canPreview: boolean;
  onEdit: (row: RosterRow) => void;
  onRemove: (row: RosterRow) => void;
  onPreview: (row: RosterRow) => void;
  editRefs: ReturnType<typeof useVariantButtonRefs>;
  previewRefs: ReturnType<typeof useVariantButtonRefs>;
  variant: "table" | "card";
}) {
  if (!row.contributorId || (!canManage && !canPreview)) return null;
  const id = row.contributorId;
  const cls = variant === "table" ? ROW_ACTION : CARD_ACTION;
  return (
    <div className="flex flex-wrap gap-6">
      {canManage && (
        <button
          type="button"
          ref={(el) => editRefs.set(variant, id, el)}
          aria-label={`Edit ${row.name}`}
          onClick={() => onEdit(row)}
          className={cn(cls, "inline-flex items-center text-sm font-semibold text-text-brand outline-none hover:text-text-brand-hover focus-visible:ring-2 focus-visible:ring-border-focus")}
        >
          Edit
        </button>
      )}
      {canManage && (
        <button
          type="button"
          aria-label={`Remove ${row.name}`}
          onClick={() => onRemove(row)}
          className={cn(cls, "inline-flex items-center text-sm font-semibold text-text-error outline-none hover:brightness-90 focus-visible:ring-2 focus-visible:ring-border-focus")}
        >
          Remove
        </button>
      )}
      {canPreview && (
        <button
          type="button"
          ref={(el) => previewRefs.set(variant, id, el)}
          aria-label={`Preview as ${row.name}`}
          onClick={() => onPreview(row)}
          className={cn(cls, "inline-flex items-center text-sm font-semibold text-text-secondary outline-none hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus")}
        >
          Preview
        </button>
      )}
    </div>
  );
}

function RosterTable({
  rows,
  projectName,
  noMatch,
  canManage,
  canPreview,
  onEdit,
  onRemove,
  onPreview,
  editRefs,
  previewRefs,
}: {
  rows: RosterRow[];
  projectName: string;
  noMatch: string | null;
  canManage: boolean;
  canPreview: boolean;
  onEdit: (row: RosterRow) => void;
  onRemove: (row: RosterRow) => void;
  onPreview: (row: RosterRow) => void;
  editRefs: ReturnType<typeof useVariantButtonRefs>;
  previewRefs: ReturnType<typeof useVariantButtonRefs>;
}) {
  const showActions = canManage || canPreview;
  return (
    <>
      {/* The wide table — under 560 px it is not displayed; the cards below take over. */}
      <div className="overflow-x-auto [@container(max-width:559px)]:hidden">
        <table className="w-full min-w-max border-collapse text-left">
          <caption className="sr-only">
            People on {projectName} and their shares
          </caption>
          <thead>
            <tr className="border-b border-solid border-border">
              {["Person", "Role", "Share", "Added"].map((h) => (
                <th key={h} scope="col" className="px-4 py-3 text-xs font-bold uppercase tracking-caps text-text-secondary">
                  {h}
                </th>
              ))}
              {showActions && (
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {noMatch !== null && (
              <tr>
                <td colSpan={showActions ? 5 : 4} className="px-4 py-6 text-sm text-text-secondary">
                  {`No one matches "${noMatch}".`}
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-solid border-border-subtle last:border-0">
                <td className="px-4 py-4">
                  <PersonCell row={row} />
                </td>
                <td className="px-4 py-4 text-text-secondary">{row.role}</td>
                <td className="px-4 py-4">
                  <ShareCell row={row} />
                </td>
                <td className="px-4 py-4 text-text-secondary">
                  <time dateTime={new Date(row.added.at).toISOString()}>{row.added.text}</time>
                </td>
                {showActions && (
                  <td className="px-4 py-4">
                    <RowActions
                      row={row}
                      canManage={canManage}
                      canPreview={canPreview}
                      onEdit={onEdit}
                      onRemove={onRemove}
                      onPreview={onPreview}
                      editRefs={editRefs}
                      previewRefs={previewRefs}
                      variant="table"
                    />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Under 560 px: one stacked card per person, same fields and order. */}
      <ul className="hidden flex-col gap-4 [@container(max-width:559px)]:flex">
        {noMatch !== null && (
          <li className="text-sm text-text-secondary">{`No one matches "${noMatch}".`}</li>
        )}
        {rows.map((row) => (
          <li key={row.key} className="flex flex-col gap-3 rounded-lg border border-solid border-border p-4">
            <PersonCell row={row} />
            <div className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
              <span>{row.role}</span>
              <span aria-hidden>·</span>
              <ShareCell row={row} />
            </div>
            <time dateTime={new Date(row.added.at).toISOString()} className="text-sm text-text-secondary">
              {row.added.text}
            </time>
            {row.contributorId && (canManage || canPreview) && (
              <RowActions
                row={row}
                canManage={canManage}
                canPreview={canPreview}
                onEdit={onEdit}
                onRemove={onRemove}
                onPreview={onPreview}
                editRefs={editRefs}
                previewRefs={previewRefs}
                variant="card"
              />
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
