"use client";

// The product's ⋯ menu (owner, 2026-10-11: the product page made like the
// project page). Beside Open in editor, owner-only and absent in a preview
// (PPL-6):
// - Edit name and description — the product's one editor for both
//   (edit-product-details.tsx), absent on a locked project;
// - Open chat “…” — the chat this version was built in, while it is in this
//   browser: the build is changed there;
// - Delete product… — set apart at the end, in the error colour
//   (delete-product-dialog.tsx). While a rule blocks it (the project's only
//   product, its copies listed or sold, the Main NFT listed, in an auction
//   or sold) it stays in the menu, aria-disabled, with the reason under it.
// The menu button is the project menu's (WAI-ARIA APG keys, Escape back to ⋯).

import * as React from "react";
import { useRouter } from "next/navigation";
import { BubbleChatIcon, Delete02Icon, MoreHorizontalIcon, PencilEdit01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { IconButton } from "@/components/ideeza";
import { productDeleteBlockOf, productDeleteFactsOf } from "@/lib/manual/delete-plan";
import { can } from "@/lib/manual/permissions";
import { productRowsOf } from "@/lib/manual/project-read";
import { cn } from "@/lib/utils";
import { DeleteProductDialog } from "./delete-product-dialog";
import type { ProductSlotProps } from "./product-slots";

type Item = {
  id: string;
  label: string;
  sub?: string;
  icon: Parameters<typeof Icon>[0]["icon"];
  danger?: boolean;
  /** Why it can't be used right now: it stays, aria-disabled, with this under it. */
  unavailable?: string;
  run: () => void;
};

export function ProductMenu({
  slot,
  chat,
  onEdit,
}: {
  slot: ProductSlotProps;
  /** The chat this version was built in, while this browser has it. */
  chat: { title: string; href: string } | null;
  /** Opens Edit name and description; null when the viewer may not edit the product. */
  onEdit: (() => void) | null;
}) {
  const { project, view, product, viewer } = slot;
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [layer, setLayer] = React.useState<"delete" | null>(null);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const menuId = React.useId();

  const block = productDeleteBlockOf(
    productDeleteFactsOf(
      { products: productRowsOf(project).length, deleteFacts: view.deleteFacts, sales: view.sales, editions: view.editions },
      product.id,
    ),
  );

  const items: Item[][] = [
    [
      ...(onEdit ? [{ id: "edit", label: "Edit name and description", icon: PencilEdit01Icon, run: onEdit }] : []),
      ...(chat
        ? [{ id: "chat", label: `Open chat “${chat.title}”`, sub: "Where it was built — change it there", icon: BubbleChatIcon, run: () => router.push(chat.href) }]
        : []),
    ],
    can(viewer, "product.edit")
      ? [
          {
            id: "delete",
            label: "Delete product…",
            icon: Delete02Icon,
            danger: true,
            unavailable: block?.reason,
            run: () => setLayer("delete"),
          },
        ]
      : [],
  ].filter((g) => g.length > 0);

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
          {items.map((group, gi) => (
            <div key={gi} role="group" className={cn("flex flex-col", gi > 0 && "mt-2 border-t border-solid border-border pt-2")}>
              {group.map((item) => (
                <MenuItem
                  key={item.id}
                  item={item}
                  onRun={() => {
                    // The keyboard waits on ⋯, which each dialog hands it back to.
                    close(true);
                    item.run();
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {layer === "delete" && (
        <DeleteProductDialog
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
  const off = item.unavailable !== undefined;
  const sub = item.unavailable ?? item.sub;
  return (
    <button
      type="button"
      role="menuitem"
      tabIndex={-1}
      aria-disabled={off || undefined}
      aria-describedby={sub ? subId : undefined}
      onClick={() => {
        if (!off) onRun();
      }}
      className={cn(
        "flex min-h-[44px] w-full items-start gap-4 px-5 py-3 text-left outline-none transition-colors duration-fast motion-reduce:transition-none",
        off
          ? "cursor-not-allowed"
          : item.danger
            ? "hover:bg-bg-error-subtle focus-visible:bg-bg-error-subtle"
            : "hover:bg-bg-subtle focus-visible:bg-bg-subtle",
        "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus",
      )}
    >
      <Icon
        icon={item.icon}
        size={18}
        className={cn("mt-[1px] shrink-0", off ? "text-text-disabled" : item.danger ? "text-text-error" : "text-text-secondary")}
      />
      <span className="flex min-w-0 flex-col gap-[2px]">
        <span
          className={cn(
            "break-words text-md font-medium leading-md",
            off ? "text-text-disabled" : item.danger ? "text-text-error" : "text-text-primary",
          )}
        >
          {item.label}
        </span>
        {sub && (
          <span id={subId} className="text-sm leading-sm text-text-secondary">
            {sub}
          </span>
        )}
      </span>
    </button>
  );
}
