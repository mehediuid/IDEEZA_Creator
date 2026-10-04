"use client";

// The Add / Edit contributor dialog (P2-CONTRIB-4, -5, -6): one dialog for
// both, built from existing atoms only (ModalFrame, TextInput, Radio,
// NumberInput, Banner) — no new ones.
//
// Validation (`checkContributor`, `contributors.ts`) runs on submit, and
// again on every change once the first submit has run. The majority note
// and the "share comes back to you" note never block saving; they are
// informational, always derived from the current draft.
//
// The write itself goes through `useManualProjects()`'s contributor writers
// (T09), which re-check the ownership invariant server-side (co-owners plus
// `opts.soldPct` at most 100) and refuse with a reason instead of writing
// past it. `soldPct` is read fresh from the market store here — the
// projects provider sits above it and can't read it itself (errata #31) —
// via `useMarket()` plus `ownershipOf`, independent of `view.ownership`
// (which a page not yet wired to the market may still show as empty).
//
// Persistence follows `useStoreWrite`'s established pattern (title-editor,
// description-editor): the record already holds the write once the writer
// returns `ok`, so "applied" is just "the record holds this exact
// contributor object"; `useStoreWrite` then waits SETTLE_MS and reports a
// refused localStorage write as `failed`, which keeps the dialog open with
// the storage-full banner instead of closing on a change this browser never
// kept.

import * as React from "react";
import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Banner, Button, ModalFrame, NumberInput, Radio, TextInput } from "@/components/ideeza";
import {
  CONTRIBUTOR_NAME_MAX,
  ROLE_INFO,
  ROLE_WORD,
  addedMessage,
  checkContributor,
  majorityNote,
  savedMessage,
  shareHint,
  type ContributorField,
  type ContributorInput,
} from "@/lib/manual/contributors";
import { WRITE_FAILED } from "@/lib/manual/project-header";
import { maxShareFor, ownershipOf } from "@/lib/manual/ownership";
import type { Contributor, ContributorRole, OwnershipSplit } from "@/lib/manual/p2-types";
import { type ContributorRefusal, type ManualProject, useManualProjects } from "@/lib/manual/projects";
import { useStoreWrite } from "./use-store-write";
import { useMarket } from "@/lib/market/market-store";
import { cn } from "@/lib/utils";

const ROLE_ORDER: readonly ContributorRole[] = ["viewer", "editor", "coOwner"];

const REFUSAL_COPY: Record<ContributorRefusal, string> = {
  missing: "This contributor is no longer on the project.",
  invalid: "That value isn't valid. Check the fields and try again.",
  duplicate: "Someone with that name is already on this project.",
  full: "This project already has as many contributors as it can hold.",
  over100:
    "That share is more than there is to give: ownership can't pass 100%, and once a share has sold you keep at least 1%. Lower it and try again.",
};

type Pending = { kind: "add" | "edit"; contributor: Contributor };

