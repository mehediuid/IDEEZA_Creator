"use client";

// Step 1, Import path — three discrete files, not a generic upload.
//
// Each field is parsed for a specific purpose, which is why they are separate:
// the symbol file feeds the pin list, the footprint file feeds the pads and
// copper geometry, the STEP file feeds the 3D body. One of symbol/footprint is
// required; the STEP is optional. Parsing reports on whatever combination
// arrived, including a pin/pad mismatch when only one of the two came through.

import * as React from "react";
import { Attachment01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { Banner, Button } from "@/components/ideeza";
import { Icon } from "@/components/dashboard/icon";
import { FootprintThumb, SymbolThumb } from "./package-thumbs";
import { usePackageActions, usePackageDraft } from "@/lib/package/store";
import { electricalPads, fpPads, symPins, type PackageDraft } from "@/lib/package/types";
import { componentBodyColor } from "@/lib/pcb/pcb-3d";
import { parseKicadMod, parseKicadSym, parseStepHeader } from "@/lib/package/kicad";
import { StepHeading } from "./editor-chrome";

type Slot = "symbol" | "footprint" | "step";

const SLOTS: { id: Slot; label: string; ext: string; feeds: string; required: string }[] = [
  { id: "symbol", label: "Schematic Symbol File", ext: ".kicad_sym", feeds: "Pin list for the Symbol step", required: "One of Symbol/Footprint required" },
  { id: "footprint", label: "PCB Footprint File", ext: ".kicad_mod", feeds: "Pads + copper geometry", required: "One of Symbol/Footprint required" },
  { id: "step", label: "STEP File", ext: ".step", feeds: "3D body in the Placement step", required: "Optional" },
];

export function ImportFields() {
  const draft = usePackageDraft();
  const actions = usePackageActions();
  const [files, setFiles] = React.useState<Partial<Record<Slot, File>>>({});
  const [busy, setBusy] = React.useState(false);
  const [failed, setFailed] = React.useState<string | null>(null);
  const refs = {
    symbol: React.useRef<HTMLInputElement>(null),
    footprint: React.useRef<HTMLInputElement>(null),
    step: React.useRef<HTMLInputElement>(null),
  };

  const canParse = !!(files.symbol || files.footprint);

  const parse = async () => {
    setBusy(true);
    setFailed(null);
    try {
      const notes: string[] = [];
      let symbolObjs = draft.symbol;
      let footprintObjs = draft.footprint;
      let prefix = draft.prefix;
      let value = draft.value;
      let mounting = draft.mounting;

      if (files.symbol) {
        const sym = parseKicadSym(await files.symbol.text());
        symbolObjs = sym.objects;
        if (sym.prefix) prefix = sym.prefix;
        if (sym.value) value = sym.value;
        notes.push(...sym.skipped);
        if (!sym.pins) notes.push("the symbol file produced no numbered pins");
      }
      if (files.footprint) {
        const fp = parseKicadMod(await files.footprint.text());
        footprintObjs = fp.objects;
        if (fp.mounting) mounting = fp.mounting;
        notes.push(...fp.skipped);
        if (!fp.pads) notes.push("the footprint file produced no pads");
      }
      if (files.step) {
        const st = parseStepHeader(await files.step.text(), files.step.name);
        notes.push(
          st.recognised
            ? `STEP recognised (${st.solids} solid${st.solids === 1 ? "" : "s"}) — the 3D step still places a box body, which needs a STEP loader`
            : "that STEP file has no ISO-10303-21 header — it may not be a STEP file",
        );
      }

      const pins = symbolObjs.filter((o) => o.kind === "pin").length;
      const pads = footprintObjs.filter((o) => o.kind === "pad" && o.padKind !== "Mounting").length;

      actions.patch({
        symbol: symbolObjs,
        footprint: footprintObjs,
        prefix,
        value,
        mounting,
        body: { ...draft.body, color: componentBodyColor(prefix) },
        imported: {
          symbol: files.symbol?.name ?? null,
          footprint: files.footprint?.name ?? null,
          step: files.step?.name ?? null,
          pins,
          pads,
          notes,
        },
      });
    } catch {
      setFailed("That file couldn't be read. Check it is a text KiCad file and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-[var(--spacing-10)]">
      <StepHeading title="Import an existing part">
        Three discrete files, each parsed for a specific purpose — this is deliberately not “attach any CAD file and
        hope”. One of the symbol or footprint is required; the STEP body is optional.
      </StepHeading>

      {failed ? <Banner tone="attention">{failed}</Banner> : null}

      <div className="flex flex-col gap-[var(--spacing-5)]">
        {SLOTS.map((s) => {
          const f = files[s.id];
          return (
            <div
              key={s.id}
              className="flex flex-wrap items-center gap-[var(--spacing-6)] rounded-[var(--radius-xl)] border border-border bg-bg-surface p-[var(--spacing-7)]"
              style={{ borderWidth: "var(--border-width-1)" }}
            >
              <div className="flex min-w-[220px] flex-1 flex-col gap-[var(--spacing-1)]">
                <span className="font-display text-md font-semibold text-text-primary">{s.label}</span>
                <span className="font-display text-sm font-regular text-text-secondary">{s.feeds}</span>
                <span className="font-mono text-2xs text-text-tertiary">
                  {s.ext} · {s.required}
                </span>
              </div>

              <input
                ref={refs[s.id]}
                type="file"
                accept={s.ext}
                className="sr-only"
                tabIndex={-1}
                onChange={(e) => {
                  const picked = e.target.files?.[0];
                  if (picked) setFiles((cur) => ({ ...cur, [s.id]: picked }));
                  e.target.value = "";
                }}
              />

              {f ? (
                <span className="inline-flex max-w-full items-center gap-[var(--spacing-4)] rounded-[var(--radius-full)] bg-bg-subtle px-[var(--spacing-5)] py-[var(--spacing-3)]">
                  <Icon icon={Attachment01Icon} size={14} />
                  <span className="max-w-[220px] truncate font-mono text-2xs text-text-secondary">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => setFiles((cur) => ({ ...cur, [s.id]: undefined }))}
                    aria-label={`Remove ${f.name}`}
                    className="inline-flex h-[18px] w-[18px] shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-full)] text-text-tertiary outline-none hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
                  >
                    <Icon icon={Cancel01Icon} size={12} />
                  </button>
                </span>
              ) : null}

              <Button hierarchy="secondary" size="md" onClick={() => refs[s.id].current?.click()}>
                {f ? "Replace" : "Choose file"}
              </Button>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-[var(--spacing-6)]">
        <Button hierarchy="primary" size="lg" onClick={parse} disabled={!canParse || busy} loading={busy}>
          Parse files
        </Button>
        <span className="font-display text-sm text-text-tertiary">
          {canParse ? "Parsed results are shown before anything is committed." : "Attach a symbol or a footprint file to parse."}
        </span>
      </div>
    </div>
  );
}

export function ImportResult() {
  const draft = usePackageDraft();
  const actions = usePackageActions();
  const imp = draft.imported;
  if (!imp) return null;

  const pins = symPins(draft).length;
  const pads = electricalPads(draft).length;
  const both = !!imp.symbol && !!imp.footprint;
  const matched = both && pins > 0 && pins === pads;

  return (
    <div className="flex flex-col gap-[var(--spacing-10)]">
      <StepHeading title="Parsed">
        This is what came out of the files. Nothing is final — the Symbol and Footprint steps are next, and both are
        fully editable.
      </StepHeading>

      <Banner tone={matched ? "good" : "attention"}>
        {matched
          ? `${pins} pins and ${pads} pads parsed, and they match`
          : both
            ? `${pads} electrical pad${pads === 1 ? "" : "s"} vs. ${pins} pin${pins === 1 ? "" : "s"} — review on the Footprint step before saving`
            : imp.symbol
              ? `${pins} pin${pins === 1 ? "" : "s"} parsed, but no footprint file came through — you will need to add pads on the Footprint step`
              : `${pads} pad${pads === 1 ? "" : "s"} parsed, but no symbol file came through — you will need to add pins on the Symbol step`}
      </Banner>

      <div className="grid grid-cols-1 gap-[var(--spacing-6)] md:grid-cols-2">
        <PreviewCard title="Symbol" file={imp.symbol} empty="No symbol file">
          <SymbolThumb draft={draft} />
        </PreviewCard>
        <PreviewCard title="Footprint" file={imp.footprint} empty="No footprint file">
          <FootprintThumb draft={draft} />
        </PreviewCard>
      </div>

      <dl className="grid grid-cols-2 gap-[var(--spacing-6)] rounded-[var(--radius-xl)] border border-border bg-bg-surface p-[var(--spacing-7)] sm:grid-cols-4">
        {[
          ["Pins", String(pins)],
          ["Electrical pads", String(pads)],
          ["Mount", draft.mounting],
          ["3D body", imp.step ?? "—"],
        ].map(([k, v]) => (
          <div key={k} className="flex min-w-0 flex-col gap-[var(--spacing-2)]">
            <dt className="font-display text-2xs font-semibold uppercase tracking-caps text-text-tertiary">{k}</dt>
            <dd className="truncate font-display text-md font-semibold text-text-primary">{v}</dd>
          </div>
        ))}
      </dl>

      {imp.notes.length ? (
        <div className="flex flex-col gap-[var(--spacing-3)]">
          <h3 className="font-display text-2xs font-semibold uppercase tracking-caps text-text-tertiary">
            What the files carried that this flow does not
          </h3>
          <ul role="list" className="flex flex-col gap-[var(--spacing-2)]">
            {imp.notes.map((n, i) => (
              <li key={i} className="font-display text-sm font-regular leading-relaxed text-text-secondary">
                — {n}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <Button hierarchy="secondary" size="md" onClick={() => actions.patch({ imported: null })}>
          Attach different files
        </Button>
      </div>
    </div>
  );
}

function PreviewCard({
  title,
  file,
  empty,
  children,
}: {
  title: string;
  file: string | null;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-[var(--spacing-4)] rounded-[var(--radius-xl)] border border-border bg-bg-surface p-[var(--spacing-7)]">
      <div className="flex items-baseline justify-between gap-[var(--spacing-4)]">
        <h3 className="font-display text-2xs font-semibold uppercase tracking-caps text-text-tertiary">{title}</h3>
        <span className="min-w-0 truncate font-mono text-2xs text-text-tertiary">{file ?? empty}</span>
      </div>
      {file ? children : <div className="h-[170px] rounded-[var(--radius-lg)] bg-bg-subtle" />}
    </div>
  );
}

/** Auto-fitted thumbnails of what actually landed in the draft — the same
 *  objects the next two steps will edit, not a picture of the file. */