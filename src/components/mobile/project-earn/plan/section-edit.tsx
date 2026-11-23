"use client";

// Editing the plan on the phone, one section at a time (Figma 16k, 16m; the
// web's plan-edit.tsx, its fields and words): ⋯ › Edit picks a written
// section (a pick-one sheet), then "Edit · {Section}" opens with every field
// of it — a paragraph or a list (one line each) as a text box, pricing tiers
// as their own small rows — and Improve with AI, which asks the section API
// to rewrite only this section and shows the proposal to Keep or Discard.
// Save changes writes the current version in place (`saveEditedSections`:
// a changed AI section becomes "Edited by you", never a new version).
// Leaving with unsaved edits asks first ("Discard your changes?"). Once the
// project is sold in full while the sheet is open, Save says why it can't.
// EARN-7 (the web's edit menu and Add section): the section list ends with
// Add section (section-add.tsx), and "Edit · {Section}" has the section's ⋯ —
// Move up · Move down · Delete section, written to the version at once
// (Delete with Undo).

import * as React from "react";
import { AiMagicIcon, ArrowDown01Icon, ArrowUp01Icon, Delete02Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { IconButton } from "@/components/ideeza/icon-button";
import { Tag } from "@/components/ideeza/tag";
import { TextInput, Textarea } from "@/components/ideeza/text-input";
import { saveEditedSections } from "@/components/projects/business-plan/plan-edit";
import { fetchPlanSection } from "@/components/projects/business-plan/plan-runner";
import { ESTIMATE_NOTE, labelize, provenanceLabel, sectionContextText } from "@/components/projects/business-plan/plan-section";
import type { PlanSection, PricingTier } from "@/lib/manual/business-plan";
import { movedSections, withoutSection } from "@/lib/manual/phone-plan-money";
import { cn } from "@/lib/utils";
import { ConfirmSheet } from "../../kit/confirm-sheet";
import { ActionSheet, Sheet, type ActionSheetItem } from "../../kit/sheet";
import { Chevron } from "../../kit/list";
import { useToast } from "../../kit/toast";
import { MORE_ICON } from "../../top-bar";
import { EARN_NOTE } from "../parts";
import { FIELD_LABEL } from "./section-view";
import { T } from "../../type";

const IMPROVE_CHIPS = ["Make it shorter", "Add more detail", "More formal tone"];
const BLOCK = "rounded-xl border-[length:var(--border-width-1)] border-solid border-border p-6";

/** ⋯ › Edit: which written section to edit, and, as the last row, Add section (EARN-7). */
export function SectionPickSheet({
  open,
  sections,
  onClose,
  onPick,
  onAdd,
}: {
  open: boolean;
  sections: readonly PlanSection[];
  onClose: () => void;
  onPick: (id: string) => void;
  /** Add section: the web's "Add section", a sheet of its own (section-add.tsx). */
  onAdd: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Edit a section">
      <ul className="-mx-8 flex flex-col">
        {sections.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => {
                onClose();
                onPick(s.id);
              }}
              className="flex min-h-[44px] w-full items-center gap-4 rounded-md px-8 py-3 text-left outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              <span className={cn(T.bodyLg, "min-w-0 flex-1 truncate")}>{s.title}</span>
              <Badge tone={s.origin === "ai" ? "neutral" : "info"} className="shrink-0">
                {provenanceLabel(s.origin)}
              </Badge>
              <Chevron />
            </button>
          </li>
        ))}
        <li>
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => {
              onClose();
              onAdd();
            }}
            className="flex min-h-[44px] w-full items-center gap-4 rounded-md px-8 py-3 text-left outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <span aria-hidden className="shrink-0 text-text-brand">
              <Icon icon={PlusSignIcon} size={24} />
            </span>
            <span className={cn(T.bodyLg, "min-w-0 flex-1 text-text-brand")}>Add section</span>
          </button>
        </li>
      </ul>
    </Sheet>
  );
}