export function ContributorDialog({
  project,
  ownership,
  editing,
  onClose,
  announce,
}: {
  project: ManualProject;
  /** `view.ownership` (COR-74) — the Share field's max and hint. */
  ownership: OwnershipSplit;
  /** Null for Add. */
  editing: Contributor | null;
  onClose: () => void;
  announce: (message: string) => void;
}) {
  const { addContributor, updateContributor, removeContributor } = useManualProjects();
  const { data: market } = useMarket();

  const others = React.useMemo(
    () => (project.contributors ?? []).filter((c) => c.id !== editing?.id),
    [project.contributors, editing?.id],
  );
  const maxShare = maxShareFor(ownership, editing);

  const [draft, setDraft] = React.useState<ContributorInput>(
    editing ? { name: editing.name, role: editing.role, share: editing.share ? String(editing.share) : "" } : { name: "", role: null, share: "" },
  );
  const [submitted, setSubmitted] = React.useState(false);
  const [refusal, setRefusal] = React.useState<ContributorRefusal | null>(null);
  const [pending, setPending] = React.useState<Pending | null>(null);

  const nameRef = React.useRef<HTMLInputElement>(null);
  const roleGroupRef = React.useRef<HTMLDivElement>(null);

  const nameId = React.useId();
  const nameErrId = React.useId();
  const roleLegendId = React.useId();
  const roleErrId = React.useId();
  const revertNoteId = React.useId();
  const shareId = React.useId();
  const shareHintId = React.useId();
  const shareErrId = React.useId();
  const majorityId = React.useId();

  const check = checkContributor(draft, { others, maxShare });
  const errors = submitted && !check.ok ? check.errors : {};

  const applied = pending !== null && (project.contributors ?? []).includes(pending.contributor);
  const write = useStoreWrite(applied, () => {
    if (pending) announce(pending.kind === "add" ? addedMessage(pending.contributor) : savedMessage(pending.contributor));
    onClose();
  });

  const revertUncommitted = () => {
    if (!pending) return;
    if (pending.kind === "add") removeContributor(project.id, pending.contributor.id);
    else if (editing) updateContributor(project.id, editing.id, { name: editing.name, role: editing.role, share: editing.share });
  };

  const handleCancel = () => {
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

  // NumberInput has no forwardRef, so the Share field takes focus by id;
  // Name is a real ref (TextInput forwards one), and Role focuses its first
  // radio button — nothing is "checked" yet, so there is no current one.
  const focusField = (field: ContributorField) => {
    if (field === "name") {
      nameRef.current?.focus();
    } else if (field === "role") {
      roleGroupRef.current?.querySelector<HTMLButtonElement>('[role="radio"]')?.focus();
    } else {
      document.getElementById(shareId)?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (write.saving) return;
    setSubmitted(true);
    setRefusal(null);

    // A retry after a failed persist: the record already holds the earlier
    // add in memory (only its localStorage write failed), so a fresh
    // addContributor would collide with its own name. Undo it first, and
    // drop it from `others` for this validation pass too — the revert's own
    // setProjects hasn't landed yet in this render's closed-over `project`.
    const retryingFailedAdd = write.failed && pending?.kind === "add";
    if (retryingFailedAdd) {
      revertUncommitted();
      write.reset();
      setPending(null);
    }
    const ctx = { others: retryingFailedAdd ? others.filter((c) => c.id !== pending!.contributor.id) : others, maxShare };
    const result = checkContributor(draft, ctx);
    if (!result.ok) {
      focusField(result.first);
      return;
    }
    write.start();
    const soldPct = soldPctNow();
    const outcome = editing
      ? updateContributor(project.id, editing.id, result.value, { soldPct })
      : addContributor(project.id, result.value, { soldPct });
    if (!outcome.ok) {
      write.reset();
      setRefusal(outcome.reason);
      return;
    }
    setPending({ kind: editing ? "edit" : "add", contributor: outcome.contributor });
  };

  const setRole = (role: ContributorRole) => {
    setRefusal(null);
    setDraft((d) => ({ ...d, role }));
  };

  const shareDescribedBy = [shareHintId, errors.share ? shareErrId : null, draft.role === "coOwner" ? majorityId : null]
    .filter(Boolean)
    .join(" ");
  const roleDescribedBy = [errors.role ? roleErrId : null, editing ? revertNoteId : null].filter(Boolean).join(" ") || undefined;

  const majority = draft.role === "coOwner" ? majorityNote(draft.name, Number(draft.share) || 0) : null;
  const revertsShare = editing?.role === "coOwner" && draft.role !== null && draft.role !== "coOwner";

  return (
    <ModalFrame
      open
      onClose={handleCancel}
      title={editing ? `Edit ${editing.name}` : "Add contributor"}
      description="They're recorded on this project in this browser — nothing is sent to them."
      size="sm"
      initialFocus={nameRef}
      footer={
        <div className="flex w-full flex-col gap-4 [@container(min-width:400px)]:ml-auto [@container(min-width:400px)]:w-auto [@container(min-width:400px)]:flex-row [@container(min-width:400px)]:justify-end">
          <Button
            type="button"
            hierarchy="ghost"
            size="lg"
            disabled={write.saving}
            onClick={handleCancel}
            className="min-h-[44px] w-full [@container(min-width:400px)]:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="contributor-form"
            hierarchy="primary"
            size="lg"
            disabled={write.saving}
            className="min-h-[44px] w-full [@container(min-width:400px)]:w-auto"
          >
            {write.saving ? "Saving…" : editing ? "Save changes" : "Add contributor"}
          </Button>
        </div>
      }
    >
      <form id="contributor-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-8">
        {write.failed && <Banner tone="error">{WRITE_FAILED}</Banner>}
        {refusal && <Banner tone="error">{REFUSAL_COPY[refusal]}</Banner>}

        <div className="flex flex-col gap-2">
          <label htmlFor={nameId} className="text-sm font-medium text-text-primary">
            Name
          </label>
          <TextInput
            ref={nameRef}
            id={nameId}
            value={draft.name}
            onValueChange={(name) => {
              setRefusal(null);
              setDraft((d) => ({ ...d, name }));
            }}
            maxLength={CONTRIBUTOR_NAME_MAX}
            invalid={!!errors.name}
            aria-invalid={!!errors.name || undefined}
            aria-describedby={errors.name ? nameErrId : undefined}
            autoComplete="off"
          />
          {errors.name && (
            <p id={nameErrId} className="text-sm text-text-error">
              {errors.name}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <span id={roleLegendId} className="text-sm font-medium text-text-primary">
            Role
          </span>
          <div
            ref={roleGroupRef}
            role="radiogroup"
            aria-labelledby={roleLegendId}
            aria-describedby={roleDescribedBy}
            tabIndex={-1}
            className="flex flex-col gap-3 outline-none"
          >
            {ROLE_ORDER.map((role) => {
              const disabled = role === "coOwner" && maxShare === 0;
              const checked = draft.role === role;
              return (
                <button
                  key={role}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  disabled={disabled}
                  onClick={() => setRole(role)}
                  className={cn(
                    "flex items-start gap-4 rounded-lg border border-solid p-4 text-left outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-60",
                    checked ? "border-border-brand bg-bg-brand-subtle" : "border-border bg-bg-surface hover:bg-bg-subtle",
                  )}
                >
                  <Radio checked={checked} disabled={disabled} decorative className="mt-1" />
                  <span className="min-w-0">
                    <span className="block text-md font-semibold text-text-primary">{ROLE_WORD[role]}</span>
                    <span className="mt-1 block text-sm text-text-secondary">{ROLE_INFO[role]}</span>
                    {disabled && (
                      <span className="mt-1 block text-sm text-text-secondary">You have no share left to give.</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
          {errors.role && (
            <p id={roleErrId} className="text-sm text-text-error">
              {errors.role}
            </p>
          )}
          {revertsShare && editing && (
            <p id={revertNoteId} className="text-sm text-text-secondary">
              {`Their ${editing.share}% share comes back to you.`}
            </p>
          )}
        </div>

        {draft.role === "coOwner" && (
          <div className="flex flex-col gap-2">
            <label htmlFor={shareId} className="text-sm font-medium text-text-primary">
              Share (%)
            </label>
            <NumberInput
              value={draft.share}
              onChange={(share) => {
                setRefusal(null);
                setDraft((d) => ({ ...d, share }));
              }}
              min={1}
              max={maxShare}
              id={shareId}
              stepsWhat="share"
              ariaDescribedBy={shareDescribedBy || undefined}
            />
            <p id={shareHintId} className="text-sm text-text-secondary">
              {shareHint(maxShare, ownership.reserved)}
            </p>
            {errors.share && (
              <p id={shareErrId} className="text-sm text-text-error">
                {errors.share}
              </p>
            )}
            {majority && (
              <p id={majorityId} className="text-sm text-text-secondary">
                {majority}
              </p>
            )}
          </div>
        )}
      </form>
    </ModalFrame>
  );
}

/** The + icon on "Add contributor" (P2-CONTRIB-2, -3): a small helper so both
 *  call sites (the section head and the empty state) draw the same glyph. */
export function AddContributorIcon({ size = 16 }: { size?: number }) {
  return <Icon icon={PlusSignIcon} size={size} />;
}
