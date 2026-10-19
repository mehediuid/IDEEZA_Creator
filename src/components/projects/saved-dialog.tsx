"use client";

// SavedDialog — what a save says, where the maker pressed Save (owner,
// 2026-10-19: Save jumped straight to the project page, which felt abrupt).
// The maker stays put and picks where to go next:
//
// - View project (primary): the project page, where Publish keeps a Draft
//   private, gives it away or sells it. Publish is never offered here — it
//   has one home — the dialog only says where it is (PUBLISH_LINE).
// - The way back to where Save was pressed — Keep editing in the editors,
//   Back to chat (or Back to the build) in the AI flow. ✕, Esc and the scrim
//   do the same.
// - Back to Home, quiet, on the left.
//
// The project's row (cover, name, status chip, products and the time of the
// save) says what was saved. In the editors, a product still "Not named yet"
// gets a Name it nudge that opens the editor's name field.
//
// SaveFailedDialog is the editors' refusal: the board or the project record
// wasn't kept (storage full or blocked), with Try again.
//
// Both sit in the shared ModalFrame (focus in, Tab kept inside, focus back to
// the opener).

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Banner, Button, ModalFrame } from "@/components/ideeza";
import { StatusChip } from "@/components/projects/status-chip";
import { useProjectBrief } from "@/lib/brief/project-brief";
import { useCreateHistory } from "@/lib/create/history";
import { buildsOf, coverOf, productRowsOf } from "@/lib/manual/project-read";
import { STATUS_WORD, projectStatus } from "@/lib/manual/project-summary";
import type { ManualProject } from "@/lib/manual/projects";
import { savedNoticeOf, type SavedKind } from "@/lib/manual/save-step";
import { listingViewOf } from "@/lib/market/listing";
import { useMarket } from "@/lib/market/market-store";
import type { ListingMetadata } from "@/lib/market/types";
import { cn } from "@/lib/utils";

/** Every control in these dialogs is at least 44 px tall: they are always under 640 px wide. */
const TOUCH = "min-h-[var(--touch-min)]";
const NO_METADATA: ListingMetadata = { name: "", description: "", products: [], cover: null, at: 0 };

function countLabel(n: number): string {
  return `${n} product${n === 1 ? "" : "s"}`;
}

/** A project as one row: its cover, name and a line under it, with an optional control.
 *  The save step's join target and the saved dialog's summary. */
export function ProjectRow({
  project,
  cover,
  meta,
  chip,
  action,
}: {
  project: ManualProject;
  cover: string | null;
  meta: string;
  chip?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-6 rounded-xl border border-solid border-border px-6 py-5">
      <div className="size-[48px] shrink-0 overflow-hidden rounded-lg bg-bg-subtle">
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" width={48} height={48} className="size-full object-cover" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-4">
          <p className="min-w-0 truncate text-md font-semibold text-text-primary">{project.name}</p>
          {chip}
        </div>
        <p className="text-sm text-text-secondary">{meta}</p>
      </div>
      {action}
    </div>
  );
}

/** The project's status as its page shows it (the save step and the editors' top bar read it
 *  the same way). */
export function useStatusOf(project: ManualProject) {
  const brief = useProjectBrief(project.id);
  const { data: market } = useMarket();
  const [now] = React.useState(() => Date.now());
  return projectStatus(project, brief ?? null, {
    listing: listingViewOf(project.id, { ...market, now, current: NO_METADATA }),
    sales: market.sales,
  });
}

/** The footer both dialogs share: an optional quiet way out on the left, then the pair. Under
 *  360 px of footer the buttons stack full width, the primary last. */
function Footer({ start, children }: { start?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="w-full [container-type:inline-size]">
      <div className="flex flex-col gap-4 [@container(min-width:360px)]:flex-row [@container(min-width:360px)]:items-center">
        {start}
        <span aria-hidden className="hidden flex-1 [@container(min-width:360px)]:block" />
        {children}
      </div>
    </div>
  );
}

const FOOT_BUTTON = cn(TOUCH, "w-full [@container(min-width:360px)]:w-auto");

export function SavedDialog({
  project,
  kind,
  product = "",
  version = 0,
  savedAt,
  stayLabel,
  onStay,
  onName,
}: {
  project: ManualProject;
  kind: SavedKind;
  /** A join's product names, for its title. */
  product?: string;
  /** A rebuild's version number, for its title. */
  version?: number;
  savedAt: number;
  /** Back to where Save was pressed: "Keep editing", "Back to chat", "Back to the build". */
  stayLabel: string;
  onStay: () => void;
  /** The editor's product is still "Not named yet": Name it closes the dialog and opens its name. */
  onName?: () => void;
}) {
  const router = useRouter();
  const { builds } = useCreateHistory();
  const status = useStatusOf(project);
  const notice = savedNoticeOf(kind, { name: project.name, product, version, draft: status === "draft" });
  const primaryRef = React.useRef<HTMLButtonElement>(null);
  const time = new Date(savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const meta = `${countLabel(productRowsOf(project).length)} · Saved ${time}`;

  return (
    <ModalFrame
      open
      onClose={onStay}
      size="sm"
      title={
        <span className="flex items-center gap-4">
          <span aria-hidden className="inline-flex shrink-0 text-text-success">
            <Icon icon={CheckmarkCircle02Icon} size={22} />
          </span>
          {notice.title}
        </span>
      }
      description={notice.body}
      initialFocus={primaryRef}
      footer={
        <Footer
          start={
            <Button
              type="button"
              hierarchy="ghost"
              size="lg"
              onClick={() => router.push("/")}
              className={cn(FOOT_BUTTON, "[@container(min-width:360px)]:-ml-4")}
            >
              Back to Home
            </Button>
          }
        >
          <Button type="button" hierarchy="secondary" size="lg" onClick={onStay} className={FOOT_BUTTON}>
            {stayLabel}
          </Button>
          <Button
            ref={primaryRef}
            type="button"
            hierarchy="primary"
            size="lg"
            onClick={() => router.push(`/projects/${encodeURIComponent(project.id)}`)}
            className={FOOT_BUTTON}
          >
            View project
          </Button>
        </Footer>
      }
    >
      <div className="flex flex-col gap-8">
        <ProjectRow
          project={project}
          cover={coverOf(project, buildsOf(project, builds))}
          meta={meta}
          chip={<StatusChip status={status} word={STATUS_WORD[status]} />}
        />
        {onName && (
          <Banner
            tone="info"
            action={
              <Button type="button" hierarchy="ghost" size="md" onClick={onName} className={TOUCH}>
                Name it
              </Button>
            }
          >
            Your product is still “Not named yet”.
          </Banner>
        )}
        {notice.publishLine && <p className="text-sm text-text-secondary">{notice.publishLine}</p>}
      </div>
    </ModalFrame>
  );
}

export function SaveFailedDialog({ onStay, onRetry }: { onStay: () => void; onRetry: () => void }) {
  const primaryRef = React.useRef<HTMLButtonElement>(null);
  return (
    <ModalFrame
      open
      onClose={onStay}
      size="sm"
      title="Couldn’t save"
      description="This browser didn’t keep the last change: its storage is full or blocked. Free some space, then try again."
      initialFocus={primaryRef}
      footer={
        <Footer>
          <Button type="button" hierarchy="secondary" size="lg" onClick={onStay} className={FOOT_BUTTON}>
            Keep editing
          </Button>
          <Button ref={primaryRef} type="button" hierarchy="primary" size="lg" onClick={onRetry} className={FOOT_BUTTON}>
            Try again
          </Button>
        </Footer>
      }
    >
      {null}
    </ModalFrame>
  );
}
