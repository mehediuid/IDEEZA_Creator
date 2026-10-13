"use client";

// The product's ⋯ menu (owner, 2026-10-11: the product page made like the
// project page). Beside Open in editor, owner-only and absent in a preview
// (PPL-6):
// - Rename product — a small dialog over `renameProduct`, the same write the
//   editor's name field makes, through the same write guard ("editProduct":
//   a live Buy-now listing asks to pause first; an auction or the lock
//   refuses, said under the field);
// - Open chat “…” — the chat this version was built in, while it is in this
//   browser: the build is changed there.
// The menu button is the project menu's (WAI-ARIA APG keys, Escape back to ⋯).

import * as React from "react";
import { useRouter } from "next/navigation";
import { BubbleChatIcon, MoreHorizontalIcon, PencilEdit01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, IconButton, ModalFrame, TextInput } from "@/components/ideeza";
import { can } from "@/lib/manual/permissions";
import { WRITE_FAILED } from "@/lib/manual/project-header";
import { productRowsOf } from "@/lib/manual/project-read";
import { displayProductName } from "@/lib/manual/products-tab-view";
import { PROJECT_NAME_MAX, useManualProjects } from "@/lib/manual/projects";
import { useWriteGuard } from "@/lib/manual/use-write-guard";
import { cn } from "@/lib/utils";
import { useStoreWrite } from "../details/use-store-write";
import type { ProductSlotProps } from "./product-slots";

const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";
const lengthOf = (s: string) => Array.from(s.trim()).length;

type Item = { id: string; label: string; sub?: string; icon: Parameters<typeof Icon>[0]["icon"]; run: () => void };

export function ProductMenu({
  slot,
  chat,
}: {
  slot: ProductSlotProps;
  /** The chat this version was built in, while this browser has it. */
  chat: { title: string; href: string } | null;
}) {
  const { view, viewer } = slot;
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [layer, setLayer] = React.useState<"rename" | null>(null);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const menuId = React.useId();

  const canRename = can(viewer, "product.openEditor", view.canCtx);

  const items: Item[] = [
    ...(canRename ? [{ id: "rename", label: "Rename product", icon: PencilEdit01Icon, run: () => setLayer("rename") }] : []),
    ...(chat
      ? [{ id: "chat", label: `Open chat “${chat.title}”`, sub: "Where it was built — change it there", icon: BubbleChatIcon, run: () => router.push(chat.href) }]
      : []),
  ];

  const menuItems = () => Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
  const focusItem = (at: "first" | "last") =>
    requestAnimationFrame(() => {
      const list = menuItems();
      (at === "first" ? list[0] : list[list.length - 1])?.focus();
    });
  const close = (back: boolean) => {
    setOpen(false);
    if (back) triggerRef.current?.focus();
  };
  const backToTrigger = () =>
    requestAnimationFrame(() => {
      const at = document.activeElement;
      if (!at || at === document.body) triggerRef.current?.focus();
    });

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <IconButton
        ref={triggerRef}
        hierarchy="secondary"
        size="lg"
        aria-label="Product actions"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        icon={<Icon icon={MoreHorizontalIcon} size={20} />}
        onClick={() => {
          if (open) close(false);
          else {
            setOpen(true);
            focusItem("first");
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setOpen(true);
            focusItem(e.key === "ArrowDown" ? "first" : "last");
          }
        }}
        className="size-[44px] [@container(min-width:720px)]:size-[40px]"
      />
      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="Product actions"
          onKeyDown={(e) => {
            const list = menuItems();
            const at = list.indexOf(document.activeElement as HTMLElement);
            const go = (i: number) => {
              e.preventDefault();
              list[(i + list.length) % list.length]?.focus();
            };
            if (e.key === "ArrowDown") go(at + 1);
            else if (e.key === "ArrowUp") go(at - 1);
            else if (e.key === "Home") go(0);
            else if (e.key === "End") go(list.length - 1);
            else if (e.key === "Escape") {
              e.preventDefault();
              close(true);
            } else if (e.key === "Tab") setOpen(false);
          }}
          className="absolute right-0 top-full z-popover mt-2 flex w-[min(300px,calc(100vw-32px))] flex-col rounded-xl border border-solid border-border bg-bg-surface py-2 shadow-3 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-fast [@container(min-width:480px)]:left-0 [@container(min-width:480px)]:right-auto [@container(min-width:720px)]:left-auto [@container(min-width:720px)]:right-0"
        >
          {items.map((item) => (
            <MenuItem
              key={item.id}
              item={item}
              onRun={() => {
                close(true);
                item.run();
              }}
            />
          ))}
        </div>
      )}

      {layer === "rename" && (
        <RenameDialog
          slot={slot}
          onClose={() => {
            setLayer(null);
            backToTrigger();
          }}
        />
      )}
    </div>
  );
}

