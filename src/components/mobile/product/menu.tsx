"use client";

// The product's ⋯ (Product Details 10c), the owner's only: the kit's M12
// action sheet, as on the project page — Rename product (10d) and Open chat
// "…" — where it was built, the one place a build is changed (D3) — the web's
// ProductMenu. The previews and the marketplace view have no entry on the
// Figma's ⋯, so they live here, after the web's two, in the web's words:
// Preview as others see it (31a), Preview as a contributor (31b, with the
// team: a pick-one sheet of who), and — while one of its copies is on sale —
// See it on the marketplace (10h, as a demo buyer; that page says it is a
// Testnet demo). Open chat opens the chat itself (`/m/ai/chat/<id>`).
// Rename goes through the write gate: a live Buy-now listing asks to pause
// first (the project page's 21) — Rename steps aside so only that question
// shows, and the new name is saved once it is answered — an auction keeps the
// field off with the reason (27a); an empty name says "Give the product a
// name." (27b).

import * as React from "react";
import { useRouter } from "next/navigation";
import { BubbleChatIcon, PencilEdit01Icon, Store01Icon, UserMultipleIcon, ViewIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ideeza/button";
import { TextInput } from "@/components/ideeza/text-input";
import { Field, errorProps, useFieldIds } from "@/components/auth/auth-parts";
import { ROLE_WORD } from "@/lib/manual/contributors";
import { displayProductName } from "@/lib/manual/products-tab-view";
import { productRowsOf } from "@/lib/manual/project-read";
import { PROJECT_NAME_MAX, useManualProjects } from "@/lib/manual/projects";
import { MARKET_VIEW, phoneProductPath } from "@/lib/manual/phone-product";
import { cn } from "@/lib/utils";
import { PickSheet } from "../kit/pick-list";
import { ActionSheet, Sheet, type ActionSheetItem } from "../kit/sheet";
import { useToast } from "../kit/toast";
import { T } from "../type";
import type { PhoneWriteGate } from "../project/write-gate";
import { useListedCopies } from "./overview";
import { useProduct } from "./use-product";

export function ProductMenu({ open, onClose, onRename }: { open: boolean; onClose: () => void; onRename: () => void }) {
  const { project, product, name, chat, canEdit } = useProduct();
  const router = useRouter();
  const listed = useListedCopies().length > 0;
  const [picking, setPicking] = React.useState(false);
  const team = project.contributors ?? [];
  const base = phoneProductPath(project.id, product.id);
  const items: ActionSheetItem[] = [
    ...(canEdit ? [{ label: "Rename product", icon: PencilEdit01Icon, onSelect: onRename }] : []),
    ...(chat ? [{ label: `Open chat “${chat.title}”`, icon: BubbleChatIcon, onSelect: () => router.push(`/m/ai/chat/${encodeURIComponent(chat.id)}`) }] : []),
    { label: "Preview as others see it", icon: ViewIcon, onSelect: () => router.push(`${base}?view=buyer`) },
    ...(team.length ? [{ label: "Preview as a contributor", icon: UserMultipleIcon, onSelect: () => setPicking(true) }] : []),
    ...(listed ? [{ label: "See it on the marketplace", icon: Store01Icon, onSelect: () => router.push(`${base}?view=${MARKET_VIEW}`) }] : []),
  ];
  return (
    <>
      <ActionSheet open={open} onClose={onClose} title={name} items={items} />
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

const lengthOf = (s: string) => Array.from(s.trim()).length;

/** 10d · Rename product (27a the auction, 27b no name). Mounted each time it opens, so it starts
 *  from the name as stored now. */
export function RenameSheet({ open, onClose, gate }: { open: boolean; onClose: () => void; gate: PhoneWriteGate }) {
  const { project, product } = useProduct();
  const { projects, renameProduct } = useManualProjects();
  const toast = useToast();
  const ids = useFieldIds(["name"] as const);
  const live = projects.find((p) => p.id === project.id) ?? project;
  const current = (productRowsOf(live).find((r) => r.id === product.id)?.name ?? product.name).trim();
  const [name, setName] = React.useState(current);
  const [tried, setTried] = React.useState(false);
  const [refused, setRefused] = React.useState<string | null>(null);

  const value = name.trim();
  const tooLong = lengthOf(name) > PROJECT_NAME_MAX;
  const error = value === "" ? "Give the product a name." : tooLong ? `Keep it to ${PROJECT_NAME_MAX} characters.` : null;
  const blocked = gate.reasonOf("editProduct");
  const reason = refused ?? blocked;
  const shown = tried || tooLong ? error : null;

  const save = (e?: React.FormEvent) => {
    e?.preventDefault();
    setTried(true);
    if (error || blocked) return;
    if (value === current) return onClose();
    setRefused(null);
    const out = gate.guard("editProduct", () => {
      renameProduct(project.id, product.id, value);
      toast({ title: `Renamed to “${displayProductName(value)}”` });
      onClose();
    });
    if (out.kind === "refused") setRefused(out.reason);
    // The pause question is a sheet of its own: one sheet at a time, so Rename steps aside.
    else if (out.kind === "confirming") onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Rename product"
      description="The name shows on its card, its page and in the editor."
      actions={
        <>
          <Button size="xl" className="w-full" type="submit" form="m-rename-product" disabled={blocked !== null}>
            Save
          </Button>
          <Button hierarchy="secondary" size="xl" className="w-full" onClick={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      <form id="m-rename-product" onSubmit={save} noValidate className="flex flex-col gap-2 pb-6">
        <Field label="Name" htmlFor={ids.name.id} error={shown} errorId={ids.name.errorId}>
          <TextInput
            id={ids.name.id}
            size="xl"
            value={name}
            placeholder="Name this product"
            onValueChange={setName}
            disabled={blocked !== null}
            autoComplete="off"
            {...errorProps(shown, ids.name.errorId)}
          />
        </Field>
        <span className={cn(T.caption, "text-right", tooLong && "text-text-error")}>
          {lengthOf(name)}/{PROJECT_NAME_MAX}
        </span>
        {reason && <p className={T.body}>{reason}</p>}
      </form>
    </Sheet>
  );
}
