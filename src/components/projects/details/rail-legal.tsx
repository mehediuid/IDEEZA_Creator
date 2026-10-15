"use client";

// The project's rights (P2-TABS-23; owner, 2026-10-13: "rights are multiple —
// the maker sets as many as they have"): each Patent, Copyright and Trademark
// as the maker typed it — never verified, said plainly in the footnote. The
// owner edits them in Earn › Money › Rights; a buyer reads them in the rail's
// Legal information block, which is absent while there are none (AC3): there
// is nothing to tell a buyer, and no "Add a right" for them to see.
//
// Owner-only editing, inline, never a dialog, so the block stays where it is:
// "Add a right" and each right's Edit open one form in place of the list
// (Save / Cancel; on an existing right, Remove, which asks once more before it
// removes). It asks `can(…, view.canCtx)`, so a project sold in full shows its
// rights and no Edit, and a form that is open when the lock arrives closes.
// `checkRight` and `normalizeLegal` (lib/manual/legal.ts) hold the real
// validation and the stored shape; this file decides what to show and wires
// the write.
//
// A right with a link becomes a button — the same external-link confirm
// P2-TABS-8 gives Activity's link cards (./link-confirm.tsx).

import * as React from "react";
import { Add01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, Segmented, TextInput } from "@/components/ideeza";
import {
  checkRight,
  rightFromInput,
  rightsOf,
  RIGHT_FIELD,
  RIGHT_KINDS,
  RIGHT_LABEL,
  RIGHTS_MAX,
  withoutRight,
  withRight,
  type LegalRight,
  type LegalRightKind,
  type RightInput,
} from "@/lib/manual/legal";
import { WRITE_FAILED } from "@/lib/manual/project-header";
import type { ProjectLegal } from "@/lib/manual/p2-types";
import { can } from "@/lib/manual/permissions";
import { useManualProjects, type ManualProject } from "@/lib/manual/projects";
import { cn } from "@/lib/utils";
import { LinkConfirmDialog } from "./link-confirm";
import { RailBlock, RailFact, RailFacts, useRailStacked } from "./rail-block";
import { RAIL_LINK } from "./rail-versions";
import { useStoreWrite } from "./use-store-write";
import type { SlotProps } from "./slots";

const FOOTNOTE = "As stated by you — not verified.";

/** A small text action beside a right: 44 px tall at phone width and on a coarse pointer. */
const ROW_ACTION =
  "inline-flex min-h-[32px] items-center rounded-sm text-md font-medium text-text-brand outline-none hover:text-text-brand-hover focus-visible:ring-2 focus-visible:ring-border-focus max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

export type LegalRow = { id: string; label: string; lines: string[]; url?: string };

/**
 * The rights as rows, in the order they were added: the kind as the label, the number or
 * words, and a trademark's attorney on its own line. Exported so every reader of the rights —
 * Earn › Money and the buyer's rail — shows them the same way.
 */
export function legalRows(legal: ProjectLegal | undefined): LegalRow[] {
  return rightsOf(legal).map((r) => ({
    id: r.id,
    label: RIGHT_LABEL[r.kind],
    lines: [r.text, ...(r.attorney ? [`Attorney: ${r.attorney}`] : [])].filter(Boolean),
    url: r.url,
  }));
}

export function RailLegal({ project, view, viewer, announce }: SlotProps) {
  const editable = can(viewer, "legal.edit", view.canCtx);
  const rows = legalRows(project.legal);
  if (!editable && rows.length === 0) return null;
  return (
    <RailBlock title="Legal information">
      {/* A child of RailBlock, so useRailStacked reads the layout it just set. */}
      <LegalBody project={project} editable={editable} rows={rows} announce={announce} />
    </RailBlock>
  );
}

/** What the form is open on: a new right, or the right with this id. */
type Editing = { kind: "new" } | { kind: "edit"; id: string };

