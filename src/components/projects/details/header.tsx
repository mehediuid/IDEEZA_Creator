"use client";

// ProjectHeader — the top of /projects/[id] (spec §5.4, §3.3, §3.5).
//
// In reading order: the h1 and its rename pencil; the status chip, the
// Showcase badge when the project is showcased, and the status line; the meta
// line; the description and its editor; the action pair and Preview as buyer;
// the Open in editor hint; then one notice per newer build of a chat that
// isn't saved yet. From a 520 px header the pair and Preview as buyer move up
// beside the title, and wrap under it when the name is long; below that they
// stack full width after the description, primary first. (520, not 640: the
// main column beside the rail is ~634 px at 1366 with the sidebar open, and
// a desktop must not get the phone's full-width buttons.)
//
// Every string above the description is `headerText()`'s (project-summary.ts)
// and the pair is its `pair` — `nextAction()`'s, the same object the My
// projects card shows the first of (COR-11, LST-32). Nothing here derives a
// status, a line or an action of its own. There is no ⋮ and no Share (COR-14),
// and no wallet, owner, stats or people row (COR-15, PPL-3). Showcase is not
// here: its one control on the page is the rail's Outcome block (§3.8, X38).
//
// The h1's arrival focus (COR-7) and the page's one polite live region
// (COR-101) are the shell's (usePageArrival, shell.tsx): `titleRef` and
// `announce` arrive from there through the header slot, and this file adds
// no live region of its own.

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight02Icon, BubbleChatIcon, CpuIcon, EyeIcon } from "@hugeicons/core-free-icons";
import type { IconValue } from "@/components/dashboard/icon";
import { Banner } from "@/components/ideeza";
import { LeaveButton } from "@/components/create/leave-button";
import { ShowcaseChip, StatusChip } from "@/components/projects/status-chip";
import { useManualProjects, type ManualProject } from "@/lib/manual/projects";
import { headerText, type NextAction } from "@/lib/manual/project-summary";
import type { ProjectView } from "@/lib/manual/project-read";
import { can, hasAudience, type Viewer } from "@/lib/manual/permissions";
import { EDITOR_HINT, pendingNoticesOf, type PendingNotice } from "@/lib/manual/project-header";
import { isBuyerPreview, useEnterPreview, useFocusAfterPreview } from "./buyer-preview";
import { ProjectDescription } from "./description-editor";
import { ProjectTitle } from "./title-editor";

/** Preview as buyer's id: Exit preview hands focus back to it (PPL-5). */
export const PREVIEW_TRIGGER_ID = "preview-as-buyer-trigger";

const EDITOR_HINT_ID = "project-editor-hint";

const ACTION_ICON: Record<NextAction["kind"], IconValue> = {
  "review-version": ArrowRight02Icon,
  "continue-brief": ArrowRight02Icon,
  "add-brief": ArrowRight02Icon,
  "view-brief": ArrowRight02Icon,
  "open-editor": CpuIcon,
};

/** Full width and 44 px at phone width (COR-11, PPL-4); their own width from a 520 px header. */
const HEADER_BUTTON = "h-[44px] w-full justify-center [@container(min-width:520px)]:w-auto";

