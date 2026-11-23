"use client";

// The product's ⋯ (Product Details 10c), the owner's only — the web's
// ProductMenu (CL-015) as a phone sheet of grouped rows:
// · Edit name and description (the product's one editor for both; absent on a
//   locked project), Open chat “…” with "Where it was built — change it
//   there" under it (the one place a build is changed, D3);
// · the previews and the marketplace view the Figma's ⋯ carries, after the
//   web's two, in the web's words: Preview as others see it (31a), Preview as
//   a contributor (31b, a pick-one sheet of who) and — while one of its copies
//   is on sale — See it on the marketplace (10h);
// · then, in a group of its own at the end, Delete product… in red. While one
//   of the web's eight rules blocks it (`productDeleteBlockOf`, first match
//   wins) it stays, greyed, does nothing, and says the reason under its label.
// The kit's M12 action sheet has no line under a row and no greyed row, so
// this is the M09 sheet with the kit's list rows (the reasons are the
// requirement).
//
// Edit name and description (`EditDetailsSheet`): Name (trimmed, 1–80, its
// count beside the label, red past 80) and Description (up to 1,000, the count
// from 800), one Save. Save goes through the write gate: a live Buy-now
// listing asks to pause first — that sheet opens over this one — and an
// auction or the lock keeps Save off with the reason. Closing with changes
// asks "Discard changes?" first.

import * as React from "react";
import { useRouter } from "next/navigation";
import { BubbleChatIcon, Bug01Icon, Delete02Icon, PencilEdit01Icon, Store01Icon, UserMultipleIcon, ViewIcon } from "@hugeicons/core-free-icons";
import { REPORT_PROBLEM, reportProblemHref } from "../help/report-link";
import { Icon } from "@/components/dashboard/icon";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { TextInput, Textarea } from "@/components/ideeza/text-input";
import { Field, errorProps, useFieldIds } from "@/components/auth/auth-parts";
import { useStoreWrite } from "@/components/projects/details/use-store-write";
import { ROLE_WORD } from "@/lib/manual/contributors";
import { productDeleteBlockOf, productDeleteFactsOf, type ProductDeleteBlock } from "@/lib/manual/delete-plan";
import { can } from "@/lib/manual/permissions";
import { DESCRIPTION_SAVED, WRITE_FAILED, checkDescription, renamedMessage } from "@/lib/manual/project-header";
import { displayProductName } from "@/lib/manual/products-tab-view";
import { productRowsOf } from "@/lib/manual/project-read";
import { PROJECT_DESC_COUNTER_FROM, PROJECT_DESC_MAX, PROJECT_NAME_MAX, useManualProjects } from "@/lib/manual/projects";
import { MARKET_VIEW, phoneProductPath } from "@/lib/manual/phone-product";
import { cn } from "@/lib/utils";
import { ConfirmSheet } from "../kit/confirm-sheet";
import { ListCard, ListRow } from "../kit/list";
import { PickSheet } from "../kit/pick-list";
import { Sheet } from "../kit/sheet";
import { useToast } from "../kit/toast";
import { T } from "../type";
import type { PhoneWriteGate } from "../project/write-gate";
import { useListedCopies } from "./overview";
import { useProduct } from "./use-product";

/** The web's `canEditDetails`: the owner's own page, not on a locked project (`product.edit`). */
export function useCanEditDetails(): boolean {
  const { mode, viewer, view } = useProduct();
  return mode === "owner" && can(viewer, "facts.seeOwnerOnly") && can(viewer, "product.edit", view.canCtx);
}

/** Why Delete product is blocked right now (the web menu's reason), or null. */
export function useDeleteBlock(): ProductDeleteBlock | null {
  const { project, view, product } = useProduct();
  return productDeleteBlockOf(
    productDeleteFactsOf(
      { products: productRowsOf(project).length, deleteFacts: view.deleteFacts, sales: view.sales, editions: view.editions },
      product.id,
    ),
  );
}