/** The block's body, also Earn › Money › Rights' (under a RailStackScope there). */
export function LegalBody({
  project,
  editable,
  rows,
  announce,
}: {
  project: ManualProject;
  editable: boolean;
  rows: LegalRow[];
  announce: (message: string) => void;
}) {
  const stacked = useRailStacked();
  const [editing, setEditing] = React.useState<Editing | null>(null);
  const [linkUrl, setLinkUrl] = React.useState<string | null>(null);
  const addRef = React.useRef<HTMLButtonElement>(null);
  const editRefs = React.useRef(new Map<string, HTMLButtonElement>());
  const rights = rightsOf(project.legal);
  const full = rights.length >= RIGHTS_MAX;

  // Focus goes back to what opened the form; after a remove, to "Add a right".
  const close = (focusId?: string) => {
    setEditing(null);
    requestAnimationFrame(() => (focusId ? editRefs.current.get(focusId) : addRef.current)?.focus());
  };

  const open = editing && editable ? editing : null;
  const right = open?.kind === "edit" ? (rights.find((r) => r.id === open.id) ?? null) : null;

  return (
    <>
      {open && (open.kind === "new" || right) ? (
        <RightForm
          project={project}
          right={right}
          onDone={(message, focusId) => {
            announce(message);
            close(focusId);
          }}
          onCancel={() => close(right?.id)}
        />
      ) : (
        <>
          {rows.length > 0 && (
            <>
              <RailFacts>
                {rows.map((row) => (
                  <RailFact key={row.id} label={row.label}>
                    <LegalRowValue row={row} onOpenLink={setLinkUrl} />
                    {editable && (
                      <button
                        ref={(el) => {
                          if (el) editRefs.current.set(row.id, el);
                          else editRefs.current.delete(row.id);
                        }}
                        type="button"
                        onClick={() => setEditing({ kind: "edit", id: row.id })}
                        aria-label={`Edit ${row.label.toLowerCase()} ${row.lines[0] ?? ""}`.trim()}
                        className={cn(ROW_ACTION, "mt-1")}
                      >
                        Edit
                      </button>
                    )}
                  </RailFact>
                ))}
              </RailFacts>
              <p className="text-sm leading-sm text-text-tertiary">{FOOTNOTE}</p>
            </>
          )}
          {/* Only the owner edits, and the owner reads these in Earn › Money › Rights, whose
              lead line says what they are: an empty one is that line and this one action. */}
          {editable &&
            (full ? (
              <p className="text-md text-text-secondary">{`That's ${RIGHTS_MAX} rights, the most a project holds. Edit or remove one to add another.`}</p>
            ) : (
              <Button
                ref={addRef}
                type="button"
                hierarchy="secondary"
                size="md"
                iconLeading={<Icon icon={Add01Icon} size={16} />}
                onClick={() => setEditing({ kind: "new" })}
                className={cn("self-start", stacked && "min-h-[var(--touch-min)]", "[@media(pointer:coarse)]:min-h-[var(--touch-min)]")}
              >
                Add a right
              </Button>
            ))}
        </>
      )}
      {linkUrl && <LinkConfirmDialog url={linkUrl} onClose={() => setLinkUrl(null)} />}
    </>
  );
}

function LegalRowValue({ row, onOpenLink }: { row: LegalRow; onOpenLink: (url: string) => void }) {
  const body = (
    <span className="block break-words">
      {row.lines.map((line, i) => (
        <span key={i} className="block">
          {line}
        </span>
      ))}
    </span>
  );
  const { url } = row;
  if (!url) return body;
  return (
    <button type="button" onClick={() => onOpenLink(url)} className={cn(RAIL_LINK, "block text-left")}>
      {body}
    </button>
  );
}

function bareLegal(l: ProjectLegal | undefined): string {
  return l ? JSON.stringify(l.rights) : "";
}

