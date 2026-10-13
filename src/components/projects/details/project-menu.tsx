"use client";

// The project's ⋯ menu (owner, 2026-10-11: "the project has no three-dot
// actions"). Every action on the project itself, in one place beside "Earn
// from this project", owner-only and absent in a preview (PPL-6):
// - Edit name and description — the one editor for both (edit-details.tsx);
// - Share to Innovations / View post — what Showcase was: a flag that puts
//   the project on the Innovations page for this browser (no sale, no wallet).
//   On a Draft it reads "Mint it first · Go to mint" and opens the mint
//   (owner, 2026-10-12: never a greyed item that leaves the maker guessing);
//   sharing first runs the
//   videos-and-ownership gate (P2-VIDEO-15), opening the ReadinessDialog when
//   something is missing. Once shared it opens the post, where Edit post and
//   Stop sharing live (plan D8, 2026-10-13);
// - Activity — the phase-and-status notes drawer (P2-TABS-5), with its count;
// - Delete project… — set apart at the end, in the error colour. While a rule
//   blocks it (§3.8.4: a sale, an auction, a listing, a co-owner) it stays in
//   the menu, aria-disabled, with the reason under it.
//
// A menu button (WAI-ARIA APG): Enter, Space or ↓ opens it on the first item,
// ↑ on the last; ↑ ↓ Home End move; Escape and Tab close it, Escape back to ⋯;
// a press outside closes it. An item that opens a dialog first puts focus on
// ⋯, so the dialog hands focus back there.

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Activity01Icon,
  Delete02Icon,
  MoreHorizontalIcon,
  News01Icon,
  PencilEdit01Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { IconButton } from "@/components/ideeza";
import { DeleteProjectDialog } from "@/components/projects/delete-project-dialog";
import { activitiesFor } from "@/lib/manual/journey";
import { useJourney } from "@/lib/manual/journey-store";
import { isPreview } from "@/lib/manual/buyer-preview";
import { earnMintHref } from "@/lib/manual/earn-route";
import { can, deleteBlockOf } from "@/lib/manual/permissions";
import { formatDate } from "@/lib/manual/project-summary";
import { useManualProjects } from "@/lib/manual/projects";
import { outcomeView } from "@/lib/manual/rail-copy";
import { shareAnnouncement } from "@/lib/manual/showcase-copy";
import { mineSlugOf, postHref } from "@/lib/innovations/slug";
import { cn } from "@/lib/utils";
import { ActivityDrawer } from "./activity/drawer";
import { ShareDialog } from "../share-dialog";
import type { SlotProps } from "./slots";

type Item = {
  id: string;
  label: string;
  sub?: string;
  icon: Parameters<typeof Icon>[0]["icon"];
  danger?: boolean;
  /** Why it can't be used right now: it stays, aria-disabled, with this under it. */
  unavailable?: string;
  run?: () => void;
};

export function ProjectMenu({
  project,
  view,
  viewer,
  brief,
  now,
  announce,
  canEdit,
  onEdit,
  triggerRef,
}: SlotProps & {
  canEdit: boolean;
  onEdit: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const router = useRouter();
  const { setShowcase } = useManualProjects();
  const { record } = useJourney(project.id);
  const [open, setOpen] = React.useState(false);
  const [layer, setLayer] = React.useState<"activity" | "share" | "delete" | null>(null);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const menuId = React.useId();

  const products = React.useMemo(() => view.products.map((p) => ({ id: p.id, name: p.name })), [view.products]);
  const activityCount = activitiesFor(record, {}).length;

  // Sharing: what Showcase was. Null on a Draft (the Brief's minted rule decides first).
  const readiness = view.videos.readiness.showcase;
  const shareCopy = outcomeView(view.commerce, view.summary, readiness).minted?.showcase ?? null;
  const shared = view.summary.showcase;
  // A Draft's item opens the mint; a project sold in full doesn't show it.
  const canShare = can(viewer, "project.showcase", view.canCtx);
  const shareShown = canShare || (shareCopy === null && view.lock === null && can(viewer, "facts.seeOwnerOnly"));
  const block = deleteBlockOf(view.deleteFacts);

  // Always the share dialog: the videos, then the post's story and status (owner, 2026-10-12).
  // Once shared, the post's own controls (Edit post, Stop sharing) live on the post (plan D8).
  const share = () => setLayer("share");

  const items: Item[][] = [
    [
      ...(canEdit ? [{ id: "edit", label: "Edit name and description", icon: PencilEdit01Icon, run: onEdit }] : []),
      ...(shareShown
        ? [
            shared
              ? {
                  id: "share",
                  label: "View post",
                  sub: `On Innovations since ${formatDate(shared.at)}`,
                  icon: News01Icon,
                  run: () => router.push(postHref(mineSlugOf(project))),
                }
              : {
                  id: "share",
                  label: "Share to Innovations",
                  sub: shareCopy ? "Show it on the Innovations page" : "Mint it first · Go to mint",
                  icon: News01Icon,
                  run: shareCopy ? share : () => router.push(earnMintHref(project.id, "save")),
                },
          ]
        : []),
      {
        id: "activity",
        label: "Activity",
        sub: activityCount === 0 ? "Notes on its phase and status" : `${activityCount} ${activityCount === 1 ? "note" : "notes"}`,
        icon: Activity01Icon,
        run: () => setLayer("activity"),
      },
    ],
    can(viewer, "project.delete")
      ? [
          {
            id: "delete",
            label: "Delete project…",
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

  // A press outside closes it.
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
        aria-label="Project actions"
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
          aria-label="Project actions"
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
          className="absolute right-0 top-full z-popover mt-2 flex [@container(min-width:480px)]:left-0 [@container(min-width:480px)]:right-auto [@container(min-width:720px)]:left-auto [@container(min-width:720px)]:right-0 w-[min(300px,calc(100vw-32px))] flex-col rounded-xl border border-solid border-border bg-bg-surface py-2 shadow-3 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-fast"
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
                    item.run?.();
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      <ActivityDrawer
        open={layer === "activity"}
        onClose={() => {
          setLayer(null);
          requestAnimationFrame(() => {
            const at = document.activeElement;
            if (!at || at === document.body) triggerRef.current?.focus();
          });
        }}
        projectId={project.id}
        products={products}
        canWrite={can(viewer, "activity.write", view.canCtx)}
        isPreview={isPreview(viewer)}
        announce={announce}
        now={now}
      />
      {layer === "share" && (
        <ShareDialog
          project={project}
          view={view}
          brief={brief}
          onShared={(post) => {
            setShowcase(project.id, true, undefined, post);
            announce(shareAnnouncement(true, project.name));
            setLayer(null);
          }}
          onClose={() => {
            setLayer(null);
            triggerRef.current?.focus();
          }}
        />
      )}
      {layer === "delete" && (
        <DeleteProjectDialog
          project={project}
          view={view}
          draft={brief}
          onClose={() => {
            setLayer(null);
            triggerRef.current?.focus();
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
        <span className={cn("text-md font-medium leading-md", off ? "text-text-disabled" : item.danger ? "text-text-error" : "text-text-primary")}>
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
