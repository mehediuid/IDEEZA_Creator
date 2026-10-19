"use client";

// Download Your Information — the Figma wizard (22048:35288 → 27458:55889 →
// 27435:53319 → 27435:53571) in one dialog: Available or Specific
// information, the categories (Specific only), how to save it, then Date
// Range, Format and Media Quality, each opening its radio modal (27452:53847,
// 27452:54745, 27452:55003). "Create File to download" makes the zip in this
// browser (lib/data/export-browser.ts) and downloads it.
//
// Changed from the Figma, and why: "Notify" waits for sign-in (Phase 2), and
// so does "we will notify you … 72 hrs": the file is made here and downloads
// at once. The categories drop the second "Marketplace Information", "Send to
// Manufacturer" (no such data) and "Security & Login" (no accounts), and add
// Project files.

import * as React from "react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, Checkbox, ModalFrame, ProgressBar, TextInput } from "@/components/ideeza";
import { dayDate } from "@/lib/blog/dates";
import {
  CATEGORIES,
  CATEGORY_IDS,
  FORMATS,
  MEDIA_QUALITIES,
  RANGES,
  rangeBounds,
  type CategoryId,
  type Format,
  type MediaQuality,
  type RangeId,
} from "@/lib/data/export";
import { createInformationZip, downloadBlob, type ExportProgress } from "@/lib/data/export-browser";
import { ChoiceRow, SettingsChoiceDialog } from "./settings-choice";

type Step = "scope" | "choose" | "method" | "create";
type Sub = null | "range" | "format" | "media";

export type DownloadDone = { name: string; files: number; bytes: number };

const TAP = "max-md:min-h-[var(--touch-min)]";

