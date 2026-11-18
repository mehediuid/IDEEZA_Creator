"use client";

// Edit name and description — the product's one editor for both (owner,
// 2026-11-15: made like the project's, details/edit-details.tsx). It opens
// from the product ⋯ menu and from "Add a description" on a product without
// one, owner-only and absent in a preview or on a locked project.
//
// - Name: trimmed, 1–80 characters, its count beside the label.
// - Description: up to 1,000 characters with a counter from 800.
// - Save writes both in one store write (`updateProductDetails`) through the
//   write guard ("editProduct"): a live Buy-now listing asks to pause first —
//   that confirm opens over this dialog — and an auction or the lock refuses,
//   said under the fields.
// - Closing with changes asks "Discard changes?" in the footer first.

import * as React from "react";
import { Button, ModalFrame, TextInput, Textarea } from "@/components/ideeza";
import { DESCRIPTION_SAVED, WRITE_FAILED, checkDescription, renamedMessage } from "@/lib/manual/project-header";
import { productRowsOf } from "@/lib/manual/project-read";
import { displayProductName } from "@/lib/manual/products-tab-view";
import { PROJECT_DESC_COUNTER_FROM, PROJECT_DESC_MAX, PROJECT_NAME_MAX, useManualProjects } from "@/lib/manual/projects";
import { useWriteGuard } from "@/lib/manual/use-write-guard";
import { cn } from "@/lib/utils";
import { useStoreWrite } from "../details/use-store-write";
import type { ProductSlotProps } from "./product-slots";

const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";
const LABEL = "text-md font-semibold text-text-primary";
const QUIET = "text-sm tabular-nums text-text-secondary";

/** Characters as a person counts them (an emoji is one). */
const lengthOf = (s: string) => Array.from(s.trim()).length;

export type EditProductDetails = {
  open: () => void;
  /** The dialog itself; render it once. */
  dialog: React.ReactNode;
};

export function useEditProductDetails({
  slot,
  canEdit,
  fallbackFocus,
}: {
  /** Null until the page has its product: the hook runs before the page's loading returns. */
  slot: ProductSlotProps | null;
  /** `can(viewer, "product.edit", view.canCtx)` — false in a preview and on a locked project. */
  canEdit: boolean;
  /** Where focus goes when the control that opened the dialog is gone. */
  fallbackFocus: () => HTMLElement | null;
}): EditProductDetails {
  const [key, setKey] = React.useState<number | null>(null);
  const open = React.useCallback(() => setKey((k) => (k ?? 0) + 1), []);
  const close = React.useCallback(() => {
    setKey(null);
    requestAnimationFrame(() => {
      const at = document.activeElement;
      if (!at || at === document.body) fallbackFocus()?.focus();
    });
  }, [fallbackFocus]);
  return {
    open,
    dialog: key !== null && canEdit && slot ? <EditProductDetailsDialog key={key} slot={slot} onClose={close} /> : null,
  };
}