export function ProductMenu({
  open,
  onClose,
  onEdit,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { project, product, viewer, name, chat } = useProduct();
  const router = useRouter();
  const listed = useListedCopies().length > 0;
  const canEdit = useCanEditDetails();
  const block = useDeleteBlock();
  const [picking, setPicking] = React.useState(false);
  const team = project.contributors ?? [];
  const base = phoneProductPath(project.id, product.id);
  const go = (run: () => void) => () => {
    onClose();
    run();
  };
  return (
    <>
      <Sheet open={open} onClose={onClose} title={name}>
        <div className="flex flex-col gap-6 pb-8">
          <ListCard label="Product actions">
            {canEdit && <ListRow icon={PencilEdit01Icon} title="Edit name and description" onClick={go(onEdit)} />}
            {chat && (
              <ListRow
                icon={BubbleChatIcon}
                title={`Open chat “${chat.title}”`}
                meta="Where it was built — change it there"
                onClick={go(() => router.push(`/m/ai/chat/${encodeURIComponent(chat.id)}`))}
              />
            )}
            <ListRow icon={ViewIcon} title="Preview as others see it" onClick={go(() => router.push(`${base}?view=buyer`))} />
            {team.length > 0 && <ListRow icon={UserMultipleIcon} title="Preview as a contributor" onClick={go(() => setPicking(true))} />}
            {listed && <ListRow icon={Store01Icon} title="See it on the marketplace" onClick={go(() => router.push(`${base}?view=${MARKET_VIEW}`))} />}
            <ListRow icon={Bug01Icon} title={REPORT_PROBLEM} onClick={go(() => router.push(reportProblemHref()))} />
          </ListCard>
          {can(viewer, "product.edit") && (
            <ListCard label="Delete">
              <ListRow
                leading={
                  <span aria-hidden className={cn("shrink-0", block ? "text-[color:var(--color-icon-disabled)]" : "text-[color:var(--color-icon-error)]")}>
                    <Icon icon={Delete02Icon} size={24} />
                  </span>
                }
                title="Delete product…"
                danger={!block}
                disabled={block !== null}
                reason={block?.reason}
                onClick={go(onDelete)}
              />
            </ListCard>
          )}
        </div>
      </Sheet>
      <PickSheet
        open={picking}
        onClose={() => setPicking(false)}
        title="Preview as a contributor"
        value={null}
        options={team.map((c) => ({ value: c.id, label: c.name, helper: `${ROLE_WORD[c.role]} · ${c.share}%` }))}
        onPick={(cid) => {
          setPicking(false);
          router.push(`${base}?view=contributor&as=${encodeURIComponent(cid)}`);
        }}
      />
    </>
  );
}

/** Characters as a person counts them (an emoji is one). */
const lengthOf = (s: string) => Array.from(s.trim()).length;

/** Edit name and description (the web's EditProductDetailsDialog, CL-015). Mounted each time it
 *  opens, so it starts from the words as stored now. */
export function EditDetailsSheet({ onClose, gate }: { onClose: () => void; gate: PhoneWriteGate }) {
  const { project, product } = useProduct();
  const { projects, updateProductDetails, updateProject } = useManualProjects();
  const toast = useToast();
  const ids = useFieldIds(["name", "description"] as const);
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
  const [discarding, setDiscarding] = React.useState(false);
  const [pending, setPending] = React.useState<{ name: string; description: string } | null>(null);

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
        toast({
          title: renamed && described ? "Name and description saved" : renamed ? renamedMessage(displayProductName(p.name)) : DESCRIPTION_SAVED,
        });
      }
      onClose();
    },
  );

  const save = () => {
    if (write.saving) return;
    setTried(true);
    if (nameError || descCheck.tooLong || blocked) return;
    if (!nameChanged && !descChanged && !write.failed) return onClose();
    const next = { name: value, description: descCheck.value };
    setDenied(null);
    // A live Buy-now listing asks to pause first: that sheet opens over this one.
    const out = gate.guard("editProduct", () => {
      setPending(next);
      write.start();
      updateProductDetails(project.id, product.id, next);
    });
    if (out.kind === "refused") setDenied(out.reason);
  };
  const leave = () => {
    // After a refused write the record holds words this browser never kept: put the kept ones back.
    if (write.failed) updateProject(project.id, before);
    write.reset();
    onClose();
  };
  const requestClose = () => {
    if (write.saving) return;
    if (dirty) setDiscarding(true);
    else leave();
  };

  const shownNameError = tried || tooLong ? nameError : null;
  const descError = descCheck.tooLong ? descCheck.error : null;

  return (
    <>
      <Sheet
        open
        onClose={requestClose}
        title="Edit name and description"
        description="They show on its page and on its card in the project."
        actions={
          <>
            <Button size="xl" className="w-full" disabled={blocked !== null} loading={write.saving} onClick={save}>
              {write.saving ? "Saving…" : "Save"}
            </Button>
            {reason && <p className={T.meta}>{reason}</p>}
          </>
        }
      >
        <Field
          label="Name"
          htmlFor={ids.name.id}
          error={shownNameError}
          errorId={ids.name.errorId}
          aside={
            <span aria-hidden className={cn(T.caption, "tabular-nums", tooLong && "text-text-error")}>
              {`${lengthOf(name)}/${PROJECT_NAME_MAX}`}
            </span>
          }
        >
          <TextInput
            id={ids.name.id}
            size="xl"
            value={name}
            onValueChange={setName}
            autoComplete="off"
            {...errorProps(shownNameError, ids.name.errorId)}
          />
        </Field>
        <Field label="Description" htmlFor={ids.description.id} error={descError} errorId={ids.description.errorId}>
          <Textarea
            id={ids.description.id}
            rows={6}
            value={description}
            onValueChange={setDescription}
            placeholder="What it does, and who it is for."
            {...errorProps(descError, ids.description.errorId)}
          />
          {descCheck.counter && (
            <span className={cn(T.caption, "text-right tabular-nums", descError && "text-text-error")}>{descCheck.counter}</span>
          )}
        </Field>
        {write.failed && <Banner tone="error">{WRITE_FAILED}</Banner>}
      </Sheet>
      <ConfirmSheet
        open={discarding}
        onClose={() => setDiscarding(false)}
        title="Discard changes?"
        verb="Discard"
        destructive
        cancelLabel="Keep editing"
        onConfirm={leave}
      />
    </>
  );
}