function MenuItem({ item, onRun }: { item: Item; onRun: () => void }) {
  const subId = React.useId();
  return (
    <button
      type="button"
      role="menuitem"
      tabIndex={-1}
      aria-describedby={item.sub ? subId : undefined}
      onClick={onRun}
      className="flex min-h-[44px] w-full items-start gap-4 px-5 py-3 text-left outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus motion-reduce:transition-none"
    >
      <Icon icon={item.icon} size={18} className="mt-[1px] shrink-0 text-text-secondary" />
      <span className="flex min-w-0 flex-col gap-[2px]">
        <span className="break-words text-md font-medium leading-md text-text-primary">{item.label}</span>
        {item.sub && (
          <span id={subId} className="text-sm leading-sm text-text-secondary">
            {item.sub}
          </span>
        )}
      </span>
    </button>
  );
}

/** Rename product: one field. Save goes through the write guard; Escape, ✕ and Cancel close it. */
function RenameDialog({ slot, onClose }: { slot: ProductSlotProps; onClose: () => void }) {
  const { project, product, announce } = slot;
  const { projects, renameProduct } = useManualProjects();
  const gate = useWriteGuard(project.id);
  const live = projects.find((p) => p.id === project.id) ?? project;
  const row = productRowsOf(live).find((r) => r.id === product.id);
  const current = row?.name.trim() ?? product.name.trim();
  const [name, setName] = React.useState(current);
  const [tried, setTried] = React.useState(false);
  const [denied, setDenied] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const formId = React.useId();
  const fieldId = React.useId();
  const msgId = React.useId();

  const value = name.trim();
  const tooLong = lengthOf(name) > PROJECT_NAME_MAX;
  const error = value === "" ? "Give the product a name." : tooLong ? `Keep it to ${PROJECT_NAME_MAX} characters.` : null;
  const blocked = gate.reasonOf("editProduct");
  const reason = denied ?? blocked;

  const write = useStoreWrite(pending !== null && current === pending, () => {
    if (pending !== null) announce(`Renamed to “${displayProductName(pending)}”`);
    onClose();
  });

  const save = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (write.saving) return;
    setTried(true);
    if (error) {
      inputRef.current?.focus();
      return;
    }
    if (value === current && !write.failed) {
      onClose();
      return;
    }
    setDenied(null);
    const outcome = gate.guard("editProduct", () => {
      setPending(value);
      write.start();
      renameProduct(project.id, product.id, value);
    });
    if (outcome.kind === "refused") setDenied(outcome.reason);
  };

  const shownError = tried || tooLong ? error : null;
  return (
    <>
      <ModalFrame
        open
        onClose={() => {
          if (!write.saving) onClose();
        }}
        covered={gate.confirming}
        size="sm"
        title="Rename product"
        description="The name shows on its card, its page and in the editor."
        initialFocus={inputRef}
        closeUnavailable={write.saving}
        footer={
          <div className="ml-auto flex flex-wrap items-center gap-4">
            <Button type="button" hierarchy="ghost" size="lg" onClick={onClose} disabled={write.saving} className={TAP}>
              Cancel
            </Button>
            <Button
              type="submit"
              form={formId}
              hierarchy="primary"
              size="lg"
              disabled={write.saving}
              aria-disabled={blocked !== null || undefined}
              aria-describedby={reason ? msgId : undefined}
              className={cn(TAP, blocked !== null && "cursor-not-allowed opacity-60")}
            >
              {write.saving ? "Saving…" : "Save"}
            </Button>
          </div>
        }
      >
        <form id={formId} onSubmit={save} noValidate className="flex flex-col gap-2 pt-4">
          <div className="flex items-baseline justify-between gap-4">
            <label htmlFor={fieldId} className="text-md font-semibold text-text-primary">
              Name
            </label>
            <span aria-hidden className={cn("text-sm tabular-nums text-text-secondary", tooLong && "text-text-error")}>
              {`${lengthOf(name)}/${PROJECT_NAME_MAX}`}
            </span>
          </div>
          <TextInput
            ref={inputRef}
            id={fieldId}
            size="lg"
            value={name}
            onValueChange={setName}
            invalid={shownError !== null}
            aria-invalid={shownError !== null || undefined}
            aria-describedby={msgId}
            autoComplete="off"
            containerClassName={TAP}
          />
          <div id={msgId} aria-live="polite" className="min-h-[20px] text-sm">
            {shownError && <p className="text-text-error">{shownError}</p>}
            {write.failed && <p className="text-text-error">{WRITE_FAILED}</p>}
            {reason && <p className="text-text-secondary">{reason}</p>}
          </div>
        </form>
      </ModalFrame>
      {gate.dialog}
    </>
  );
}
