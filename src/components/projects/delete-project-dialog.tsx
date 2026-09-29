"use client";

// Delete project — the Manage block's one control and the one dialog behind
// it (COR-67…71, owner answer 6; Phase 2 §3.8.4).
//
// - The control is owner-only (`can(viewer, "project.delete")`) and absent in
//   Preview as buyer. `deleteBlockOf(view.deleteFacts)` (§3.8.4) names the
//   first rule that applies — unreadable market records, a sale, a live
//   auction, a live or paused listing, or a co-owner's share — and while it
//   does, the control stays where it is, aria-disabled and in the tab order,
//   with the reason and detail beside it, named by aria-describedby; pressing
//   it opens nothing. The otherOwners case also carries a quiet "Open
//   Contributors" link that selects the Contributors tab (P2-CONTRIB-14).
// - The dialog lists what goes and what stays (deletePlanOf) and asks for the
//   typed project name only when editor work, a mint record or a network would
//   be lost. The editor work is every swept row's (`editorWorkOfProject`),
//   each product named once more than one has work, and the activity history
//   is counted. Cancel has the focus; the destructive button
//   reads Delete project.
// - Confirm re-reads the delete gate from storage first: a sale, listing or
//   co-owner that arrived while the dialog was open blocks it there, with the
//   reason said in the dialog. Otherwise it queues "Deleted "{name}"" for My
//   projects, then deletes and navigates in one transition, so this page never
//   renders "We couldn't find this project" on the way out.

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Delete02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Banner, ConfirmDialog, TextInput } from "@/components/ideeza";
import type { StoredDraft } from "@/lib/brief/project-brief";
import { useCreateHistory } from "@/lib/create/history";
import { parseStored, readStoredKey } from "@/lib/key-store";
import { readMarketNow } from "@/lib/market/market-store";
import { deletePlanOf, matchesTypedName } from "@/lib/manual/delete-plan";
import { editorWorkOfProject } from "@/lib/manual/editor-work";
import { readJourney } from "@/lib/manual/journey-store";
import { can, deleteBlockOf, type DeleteBlock, type Viewer } from "@/lib/manual/permissions";
import { deleteFactsOf, type ProjectView } from "@/lib/manual/project-read";
import { withTab } from "@/lib/manual/project-route";
import { projectSummary } from "@/lib/manual/project-summary";
import { normalizeProjects, PROJECTS_KEY, useManualProjects, type ManualProject } from "@/lib/manual/projects";
import { readNetwork } from "@/lib/network/store";
import { cn } from "@/lib/utils";
import { setProjectNotice } from "./project-notice";

export type DeleteProjectControlProps = {
  project: ManualProject;
  viewer: Viewer;
  /** The page's one derivation — §3.8.4's facts (`view.deleteFacts`) and every other fact the
   *  dialog reads (mint, summary). */
  view: ProjectView;
  /** The project's brief draft as the page read it. */
  draft: StoredDraft | null;
};