function isTiers(v: unknown): v is PricingTier[] {
  return Array.isArray(v) && (v.length === 0 || (typeof v[0] === "object" && v[0] !== null && "name" in (v[0] as object)));
}

/** A text box that grows with what it holds. */
function GrowingTextarea(props: React.ComponentProps<typeof Textarea>) {
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
        <div key={i} className={cn(BLOCK, "flex flex-col gap-4")}>
          <TextInput size="xl" value={t.name} onValueChange={(v) => set(i, { name: v })} placeholder="Tier name" aria-label="Tier name" />
          <TextInput size="xl" value={t.price} onValueChange={(v) => set(i, { price: v })} placeholder="Price" aria-label="Tier price" />
          <TextInput size="xl" value={t.cadence} onValueChange={(v) => set(i, { cadence: v })} placeholder="Cadence (e.g. /mo)" aria-label="Tier cadence" />
          <Textarea
            value={t.features.join("\n")}
            onValueChange={(v) => set(i, { features: v.split("\n").map((x) => x.trim()).filter(Boolean) })}
            rows={2}
            placeholder="One feature per line"
            aria-label="Tier features"
          />
          <Button hierarchy="ghost" size="xl" className="self-start" onClick={() => onChange(tiers.filter((_, j) => j !== i))}>
            Remove tier
          </Button>
        </div>
      ))}
      <Button
        hierarchy="secondary"
        size="xl"
        className="self-start"
        iconLeading={<Icon icon={PlusSignIcon} size={16} />}
        onClick={() => onChange([...tiers, { name: "", price: "", cadence: "", features: [] }])}
      >
        Add tier
      </Button>
    </div>
  );
}

function FieldEditor({ id, label, value, onChange }: { id: string; label: string; value: PlanSection["fields"][string]; onChange: (v: PlanSection["fields"][string]) => void }) {
  if (isTiers(value)) {
    return (
      <div className="flex flex-col gap-3">
        <p className={cn(FIELD_LABEL, "text-text-primary")}>{label}</p>
        <TiersEditor tiers={value} onChange={onChange} />
      </div>
    );
  }
  const list = Array.isArray(value);
  return (
    <div className="flex flex-col gap-3">
      <label htmlFor={id} className={cn(FIELD_LABEL, "text-text-primary")}>
        {list ? `${label} (one per line)` : label}
      </label>
      {list ? (
        <GrowingTextarea
          id={id}
          value={value.join("\n")}
          onValueChange={(v) => onChange(v.split("\n").map((x) => x.replace(/^[-*•]\s*/, "").trim()).filter(Boolean))}
          rows={Math.max(2, value.length)}
        />
      ) : (
        <GrowingTextarea id={id} value={value} onValueChange={onChange} rows={2} />
      )}
    </div>
  );
}

