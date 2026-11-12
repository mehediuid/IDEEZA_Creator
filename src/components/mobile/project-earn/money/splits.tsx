"use client";

// Earn › Money › Splits on the phone (Figma 17, 17b, 17c, 17f, 17g, 17j; the
// web's EarnSplits, contributors-tab.tsx and contributor-dialog.tsx, their
// rules and words): Ownership "You · 80%" and who holds the rest; the
// over-100 % banner; the roster as rows (Mobile / Info row) — a contributor
// opens its sheet, a buyer's share from a sale reads only; Add contributor.
// The sheet (Add / Edit {name}) is the web's dialog: Name, Role as cards with
// their lines, Share (%) for a co-owner with "Up to N%.", the majority note,
// checked on submit and again on each change after it; the store's own
// writers re-check the 100 % rule with the shares already sold. Editing
// adds Preview as {name} (`phonePreviewHref`) and Remove, which asks first.
// Every write asks `can(viewer, …, view.canCtx)`: sold in full, rows read only.

import * as React from "react";
import Link from "next/link";
import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Field, errorProps, useFieldIds } from "@/components/auth/auth-parts";
import { Banner } from "@/components/ideeza/banner";
import { Button, buttonVariants } from "@/components/ideeza/button";
import { Radio } from "@/components/ideeza/checkbox";
import { TextInput } from "@/components/ideeza/text-input";
import { useStoreWrite } from "@/components/projects/details/use-store-write";
import {
  CONTRIBUTOR_NAME_MAX,
  CONTRIBUTORS_MAX,
  ROLE_INFO,
  ROLE_WORD,
  addedMessage,
  checkContributor,
  majorityNote,
  removeCopy,
  removedMessage,
  rosterOf,
  savedMessage,
  shareHint,
  type ContributorInput,
} from "@/lib/manual/contributors";
import { maxShareFor, ownershipOf, ownershipRow } from "@/lib/manual/ownership";
import type { Contributor, ContributorRole } from "@/lib/manual/p2-types";
import { can } from "@/lib/manual/permissions";
import { phonePreviewHref } from "@/lib/manual/phone-earn";
import { WRITE_FAILED } from "@/lib/manual/project-header";
import { useManualProjects, type ContributorRefusal } from "@/lib/manual/projects";
import { useMarket } from "@/lib/market/market-store";
import { cn } from "@/lib/utils";
import { ConfirmSheet } from "../../kit/confirm-sheet";
import { Sheet } from "../../kit/sheet";
import { useToast } from "../../kit/toast";
import { Chevron, ListCard } from "../../kit/list";
import { useEarn } from "../context";
import { EARN_CARD, EARN_LEAD, EARN_NOTE } from "../parts";
import { MoneySection, ROW_BUTTON } from "./parts";
import { T } from "../../type";

const ROLE_ORDER: readonly ContributorRole[] = ["viewer", "editor", "coOwner"];

const REFUSAL_COPY: Record<ContributorRefusal, string> = {
  missing: "This contributor is no longer on the project.",
  invalid: "That value isn't valid. Check the fields and try again.",
  duplicate: "Someone with that name is already on this project.",
  full: "This project already has as many contributors as it can hold.",
  over100:
    "That share is more than there is to give: ownership can't pass 100%, and once a share has sold you keep at least 1%. Lower it and try again.",
};

type Open = { mode: "add" } | { mode: "edit"; id: string } | null;