export function DeleteProjectControl({ project, viewer, view, draft }: DeleteProjectControlProps) {
  const pathname = usePathname();
  const search = useSearchParams();
  const [open, setOpen] = React.useState(false);
  const reasonId = React.useId();
  if (!can(viewer, "project.delete")) return null;
  // §3.8.4: the first rule that applies, from the page's one derivation — no
  // second reading of the market or the roster here.
  const block = deleteBlockOf(view.deleteFacts);
  const unavailable = block !== null;
  const openContributors = () => {
    const qs = withTab(search.toString(), block!.link!.tab);
    window.history.pushState(null, "", qs ? `${pathname}?${qs}` : pathname);
  };
  return (
    <div className="flex flex-col items-start gap-[8px]">
      <button
        type="button"
        onClick={() => {
          if (!unavailable) setOpen(true);
        }}
        aria-disabled={unavailable || undefined}
        aria-describedby={block ? reasonId : undefined}
        aria-haspopup="dialog"
        className={cn(
          "inline-flex min-h-[40px] items-center gap-[8px] rounded-lg border border-solid border-border bg-bg-surface px-[14px] text-sm font-semibold outline-none transition-colors duration-normal ease-decelerate focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none [@media(pointer:coarse)]:min-h-[var(--touch-min)]",
          unavailable
            ? "cursor-not-allowed text-text-disabled"
            : "text-text-error hover:border-border-error hover:bg-bg-error-subtle",
        )}
      >
        <Icon icon={Delete02Icon} size={16} />
        Delete project…
      </button>
      {block && (
        <div id={reasonId} className="max-w-[40ch] text-sm leading-relaxed">
          <p className="font-medium text-text-primary">{block.reason}</p>
          <p className="text-text-secondary">{block.detail}</p>
          {block.link && (
            <button
              type="button"
              onClick={openContributors}
              className="mt-1 rounded-sm text-text-primary underline decoration-border-strong underline-offset-2 outline-none transition-colors duration-normal ease-decelerate hover:decoration-current focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              {block.link.label}
            </button>
          )}
        </div>
      )}
      {open && (
        <DeleteProjectDialog project={project} view={view} draft={draft} onClose={() => setOpen(false)} />
      )}
    </div>
  );
}

type DeleteProjectDialogProps = {
  project: ManualProject;
  view: ProjectView;
  draft: StoredDraft | null;
  onClose: () => void;
};

/** The stored projects, as another tab may have left them; null when unreadable. */
function storedProject(id: string): ManualProject | null {
  const parsed = parseStored(readStoredKey(PROJECTS_KEY));
  if (parsed.unreadable) return null;
  return normalizeProjects(parsed.value ?? []).find((p) => p.id === id) ?? null;
}

/** §3.8.4 over what is stored now, not what the page last rendered: the market
 *  and the record, in memory and in storage — either one blocking blocks. */
function deleteBlockNow(project: ManualProject, view: ProjectView, draft: StoredDraft | null): DeleteBlock | null {
  const market = readMarketNow();
  const builds = view.refs.flatMap((r) => (r.job ? [r.job] : []));
  const now = Date.now();
  const records = [project, storedProject(project.id)].filter((p): p is ManualProject => p !== null);
  for (const p of records) {
    const summary = projectSummary(p, { builds, brief: draft, videoJobs: [], now, market });
    const block = deleteBlockOf(
      deleteFactsOf({
        ...view,
        listing: summary.listing,
        sales: market.sales.filter((s) => s.projectId === p.id),
        ownership: summary.ownership,
        marketUnreadable: market.unreadable,
      }),
    );
    if (block) return block;
  }
  return null;
}