/** Improve with AI: an instruction (or a chip), then the proposed rewrite to keep or discard. */
function ImproveBlock({
  section,
  planPrompt,
  preceding,
  onKeep,
}: {
  section: PlanSection;
  planPrompt: string;
  preceding: readonly PlanSection[];
  onKeep: (fields: PlanSection["fields"]) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const [proposal, setProposal] = React.useState<PlanSection["fields"] | null>(null);

  const run = async () => {
    setBusy(true);
    setFailed(false);
    const own = sectionContextText([{ ...section, state: "done" }]);
    const earlier = sectionContextText(preceding);
    const context = [own && `This section, to rewrite:\n${own}`, earlier && `Earlier sections:\n${earlier}`].filter(Boolean).join("\n\n");
    const fields = await fetchPlanSection({
      prompt: planPrompt,
      section: section.kind === "custom" ? { title: section.title, brief: section.title } : section.kind,
      context,
      instruction: text.trim() || "Rewrite this section.",
    });
    setBusy(false);
    if (fields) setProposal(fields);
    else setFailed(true);
  };

  if (!open) {
    return (
      <Button hierarchy="secondary" size="xl" className="self-start" iconLeading={<Icon icon={AiMagicIcon} size={16} />} onClick={() => setOpen(true)}>
        Improve with AI
      </Button>
    );
  }
  if (proposal) {
    return (
      <div className={cn(BLOCK, "flex flex-col gap-4 border-[var(--color-border-brand)] bg-bg-brand-subtle")}>
        <p className={T.label}>Proposed rewrite</p>
        {Object.entries(proposal).map(([key, value]) => (
          <div key={key} className="flex flex-col gap-1">
            <p className={FIELD_LABEL}>{labelize(key)}</p>
            <p className={cn(T.body, "text-text-primary")}>
              {isTiers(value) ? value.map((t) => `${t.name} · ${t.price}`).join(" · ") : Array.isArray(value) ? value.join(" · ") : value}
            </p>
          </div>
        ))}
        <div className="flex flex-col gap-4">
          <Button
            size="xl"
            className="w-full"
            onClick={() => {
              onKeep(proposal);
              setProposal(null);
              setOpen(false);
              setText("");
            }}
          >
            Keep
          </Button>
          <Button hierarchy="secondary" size="xl" className="w-full" onClick={() => setProposal(null)}>
            Discard
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className={cn(BLOCK, "flex flex-col gap-4 bg-bg-subtle")}>
      <Textarea value={text} onValueChange={setText} rows={2} placeholder="Tell AI what to change in this section…" aria-label="Improve with AI" disabled={busy} />
      <div className="flex flex-wrap gap-3">
        {IMPROVE_CHIPS.map((c) => (
          <Tag key={c} disabled={busy} onClick={() => setText((t) => (t ? `${t}. ${c}.` : `${c}.`))}>
            {c}
          </Tag>
        ))}
      </div>
      <p className={EARN_NOTE}>Rewrites this section only.</p>
      {failed && (
        <p role="status" className={cn(T.body, "text-text-error")}>
          Couldn&apos;t rewrite this section. Try again in a moment.
        </p>
      )}
      <div className="flex gap-4">
        <Button hierarchy="ghost" size="xl" className="min-w-0 flex-1" disabled={busy} onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button hierarchy="secondary" size="xl" className="min-w-0 flex-1" loading={busy} onClick={run}>
          Improve
        </Button>
      </div>
    </div>
  );
}

export function SectionEditSheet({
  projectId,
  versionN,
  sections,
  sectionId,
  planPrompt,
  saveBlocked,
  onClose,
  onSaved,
}: {
  projectId: string;
  versionN: number;
  /** The version's sections as stored: the edit replaces one of them. */
  sections: readonly PlanSection[];
  sectionId: string;
  planPrompt: string;
  /** Why the edit can't be saved now (sold in full meanwhile); null when it can. */
  saveBlocked: string | null;
  onClose: () => void;
  onSaved: (section: PlanSection) => void;
}) {
  const index = sections.findIndex((s) => s.id === sectionId);
  const original = index >= 0 ? sections[index] : null;
  const [draft, setDraft] = React.useState<PlanSection | null>(original);
  const [confirming, setConfirming] = React.useState(false);
  const [menu, setMenu] = React.useState(false);
  const toast = useToast();
  const base = React.useId();
  const blockedId = React.useId();
  if (!original || !draft) return null;
  const dirty = JSON.stringify(draft) !== JSON.stringify(original);

  // The section's own ⋯ (the web's edit menu, EARN-7): Move up · Move down · Delete section. They
  // change the plan's order or drop the section from this version at once, in place (the same
  // `saveEditedSections`, so no section's provenance changes); the fields being edited stay as they
  // are until Save changes. Delete closes the sheet, with Undo in its toast.
  const move = (dir: -1 | 1) => {
    if (saveBlocked) return;
    const next = movedSections(sections, original.id, dir);
    if (!next) return;
    saveEditedSections(projectId, versionN, sections, next);
    toast({ title: `${original.title} moved ${dir < 0 ? "up" : "down"}.` });
  };
  const remove = () => {
    if (saveBlocked) return;
    const before = sections.slice();
    saveEditedSections(projectId, versionN, before, withoutSection(before, original.id));
    onClose();
    toast({
      title: `${original.title} deleted.`,
      action: { label: "Undo", onClick: () => saveEditedSections(projectId, versionN, before, before) },
    });
  };
  const menuItems: ActionSheetItem[] = [
    ...(index > 0 ? [{ label: "Move up", icon: ArrowUp01Icon, onSelect: () => move(-1) }] : []),
    ...(index < sections.length - 1 ? [{ label: "Move down", icon: ArrowDown01Icon, onSelect: () => move(1) }] : []),
    { label: "Delete section", icon: Delete02Icon, destructive: true, onSelect: remove },
  ];

  const leave = () => {
    if (dirty) setConfirming(true);
    else onClose();
  };
  const save = () => {
    if (saveBlocked) return;
    saveEditedSections(
      projectId,
      versionN,
      sections,
      sections.map((s) => (s.id === draft.id ? draft : s)),
    );
    onSaved(draft);
  };

  return (
    <>
      <Sheet
        open
        onClose={leave}
        title={`Edit · ${original.title}`}
        description={`Changes save to version ${versionN} of the plan.`}
        actions={
          <>
            <Button
              size="xl"
              className={cn("w-full", saveBlocked && "cursor-not-allowed opacity-60")}
              aria-disabled={saveBlocked ? true : undefined}
              aria-describedby={saveBlocked ? blockedId : undefined}
              onClick={save}
            >
              Save changes
            </Button>
            {saveBlocked && (
              <p id={blockedId} role="status" className={EARN_NOTE}>
                {saveBlocked}
              </p>
            )}
          </>
        }
      >
        <div className="-my-3 flex min-h-[44px] items-center justify-between gap-4">
          <span className={T.meta}>{provenanceLabel(original.origin)}</span>
          {!saveBlocked && (
            <IconButton
              hierarchy="ghost"
              size="xl"
              aria-label="Actions for this section"
              aria-haspopup="dialog"
              icon={<Icon icon={MORE_ICON} size={20} />}
              onClick={() => setMenu(true)}
              className="-mr-4 shrink-0 text-[color:var(--color-icon-default)]"
            />
          )}
        </div>
        {draft.kind === "custom" && (
          <div className="flex flex-col gap-3">
            <label htmlFor={`${base}-title`} className={cn(FIELD_LABEL, "text-text-primary")}>
              Section title
            </label>
            <TextInput id={`${base}-title`} size="xl" value={draft.title} onValueChange={(title) => setDraft({ ...draft, title })} />
          </div>
        )}
        {Object.entries(draft.fields).map(([key, value]) => (
          <FieldEditor
            key={key}
            id={`${base}-${key}`}
            label={labelize(key)}
            value={value}
            onChange={(v) => setDraft({ ...draft, fields: { ...draft.fields, [key]: v } })}
          />
        ))}
        {(draft.kind === "market" || draft.kind === "pricing") && <p className={cn(T.meta, "text-text-tertiary")}>{ESTIMATE_NOTE}</p>}
        <ImproveBlock
          section={draft}
          planPrompt={planPrompt}
          preceding={sections.slice(0, index)}
          onKeep={(fields) => setDraft({ ...draft, fields, origin: draft.origin === "added" ? "added" : "edited" })}
        />
      </Sheet>
      <ActionSheet open={menu} onClose={() => setMenu(false)} title={original.title} items={menuItems} />
      <ConfirmSheet
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Discard your changes?"
        body="Your edits to this business plan haven't been saved."
        verb="Discard"
        destructive
        cancelLabel="Keep editing"
        onConfirm={onClose}
      />
    </>
  );
}