export function ProjectHeader({
  project,
  view,
  viewer,
  titleRef,
  announce,
}: {
  project: ManualProject;
  /** `projectView()` — the page's one derivation (COR-74). */
  view: ProjectView;
  viewer: Viewer;
  /** The shell's h1 ref (COR-7), forwarded to ProjectTitle. */
  titleRef: React.RefObject<HTMLHeadingElement | null>;
  /** The page's one polite live region (COR-101). */
  announce: (message: string) => void;
}) {
  const router = useRouter();
  const { selectProject } = useManualProjects();
  // Which control is taking the maker off the page. Never cleared: the navigation unmounts it.
  const [leaving, setLeaving] = React.useState<string | null>(null);

  const { summary } = view;
  const text = headerText(summary);
  const owner = can(viewer, "facts.seeOwnerOnly");
  const allowed = (a: NextAction) =>
    a.kind === "open-editor" || a.kind === "review-version"
      ? can(viewer, "project.openEditor")
      : can(viewer, "project.brief");
  // Preview as buyer has no pair (§3.5); the header never shows half of one.
  const pair = allowed(text.pair.first) ? text.pair : null;
  const second = pair?.second && allowed(pair.second) ? pair.second : null;
  const preview = can(viewer, "preview.enter") && hasAudience(summary.status, summary.showcase);
  // COR-12: a project with a build opens on a sample board all the same.
  const hint = pair !== null && summary.source.kind !== "hand";
  // A Draft's line is the maker's own workflow ("Brief in progress · …"); a buyer sees the chip alone.
  // A minted line stays — "Listed" never stands without its subline (COR-76).
  const showLine = owner || summary.status !== "draft";
  // A2's PendingBuild ↔ A3's PendingVersion: the header's primary opens `pendingVersion.buildId`.
  const reviewedInHeader =
    pair?.first.kind === "review-version" ? (summary.pendingVersion?.buildId ?? null) : null;
  const notices = owner ? pendingNoticesOf(view.pending, view.lineages, reviewedInHeader) : [];

  const leave = (key: string, href: string) => {
    setLeaving(key);
    // The editor works on the active project; choosing it first skips the workspace's "Opening project…" frame.
    if (href.startsWith("/project/")) selectProject(project.id);
    router.push(href);
  };
  const enterPreview = useEnterPreview();
  // PPL-5: Exit preview hands focus back to this button — or to the h1 when
  // the project offers no preview button of its own (a bare ?view=buyer link).
  useFocusAfterPreview(!isBuyerPreview(viewer), () => document.getElementById(PREVIEW_TRIGGER_ID) ?? titleRef.current);
  const actionButton = (a: NextAction, key: "first" | "second", primary: boolean) => (
    <LeaveButton
      tone={primary ? "primary" : "quiet"}
      busy={leaving === key}
      blocked={leaving !== null}
      onClick={() => leave(key, a.href)}
      icon={ACTION_ICON[a.kind]}
      aria-describedby={hint && a.kind === "open-editor" ? EDITOR_HINT_ID : undefined}
      className={HEADER_BUTTON}
    >
      {a.label}
    </LeaveButton>
  );

  return (
    <header className="flex flex-col gap-8 [container-type:inline-size]">
      <div className="flex flex-col gap-6 [@container(min-width:520px)]:flex-row [@container(min-width:520px)]:flex-wrap [@container(min-width:520px)]:items-center [@container(min-width:520px)]:gap-x-8 [@container(min-width:520px)]:gap-y-4">
        <div className="min-w-0 [@container(min-width:520px)]:order-1 [@container(min-width:520px)]:flex-auto">
          <ProjectTitle
            project={project}
            canRename={can(viewer, "project.rename")}
            announce={announce}
            titleRef={titleRef}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-3 [@container(min-width:520px)]:order-3 [@container(min-width:520px)]:basis-full">
          <p className="flex flex-wrap items-center gap-x-4 gap-y-2 text-md text-text-secondary">
            <StatusChip status={summary.status} word={text.chip.word} />
            {text.chip.badge && <ShowcaseChip />}
            {showLine && (
              <>
                <span aria-hidden className="text-text-tertiary">
                  ·
                </span>
                <span className="min-w-0">{text.chip.line}</span>
              </>
            )}
          </p>
          <p className="text-sm text-text-secondary">
            {text.meta.map((m, i) => (
              <React.Fragment key={i}>
                {i > 0 && " · "}
                {m.kind === "time" ? (
                  <time dateTime={m.time.dateTime} title={m.time.title}>
                    {m.time.text}
                  </time>
                ) : (
                  m.text
                )}
              </React.Fragment>
            ))}
          </p>
          <ProjectDescription project={project} canEdit={can(viewer, "project.editDescription")} announce={announce} />
        </div>

        {(pair || preview) && (
          <div className="flex max-w-full flex-col gap-4 [@container(min-width:520px)]:order-2 [@container(min-width:520px)]:flex-none [@container(min-width:520px)]:flex-row [@container(min-width:520px)]:flex-wrap [@container(min-width:520px)]:items-center">
            {pair && actionButton(pair.first, "first", pair.violet)}
            {second && actionButton(second, "second", false)}
            {preview && (
              <LeaveButton
                id={PREVIEW_TRIGGER_ID}
                tone="quiet"
                busy={false}
                blocked={leaving !== null}
                onClick={enterPreview}
                icon={EyeIcon}
                className={HEADER_BUTTON}
              >
                Preview as buyer
              </LeaveButton>
            )}
          </div>
        )}

        {hint && (
          <p
            id={EDITOR_HINT_ID}
            className="text-sm text-text-secondary [@container(min-width:520px)]:order-4 [@container(min-width:520px)]:basis-full"
          >
            {EDITOR_HINT}
          </p>
        )}
      </div>

      {notices.length > 0 && (
        <div className="flex flex-col gap-4">
          {notices.map((n) => (
            <PendingBanner
              key={n.buildId}
              notice={n}
              busy={leaving === n.buildId}
              blocked={leaving !== null}
              onLeave={(href) => leave(n.buildId, href)}
            />
          ))}
        </div>
      )}
    </header>
  );
}

/** COR-18: a newer build of one chat, not saved yet. The Banner is a polite live
 *  region; what it speaks changes only with `announceKey` (COR-101), while the
 *  visible count follows every finished piece. */
function PendingBanner({
  notice,
  busy,
  blocked,
  onLeave,
}: {
  notice: PendingNotice;
  busy: boolean;
  blocked: boolean;
  onLeave: (href: string) => void;
}) {
  const spoken = useKeyed(notice.text, notice.announceKey);
  const action = notice.action;
  return (
    <Banner
      tone={notice.tone}
      action={
        action ? (
          <LeaveButton
            tone="quiet"
            busy={busy}
            blocked={blocked}
            onClick={() => onLeave(action.href)}
            icon={action.kind === "chat" ? BubbleChatIcon : ArrowRight02Icon}
            className="h-[44px] [@container(min-width:520px)]:h-[40px]"
          >
            {action.label}
          </LeaveButton>
        ) : undefined
      }
    >
      <span aria-hidden>{notice.text}</span>
      <span className="sr-only">{spoken}</span>
    </Banner>
  );
}

/** `text` as it was when `key` last changed. */
function useKeyed(text: string, key: string): string {
  const [held, setHeld] = React.useState({ key, text });
  if (held.key !== key) setHeld({ key, text });
  return held.key === key ? held.text : text;
}
