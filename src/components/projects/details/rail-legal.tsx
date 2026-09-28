"use client";

// The rail's Legal information block (P2-TABS-23): Patent, Copyright and
// Trademark, as the maker typed them — never verified, said plainly in the
// footnote. A row without a value is omitted, and the whole block is absent
// from a non-owner's page while it holds nothing (AC3): there is nothing to
// tell a buyer, and no "Add legal details" for them to see.
//
// Owner-only editing: an inline form (Save / Cancel), never a dialog, so the
// block stays where it is while it's open. `checkLegal` and `normalizeLegal`
// (lib/manual/legal.ts, T08) hold the real validation and the stored shape;
// this file only decides what to show and wires the write.
//
// A Copyright or Trademark row with a link becomes a button — the same
// external-link confirm P2-TABS-8 gives Activity's link cards ("Open this
// link in a new tab?"). T20 (a parallel W1 task) owns that shared confirm and
// hasn't landed it yet, so this file carries its own copy of it for now; a
// later pass can swap this for the shared component once T20 merges.

import * as React from "react";
import { Add01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, ConfirmDialog, TextInput } from "@/components/ideeza";
import { checkLegal, normalizeLegal, type LegalInput } from "@/lib/manual/legal";
import { WRITE_FAILED } from "@/lib/manual/project-header";
import type { ProjectLegal } from "@/lib/manual/p2-types";
import { can } from "@/lib/manual/permissions";
import { useManualProjects, type ManualProject } from "@/lib/manual/projects";
import { cn } from "@/lib/utils";
import { RailBlock, RailFact, RailFacts, useRailStacked } from "./rail-block";
import { RAIL_LINK, SHOW_ALL } from "./rail-versions";
import { useStoreWrite } from "./use-store-write";
import type { SlotProps } from "./slots";

const FOOTNOTE = "As stated by you — not verified.";
const EMPTY_OWNER_HINT = "Add the patent, copyright or trademark details buyers should know.";
const SAVED_MESSAGE = "Legal details saved";
const LINK_TITLE = "Open this link in a new tab?";
const LINK_BODY = "It leaves IDEEZA — only open links you trust.";

export type LegalRow =
  | { key: "patent"; label: string; text: string }
  | { key: "copyright"; label: string; text: string; url?: string }
  | { key: "trademark"; label: string; lines: string[]; url?: string };

/**
 * P2-TABS-23's rows, in order — Patent, Copyright, Trademark — each omitted
 * with no value. Exported so a later buyer-facing view (MARKETPLACE, W2) can
 * read the same rows, since this is the one place their shape is decided.
 */
export function legalRows(legal: ProjectLegal | undefined): LegalRow[] {
  if (!legal) return [];
  const rows: LegalRow[] = [];
  if (legal.patent) rows.push({ key: "patent", label: "Patent", text: legal.patent });
  if (legal.copyright?.text) {
    rows.push({ key: "copyright", label: "Copyright", text: legal.copyright.text, url: legal.copyright.url });
  }
  if (legal.trademark && (legal.trademark.mark || legal.trademark.attorney)) {
    const lines: string[] = [];
    if (legal.trademark.mark) lines.push(legal.trademark.mark);
    if (legal.trademark.attorney) lines.push(`Attorney: ${legal.trademark.attorney}`);
    rows.push({ key: "trademark", label: "Trademark", lines, url: legal.trademark.url });
  }
  return rows;
}

export function RailLegal({ project, viewer, announce }: SlotProps) {
  const editable = can(viewer, "legal.edit");
  const rows = legalRows(project.legal);
  if (!editable && rows.length === 0) return null;
  return (
    <RailBlock title="Legal information">
      {/* A child of RailBlock, so useRailStacked reads the layout it just set. */}
      <LegalBody project={project} editable={editable} rows={rows} announce={announce} />
    </RailBlock>
  );
}

