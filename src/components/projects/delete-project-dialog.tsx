"use client";

// Delete project — the Manage block's one control and the one dialog behind
// it (COR-67…71, owner answer 6).
//
// - The control is owner-only (`can(viewer, "project.delete")`) and absent in
//   Preview as buyer. While `deleteBlockOf(status)` names a reason — NOW only
//   a Listed project — it stays where it is, aria-disabled and in the tab
//   order, with the reason beside it and named by aria-describedby; pressing
//   it opens nothing.
// - The dialog lists what goes and what stays (deletePlanOf) and asks for the
//   typed project name only when editor work, a mint record or a network would
//   be lost. Cancel has the focus; the destructive button reads Delete project.
// - Confirm queues "Deleted “{name}”" for My projects, then deletes and
//   navigates in one transition, so this page never renders "We couldn't find
//   this project" on the way out.

import * as React from "react";
import { useRouter } from "next/navigation";
import { Delete02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { ConfirmDialog, TextInput } from "@/components/ideeza";
import type { StoredDraft } from "@/lib/brief/project-brief";
import { useCreateHistory } from "@/lib/create/history";
import { deletePlanOf, matchesTypedName } from "@/lib/manual/delete-plan";
import { editorWorkOf } from "@/lib/manual/editor-work";
import { can, deleteBlockOf, type Viewer } from "@/lib/manual/permissions";
import type { BuildRef } from "@/lib/manual/project-read";
import type { ProjectStatus } from "@/lib/manual/project-summary";
import { useManualProjects, type ManualProject } from "@/lib/manual/projects";
import { readNetwork } from "@/lib/network/store";
import { cn } from "@/lib/utils";
import { setProjectNotice } from "./project-notice";

export type DeleteProjectControlProps = {
  project: ManualProject;
  viewer: Viewer;
  /** The page's status (summary.status); undefined until the brief draft is read. */
  status: ProjectStatus | undefined;
  /** The project's brief draft as the page read it. */
  draft: StoredDraft | null;
  /** summary.showcase !== null */
  showcased: boolean;
  /** summary.productCount */
  productCount: number;
  /** buildsOf(project, builds) — the page's refs */
  refs: BuildRef[];
};

export function DeleteProjectControl(props: DeleteProjectControlProps) {
  const { viewer, status } = props;
  const [open, setOpen] = React.useState(false);
  const reasonId = React.useId();
  if (!can(viewer, "project.delete")) return null;
  // Phase 2 §3.8.4 takes the facts; until deleteFactsOf(view) lands (T10, T19),
  // the v1 page knows only its status, so a Listed project is the one block.
  const block =
    status === undefined
      ? null
      : deleteBlockOf({
          marketUnreadable: false,
          sold: { sharePct: 0, editions: 0 },
          auction: null,
          listed: status === "listed" || status === "paused",
          otherOwners: [],
        });
  const unavailable = status === undefined || block !== null;
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
        </div>
      )}
      {open && status !== undefined && (
        <DeleteProjectDialog {...props} status={status} onClose={() => setOpen(false)} />
      )}
    </div>
  );
}

type DeleteProjectDialogProps = Omit<DeleteProjectControlProps, "viewer" | "status"> & {
  status: ProjectStatus;
  onClose: () => void;
};

function DeleteProjectDialog({
  project,
  status,
  draft,
  showcased,
  productCount,
  refs,
  onClose,
}: DeleteProjectDialogProps) {
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

  // Read when the dialog opens: the editor docs and the network are in this
  // browser's storage, not in the page's derivation.
  const plan = React.useMemo(() => {
    const live = refs.filter((r) => r.job !== null);
    const known = new Set(chats.map((c) => c.id));
    const keptChats = new Set(
      live.flatMap((r) => (r.chatId && known.has(r.chatId) ? [r.chatId] : [])),
    );
    const network = readNetwork(project.id);
    return deletePlanOf({
      status,
      draft,
      products: productCount,
      work: editorWorkOf(project.id),
      network: network ? { links: network.links.length } : null,
      showcased,
      builds: live.length,
      chats: keptChats.size,
    });
  }, [project.id, status, draft, productCount, showcased, refs, chats]);

  const matched = !plan.typed || matchesTypedName(entry, name);
  const mismatch = plan.typed && tried && !matched;

  const confirm = () => {
    if (pending) return;
    if (!matched) {
      setTried(true);
      fieldRef.current?.focus();
      return;
    }
    setProjectNotice(`Deleted “${name}”`);
    // One transition: the record goes as /projects arrives.
    startTransition(() => {
      deleteProject(project.id);
      router.replace("/projects");
    });
  };

  return (
    <ConfirmDialog
      open
      title={`Delete “${name}”?`}
      confirmLabel={pending ? "Deleting…" : "Delete project"}
      confirmUnavailable={!matched || pending}
      onConfirm={confirm}
      onCancel={() => {
        if (!pending) onClose();
      }}
    >
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
            {mismatch ? `That doesn't match “${name}”.` : ""}
          </p>
        </div>
      )}
    </ConfirmDialog>
  );
}