function newRightId(): string {
  return `right_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

const KIND_OPTIONS = RIGHT_KINDS.map((k) => ({ value: k, label: RIGHT_LABEL[k] }));

/** One right's form: a new one, or `right` to change or remove. */
function RightForm({
  project,
  right,
  onDone,
  onCancel,
}: {
  project: ManualProject;
  right: LegalRight | null;
  onDone: (message: string, focusId?: string) => void;
  onCancel: () => void;
}) {
  const { setLegal } = useManualProjects();
  const [id] = React.useState(() => right?.id ?? newRightId());
  const [input, setInput] = React.useState<RightInput>({
    kind: right?.kind ?? "patent",
    text: right?.text ?? "",
    url: right?.url ?? "",
    attorney: right?.attorney ?? "",
  });
  const [tried, setTried] = React.useState(false);
  const [confirmRemove, setConfirmRemove] = React.useState(false);
  // What the write must leave in the store, and what to say once it has.
  const [pending, setPending] = React.useState<{ snapshot: string; message: string; focusId?: string } | null>(null);
  const textRef = React.useRef<HTMLInputElement>(null);
  const keepRef = React.useRef<HTMLButtonElement>(null);
  const headingId = React.useId();

  React.useEffect(() => {
    textRef.current?.focus();
  }, []);
  React.useEffect(() => {
    if (confirmRemove) keepRef.current?.focus();
  }, [confirmRemove]);

  const check = checkRight(input);
  const write = useStoreWrite(pending !== null && bareLegal(project.legal) === pending.snapshot, () =>
    onDone(pending?.message ?? "", pending?.focusId),
  );
  const field = (key: keyof Omit<RightInput, "kind">) => (value: string) => setInput((s) => ({ ...s, [key]: value }));
  const label = RIGHT_FIELD[input.kind];

  const commit = (next: ProjectLegal | undefined, message: string, focusId?: string) => {
    const snapshot = bareLegal(next);
    if (snapshot === bareLegal(project.legal)) {
      // Saving it back the way it already reads: nothing to settle, nothing to say.
      onCancel();
      return;
    }
    setPending({ snapshot, message, focusId });
    write.start();
    setLegal(project.id, next ?? null);
  };

  const save = () => {
    if (write.saving) return;
    if (!check.ok) {
      setTried(true);
      return;
    }
    const next = withRight(project.legal, rightFromInput(id, input), Date.now());
    commit(next, right ? "Right saved" : "Right added", id);
  };

  const remove = () => {
    if (write.saving || !right) return;
    commit(withoutRight(project.legal, right.id, Date.now()), "Right removed");
  };

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-5">
      <h3 id={headingId} className="m-0 text-md font-semibold text-text-primary">
        {right ? `Edit ${RIGHT_LABEL[right.kind].toLowerCase()}` : "Add a right"}
      </h3>
      <div className="flex flex-col gap-[6px]">
        <span className="text-md font-medium text-text-primary">Type</span>
        <Segmented<LegalRightKind>
          label="Type of right"
          value={input.kind}
          options={KIND_OPTIONS}
          onChange={(kind) => setInput((s) => ({ ...s, kind }))}
          disabled={write.saving}
          className="self-start"
        />
      </div>
      <RightField
        inputRef={textRef}
        label={label.label}
        value={input.text}
        onChange={field("text")}
        error={tried ? check.text : null}
        placeholder={label.example}
      />
      {input.kind === "trademark" && (
        <RightField
          label="Attorney name (optional)"
          value={input.attorney}
          onChange={field("attorney")}
          error={tried ? check.attorney : null}
        />
      )}
      <RightField
        label="Link (optional)"
        value={input.url}
        onChange={field("url")}
        error={tried ? check.url : null}
        placeholder="https://"
      />
      {confirmRemove && right ? (
        <div role="group" aria-label="Remove this right" className="flex flex-col gap-4">
          <p className="m-0 text-md text-text-primary">{`Remove this ${RIGHT_LABEL[right.kind].toLowerCase()}? Buyers won't see it any more.`}</p>
          <div className="flex flex-wrap items-center gap-4">
            <Button type="button" hierarchy="danger" size="lg" onClick={remove} disabled={write.saving}>
              {write.saving ? "Removing…" : "Remove"}
            </Button>
            <Button ref={keepRef} type="button" hierarchy="ghost" size="lg" onClick={() => setConfirmRemove(false)} disabled={write.saving}>
              Keep it
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-4">
          <Button type="button" hierarchy="secondary" size="lg" onClick={save} disabled={write.saving}>
            {write.saving ? "Saving…" : "Save"}
          </Button>
          <Button type="button" hierarchy="ghost" size="lg" onClick={onCancel} disabled={write.saving}>
            Cancel
          </Button>
          {right && (
            <Button
              type="button"
              hierarchy="ghost"
              size="lg"
              onClick={() => setConfirmRemove(true)}
              disabled={write.saving}
              className="ml-auto text-[color:var(--color-text-error)]"
            >
              Remove
            </Button>
          )}
        </div>
      )}
      {write.failed && <p className="text-md text-text-error">{WRITE_FAILED}</p>}
    </section>
  );
}

function RightField({
  label,
  value,
  onChange,
  error,
  placeholder,
  inputRef,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error: string | null;
  placeholder?: string;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  const fieldId = React.useId();
  const errorId = React.useId();
  return (
    <div className="flex flex-col gap-[6px]">
      <label htmlFor={fieldId} className="text-md font-medium text-text-primary">
        {label}
      </label>
      <TextInput
        ref={inputRef}
        id={fieldId}
        size="lg"
        value={value}
        onValueChange={onChange}
        placeholder={placeholder}
        invalid={Boolean(error)}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? errorId : undefined}
      />
      {error && (
        <p id={errorId} className="text-sm text-text-error">
          {error}
        </p>
      )}
    </div>
  );
}