function DeleteProjectDialog({ project, view, draft, onClose }: DeleteProjectDialogProps) {
  const router = useRouter();
  const { deleteProject } = useManualProjects();
  const { chats } = useCreateHistory();
  const [entry, setEntry] = React.useState("");
  const [tried, setTried] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const fieldRef = React.useRef<HTMLInputElement>(null);
  const fieldId = React.useId();
  const errorId = React.useId();
  const name = project.name.trim();
  const status = view.summary.status;

  // Read when the dialog opens: the editor docs, the network, the activity
  // history and the marketplace's ended listings are in this browser's
  // storage, not in the page's derivation.
  const plan = React.useMemo(() => {
    const live = view.refs.filter((r) => r.job !== null);
    const known = new Set(chats.map((c) => c.id));
    const keptChats = new Set(
      live.flatMap((r) => (r.chatId && known.has(r.chatId) ? [r.chatId] : [])),
    );
    const network = readNetwork(project.id);
    // P2-LISTING-19: only removed or closed listings are left once delete is
    // offered (a live or paused one already blocks it) — they're deletable,
    // and the sweep drops them (dropProjectListings).
    const endedListings = readMarketNow().listings.filter(
      (l) => l.projectId === project.id && (l.status === "removed" || l.status === "closed"),
    ).length;
    // P2-CONTRIB-15: the contributors a co-owner's share doesn't already
    // cover — viewers, editors, and any co-owner whose share came back to 0.
    const contributors = (project.contributors ?? []).filter((c) => !(c.role === "coOwner" && c.share > 0)).length;
    // The sweep deletes the scoped documents of every row it names, so the
    // plan reads every one of them — not just the virtual first row.
    const journey = readJourney(project.id);
    return deletePlanOf({
      status,
      draft,
      products: view.summary.productCount,
      rows: editorWorkOfProject(project),
      network: network ? { links: network.links.length } : null,
      showcased: view.summary.showcase !== null,
      builds: live.length,
      chats: keptChats.size,
      contributors,
      activity: {
        entries: journey.activities.length,
        files: journey.activities.reduce((n, a) => n + a.media.length, 0),
      },
      endedListings,
      mint: view.mint.status,
    });
  }, [project, status, draft, view.summary.productCount, view.summary.showcase, view.refs, view.mint.status, chats]);

  // §3.8.4 again at confirm: a sale, a listing or a co-owner that arrived
  // while the dialog was open (another tab included) still blocks the delete.
  const liveBlock = deleteBlockOf(view.deleteFacts);
  const [lateBlock, setLateBlock] = React.useState<DeleteBlock | null>(null);
  const block = liveBlock ?? lateBlock;

  const matched = !plan.typed || matchesTypedName(entry, name);
  const mismatch = plan.typed && tried && !matched;

  const confirm = () => {
    if (pending || block) return;
    if (!matched) {
      setTried(true);
      fieldRef.current?.focus();
      return;
    }
    const now = deleteBlockNow(project, view, draft);
    if (now) {
      setLateBlock(now);
      return;
    }
    setProjectNotice(`Deleted "${name}"`);
    // One transition: the record goes as /projects arrives.
    startTransition(() => {
      deleteProject(project.id);
      router.replace("/projects");
    });
  };

  return (
    <ConfirmDialog
      open
      title={`Delete "${name}"?`}
      confirmLabel={pending ? "Deleting…" : "Delete project"}
      confirmUnavailable={!matched || pending || block !== null}
      onConfirm={confirm}
      onCancel={() => {
        if (!pending) onClose();
      }}
    >
      {/* Always on the page, so a block that arrives while it is open is read. */}
      <div aria-live="polite">
        {block && (
          <Banner tone="attention" title={block.reason} className="mb-[16px]">
            {block.detail}
          </Banner>
        )}
      </div>
      <h3 className="font-semibold text-text-primary">What goes</h3>
      {/* No role="list" on these: reset.css strips the bullets and the indent
          from ul[role="list"], and a bulleted list keeps its semantics. */}
      <ul className="mt-[4px] flex list-disc flex-col gap-[2px] pl-[20px]">
        {plan.goes.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {plan.minted && <p className="mt-[8px]">{plan.minted}</p>}
      <h3 className="mt-[16px] font-semibold text-text-primary">What stays</h3>
      <ul className="mt-[4px] flex list-disc flex-col gap-[2px] pl-[20px]">
        {plan.stays.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {plan.typed && (
        <div className="mt-[16px]">
          <label htmlFor={fieldId} className="block font-medium text-text-primary">
            Type the project name to confirm
          </label>
          <TextInput
            ref={fieldRef}
            id={fieldId}
            size="xl"
            value={entry}
            onValueChange={(v) => {
              setEntry(v);
              setTried(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                confirm();
              }
            }}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            invalid={mismatch}
            aria-invalid={mismatch || undefined}
            aria-describedby={errorId}
            containerClassName="mt-[6px]"
          />
          {/* Always on the page, so the polite region speaks when it fills. */}
          <p id={errorId} aria-live="polite" className="mt-[6px] min-h-[20px] text-text-error">
            {mismatch ? `That doesn't match "${name}".` : ""}
          </p>
        </div>
      )}
    </ConfirmDialog>
  );
}