export function Splits() {
  const { project, view, viewer } = useEarn();
  const own = ownershipRow(view.ownership, viewer);
  const contributors = project.contributors ?? [];
  const canInvite = can(viewer, "people.invite", view.canCtx);
  const canManage = can(viewer, "people.manage", view.canCtx);
  const [open, setOpen] = React.useState<Open>(null);
  const limitId = React.useId();
  const atLimit = contributors.length >= CONTRIBUTORS_MAX;
  const rows = rosterOf({ createdAt: project.createdAt, contributors, ownership: view.ownership, viewer }).filter((r) => r.kind !== "maker");
  const editing = open?.mode === "edit" ? (contributors.find((c) => c.id === open.id) ?? null) : null;

  const add = canInvite && (
    <div className="flex flex-col items-start gap-2">
      <Button
        hierarchy="secondary"
        size="xl"
        iconLeading={<Icon icon={PlusSignIcon} size={20} />}
        aria-disabled={atLimit || undefined}
        aria-describedby={atLimit ? limitId : undefined}
        className={cn(atLimit && "cursor-not-allowed opacity-60")}
        onClick={() => {
          if (!atLimit) setOpen({ mode: "add" });
        }}
      >
        Add contributor
      </Button>
      {atLimit && (
        <p id={limitId} className={EARN_NOTE}>
          A project can have up to 50 contributors.
        </p>
      )}
    </div>
  );

  return (
    <MoneySection id="splits" title="Splits" lead="Who owns what share of the project. Co-owners get their share of every sale.">
      {own && (
        <dl className="flex flex-col gap-1">
          <dt className={T.meta}>{own.label}</dt>
          <dd className={T.section}>{own.value}</dd>
          {own.note && <dd className={T.meta}>{own.note}</dd>}
        </dl>
      )}
      {view.ownership.overAllocated && (
        <Banner tone="error">{`Shares add up to ${view.ownership.total}% — more than 100%. Lower a co-owner's share to fix it.`}</Banner>
      )}
      {contributors.length === 0 ? (
        <div className={EARN_CARD}>
          <p className={EARN_LEAD}>No contributors yet.</p>
          {add}
        </div>
      ) : (
        <>
          {rows.length > 0 && (
            <ListCard label={`People on ${project.name} and their shares`}>
              {rows.map((row) => {
                const value = row.share.text === "—" ? row.role : `${row.role} · ${row.share.text}`;
                const body = (
                  <>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className={cn(T.body, "truncate text-text-primary")}>{row.name}</span>
                      {row.sub && <span className={T.meta}>{row.sub}</span>}
                    </span>
                    <span className={cn(T.body, "shrink-0 text-text-primary")}>{value}</span>
                  </>
                );
                return (
                  <li key={row.key}>
                    {row.contributorId && canManage ? (
                      <button type="button" aria-label={`Edit ${row.name}, ${value}`} className={ROW_BUTTON} onClick={() => setOpen({ mode: "edit", id: row.contributorId! })}>
                        {body}
                        <Chevron />
                      </button>
                    ) : row.contributorId && can(viewer, "preview.enter", view.canCtx) ? (
                      <Link href={phonePreviewHref(project.id, { contributor: row.contributorId })} aria-label={`Preview as ${row.name}`} className={ROW_BUTTON}>
                        {body}
                        <Chevron />
                      </Link>
                    ) : (
                      <div className={cn(ROW_BUTTON, "hover:bg-transparent")}>{body}</div>
                    )}
                  </li>
                );
              })}
            </ListCard>
          )}
          {add}
        </>
      )}
      {open?.mode === "add" && <ContributorSheet key="add" editing={null} onClose={() => setOpen(null)} />}
      {editing && <ContributorSheet key={editing.id} editing={editing} onClose={() => setOpen(null)} />}
    </MoneySection>
  );
}

type Pending = { kind: "add" | "edit"; contributor: Contributor };