export function DownloadWizard({
  open,
  onClose,
  onDone,
  summary,
}: {
  open: boolean;
  onClose: () => void;
  onDone: (done: DownloadDone) => void;
  /** One line per category of what this browser holds; null until read. */
  summary: Record<CategoryId, string> | null;
}) {
  const [step, setStep] = React.useState<Step>("scope");
  const [scope, setScope] = React.useState<"available" | "specific">("available");
  const [picked, setPicked] = React.useState<CategoryId[]>([]);
  const [pickTried, setPickTried] = React.useState(false);
  const [range, setRange] = React.useState<RangeId>("all");
  const [custom, setCustom] = React.useState({ from: "", to: "" });
  const [format, setFormat] = React.useState<Format>("html");
  const [media, setMedia] = React.useState<MediaQuality>("medium");
  const [sub, setSub] = React.useState<Sub>(null);
  const [busy, setBusy] = React.useState<ExportProgress | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const name = React.useId();
  const pickErrorId = React.useId();

  // Every opening starts at the first step with Figma's choices (during render, no second pass).
  const [seenOpen, setSeenOpen] = React.useState(open);
  if (seenOpen !== open) {
    setSeenOpen(open);
    if (open) {
      setStep("scope");
      setPickTried(false);
      setError(null);
      setBusy(null);
      setSub(null);
    }
  }

  const categories: CategoryId[] = scope === "available" ? [...CATEGORY_IDS] : CATEGORY_IDS.filter((c) => picked.includes(c));
  const steps: Step[] = scope === "available" ? ["scope", "method", "create"] : ["scope", "choose", "method", "create"];
  const at = steps.indexOf(step);
  const back = () => setStep(steps[Math.max(0, at - 1)]);
  const next = () => {
    if (step === "choose" && picked.length === 0) {
      setPickTried(true);
      return;
    }
    setStep(steps[Math.min(steps.length - 1, at + 1)]);
  };

  const rangeLabel =
    range === "custom" && custom.from && custom.to
      ? `${dayDate(new Date(`${custom.from}T00:00`).getTime())} – ${dayDate(new Date(`${custom.to}T00:00`).getTime())}`
      : RANGES.find((r) => r.id === range)?.label ?? "All Time";

  const create = async () => {
    if (busy) return;
    const now = Date.now();
    const bounds = rangeBounds(range, now, custom);
    if (!bounds) {
      setError("Choose a start and an end date for the custom range, the start first.");
      return;
    }
    setError(null);
    setBusy({ label: "Reading your information", done: 0, total: 1 });
    try {
      const zip = await createInformationZip({ categories, bounds, format, media, now }, setBusy);
      downloadBlob(zip.blob, zip.name);
      onDone({ name: zip.name, files: zip.files, bytes: zip.blob.size });
    } catch (e) {
      const why = e instanceof Error && /4 GB|Too many/.test(e.message) ? "it is too big for one file. Choose fewer categories, a shorter date range or a lower media quality" : "something went wrong while reading it";
      setError(`Couldn't make your file: ${why}. Nothing was changed, so try again.`);
    } finally {
      setBusy(null);
    }
  };

  const title =
    step === "scope" ? "Download Your Information" : step === "choose" ? "Choose Information" : step === "method" ? "Choose method to save your data" : "Create Files to download";
  const description =
    step === "scope"
      ? "Your information includes the things you've made and shared and your activity, as this browser keeps them."
      : step === "choose"
        ? "Choose the information that you want to download."
        : step === "method"
          ? "Download a copy to your own device."
          : "Your file is made in this browser and downloads straight away. Nothing is sent anywhere.";

  const footer = (
    <div className="flex w-full flex-wrap items-center justify-between gap-[8px]">
      <span className="text-sm leading-sm text-text-tertiary">
        Step {at + 1} of {steps.length}
      </span>
      <div className="flex flex-wrap justify-end gap-[8px]">
        {at === 0 ? (
          <Button type="button" hierarchy="secondary" size="lg" className={TAP} onClick={onClose} disabled={!!busy}>
            Cancel
          </Button>
        ) : (
          <Button type="button" hierarchy="secondary" size="lg" className={TAP} onClick={back} disabled={!!busy}>
            Back
          </Button>
        )}
        {step === "create" ? (
          <Button type="button" hierarchy="primary" size="lg" className={TAP} loading={!!busy} onClick={create}>
            Create File to download
          </Button>
        ) : (
          <Button
            type="button"
            hierarchy="primary"
            size="lg"
            className={TAP}
            aria-disabled={(step === "choose" && picked.length === 0) || undefined}
            aria-describedby={step === "choose" && pickTried && picked.length === 0 ? pickErrorId : undefined}
            onClick={next}
          >
            Continue
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <ModalFrame
        open={open}
        onClose={() => {
          if (!busy) onClose();
        }}
        closeUnavailable={!!busy}
        covered={sub !== null}
        size="sm"
        sheet
        title={title}
        description={description}
        footer={footer}
      >
        {step === "scope" && (
          <div role="radiogroup" aria-label="What to download" className="flex flex-col gap-[2px]">
            <ChoiceRow
              name={name}
              checked={scope === "available"}
              onChange={() => setScope("available")}
              option={{ value: "available", label: "Available Information", hint: "Everything this browser keeps: your information and your activity" }}
            />
            <ChoiceRow
              name={name}
              checked={scope === "specific"}
              onChange={() => setScope("specific")}
              option={{ value: "specific", label: "Specific Information", hint: "Only the information you choose" }}
            />
          </div>
        )}

        {step === "choose" && (
          <fieldset className="m-0 flex flex-col gap-[2px] border-0 p-0">
            <legend className="sr-only">Information to download</legend>
            {pickTried && picked.length === 0 && (
              <p id={pickErrorId} role="alert" className="m-0 px-[12px] pb-[8px] text-md leading-md text-text-error">
                Choose at least one kind of information.
              </p>
            )}
            {CATEGORIES.map((c) => {
              const on = picked.includes(c.id);
              return (
                <label
                  key={c.id}
                  className="flex min-h-[44px] cursor-pointer items-start gap-[12px] rounded-lg px-[12px] py-[10px] transition-colors duration-fast hover:bg-bg-subtle has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-border-focus"
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={on}
                    onChange={() => setPicked((p) => (on ? p.filter((x) => x !== c.id) : [...p, c.id]))}
                  />
                  <Checkbox checked={on} decorative className="mt-[2px]" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-md font-medium leading-md text-text-primary">{c.label}</span>
                    <span className="text-md leading-md text-text-secondary">{c.hint}</span>
                    {summary && <span className="text-sm leading-sm text-text-tertiary">{summary[c.id]}</span>}
                  </span>
                </label>
              );
            })}
          </fieldset>
        )}

        {step === "method" && (
          <div role="radiogroup" aria-label="How to save it" className="flex flex-col gap-[2px]">
            <ChoiceRow
              name={`${name}-method`}
              checked
              onChange={() => undefined}
              option={{ value: "device", label: "Download to device", hint: "Information will save directly to your device" }}
            />
          </div>
        )}

        {step === "create" && (
          <div className="flex flex-col">
            <OptionRow label="Date Range" value={rangeLabel} onClick={() => setSub("range")} disabled={!!busy} />
            <OptionRow label="Format" value={FORMATS.find((f) => f.id === format)?.label ?? "HTML"} onClick={() => setSub("format")} disabled={!!busy} />
            <OptionRow label="Media Quality" value={MEDIA_QUALITIES.find((m) => m.id === media)?.label ?? "Medium"} onClick={() => setSub("media")} disabled={!!busy} />
            <p className="m-0 pt-[12px] text-sm leading-sm text-text-tertiary">
              {scope === "available" ? "Everything" : `${categories.length} of ${CATEGORY_IDS.length} kinds of information`} ·{" "}
              {MEDIA_QUALITIES.find((m) => m.id === media)?.hint}
            </p>
            <div aria-live="polite" className="flex flex-col gap-[8px] pt-[12px] empty:hidden">
              {busy && (
                <>
                  <p className="m-0 text-md leading-md text-text-secondary">
                    {busy.label}
                    {busy.total > 1 ? ` (${Math.min(busy.done + 1, busy.total)} of ${busy.total})` : ""}…
                  </p>
                  <ProgressBar value={busy.total > 1 ? (busy.done / busy.total) * 100 : 100} label="Making your file" />
                </>
              )}
              {error && (
                <p role="alert" className="m-0 text-md leading-md text-text-error">
                  {error}
                </p>
              )}
            </div>
          </div>
        )}
      </ModalFrame>

      <RangeDialog
        open={sub === "range"}
        value={range}
        custom={custom}
        onClose={() => setSub(null)}
        onSave={(r, c) => {
          setRange(r);
          setCustom(c);
          setError(null);
          setSub(null);
        }}
      />
      <SettingsChoiceDialog
        open={sub === "format"}
        title="Format"
        options={FORMATS.map((f) => ({ value: f.id, label: f.label, hint: f.hint }))}
        value={format}
        saveLabel="Save"
        onClose={() => setSub(null)}
        onSave={(v) => setFormat(v)}
      />
      <SettingsChoiceDialog
        open={sub === "media"}
        title="Media Quality"
        options={MEDIA_QUALITIES.map((m) => ({ value: m.id, label: m.label, hint: m.hint }))}
        value={media}
        saveLabel="Save"
        onClose={() => setSub(null)}
        onSave={(v) => setMedia(v)}
      />
    </>
  );
}

function OptionRow({ label, value, onClick, disabled }: { label: string; value: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="-mx-[8px] flex min-h-[52px] items-center justify-between gap-[16px] rounded-lg border-b border-solid border-border px-[8px] py-[12px] text-left outline-none transition-colors duration-fast last-of-type:border-b-0 hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed"
    >
      <span className="flex min-w-0 flex-col">
        <span className="text-md font-medium leading-md text-text-primary">{label}</span>
        <span className="text-md leading-md text-text-secondary">{value}</span>
      </span>
      <span aria-hidden className="shrink-0 text-text-tertiary">
        <Icon icon={ArrowRight01Icon} size={20} />
      </span>
    </button>
  );
}

/** Figma's Date Range modal (27452:53847): the ranges, and two dates under Custom. */
function RangeDialog({
  open,
  value,
  custom,
  onClose,
  onSave,
}: {
  open: boolean;
  value: RangeId;
  custom: { from: string; to: string };
  onClose: () => void;
  onSave: (r: RangeId, c: { from: string; to: string }) => void;
}) {
  const [draft, setDraft] = React.useState<RangeId>(value);
  const [dates, setDates] = React.useState(custom);
  const [tried, setTried] = React.useState(false);
  const name = React.useId();
  const errId = React.useId();
  const [seenOpen, setSeenOpen] = React.useState(open);
  if (seenOpen !== open) {
    setSeenOpen(open);
    if (open) {
      setDraft(value);
      setDates(custom);
      setTried(false);
    }
  }
  const bad = draft === "custom" && rangeBounds("custom", 0, dates) === null;
  const save = () => {
    if (bad) {
      setTried(true);
      return;
    }
    onSave(draft, draft === "custom" ? dates : custom);
  };
  return (
    <ModalFrame
      open={open}
      onClose={onClose}
      size="sm"
      sheet
      title="Date Range"
      footer={
        <div className="flex w-full justify-end gap-[8px]">
          <Button type="button" hierarchy="secondary" size="lg" className={TAP} onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" hierarchy="primary" size="lg" className={TAP} aria-describedby={tried && bad ? errId : undefined} onClick={save}>
            Save
          </Button>
        </div>
      }
    >
      <div role="radiogroup" aria-label="Date Range" className="flex flex-col gap-[2px]">
        {RANGES.map((r) => (
          <ChoiceRow key={r.id} name={name} option={{ value: r.id, label: r.label }} checked={draft === r.id} onChange={setDraft} />
        ))}
      </div>
      {draft === "custom" && (
        <div className="grid grid-cols-2 gap-[12px] px-[12px] pt-[8px] max-sm:grid-cols-1">
          <label className="flex flex-col gap-[6px] text-md font-medium leading-md text-text-primary">
            From
            <TextInput type="date" size="xl" value={dates.from} max={dates.to || undefined} invalid={tried && bad} onValueChange={(v) => setDates((d) => ({ ...d, from: v }))} />
          </label>
          <label className="flex flex-col gap-[6px] text-md font-medium leading-md text-text-primary">
            To
            <TextInput type="date" size="xl" value={dates.to} min={dates.from || undefined} invalid={tried && bad} onValueChange={(v) => setDates((d) => ({ ...d, to: v }))} />
          </label>
          {tried && bad && (
            <p id={errId} role="alert" className="col-span-full m-0 text-md leading-md text-text-error">
              Choose a start and an end date, the start first.
            </p>
          )}
        </div>
      )}
    </ModalFrame>
  );
}