function EditProductDetailsDialog({ slot, onClose }: { slot: ProductSlotProps; onClose: () => void }) {
  const { project, product, announce } = slot;
  const { projects, updateProductDetails, updateProject } = useManualProjects();
  const gate = useWriteGuard(project.id);
  const live = projects.find((p) => p.id === project.id) ?? project;
  const row = productRowsOf(live).find((r) => r.id === product.id);
  const stored = { name: row?.name ?? product.name, description: row?.description ?? product.description };
  const [initial] = React.useState(() => ({ name: stored.name.trim(), description: stored.description.trim() }));
  // An empty list reads as the virtual "p1" again, so a stored p1 can be put back to none.
  const [before] = React.useState(() => ({ productName: live.productName, products: live.products ?? [] }));
  const [name, setName] = React.useState(initial.name);
  const [description, setDescription] = React.useState(initial.description);
  const [tried, setTried] = React.useState(false);
  const [denied, setDenied] = React.useState<string | null>(null);
  const [confirming, setConfirming] = React.useState(false);
  const [pending, setPending] = React.useState<{ name: string; description: string } | null>(null);
  const nameRef = React.useRef<HTMLInputElement>(null);
  const areaRef = React.useRef<HTMLTextAreaElement>(null);
  const keepRef = React.useRef<HTMLButtonElement>(null);
  const formId = React.useId();
  const nameId = React.useId();
  const nameMsgId = React.useId();
  const areaId = React.useId();
  const areaMsgId = React.useId();
  const messageId = React.useId();

  const value = name.trim();
  const tooLong = lengthOf(name) > PROJECT_NAME_MAX;
  const nameError = value === "" ? "Give the product a name." : tooLong ? `Keep it to ${PROJECT_NAME_MAX} characters.` : null;
  const descCheck = checkDescription(description, PROJECT_DESC_MAX, PROJECT_DESC_COUNTER_FROM);
  const nameChanged = value !== initial.name;
  const descChanged = descCheck.value !== initial.description;
  const dirty = name !== initial.name || description !== initial.description;
  const blocked = gate.reasonOf("editProduct");
  const reason = denied ?? blocked;

  const write = useStoreWrite(
    pending !== null && stored.name.trim() === pending.name && stored.description.trim() === pending.description,
    () => {
      const p = pending;
      if (p) {
        const renamed = p.name !== initial.name;
        const described = p.description !== initial.description;
        announce(
          renamed && described
            ? "Name and description saved"
            : renamed
              ? renamedMessage(displayProductName(p.name))
              : DESCRIPTION_SAVED,
        );
      }
      onClose();
    },
  );

  const save = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (write.saving) return;
    setTried(true);
    if (nameError) {
      nameRef.current?.focus();
      return;
    }
    if (descCheck.tooLong) {
      areaRef.current?.focus();
      return;
    }
    if (!nameChanged && !descChanged && !write.failed) {
      onClose();
      return;
    }
    const next = { name: value, description: descCheck.value };
    setDenied(null);
    const outcome = gate.guard("editProduct", () => {
      setPending(next);
      write.start();
      updateProductDetails(project.id, product.id, next);
    });
    if (outcome.kind === "refused") setDenied(outcome.reason);
  };

  const leave = () => {
    // After a refused write the record holds words this browser never kept: put the kept ones back.
    if (write.failed) updateProject(project.id, before);
    write.reset();
    onClose();
  };
  const requestClose = () => {
    if (write.saving) return;
    if (!dirty) {
      leave();
      return;
    }
    setConfirming(true);
    requestAnimationFrame(() => keepRef.current?.focus());
  };
  const keepEditing = () => {
    setConfirming(false);
    requestAnimationFrame(() => nameRef.current?.focus());
  };

  const shownNameError = tried || tooLong ? nameError : null;
  const descError = descCheck.tooLong ? descCheck.error : null;

  return (
    <>
      <ModalFrame
        open
        onClose={confirming ? keepEditing : requestClose}
        covered={gate.confirming}
        size="sm"
        title="Edit name and description"
        description="They show on its page and on its card in the project."
        initialFocus={nameRef}
        closeUnavailable={write.saving}
        footer={
          confirming ? (
            <div role="group" aria-label="Discard changes?" className="flex w-full flex-wrap items-center gap-4">
              <p className="mr-auto text-md font-semibold text-text-primary">Discard changes?</p>
              <Button ref={keepRef} type="button" hierarchy="secondary" size="lg" onClick={keepEditing} className={TAP}>
                Keep editing
              </Button>
              <Button type="button" hierarchy="ghost" size="lg" onClick={leave} className={cn(TAP, "text-text-error")}>
                Discard
              </Button>
            </div>
          ) : (
            <div className="ml-auto flex flex-wrap items-center gap-4">
              <Button type="button" hierarchy="ghost" size="lg" onClick={requestClose} disabled={write.saving} className={TAP}>
                Cancel
              </Button>
              <Button
                type="submit"
                form={formId}
                hierarchy="primary"
                size="lg"
                disabled={write.saving}
                aria-disabled={blocked !== null || undefined}
                aria-describedby={reason ? messageId : undefined}
                className={cn(TAP, blocked !== null && "cursor-not-allowed opacity-60")}
              >
                {write.saving ? "Saving…" : "Save"}
              </Button>
            </div>
          )
        }
      >
        <form id={formId} onSubmit={save} noValidate className="flex flex-col gap-8 pt-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-4">
              <label htmlFor={nameId} className={LABEL}>
                Name
              </label>
              <span aria-hidden className={cn(QUIET, tooLong && "text-text-error")}>
                {`${lengthOf(name)}/${PROJECT_NAME_MAX}`}
              </span>
            </div>
            <TextInput
              ref={nameRef}
              id={nameId}
              size="lg"
              value={name}
              onValueChange={setName}
              invalid={shownNameError !== null}
              aria-invalid={shownNameError !== null || undefined}
              aria-describedby={nameMsgId}
              autoComplete="off"
              containerClassName={TAP}
            />
            <p id={nameMsgId} aria-live="polite" className="text-md">
              {shownNameError && <span className="text-text-error">{shownNameError}</span>}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor={areaId} className={LABEL}>
              Description
            </label>
            <Textarea
              ref={areaRef}
              id={areaId}
              value={description}
              rows={6}
              onValueChange={setDescription}
              invalid={descError !== null}
              aria-invalid={descError !== null || undefined}
              aria-describedby={areaMsgId}
              placeholder="What it does, and who it is for."
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save(e);
              }}
            />
            <div id={areaMsgId} className="flex flex-wrap items-baseline justify-between gap-x-4 text-md">
              <span className={descError ? "text-text-error" : "text-text-secondary"}>{descError ?? ""}</span>
              {descCheck.counter && <span className={cn(QUIET, descError && "text-text-error")}>{descCheck.counter}</span>}
            </div>
          </div>

          <div id={messageId} aria-live="polite" className="text-md empty:hidden">
            {write.failed && <p className="text-text-error">{WRITE_FAILED}</p>}
            {reason && <p className="text-text-secondary">{reason}</p>}
          </div>
        </form>
      </ModalFrame>
      {gate.dialog}
    </>
  );
}