/** Add contributor / Edit {name} (17c, 17f, 17j): the web's dialog as a sheet. */
function ContributorSheet({ editing, onClose }: { editing: Contributor | null; onClose: () => void }) {
  const { project, view, viewer, announce } = useEarn();
  const { addContributor, updateContributor, removeContributor } = useManualProjects();
  const { data: market } = useMarket();
  const toast = useToast();
  const others = React.useMemo(() => (project.contributors ?? []).filter((c) => c.id !== editing?.id), [project.contributors, editing?.id]);
  const maxShare = maxShareFor(view.ownership, editing);
  const [draft, setDraft] = React.useState<ContributorInput>(
    editing ? { name: editing.name, role: editing.role, share: editing.share ? String(editing.share) : "" } : { name: "", role: null, share: "" },
  );
  const [submitted, setSubmitted] = React.useState(false);
  const [refusal, setRefusal] = React.useState<ContributorRefusal | null>(null);
  const [pending, setPending] = React.useState<Pending | null>(null);
  const [removing, setRemoving] = React.useState(false);
  const ids = useFieldIds(["name", "share"] as const);
  const roleId = React.useId();
  const roleErrId = React.useId();
  const hintId = React.useId();
  const majorityId = React.useId();

  const check = checkContributor(draft, { others, maxShare });
  const errors = submitted && !check.ok ? check.errors : {};
  const applied = pending !== null && (project.contributors ?? []).includes(pending.contributor);
  const write = useStoreWrite(applied, () => {
    if (!pending) return;
    const message = pending.kind === "add" ? addedMessage(pending.contributor) : savedMessage(pending.contributor);
    toast({ title: message });
    announce(message);
    onClose();
  });

  const revertUncommitted = () => {
    if (!pending) return;
    if (pending.kind === "add") removeContributor(project.id, pending.contributor.id);
    else if (editing) updateContributor(project.id, editing.id, { name: editing.name, role: editing.role, share: editing.share });
  };
  const cancel = () => {
    if (write.saving) return;
    if (write.failed) revertUncommitted();
    write.reset();
    setPending(null);
    onClose();
  };
  const soldPctNow = () => {
    const sold = ownershipOf({
      createdAt: project.createdAt,
      contributors: project.contributors ?? [],
      sales: market.sales.filter((s) => s.projectId === project.id),
      listedPercent: 0,
    });
    return sold.holdings.filter((h) => h.holder.kind === "buyer").reduce((sum, h) => sum + h.percent, 0);
  };
  const submit = () => {
    if (write.saving) return;
    setSubmitted(true);
    setRefusal(null);
    const retryingFailedAdd = write.failed && pending?.kind === "add";
    if (retryingFailedAdd) {
      revertUncommitted();
      write.reset();
      setPending(null);
    }
    const result = checkContributor(draft, { others: retryingFailedAdd ? others.filter((c) => c.id !== pending!.contributor.id) : others, maxShare });
    if (!result.ok) {
      const el = result.first === "role" ? document.getElementById(roleId)?.querySelector<HTMLElement>('[role="radio"]') : document.getElementById(ids[result.first].id);
      el?.focus();
      return;
    }
    write.start();
    const soldPct = soldPctNow();
    const outcome = editing ? updateContributor(project.id, editing.id, result.value, { soldPct }) : addContributor(project.id, result.value, { soldPct });
    if (!outcome.ok) {
      write.reset();
      setRefusal(outcome.reason);
      return;
    }
    setPending({ kind: editing ? "edit" : "add", contributor: outcome.contributor });
  };
  const remove = () => {
    if (!editing) return;
    const outcome = removeContributor(project.id, editing.id);
    if (outcome.ok) {
      const message = removedMessage(outcome.contributor);
      toast({ title: message });
      announce(message);
    }
    onClose();
  };

  const majority = draft.role === "coOwner" ? majorityNote(draft.name, Number(draft.share) || 0) : null;
  const revertsShare = editing?.role === "coOwner" && draft.role !== null && draft.role !== "coOwner";
  const canPreview = editing !== null && can(viewer, "preview.enter", view.canCtx);
  const shareDescribedBy = [hintId, errors.share ? ids.share.errorId : null, majority ? majorityId : null].filter(Boolean).join(" ");

  return (
    <>
      <Sheet
        open={!removing}
        onClose={cancel}
        title={editing ? `Edit ${editing.name}` : "Add contributor"}
        description="They're recorded on this project in this browser — nothing is sent to them."
        actions={
          <>
            <Button size="xl" className="w-full" loading={write.saving} onClick={submit}>
              {write.saving ? "Saving…" : editing ? "Save changes" : "Add contributor"}
            </Button>
            <Button hierarchy="secondary" size="xl" className="w-full" disabled={write.saving} onClick={cancel}>
              Cancel
            </Button>
          </>
        }
      >
        {write.failed && <Banner tone="error">{WRITE_FAILED}</Banner>}
        {refusal && <Banner tone="error">{REFUSAL_COPY[refusal]}</Banner>}
        <Field label="Name" htmlFor={ids.name.id} error={errors.name} errorId={ids.name.errorId}>
          <TextInput
            id={ids.name.id}
            size="xl"
            value={draft.name}
            placeholder="e.g. Ana Silva"
            maxLength={CONTRIBUTOR_NAME_MAX}
            autoComplete="off"
            onValueChange={(name) => {
              setRefusal(null);
              setDraft((d) => ({ ...d, name }));
            }}
            {...errorProps(errors.name, ids.name.errorId)}
          />
        </Field>
        <div className="flex flex-col gap-3">
          <span id={`${roleId}-label`} className={T.rowTitle}>
            Role
          </span>
          <div
            id={roleId}
            role="radiogroup"
            aria-labelledby={`${roleId}-label`}
            aria-describedby={errors.role ? roleErrId : undefined}
            className="flex flex-col gap-4"
          >
            {ROLE_ORDER.map((role) => {
              const off = role === "coOwner" && maxShare === 0;
              const checked = draft.role === role;
              return (
                <button
                  key={role}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  disabled={off}
                  onClick={() => {
                    setRefusal(null);
                    setDraft((d) => ({ ...d, role }));
                  }}
                  className={cn(
                    "flex items-start gap-6 rounded-xl border-[length:var(--border-width-1)] border-solid p-6 text-left outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-60",
                    checked ? "border-[var(--color-border-brand)] bg-bg-brand-subtle" : "border-[var(--color-border-default)] bg-bg-surface hover:bg-bg-subtle",
                  )}
                >
                  <Radio checked={checked} disabled={off} decorative className="shrink-0" />
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className={T.rowTitle}>{ROLE_WORD[role]}</span>
                    <span className={T.meta}>{ROLE_INFO[role]}</span>
                    {off && <span className={T.meta}>You have no share left to give.</span>}
                  </span>
                </button>
              );
            })}
          </div>
          {errors.role && (
            <p id={roleErrId} className={cn(T.meta, "text-text-error")}>
              {errors.role}
            </p>
          )}
          {revertsShare && editing && <p className={EARN_NOTE}>{`Their ${editing.share}% share comes back to you.`}</p>}
        </div>
        {draft.role === "coOwner" && (
          <Field label="Share (%)" htmlFor={ids.share.id} error={errors.share} errorId={ids.share.errorId}>
            <TextInput
              id={ids.share.id}
              size="xl"
              inputMode="numeric"
              value={draft.share}
              placeholder="e.g. 10"
              onValueChange={(share) => {
                setRefusal(null);
                setDraft((d) => ({ ...d, share }));
              }}
              invalid={!!errors.share}
              aria-invalid={!!errors.share || undefined}
              aria-describedby={shareDescribedBy || undefined}
            />
            <p id={hintId} className={EARN_NOTE}>
              {shareHint(maxShare, view.ownership.reserved)}
            </p>
            {majority && (
              <p id={majorityId} className={EARN_NOTE}>
                {majority}
              </p>
            )}
          </Field>
        )}
        {editing && (
          <div className="flex flex-col gap-4 pt-2">
            {canPreview && (
              <Link href={phonePreviewHref(project.id, { contributor: editing.id })} className={cn(buttonVariants({ hierarchy: "secondary", size: "xl" }), "w-full")}>
                {`Preview as ${editing.name}`}
              </Link>
            )}
            <Button hierarchy="danger" size="xl" className="w-full" aria-label={`Remove ${editing.name}`} disabled={write.saving} onClick={() => setRemoving(true)}>
              Remove
            </Button>
          </div>
        )}
      </Sheet>
      {editing && (
        <ConfirmSheet
          open={removing}
          onClose={() => setRemoving(false)}
          title={removeCopy(editing).title}
          body={removeCopy(editing).body}
          verb="Remove"
          destructive
          onConfirm={remove}
        />
      )}
    </>
  );
}