function LegalBody({
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
  const [editing, setEditing] = React.useState(false);
  const [linkUrl, setLinkUrl] = React.useState<string | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  const close = () => {
    setEditing(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  return (
    <>
      {editing ? (
        <LegalForm
          project={project}
          onSaved={() => {
            announce(SAVED_MESSAGE);
            close();
          }}
          onCancel={close}
        />
      ) : (
        <>
          {rows.length === 0 ? (
            <p className="text-md leading-md text-text-secondary">{EMPTY_OWNER_HINT}</p>
          ) : (
            <>
              <RailFacts>
                {rows.map((row) => (
                  <RailFact key={row.key} label={row.label}>
                    <LegalRowValue row={row} onOpenLink={setLinkUrl} />
                  </RailFact>
                ))}
              </RailFacts>
              <p className="text-sm leading-sm text-text-tertiary">{FOOTNOTE}</p>
            </>
          )}
          {editable && (
            <button
              ref={triggerRef}
              type="button"
              onClick={() => setEditing(true)}
              className={cn(SHOW_ALL, stacked && "min-h-[var(--touch-min)]")}
            >
              {rows.length === 0 && <Icon icon={Add01Icon} size={16} />}
              {rows.length === 0 ? "Add legal details" : "Edit legal details"}
            </button>
          )}
        </>
      )}
      {linkUrl && <LegalLinkConfirm url={linkUrl} onClose={() => setLinkUrl(null)} />}
    </>
  );
}

function LegalRowValue({ row, onOpenLink }: { row: LegalRow; onOpenLink: (url: string) => void }) {
  if (row.key === "patent") {
    return <span className="block break-words">{row.text}</span>;
  }
  const body =
    row.key === "trademark" ? (
      <span className="block">
        {row.lines.map((line, i) => (
          <span key={i} className="block">
            {line}
          </span>
        ))}
      </span>
    ) : (
      <span className="block break-words">{row.text}</span>
    );
  const { url } = row;
  if (!url) return body;
  return (
    <button type="button" onClick={() => onOpenLink(url)} className={cn(RAIL_LINK, "block text-left")}>
      {body}
    </button>
  );
}

function LegalLinkConfirm({ url, onClose }: { url: string; onClose: () => void }) {
  const openLink = () => {
    window.open(url, "_blank", "noopener");
    onClose();
  };
  return (
    <ConfirmDialog open title={LINK_TITLE} confirmLabel="Open link" tone="primary" onConfirm={openLink} onCancel={onClose}>
      {LINK_BODY}
    </ConfirmDialog>
  );
}

const FIELD_LABEL: Record<keyof LegalInput, string> = {
  patent: "Patent number",
  copyrightText: "Copyright",
  copyrightUrl: "Copyright link (optional)",
  trademark: "Trademark",
  attorneyName: "Attorney name",
  attorneyUrl: "Attorney link (optional)",
};

function bareLegal(l: ProjectLegal | undefined): string {
  return l ? JSON.stringify({ ...l, updatedAt: 0 }) : "";
}

function draftOf(input: LegalInput): ProjectLegal | undefined {
  return normalizeLegal({
    updatedAt: Date.now(),
    patent: input.patent,
    copyright: { text: input.copyrightText, url: input.copyrightUrl },
    trademark: { mark: input.trademark, attorney: input.attorneyName, url: input.attorneyUrl },
  });
}

function LegalForm({
  project,
  onSaved,
  onCancel,
}: {
  project: ManualProject;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { setLegal } = useManualProjects();
  const initial = project.legal;
  const [input, setInput] = React.useState<LegalInput>({
    patent: initial?.patent ?? "",
    copyrightText: initial?.copyright?.text ?? "",
    copyrightUrl: initial?.copyright?.url ?? "",
    trademark: initial?.trademark?.mark ?? "",
    attorneyName: initial?.trademark?.attorney ?? "",
    attorneyUrl: initial?.trademark?.url ?? "",
  });
  const [tried, setTried] = React.useState(false);
  const [pendingSnapshot, setPendingSnapshot] = React.useState<string | null>(null);
  const firstFieldRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  const check = checkLegal(input);
  const write = useStoreWrite(pendingSnapshot !== null && bareLegal(project.legal) === pendingSnapshot, onSaved);

  const field = (key: keyof LegalInput) => (value: string) => setInput((s) => ({ ...s, [key]: value }));

  const save = () => {
    if (write.saving) return;
    if (!check.ok) {
      setTried(true);
      return;
    }
    const draft = draftOf(input);
    const snapshot = bareLegal(draft);
    if (snapshot === bareLegal(project.legal)) {
      // Saving it back the way it already reads: nothing to settle, nothing to say.
      onCancel();
      return;
    }
    setPendingSnapshot(snapshot);
    write.start();
    setLegal(project.id, draft ?? null);
  };

  const ORDER: (keyof LegalInput)[] = [
    "patent",
    "copyrightText",
    "copyrightUrl",
    "trademark",
    "attorneyName",
    "attorneyUrl",
  ];

  return (
    <div className="flex flex-col gap-5">
      {ORDER.map((key, i) => (
        <LegalField
          key={key}
          inputRef={i === 0 ? firstFieldRef : undefined}
          label={FIELD_LABEL[key]}
          value={input[key]}
          onChange={field(key)}
          error={tried ? check[key] : null}
          placeholder={key === "copyrightUrl" || key === "attorneyUrl" ? "https://" : undefined}
        />
      ))}
      <div className="flex flex-wrap items-center gap-4">
        <Button type="button" hierarchy="secondary" size="lg" onClick={save} disabled={write.saving}>
          {write.saving ? "Saving…" : "Save"}
        </Button>
        <Button type="button" hierarchy="ghost" size="lg" onClick={onCancel} disabled={write.saving}>
          Cancel
        </Button>
      </div>
      {write.failed && <p className="text-sm text-text-error">{WRITE_FAILED}</p>}
    </div>
  );
}

function LegalField({
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
      <label htmlFor={fieldId} className="text-sm font-medium text-text-primary">
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
