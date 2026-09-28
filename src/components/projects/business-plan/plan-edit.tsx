"use client";

// Edit mode (P2-TABS-18): the whole plan switches into editable fields at
// once — page-wide, per the Figma, with no rich-text toolbar (the section's
// own departure note). Paragraphs and bullet lists only; a pricing section's
// tiers get their own small row editor instead of a raw textarea, since a
// maker typing "Name | Price | Cadence | Feature" by hand would be typing the
// section API's own wire format back at it.

import * as React from "react";
import { AiMagicIcon, MoreVerticalIcon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, ConfirmDialog, IconButton, TextInput, Textarea } from "@/components/ideeza";
import type { PlanSection, PricingTier } from "@/lib/manual/business-plan";
import { readBusinessPlan, writeBusinessPlan } from "@/lib/manual/business-plan-store";
import { fetchPlanSection } from "./plan-runner";
import { ESTIMATE_NOTE, labelize, provenanceLabel, sectionContextText } from "./plan-section";

const IMPROVE_CHIPS = ["Make it shorter", "Add more detail", "More formal tone"];

function newSectionId(): string {
  return `bps_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** In-place edit (P2-TABS-18): the current version's sections are replaced,
 *  not versioned — "After a reload the new text shows with 'Edited by you'",
 *  never a new "Version {n}". A section whose text actually changed flips
 *  from "ai" to "edited"; one already "edited" or "added" stays as it is. */
export function saveEditedSections(projectId: string, versionN: number, before: readonly PlanSection[], after: readonly PlanSection[]): void {
  const plan = readBusinessPlan(projectId);
  if (!plan) return;
  const vi = plan.versions.findIndex((v) => v.n === versionN);
  if (vi < 0) return;
  const beforeById = new Map(before.map((s) => [s.id, s]));
  const sections = after.map((s) => {
    const prior = beforeById.get(s.id);
    const changed = !prior || JSON.stringify(prior.fields) !== JSON.stringify(s.fields) || prior.title !== s.title;
    const origin = changed && s.origin === "ai" ? ("edited" as const) : s.origin;
    return { ...s, origin };
  });
  const versions = plan.versions.slice();
  versions[vi] = { ...versions[vi], sections };
  writeBusinessPlan(projectId, { ...plan, versions });
}

function isPricingTiers(v: unknown): v is PricingTier[] {
  return Array.isArray(v) && (v.length === 0 || (typeof v[0] === "object" && v[0] !== null && "name" in (v[0] as object)));
}

function AutoTextarea(props: React.ComponentProps<typeof Textarea>) {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [props.value]);
  return <Textarea ref={ref} {...props} />;
}

function TiersEditor({ tiers, onChange }: { tiers: PricingTier[]; onChange: (next: PricingTier[]) => void }) {
  const set = (i: number, patch: Partial<PricingTier>) => onChange(tiers.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  return (
    <div className="flex flex-col gap-4">
      {tiers.map((t, i) => (
        <div key={i} className="rounded-xl border border-solid border-border p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <TextInput value={t.name} onValueChange={(v) => set(i, { name: v })} placeholder="Tier name" aria-label="Tier name" />
            <TextInput value={t.price} onValueChange={(v) => set(i, { price: v })} placeholder="Price" aria-label="Tier price" />
            <TextInput value={t.cadence} onValueChange={(v) => set(i, { cadence: v })} placeholder="Cadence (e.g. /mo)" aria-label="Tier cadence" />
          </div>
          <Textarea
            className="mt-3"
            value={t.features.join("\n")}
            onValueChange={(v) => set(i, { features: v.split("\n").map((x) => x.trim()).filter(Boolean) })}
            rows={2}
            placeholder="One feature per line"
            aria-label="Tier features"
          />
          <Button type="button" hierarchy="ghost" size="sm" className="mt-2" onClick={() => onChange(tiers.filter((_, j) => j !== i))}>
            Remove tier
          </Button>
        </div>
      ))}
      <Button
        type="button"
        hierarchy="secondary"
        size="sm"
        className="w-fit"
        onClick={() => onChange([...tiers, { name: "", price: "", cadence: "", features: [] }])}
      >
        + Add tier
      </Button>
    </div>
  );
}

function FieldEditor({ label, value, onChange }: { label: string; value: PlanSection["fields"][string]; onChange: (v: PlanSection["fields"][string]) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-text-primary">{label}</span>
      {typeof value === "string" ? (
        <AutoTextarea value={value} onValueChange={onChange} rows={2} aria-label={label} />
      ) : isPricingTiers(value) ? (
        <TiersEditor tiers={value} onChange={onChange} />
      ) : (
        <AutoTextarea
          value={value.join("\n")}
          onValueChange={(v) => onChange(v.split("\n").map((x) => x.replace(/^[-*•]\s*/, "").trim()).filter(Boolean))}
          rows={Math.max(2, value.length)}
          aria-label={`${label} (one per line)`}
        />
      )}
    </div>
  );
}

function SectionMenu({ onImprove, onMoveUp, onMoveDown, onDelete, canMoveUp, canMoveDown }: { onImprove: () => void; onMoveUp: () => void; onMoveDown: () => void; onDelete: () => void; canMoveUp: boolean; canMoveDown: boolean }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const item = (label: string, onClick: () => void, disabled?: boolean) => (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={() => {
        setOpen(false);
        onClick();
      }}
      className="w-full rounded-md px-3 py-2 text-left text-sm text-text-primary hover:bg-bg-subtle disabled:cursor-not-allowed disabled:text-text-disabled disabled:hover:bg-transparent"
    >
      {label}
    </button>
  );
  return (
    <div ref={ref} className="relative">
      <IconButton icon={<Icon icon={MoreVerticalIcon} size={18} />} aria-label="Actions for this section" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)} />
      {open && (
        <div role="menu" className="absolute right-0 top-[calc(100%+4px)] z-dropdown w-[200px] rounded-xl border border-solid border-border bg-bg-surface p-1.5 shadow-3">
          {item("Improve with AI", onImprove)}
          {item("Move up", onMoveUp, !canMoveUp)}
          {item("Move down", onMoveDown, !canMoveDown)}
          {item("Delete section", onDelete)}
        </div>
      )}
    </div>
  );
}

function ImproveBar({ onImprove, onClose, busy }: { onImprove: (instruction: string) => void; onClose: () => void; busy: boolean }) {
  const [text, setText] = React.useState("");
  return (
    <div className="mt-3 rounded-xl border border-solid border-border-subtle bg-bg-subtle p-4">
      <Textarea value={text} onValueChange={setText} rows={2} placeholder="Tell AI what to change in this section…" aria-label="Improve with AI" disabled={busy} />
      <div className="mt-2 flex flex-wrap gap-2">
        {IMPROVE_CHIPS.map((c) => (
          <button
            key={c}
            type="button"
            disabled={busy}
            onClick={() => setText((t) => (t ? `${t}. ${c}.` : `${c}.`))}
            className="rounded-full border border-solid border-border px-3 py-1 text-xs text-text-secondary hover:bg-bg-surface disabled:cursor-not-allowed"
          >
            {c}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-text-tertiary">Rewrites this section only.</p>
      <div className="mt-3 flex items-center gap-3">
        <Button type="button" hierarchy="primary" size="sm" loading={busy} onClick={() => onImprove(text.trim())}>
          Improve
        </Button>
        <Button type="button" hierarchy="ghost" size="sm" disabled={busy} onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function SectionEditor({
  section,
  index,
  total,
  planPrompt,
  precedingDone,
  onChange,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  section: PlanSection;
  index: number;
  total: number;
  planPrompt: string;
  precedingDone: readonly PlanSection[];
  onChange: (next: PlanSection) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}) {
  const [improving, setImproving] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [proposal, setProposal] = React.useState<PlanSection["fields"] | null>(null);

  const runImprove = async (instruction: string) => {
    setBusy(true);
    const fields = await fetchPlanSection({
      prompt: planPrompt,
      section: section.kind === "custom" ? { title: section.title, brief: section.title } : section.kind,
      context: sectionContextText(precedingDone),
      instruction: instruction || "Rewrite this section.",
    });
    setBusy(false);
    if (fields) setProposal(fields);
  };

  return (
    <div className="border-b border-solid border-border-subtle py-6 last:border-b-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {section.kind === "custom" ? (
            <TextInput
              value={section.title}
              onValueChange={(title) => onChange({ ...section, title })}
              placeholder="Section title"
              aria-label="Section title"
              className="font-semibold"
            />
          ) : (
            <h3 className="text-lg font-semibold text-text-primary">{section.title}</h3>
          )}
          <p className="mt-1 text-xs text-text-tertiary">{provenanceLabel(section.origin)}</p>
        </div>
        <SectionMenu
          onImprove={() => setImproving((v) => !v)}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onDelete={onDelete}
          canMoveUp={index > 0}
          canMoveDown={index < total - 1}
        />
      </div>

      <div className="mt-4 flex flex-col gap-5">
        {Object.entries(section.fields).map(([key, value]) => (
          <FieldEditor
            key={key}
            label={labelize(key)}
            value={value}
            onChange={(v) => onChange({ ...section, fields: { ...section.fields, [key]: v } })}
          />
        ))}
        {(section.kind === "market" || section.kind === "pricing") && <p className="text-xs text-text-tertiary">{ESTIMATE_NOTE}</p>}
      </div>

      {improving && !proposal && <ImproveBar busy={busy} onImprove={runImprove} onClose={() => setImproving(false)} />}

      {proposal && (
        <div className="mt-4 rounded-xl border border-solid border-border-brand bg-bg-brand-subtle p-4">
          <p className="text-sm font-semibold text-text-primary">Proposed rewrite</p>
          <div className="mt-3 flex flex-col gap-3">
            {Object.entries(proposal).map(([key, value]) => (
              <div key={key}>
                <p className="text-xs font-semibold text-text-secondary">{labelize(key)}</p>
                <p className="text-sm text-text-primary">{Array.isArray(value) ? (value as string[]).join(" · ") : String(value)}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <Button
              type="button"
              hierarchy="primary"
              size="sm"
              onClick={() => {
                onChange({ ...section, fields: proposal, origin: section.origin === "added" ? "added" : "edited" });
                setProposal(null);
                setImproving(false);
              }}
            >
              Keep
            </Button>
            <Button type="button" hierarchy="ghost" size="sm" onClick={() => setProposal(null)}>
              Discard
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function AddSectionSlot({ planPrompt, precedingDone, onAdd }: { planPrompt: string; precedingDone: readonly PlanSection[]; onAdd: (s: PlanSection) => void }) {
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [brief, setBrief] = React.useState("");
  const [free, setFree] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [proposal, setProposal] = React.useState<PlanSection["fields"] | null>(null);
  const [failed, setFailed] = React.useState(false);

  if (!open) {
    return (
      <div className="group flex justify-center py-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full px-3 py-1 text-xs font-semibold text-text-tertiary opacity-0 transition-opacity hover:bg-bg-subtle focus-visible:opacity-100 group-hover:opacity-100"
        >
          <Icon icon={PlusSignIcon} size={12} /> Add section here
        </button>
      </div>
    );
  }

  const writeWithAI = async () => {
    setBusy(true);
    setFailed(false);
    const fields = await fetchPlanSection({ prompt: planPrompt, section: { title: title || "Untitled section", brief }, context: sectionContextText(precedingDone) });
    setBusy(false);
    if (!fields) {
      setFailed(true);
      return;
    }
    setProposal(fields);
  };

  const close = () => {
    setOpen(false);
    setTitle("");
    setBrief("");
    setFree("");
    setProposal(null);
    setFailed(false);
  };

  return (
    <div className="my-4 rounded-xl border border-dashed border-border p-4">
      <TextInput value={title} onValueChange={setTitle} placeholder="Section title" aria-label="New section title" />
      {proposal ? (
        <div className="mt-3">
          <p className="text-xs font-semibold text-text-success">Written by AI · just now — edit it freely, it stays when you regenerate the plan.</p>
          <div className="mt-2 flex flex-col gap-2">
            {Object.entries(proposal).map(([key, value]) => (
              <p key={key} className="text-sm text-text-secondary">
                <span className="font-semibold text-text-primary">{labelize(key)}: </span>
                {Array.isArray(value) ? (value as string[]).join(" · ") : String(value)}
              </p>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <Button
              type="button"
              hierarchy="primary"
              size="sm"
              onClick={() => {
                onAdd({ id: newSectionId(), kind: "custom", title: title || "Untitled section", fields: proposal, origin: "added", state: "done" });
                close();
              }}
            >
              Keep
            </Button>
            <Button type="button" hierarchy="secondary" size="sm" onClick={writeWithAI}>
              Try again
            </Button>
            <Button type="button" hierarchy="ghost" size="sm" onClick={close}>
              Discard
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-2 text-xs text-text-tertiary">Describe what this section should cover — AI will write it, or type it yourself below.</p>
          <Textarea value={brief} onValueChange={setBrief} rows={2} placeholder="What should this section say?" aria-label="What this section should cover" className="mt-2" />
          {failed && <p className="mt-2 text-xs text-text-error">Couldn&apos;t write this section. Try again, or write it yourself below.</p>}
          <div className="mt-2 flex items-center gap-3">
            <Button type="button" hierarchy="primary" size="sm" loading={busy} iconLeading={<Icon icon={AiMagicIcon} size={14} />} onClick={writeWithAI}>
              Write with AI
            </Button>
            <Button type="button" hierarchy="ghost" size="sm" onClick={close}>
              Cancel
            </Button>
          </div>
          <Textarea value={free} onValueChange={setFree} rows={3} placeholder="…or write the section yourself" aria-label="Write this section yourself" className="mt-3" />
          {free.trim() && (
            <Button
              type="button"
              hierarchy="secondary"
              size="sm"
              className="mt-2"
              onClick={() => {
                const body = free
                  .split(/\n{2,}/)
                  .map((p) => p.trim())
                  .filter(Boolean);
                onAdd({ id: newSectionId(), kind: "custom", title: title || "Untitled section", fields: { body }, origin: "added", state: "done" });
                close();
              }}
            >
              Add section
            </Button>
          )}
        </>
      )}
    </div>
  );
}

export function PlanEditView({
  projectId,
  versionN,
  sections,
  planPrompt,
  onCancel,
  onSaved,
}: {
  projectId: string;
  versionN: number;
  sections: readonly PlanSection[];
  planPrompt: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const original = React.useMemo(() => sections, [sections]);
  const [draft, setDraft] = React.useState<PlanSection[]>(() => sections.map((s) => ({ ...s })));
  const [confirmingDiscard, setConfirmingDiscard] = React.useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(original);

  const move = (i: number, dir: -1 | 1) => {
    setDraft((prev) => {
      const next = prev.slice();
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const cancel = () => {
    if (dirty) setConfirmingDiscard(true);
    else onCancel();
  };

  const save = () => {
    saveEditedSections(projectId, versionN, original, draft);
    onSaved();
  };

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-8 flex items-center justify-between gap-4 border-b border-solid border-border bg-bg-page/95 px-8 py-4 backdrop-blur">
        <span className="text-sm text-text-secondary">{dirty ? "Unsaved changes" : "Editing the plan"}</span>
        <div className="flex items-center gap-3">
          <Button type="button" hierarchy="secondary" onClick={cancel}>
            Cancel
          </Button>
          <Button type="button" hierarchy="primary" onClick={save}>
            Save changes
          </Button>
        </div>
      </div>

      <AddSectionSlot planPrompt={planPrompt} precedingDone={[]} onAdd={(s) => setDraft((prev) => [s, ...prev])} />
      {draft.map((section, i) => (
        <React.Fragment key={section.id}>
          <SectionEditor
            section={section}
            index={i}
            total={draft.length}
            planPrompt={planPrompt}
            precedingDone={draft.slice(0, i)}
            onChange={(next) => setDraft((prev) => prev.map((s, j) => (j === i ? next : s)))}
            onMoveUp={() => move(i, -1)}
            onMoveDown={() => move(i, 1)}
            onDelete={() => setDraft((prev) => prev.filter((_, j) => j !== i))}
          />
          <AddSectionSlot planPrompt={planPrompt} precedingDone={draft.slice(0, i + 1)} onAdd={(s) => setDraft((prev) => [...prev.slice(0, i + 1), s, ...prev.slice(i + 1)])} />
        </React.Fragment>
      ))}

      <ConfirmDialog
        open={confirmingDiscard}
        title="Discard your changes?"
        confirmLabel="Discard"
        onConfirm={() => {
          setConfirmingDiscard(false);
          onCancel();
        }}
        onCancel={() => setConfirmingDiscard(false)}
      >
        Your edits to this business plan haven&apos;t been saved.
      </ConfirmDialog>
    </div>
  );
}
