"use client";

// The spec sheet's sections below Size — what powers the product, what moves,
// senses, controls and shows, its radio, its case, its brain and what is
// inside it — each one a set of controls over the parts the build will use
// (lib/spec/edits.ts), and only the ones this product has. A charger says
// what it charges and a spare pack what pack it is, in place of a power
// source neither has. Every choice says what it is for before its part
// number. The concept image stays as the look: the parts change here, the
// drawing does not. Every edit applies as it is made through the sheet's
// `edit`, which also says what happened — and what it did elsewhere — to a
// screen reader, and puts the keyboard where the change shows.

import * as React from "react";
import { Add01Icon, Alert02Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { NumberInput } from "@/components/ideeza/number-input";
import { Segmented } from "@/components/ideeza/segmented";
import { SelectMenu, type SelectOption } from "@/components/ideeza/select-menu";
import type { ConceptPart } from "@/lib/create/concept";
import type { ProductLink } from "@/lib/create/project-state";
import { BATTERIES, batteryOf } from "@/lib/spec/batteries";
import { qtyOf } from "@/lib/spec/bodies";
import {
  ADDABLE,
  ADD_GROUPS,
  CHARGE_PORTS,
  ENVIRONMENTS,
  MCUS,
  MOTORS,
  MOUNTINGS,
  RADIOS,
  SERVOS,
  chargePortOf,
  driverWord,
  environmentOf,
  isChargePort,
  isDriveMotor,
  isGasket,
  isMcu,
  isMotorDriver,
  isMounting,
  isRadioPart,
  isServo,
  mcuKeyOf,
  motorsOf,
  mountingOf,
  partRole,
  radioChoices,
  radioKeyOf,
  radioSub,
  servosOf,
  wallNote,
} from "@/lib/spec/catalog";
import { canAddBrain, deriveSpec, productKind, smallestPack } from "@/lib/spec/derive";
import {
  CHIP_ROLES,
  addableFor,
  asPart,
  chargePortChoices,
  removePart,
  resetSection,
  sectionEdited,
  withBrain,
  withElectronics,
  withSupply,
  withoutBrain,
  withoutElectronics,
  type ChipRole,
} from "@/lib/spec/edits";
import {
  DOES_LABEL,
  chargesOf,
  insideOf,
  readableName,
  replacedNotRecharged,
} from "@/lib/spec/facts";
import { MATERIAL_NOTE, needsNoPower } from "@/lib/spec/format";
import { COUNT_MAX, WALL_MAX_MM, WALL_MIN_MM, WALL_STEP_MM, cleanEdits } from "@/lib/spec/hints";
import {
  ENVIRONMENT_KEYS,
  MATERIALS,
  MCU_KEYS,
  MOTOR_KEYS,
  MOUNTING_KEYS,
  SERVO_KEYS,
  type BatteryKey,
  type ChargePortKey,
  type EnvironmentKey,
  type McuKey,
  type MotorKey,
  type MountingKey,
  type RadioKey,
  type ServoKey,
  type SpecEdits,
} from "@/lib/spec/types";
import { currentLabel, mm3, runtimeLabel } from "@/lib/spec/units";
import { OUTLINE_BUTTON } from "./buttons";
import { SPEC_SHEET_ID } from "./spec-panel";
import type { SheetProduct } from "./spec-sheet";

/** Whether the maker changed a section — the only thing its tag says. What
 *  the concept, the AI or the rules put there reads as one word: the maker
 *  needs to know whether they set it, not which of three sources did. */
export const tagFor = (edited: boolean) => (edited ? "You set" : "Suggested");

/** An edit, with what to tell a screen reader it did, where the keyboard
 *  goes once it has rendered — the control that was pressed is often gone —
 *  and what caused it, which the knock-on line names ("Radio → Wi-Fi: …").
 *  `size` marks a change to the size itself: the fields show it, so the
 *  knock-on line is cleared rather than restating it. */
export type Edit = (
  next: SpecEdits,
  after?: { say?: string; focus?: string; cause?: string; size?: boolean },
) => void;

type Props = {
  product: SheetProduct;
  edit?: Edit;
  /** Selects another product of the project — its sheet opens in place. */
  onOpen?: (productId: string) => void;
};

export const sectionId = (s: string) => `${SPEC_SHEET_ID}-${s}`;
const headingId = (s: string) => `${sectionId(s)}-title`;

/** The keyboard lands on a section's heading after its Reset — the button
 *  it pressed is gone, and the heading is where the section starts again. */
const focusHeading = (s: string) => headingId(s);

// 24 px tall to the eye; the press reaches 10 px above and below, so a
// thumb finds it (44 px) without the header row growing on a phone.
export const QUIET_BUTTON =
  "relative inline-flex min-h-[24px] items-center rounded-sm px-[4px] font-medium text-text-secondary underline-offset-2 outline-none after:absolute after:inset-x-0 after:-inset-y-[10px] after:content-[''] hover:text-text-primary hover:underline focus-visible:ring-2 focus-visible:ring-border-focus";

export function Section({
  id,
  title,
  tag,
  reset,
  children,
}: {
  id: string;
  title: string;
  /** "You set" or "Suggested"; none on a section there is nothing to set in. */
  tag?: string;
  /** A quiet way back to the concept, while the section has edits. */
  reset?: { label?: string; name: string; onReset: () => void };
  children: React.ReactNode;
}) {
  // A rule between sections, on the sheet's own surface — not a box per
  // section, which would be a card in a sheet.
  return (
    <section
      aria-labelledby={headingId(id)}
      className="flex flex-col gap-[10px] border-t border-solid border-border py-[20px] first:border-t-0"
    >
      <div className="flex items-baseline justify-between gap-[12px]">
        <h3
          id={headingId(id)}
          tabIndex={-1}
          className="text-md font-semibold text-text-primary outline-none"
        >
          {title}
        </h3>
        <div className="flex shrink-0 items-baseline gap-[6px] text-xs text-text-tertiary">
          {tag && <span>{tag}</span>}
          {tag && reset && <span aria-hidden>·</span>}
          {reset && (
            <button
              type="button"
              onClick={reset.onReset}
              aria-label={`${reset.label ?? "Reset"}: ${reset.name}`}
              className={`-mr-[4px] ${QUIET_BUTTON}`}
            >
              {reset.label ?? "Reset"}
            </button>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

/** A visible label over its control. A SelectMenu's trigger is a button,
 *  which a label can name and click. */
function Field({
  id,
  label,
  children,
  className = "",
}: {
  id: string;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex min-w-0 flex-col gap-[4px] ${className}`}>
      <label htmlFor={id} className="w-fit text-sm text-text-secondary">
        {label}
      </label>
      {children}
    </div>
  );
}

/** The same, for a Segmented: a radiogroup is named by its own label, so the
 *  words above it are for the eye only. */
function Choice({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-[4px]">
      <span aria-hidden className="text-sm text-text-secondary">
        {label}
      </span>
      {children}
    </div>
  );
}

function ReadOnly({ children }: { children: React.ReactNode }) {
  return <p className="text-md text-text-primary">{children}</p>;
}

type Tone = "plain" | "warn" | "error";

/** A line under a control. A warning or an error carries its icon too — the
 *  colour alone is not the message. */
function Note({ children, tone = "plain" }: { children: React.ReactNode; tone?: Tone }) {
  const ink = tone === "error" ? "text-text-error" : tone === "warn" ? "text-text-warning" : "text-text-tertiary";
  return (
    <p className={`text-sm ${ink}`}>
      {tone !== "plain" && (
        <span aria-hidden className="mr-[6px] inline-flex translate-y-[2px]">
          <Icon icon={Alert02Icon} size={14} />
        </span>
      )}
      {children}
    </p>
  );
}

/** Label and value rows, every value starting on the same line — a wrapping
 *  row per pair dropped a short value under its label. */
function Rows({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] text-sm">
      {rows.map(([label, value], i) => (
        <React.Fragment key={label}>
          <dt
            className={[
              "py-[6px] pr-[16px] text-text-tertiary",
              i > 0 ? "border-t border-solid border-border" : "",
            ].join(" ")}
          >
            {label}
          </dt>
          <dd
            className={[
              "min-w-0 py-[6px] text-text-primary",
              i > 0 ? "border-t border-solid border-border" : "",
            ].join(" ")}
          >
            {value}
          </dd>
        </React.Fragment>
      ))}
    </dl>
  );
}

/** What this product works with in the project, each with a way to open the
 *  other's sheet: "Talks to Remote Controller — both use nRF24L01.", or in
 *  the error tone what no longer works and how to put it right. */
function LinkNotes({ links, onOpen }: { links: ProductLink[]; onOpen?: (productId: string) => void }) {
  if (!links.length) return null;
  return (
    <>
      {links.map((l) => (
        <div key={`${l.about}-${l.otherId}`} className="flex flex-col items-start gap-[2px]">
          <Note tone={l.ok ? "plain" : "error"}>{l.text}</Note>
          {onOpen && (
            <button type="button" onClick={() => onOpen(l.otherId)} className={`-ml-[4px] text-sm ${QUIET_BUTTON}`}>
              Open {l.otherName}
            </button>
          )}
        </div>
      ))}
    </>
  );
}

/** A part's name as it reads in a sentence: "2 × N20 gear motor" — and a
 *  part the model named only by its designator, by what kind it is. */
function counted(p: ConceptPart): string {
  const m = p.name.match(/^(.*?)\s*\(x(\d+)\)$/);
  return m ? `${m[2]} × ${m[1]}` : readableName(p);
}

/** What a picker shows for a part the catalog doesn't list: the concept's
 *  own, said to be the concept's — the list holds the catalog's choices. */
const fromConcept = (p: ConceptPart | undefined, none: string) =>
  p ? `From the concept: ${p.name}` : none;

/** −/+ over a whole number 0–8. A half-typed value stays in the field; only
 *  a whole count in range is an edit, and leaving the field puts back the
 *  count the spec holds. */
function CountField({
  id,
  value,
  what,
  disabled,
  describedBy,
  onCommit,
}: {
  id: string;
  value: number;
  /** What it counts, for its −/+ buttons' names — "motor count". */
  what: string;
  disabled?: boolean;
  describedBy?: string;
  onCommit: (n: number) => void;
}) {
  const [draft, setDraft] = React.useState(String(value));
  const [seeded, setSeeded] = React.useState(value);
  if (seeded !== value) {
    setSeeded(value);
    setDraft(String(value));
  }
  return (
    <NumberInput
      id={id}
      // The height of the SelectMenu beside it.
      size="lg"
      value={draft}
      min={0}
      max={COUNT_MAX}
      disabled={disabled}
      ariaDescribedBy={describedBy}
      stepsWhat={what}
      onChange={(v) => {
        setDraft(v);
        const n = Number(v);
        if (/^\d+$/.test(v.trim()) && n <= COUNT_MAX && n !== value) onCommit(n);
      }}
      onBlur={() => setDraft(String(value))}
      className="tabular-nums"
    />
  );
}

// ───────────────────────────── Power ─────────────────────────────

type PowerMode = "battery" | "usb" | "wall";

const PACKS = BATTERIES.filter((b) => b.key !== "none" && b.key !== "adapter");

const MODE_WORD: Record<PowerMode, string> = { battery: "Battery", usb: "USB cable", wall: "Wall adapter" };

/** The pack menu: each pack with what it would give this product — its
 *  runtime here, its size, whether it is charged or replaced — worked out as
 *  if it were picked. A pack that can't give the draw can't be picked, and
 *  says why: the one place the milliamps earn their place. */
function packOptions(product: SheetProduct): SelectOption<BatteryKey>[] {
  const { edits, conceptParts, hints } = product;
  return PACKS.map((b) => {
    const s = deriveSpec(conceptParts, hints, cleanEdits(withSupply(edits, b.key, conceptParts)));
    const weak = b.maxMa < s.drawMa;
    const runtime = runtimeLabel(s.runtimeH);
    const sub = weak
      ? `Too weak for this — gives ${currentLabel(b.maxMa)}, needs ${currentLabel(s.drawMa)}`
      : [
          runtime ? `${runtime} here` : null,
          b.body ? mm3(b.body) : null,
          replacedNotRecharged(b.key) ? "replace, not recharge" : "rechargeable",
        ]
          .filter(Boolean)
          .join(" · ");
    return { label: b.label, value: b.key, sub, disabled: weak };
  });
}

const powerReset = (product: SheetProduct, edit: Edit | undefined, id: string, name: string) =>
  edit && sectionEdited(product.edits, "power", product.conceptParts)
    ? {
        name,
        onReset: () =>
          edit(resetSection(product.edits, "power", product.conceptParts), {
            say: `${name} is back to the concept's.`,
            focus: focusHeading(id),
            cause: `${name} reset`,
          }),
      }
    : undefined;

const powerLinks = (product: SheetProduct) => product.links.filter((l) => l.about === "power");

export function PowerSection({ product, edit, onOpen }: Props) {
  const { spec, edits, parts, conceptParts, hints } = product;
  const id = "power";
  const edited = sectionEdited(edits, id, conceptParts);
  const reset = powerReset(product, edit, id, "Power");

  // Nothing in it draws current: there is no pack to pick, and a list of
  // them would ask the maker to power a thing with no circuit.
  if (needsNoPower(spec) && !edited) {
    return (
      <Section id={id} title="Power">
        <ReadOnly>No power needed</ReadOnly>
        <Note>Nothing in it draws current.</Note>
      </Section>
    );
  }

  const mode: PowerMode =
    spec.battery === "none" ? "usb" : spec.battery === "adapter" ? "wall" : "battery";
  const port = chargePortOf(parts);
  const portPart = parts.find(isChargePort);
  const packId = `${sectionId(id)}-pack`;
  const portId = `${sectionId(id)}-port`;
  // A pack that is thrown away is not charged through anything.
  const replaced = mode === "battery" && replacedNotRecharged(spec.battery);
  const portLabel = mode === "battery" && !replaced ? "Charge port" : "Power port";

  // A supply comes with the socket it needs (withSupply): a wall adapter a
  // barrel jack, USB a USB port — and a barrel jack left from the wall goes
  // again when the product comes back to a pack or USB.
  const setMode = (m: PowerMode) => {
    if (!edit || m === mode) return;
    const battery: BatteryKey =
      m === "usb" ? "none" : m === "wall" ? "adapter" : smallestPack(spec.drawMa, hints?.runtimeGoalH, hints?.useCase);
    edit(withSupply(edits, battery, conceptParts), {
      say:
        m === "battery"
          ? `Battery: ${batteryOf(battery).label}.`
          : m === "usb"
            ? "Powered over a USB cable."
            : "Powered by a wall adapter.",
      cause: `Power → ${m === "battery" ? batteryOf(battery).label : MODE_WORD[m]}`,
    });
  };

  const over = spec.drawMa > spec.budgetMa;
  const runtime = runtimeLabel(spec.runtimeH)?.replace(/^~/, "");
  const numbers = `${currentLabel(spec.drawMa)} of ${currentLabel(spec.budgetMa)}`;
  const line = over
    ? mode === "battery"
      ? `Needs more power than this gives — ${numbers}. Pick a bigger pack.`
      : mode === "usb"
        ? `Needs more power than USB gives — ${numbers}. Use a wall adapter or a battery.`
        : `Needs more power than the adapter gives — ${numbers}.`
    : mode === "usb"
      ? "No battery — it runs only while plugged in."
      : mode === "wall"
        ? "No battery — it runs only while plugged into the wall."
        : runtime
          ? replaced
            ? `Runs about ${runtime} per battery with everything on — replace, not recharge.`
            : `Runs about ${runtime} per charge with everything on — longer when it rests.`
          : "Draws almost nothing.";

  return (
    <Section
      id={id}
      // "Power", whichever it is: the choice between a battery and a cord is
      // the section's first control, so its heading can't be one of them.
      title="Power"
      tag={tagFor(edited)}
      reset={reset}
    >
      {edit ? (
        <>
          <Segmented<PowerMode>
            label="Power source"
            value={mode}
            options={(["battery", "usb", "wall"] as const).map((m) => ({ label: MODE_WORD[m], value: m }))}
            onChange={setMode}
          />
          {/* One track when the port is alone, so it fills the row; the
              sheet's own width decides this, never the window's. */}
          <div
            className={
              mode === "battery"
                ? "grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-[8px]"
                : "grid grid-cols-[minmax(0,1fr)] gap-[8px]"
            }
          >
            {mode === "battery" && (
              <Field id={packId} label="Pack">
                {/* SelectMenu, not Select: its list is drawn on the popover
                    layer, above the sheet — Select's sits under it. */}
                <SelectMenu<BatteryKey>
                  id={packId}
                  ariaLabel="Pack"
                  placeholder="Choose a pack"
                  value={spec.battery}
                  options={packOptions(product)}
                  onChange={(v) =>
                    edit(withSupply(edits, v, conceptParts), {
                      say: `Battery: ${batteryOf(v).label}.`,
                      cause: `Pack → ${batteryOf(v).label}`,
                    })
                  }
                />
              </Field>
            )}
            <Field id={portId} label={portLabel}>
              <SelectMenu<ChargePortKey>
                id={portId}
                ariaLabel={portLabel}
                placeholder={fromConcept(portPart, "Choose a port")}
                value={port}
                // Plugged in, the power comes through the port, so "None" is
                // a pack's alone; a barrel jack is the wall's.
                options={chargePortChoices(spec.battery, conceptParts).map((k) => ({
                  label: CHARGE_PORTS[k].label,
                  value: k,
                }))}
                onChange={(v) =>
                  edit({ ...edits, chargePort: v }, {
                    say: v === "none" ? "No port." : `${CHARGE_PORTS[v].label} port.`,
                    cause: `${portLabel} → ${CHARGE_PORTS[v].label}`,
                  })
                }
              />
            </Field>
          </div>
        </>
      ) : (
        <ReadOnly>
          {batteryOf(spec.battery).label}
          {portPart ? ` · ${readableName(portPart)}` : ""}
        </ReadOnly>
      )}
      {/* A port set to None on something the cable powers — an older edit
          can still hold one. */}
      {spec.noUsbPort && <Note tone="warn">USB powered, but nothing takes the power in — pick a port.</Note>}
      <Note tone={over ? "error" : "plain"}>{line}</Note>
      <LinkNotes links={powerLinks(product)} onOpen={onOpen} />
    </Section>
  );
}

/** A charger's cells in words a maker knows them by. */
const CELL_WORDS: Record<string, string> = {
  "1S Li-Po": "1S Li-Po (one cell, 3.7 V)",
  "2S Li-Po": "2S Li-Po (two cells, 7.4 V)",
  "3S Li-Po": "3S Li-Po (three cells, 11.1 V)",
  "AA cells": "AA cells",
};

/** A charger's section, in place of a power source it isn't choosing: what
 *  it charges, what it plugs into, and whether that is the pack of the
 *  product it is for. No draw — it is the thing that gives the power. */
export function ChargesSection({ product, edit, onOpen }: Props) {
  const { spec, edits, parts, conceptParts } = product;
  const id = "charges";
  const charges = chargesOf(parts) ?? chargesOf(conceptParts);
  const port = chargePortOf(parts);
  const portPart = parts.find(isChargePort);
  const portId = `${sectionId(id)}-port`;
  const cell = charges ? (CELL_WORDS[charges.cell] ?? charges.cell) : "Batteries";
  return (
    <Section
      id={id}
      title="Charges"
      tag={tagFor(sectionEdited(edits, "power", conceptParts))}
      reset={powerReset(product, edit, id, "Charges")}
    >
      <ReadOnly>{cell}</ReadOnly>
      {edit ? (
        <Field id={portId} label="Plugs into">
          <SelectMenu<ChargePortKey>
            id={portId}
            ariaLabel="Plugs into"
            placeholder={fromConcept(portPart, "Choose a port")}
            value={port}
            options={chargePortChoices(spec.battery, conceptParts).map((k) => ({
              label: CHARGE_PORTS[k].label,
              value: k,
            }))}
            onChange={(v) =>
              edit({ ...edits, chargePort: v }, {
                say: `Plugs into ${CHARGE_PORTS[v].label}.`,
                cause: `Plugs into → ${CHARGE_PORTS[v].label}`,
              })
            }
          />
        </Field>
      ) : (
        <ReadOnly>Plugs into {port && port !== "none" ? CHARGE_PORTS[port].label : (charges?.port ?? "nothing")}</ReadOnly>
      )}
      <LinkNotes links={powerLinks(product)} onOpen={onOpen} />
    </Section>
  );
}

/** A spare pack's section: the pack it is and what it plugs in with — it is
 *  the power, so there is no battery, USB or wall adapter to choose — and
 *  whether it still swaps into the product it is a spare for. */
export function PackSection({ product, edit, onOpen }: Props) {
  const { spec, edits, parts, conceptParts } = product;
  const id = "pack";
  const packId = `${sectionId(id)}-select`;
  const pack = batteryOf(spec.battery);
  // What its lead ends in: the concept's own connector, not a case fitting.
  const connector = parts.find(
    (p) => p.category === "Connector & mech" && !isMounting(p) && !isGasket(p),
  );
  const links = powerLinks(product);
  return (
    <Section
      id={id}
      title="Pack"
      tag={tagFor(sectionEdited(edits, "power", conceptParts))}
      reset={powerReset(product, edit, id, "Pack")}
    >
      {edit ? (
        <Field id={packId} label="Pack">
          <SelectMenu<BatteryKey>
            id={packId}
            ariaLabel="Pack"
            placeholder="Choose a pack"
            value={spec.battery === "none" || spec.battery === "adapter" ? null : spec.battery}
            options={packOptions(product)}
            onChange={(v) =>
              edit(withSupply(edits, v, conceptParts), {
                say: `Pack: ${batteryOf(v).label}.`,
                cause: `Pack → ${batteryOf(v).label}`,
              })
            }
          />
        </Field>
      ) : (
        <ReadOnly>{pack.label}</ReadOnly>
      )}
      <Rows rows={[["Plugs in with", connector ? readableName(connector) : "Nothing named yet"]]} />
      {links.length ? (
        <LinkNotes links={links} onOpen={onOpen} />
      ) : (
        pack.mAh > 0 && (
          <Note>
            {pack.mAh} mAh at {pack.volts} V
            {replacedNotRecharged(spec.battery) ? " — replace, not recharge." : "."}
          </Note>
        )
      )}
    </Section>
  );
}

// ───────────────────────────── Brain ─────────────────────────────

export const brainSelectId = `${sectionId("brain")}-mcu`;
export const addElectronicsId = `${sectionId("electronics")}-add`;
const addChipId = `${sectionId("brain")}-add`;

export function BrainSection({ product, edit }: Props) {
  const { edits, parts, conceptParts } = product;
  const id = "brain";
  const chip = parts.find(isMcu);
  if (!chip) {
    // Electronics with nothing to run them — a charger, a spare pack — can
    // be given a chip, which opens its radio and the parts it can run.
    if (!canAddBrain(parts)) return null;
    return (
      <Section id={id} title="Brain">
        <ReadOnly>No chip — add one to give it sensors, a screen or wireless</ReadOnly>
        {edit && (
          <div>
            <button
              id={addChipId}
              type="button"
              className={OUTLINE_BUTTON}
              onClick={() =>
                edit(withBrain(edits), {
                  say: "Added an ESP32-C3 — the sheet now shows its radio, and parts can be added.",
                  focus: brainSelectId,
                  cause: "Added a chip",
                })
              }
            >
              <Icon icon={Add01Icon} size={16} />
              Add a chip
            </button>
          </div>
        )}
      </Section>
    );
  }
  const key = mcuKeyOf(parts);
  // Electronics a plate was given are undone as one thing — taking the chip
  // out alone would leave its port on a board of its own.
  const givenElectronics = productKind(conceptParts) === "mechanical";
  // A chip a charger or a pack was given comes out with its radio, by its
  // own button — Brain's Reset alone would leave the radio's module behind.
  const givenChip = canAddBrain(conceptParts) && !!edits.mcu;
  const edited = givenElectronics || givenChip || sectionEdited(edits, id, conceptParts);
  const reset =
    edit && edited && !givenElectronics && !givenChip
      ? {
          name: "Brain",
          onReset: () =>
            edit(resetSection(edits, id, conceptParts), {
              say: "The brain is back to the concept's.",
              focus: focusHeading(id),
              cause: "Brain reset",
            }),
        }
      : undefined;
  return (
    <Section id={id} title="Brain" tag={tagFor(edited)} reset={reset}>
      {edit ? (
        <Field id={brainSelectId} label="Chip that runs it">
          <SelectMenu<McuKey>
            id={brainSelectId}
            ariaLabel="Chip that runs it"
            placeholder={fromConcept(chip, "Choose a chip")}
            value={key}
            options={MCU_KEYS.map((k) => ({ label: MCUS[k].label, value: k, sub: MCUS[k].forWhat }))}
            onChange={(v) =>
              edit({ ...edits, mcu: v }, { say: `Runs on the ${MCUS[v].label}.`, cause: `Chip → ${MCUS[v].label}` })
            }
          />
        </Field>
      ) : (
        <ReadOnly>{readableName(chip)}</ReadOnly>
      )}
      {givenElectronics && edit && (
        <div className="flex flex-wrap items-center gap-x-[12px] gap-y-[8px]">
          <button
            type="button"
            className={OUTLINE_BUTTON}
            onClick={() =>
              edit(withoutElectronics(edits), {
                say: "Electronics removed — this product has no parts to power.",
                focus: addElectronicsId,
                cause: "Removed electronics",
              })
            }
          >
            Remove electronics
          </button>
          <span className="text-sm text-text-tertiary">
            Takes the chip, its port and anything added back out.
          </span>
        </div>
      )}
      {givenChip && edit && (
        <div className="flex flex-wrap items-center gap-x-[12px] gap-y-[8px]">
          <button
            type="button"
            className={OUTLINE_BUTTON}
            onClick={() =>
              edit(withoutBrain(edits), {
                say: "Chip removed.",
                focus: addChipId,
                cause: "Removed the chip",
              })
            }
          >
            Remove chip
          </button>
          <span className="text-sm text-text-tertiary">Takes the chip and its radio back out.</span>
        </div>
      )}
    </Section>
  );
}

// ─────────────────────────── Wireless ───────────────────────────

export function WirelessSection({ product, edit, onOpen }: Props) {
  const { edits, parts, conceptParts } = product;
  const chip = parts.find(isMcu);
  // A radio needs a chip to speak through it.
  if (!chip) return null;
  const id = "connects";
  const selectId = `${sectionId(id)}-radio`;
  const edited = sectionEdited(edits, id, conceptParts);
  const key = radioKeyOf(parts);
  const radioPart = parts.find(isRadioPart);
  const options: SelectOption<RadioKey>[] = radioChoices(parts).map((c) => ({
    value: c.key,
    label: c.label,
    sub: radioSub(c.key, c.builtIn),
  }));
  const current = key ? RADIOS[key].label : radioPart ? readableName(radioPart) : "No wireless";
  return (
    <Section
      id={id}
      title="Wireless"
      tag={tagFor(edited)}
      reset={
        edit && edited
          ? {
              name: "Wireless",
              onReset: () =>
                edit(resetSection(edits, id, conceptParts), {
                  say: "The radio is back to the concept's.",
                  focus: focusHeading(id),
                  cause: "Wireless reset",
                }),
            }
          : undefined
      }
    >
      {edit ? (
        <Field id={selectId} label="Radio">
          <SelectMenu<RadioKey>
            id={selectId}
            ariaLabel="Radio"
            placeholder={fromConcept(radioPart, "Choose a radio")}
            value={key}
            options={options}
            onChange={(v) =>
              edit({ ...edits, radio: v }, {
                say: v === "none" ? "No wireless." : `Connects over ${RADIOS[v].label}.`,
                cause: `Radio → ${RADIOS[v].label}`,
              })
            }
          />
        </Field>
      ) : (
        <ReadOnly>{current}</ReadOnly>
      )}
      <LinkNotes links={product.links.filter((l) => l.about === "radio")} onOpen={onOpen} />
    </Section>
  );
}

// ───────────────────────────── Moves ─────────────────────────────

const servoSelectId = `${sectionId("moves")}-servo`;
const motorSelectId = `${sectionId("moves")}-motor`;

/** "A motor driver chip (TB6612FNG) is added to run it." — the part the
 *  motors bring with them, by what it is and then its number. */
function driverNote(driver: ConceptPart, kind: MotorKey | null, motors: number): string {
  const drivers = qtyOf(driver.name);
  const bare = driver.name.replace(/\s*\(x\d+\)$/, "");
  const known = kind ? MOTORS[kind].driver.part : undefined;
  const catalog = known && known.name === bare ? known : Object.values(MOTORS).find((m) => m.driver.part.name === bare)?.driver.part;
  const label = catalog?.label ?? bare.replace(/\s+(?:motor|stepper)?\s*driver(?:\s+(?:module|board))?$/i, "");
  const word = catalog ? driverWord(catalog) : /\besc\b/i.test(bare) ? "speed controller" : "motor driver chip";
  const them = motors > 1 ? "them" : "it";
  return drivers > 1
    ? `${drivers} ${word}s (${label}) are added to run ${them}.`
    : `A ${word} (${label}) is added to run ${them}.`;
}

export function MovesSection({ product, edit }: Props) {
  const { edits, parts, conceptParts } = product;
  const id = "moves";
  const edited = sectionEdited(edits, id, conceptParts);
  // What the edits hold, when they hold it: a count of 0 takes the motors
  // out of the parts, and the row has to stay to bring them back.
  const motors = edits.motors ?? motorsOf(parts);
  const servos = edits.servos ?? servosOf(parts);
  if (!motors && !servos) return null;
  const motorPart = parts.find(isDriveMotor);
  const servoPart = parts.find(isServo);
  const driver = parts.find(isMotorDriver);
  const motorCountId = `${sectionId(id)}-motor-count`;
  const servoCountId = `${sectionId(id)}-servo-count`;
  const motorHintId = `${sectionId(id)}-motor-hint`;

  return (
    <Section
      id={id}
      title="Moves"
      tag={tagFor(edited)}
      reset={
        edit && edited
          ? {
              name: "Moves",
              onReset: () =>
                edit(resetSection(edits, id, conceptParts), {
                  say: "What moves is back to the concept's.",
                  focus: focusHeading(id),
                  cause: "Moves reset",
                }),
            }
          : undefined
      }
    >
      {motors &&
        (edit ? (
          <>
            <div className="grid grid-cols-[minmax(0,1fr)_128px] items-end gap-[8px]">
              <Field id={motorSelectId} label="Motor">
                <SelectMenu<MotorKey>
                  id={motorSelectId}
                  ariaLabel="Motor"
                  placeholder={fromConcept(motorPart, "Choose a motor")}
                  value={motors.kind}
                  // The note under the row names the driver it brings.
                  options={MOTOR_KEYS.map((k) => ({ label: MOTORS[k].label, value: k, sub: MOTORS[k].forWhat }))}
                  onChange={(v) =>
                    edit(
                      { ...edits, motors: { kind: v, count: Math.max(1, motors.count) } },
                      { say: `${Math.max(1, motors.count)} × ${MOTORS[v].label}.`, cause: `Motor → ${MOTORS[v].label}` },
                    )
                  }
                />
              </Field>
              <Field id={motorCountId} label="How many">
                <CountField
                  id={motorCountId}
                  value={motors.count}
                  what="motor count"
                  // A count is a count of a catalog motor: one the catalog
                  // doesn't list can't be multiplied without being swapped.
                  disabled={motors.kind === null}
                  describedBy={motors.kind === null ? motorHintId : undefined}
                  onCommit={(n) =>
                    motors.kind &&
                    edit(
                      { ...edits, motors: { kind: motors.kind, count: n } },
                      {
                        say: n ? `${n} × ${MOTORS[motors.kind].label}.` : "No drive motors.",
                        cause: `Motors → ${n}`,
                      },
                    )
                  }
                />
              </Field>
            </div>
            {motors.kind === null ? (
              <Note>
                <span id={motorHintId}>Pick a motor from the list to change how many.</span>
              </Note>
            ) : driver ? (
              <Note>{driverNote(driver, motors.kind, motors.count)}</Note>
            ) : motors.count === 0 ? (
              <Note>No drive motors — the product stays where it is put.</Note>
            ) : null}
          </>
        ) : (
          <ReadOnly>{motorPart ? counted(motorPart) : "No drive motors"}</ReadOnly>
        ))}

      {servos ? (
        edit ? (
          <div className="grid grid-cols-[minmax(0,1fr)_128px] items-end gap-[8px]">
            <Field id={servoSelectId} label="Servo">
              <SelectMenu<ServoKey>
                id={servoSelectId}
                ariaLabel="Servo"
                placeholder={fromConcept(servoPart, "Choose a servo")}
                value={servos.kind}
                options={SERVO_KEYS.map((k) => ({ label: SERVOS[k].label, value: k, sub: SERVOS[k].role }))}
                onChange={(v) =>
                  edit(
                    { ...edits, servos: { kind: v, count: Math.max(1, servos.count) } },
                    { say: `${Math.max(1, servos.count)} × ${SERVOS[v].label}.`, cause: `Servo → ${SERVOS[v].label}` },
                  )
                }
              />
            </Field>
            <Field id={servoCountId} label="How many">
              <CountField
                id={servoCountId}
                value={servos.count}
                what="servo count"
                disabled={servos.kind === null}
                onCommit={(n) =>
                  servos.kind &&
                  edit(
                    { ...edits, servos: { kind: servos.kind, count: n } },
                    { say: n ? `${n} × ${SERVOS[servos.kind].label}.` : "No servos.", cause: `Servos → ${n}` },
                  )
                }
              />
            </Field>
          </div>
        ) : (
          <ReadOnly>{servoPart ? counted(servoPart) : "No servos"}</ReadOnly>
        )
      ) : (
        // The one way a moving product gains a servo: Add a part leaves
        // servos out while this section shows.
        edit && (
          <div>
            <button
              type="button"
              className={`-ml-[4px] gap-[4px] text-sm ${QUIET_BUTTON}`}
              onClick={() =>
                edit({ ...edits, servos: { kind: "sg90", count: 1 } }, {
                  say: "Added SG90 servo.",
                  focus: servoSelectId,
                  cause: "Added SG90 servo",
                })
              }
            >
              <Icon icon={Add01Icon} size={14} />
              Add a servo — steering, flaps or an arm
            </button>
          </div>
        )
      )}
    </Section>
  );
}

// ─────────────────── Senses · Controls · Shows · … ───────────────────

/** What the maker took out of a role, said once it is empty: "The Joystick
 *  is out of the build, so nothing controls it." */
function emptiedNote(role: ChipRole, edits: SpecEdits, concept: ConceptPart[]): string {
  const names = (edits.removed ?? [])
    .map((n) => concept.find((p) => p.name === n))
    .filter((p): p is ConceptPart => !!p && partRole(p) === role)
    .map(readableName);
  const many = names.length > 1;
  const list = many ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0];
  const what = list ? `${list} ${many ? "are" : "is"} out of the build` : "Nothing is left here";
  const why = role === "controls" ? ", so nothing controls it" : "";
  return `None — ${what}${why}. Reset puts ${many ? "them" : "it"} back.`;
}

const chipId = (name: string) =>
  `${SPEC_SHEET_ID}-chip-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
export const addPartId = `${SPEC_SHEET_ID}-add-part`;

/** One section per role the product has parts in — or had, before the maker
 *  took them out, so its Reset can still bring them back. Titled by the
 *  card's own words for what a part does (DOES_LABEL), one classifier. */
export function ChipSections({ product, edit }: Props) {
  const { edits, parts, conceptParts } = product;
  return (
    <>
      {CHIP_ROLES.map((role) => {
        const own = parts.filter((p) => partRole(p) === role);
        const edited = sectionEdited(edits, role, conceptParts);
        if (!own.length && !edited) return null;
        const title = DOES_LABEL[role];
        return (
          <Section
            key={role}
            id={role}
            title={title}
            tag={tagFor(edited)}
            reset={
              edit && edited
                ? {
                    name: title,
                    onReset: () =>
                      edit(resetSection(edits, role, conceptParts), {
                        say: `${title} is back to the concept's.`,
                        focus: focusHeading(role),
                        cause: `${title} reset`,
                      }),
                  }
                : undefined
            }
          >
            {own.length ? (
              <ul role="list" className="flex flex-wrap gap-[8px]">
                {own.map((p, i) => {
                  // The keyboard goes to the chip that takes this one's
                  // place, or to the add menu when it was the last.
                  const next = own[i + 1] ?? own[i - 1];
                  return (
                    <li
                      key={p.name}
                      className="inline-flex h-[32px] max-w-full items-center gap-[2px] rounded-full border border-solid border-border bg-bg-surface pl-[12px] pr-[4px] text-sm text-text-primary"
                    >
                      <span className="min-w-0 truncate">{counted(p)}</span>
                      {edit && (
                        <button
                          id={chipId(p.name)}
                          type="button"
                          aria-label={`Remove ${readableName(p)}`}
                          onClick={() =>
                            edit(removePart(edits, p, conceptParts), {
                              say: `Removed ${readableName(p)}.`,
                              focus: next ? chipId(next.name) : addPartId,
                              cause: `Removed ${readableName(p)}`,
                            })
                          }
                          // The press reaches past the circle to 32 × 44 — not
                          // so far sideways that it lands on the next chip.
                          className="relative inline-flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full text-text-tertiary outline-none transition-colors duration-fast after:absolute after:-inset-x-[4px] after:-inset-y-[10px] after:content-[''] hover:bg-bg-subtle hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
                        >
                          <Icon icon={Cancel01Icon} size={12} />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <Note>{emptiedNote(role, edits, conceptParts)}</Note>
            )}
          </Section>
        );
      })}
    </>
  );
}

/** The one "Add a part" menu, grouped the way the sections are, each part
 *  by what it is for with its part number under it — and a Moves group for
 *  a product with nothing that moves yet. Once Moves shows, it adds its own
 *  servo, so servos leave this menu; motors leave it once there are motors.
 *  Only on a product with a chip to run what it adds. */
export function AddPart({ product, edit }: Props) {
  const { edits, parts } = product;
  if (!edit || !parts.some(isMcu)) return null;
  const hasMotors = !!(edits.motors ?? motorsOf(parts));
  const hasServos = !!(edits.servos ?? servosOf(parts));
  const movesShown = hasMotors || hasServos;
  const options: SelectOption[] = [
    ...(hasMotors
      ? []
      : MOTOR_KEYS.map((k) => ({ value: `motor:${k}`, label: MOTORS[k].label, sub: MOTORS[k].forWhat, section: "Moves" }))),
    ...(movesShown
      ? []
      : SERVO_KEYS.map((k) => ({ value: `servo:${k}`, label: SERVOS[k].label, sub: SERVOS[k].role, section: "Moves" }))),
    ...ADD_GROUPS.flatMap((g) =>
      addableFor(parts)
        .filter((k) => ADDABLE[k].group === g)
        .map((k) => ({ value: `part:${k}`, label: ADDABLE[k].plain, sub: ADDABLE[k].label, section: g })),
    ),
  ];
  const add = (v: string) => {
    const [kind, key] = v.split(":");
    if (kind === "motor") {
      const k = key as MotorKey;
      edit(
        { ...edits, motors: { kind: k, count: 1 } },
        { say: `Added ${MOTORS[k].label}.`, focus: motorSelectId, cause: `Added ${MOTORS[k].label}` },
      );
    } else if (kind === "servo") {
      const k = key as ServoKey;
      edit(
        { ...edits, servos: { kind: k, count: 1 } },
        { say: `Added ${SERVOS[k].label}.`, focus: servoSelectId, cause: `Added ${SERVOS[k].label}` },
      );
    } else {
      const k = key as keyof typeof ADDABLE;
      edit(
        { ...edits, added: [...(edits.added ?? []), k] },
        { say: `Added ${ADDABLE[k].name}.`, cause: `Added ${ADDABLE[k].label}` },
      );
    }
  };
  // A heading of its own, so it reads as the way in to the sections above
  // it rather than one more field; the heading names the menu.
  return (
    <Section id="add" title="Add a part">
      <SelectMenu<string>
        id={addPartId}
        ariaLabel="Add a part"
        placeholder="Choose a sensor, control, display…"
        value={null}
        options={options}
        onChange={add}
      />
    </Section>
  );
}

// ───────────────────────────── Case ─────────────────────────────

const WALLS = Array.from(
  { length: Math.round((WALL_MAX_MM - WALL_MIN_MM) / WALL_STEP_MM) + 1 },
  (_, i) => Number((WALL_MIN_MM + i * WALL_STEP_MM).toFixed(1)),
);

export function CaseSection({
  product,
  edit,
  sealing,
}: Props & {
  /** Indoor / Splash-proof / Waterproof — an electronic product's; a plate
   *  has nothing inside to keep dry. */
  sealing: boolean;
}) {
  const { spec, edits, parts, conceptParts, hints } = product;
  const id = "case";
  const edited = sectionEdited(edits, id, conceptParts);
  const environment = edits.environment ?? environmentOf(parts, hints);
  const wallId = `${sectionId(id)}-wall`;
  return (
    <Section
      id={id}
      title="Case"
      tag={tagFor(edited)}
      reset={
        edit && edited
          ? {
              name: "Case",
              onReset: () =>
                edit(resetSection(edits, id, conceptParts), {
                  say: "The case is back to the concept's.",
                  focus: focusHeading(id),
                  cause: "Case reset",
                }),
            }
          : undefined
      }
    >
      {edit ? (
        <>
          <Choice label="Plastic">
            <Segmented
              label="Case plastic"
              value={spec.material}
              options={MATERIALS.map((m) => ({ label: m, value: m }))}
              onChange={(m) => edit({ ...edits, material: m }, { say: `${m} case.`, cause: `Plastic → ${m}` })}
            />
          </Choice>
          <Note>
            {spec.material} — {MATERIAL_NOTE[spec.material]}
          </Note>
          <Field id={wallId} label="Wall" className="max-w-[200px]">
            <SelectMenu<string>
              id={wallId}
              ariaLabel="Wall"
              placeholder="Choose a wall"
              value={String(spec.wallMm)}
              options={WALLS.map((w) => ({ label: `${w.toFixed(1)} mm`, value: String(w), sub: wallNote(w) }))}
              onChange={(v) =>
                edit(
                  { ...edits, wallMm: Number(v) },
                  { say: `${Number(v).toFixed(1)} mm wall.`, cause: `Wall → ${Number(v).toFixed(1)} mm` },
                )
              }
            />
          </Field>
          {/* A plate has no shell round its parts, so its wall moves nothing. */}
          {spec.kind !== "mechanical" && <Note>Thicker walls make the outside bigger.</Note>}
          {sealing && (
            <>
              <Choice label="Where it's used">
                <Segmented<EnvironmentKey>
                  label="Where it's used"
                  value={environment}
                  options={ENVIRONMENT_KEYS.map((k) => ({ label: ENVIRONMENTS[k].label, value: k }))}
                  onChange={(v) =>
                    edit(
                      { ...edits, environment: v },
                      { say: `${ENVIRONMENTS[v].label}.`, cause: `Where it's used → ${ENVIRONMENTS[v].label}` },
                    )
                  }
                />
              </Choice>
              {environment !== "indoor" && (
                <Note>
                  {environment === "waterproof"
                    ? "A silicone O-ring seals the lid's seam"
                    : "Seams stay tight against rain"}
                  {spec.materialSource === "you" ? "." : " · ASA, which takes sun and water."}
                </Note>
              )}
            </>
          )}
        </>
      ) : (
        <ReadOnly>
          {spec.material} · {spec.wallMm} mm wall
          {sealing ? ` · ${ENVIRONMENTS[environment].label}` : ""}
        </ReadOnly>
      )}
    </Section>
  );
}

// ─────────────────────────── Mounting ───────────────────────────

export function MountingSection({ product, edit, always }: Props & { always: boolean }) {
  const { edits, parts, conceptParts } = product;
  const id = "mounting";
  const current = edits.mounting ?? mountingOf(parts);
  if (!current && !always) return null;
  const edited = sectionEdited(edits, id, conceptParts);
  const part = current ? MOUNTINGS[current] : null;
  return (
    <Section
      id={id}
      title="Mounting"
      tag={edited || current ? tagFor(edited) : undefined}
      reset={
        edit && edited
          ? {
              name: "Mounting",
              onReset: () =>
                edit(resetSection(edits, id, conceptParts), {
                  say: "Mounting is back to the concept's.",
                  focus: focusHeading(id),
                  cause: "Mounting reset",
                }),
            }
          : undefined
      }
    >
      {edit ? (
        // With nothing chosen no option is checked — the radiogroup still
        // takes the keyboard on its first.
        <Segmented<MountingKey | "none">
          label="Mounting"
          value={current ?? "none"}
          options={MOUNTING_KEYS.map((k) => ({ label: MOUNTINGS[k].label, value: k }))}
          onChange={(v) =>
            v !== "none" &&
            edit({ ...edits, mounting: v }, { say: `${MOUNTINGS[v].label}.`, cause: `Mounting → ${MOUNTINGS[v].label}` })
          }
        />
      ) : (
        <ReadOnly>{part ? part.label : "None"}</ReadOnly>
      )}
      <Note>
        {part
          ? `${counted(asPart(part))} — ${part.role.charAt(0).toLowerCase()}${part.role.slice(1)}.`
          : "Nothing holds it where it sits yet."}
      </Note>
    </Section>
  );
}

// ────────────────────────── Electronics ──────────────────────────

/** A product with no parts to power says so, and can be given some. */
export function ElectronicsSection({ product, edit }: Props) {
  const { edits } = product;
  return (
    <Section id="electronics" title="Electronics">
      <ReadOnly>None — this product has no parts to power.</ReadOnly>
      {edit && (
        <div>
          <button
            id={addElectronicsId}
            type="button"
            className={OUTLINE_BUTTON}
            onClick={() =>
              edit(withElectronics(edits), {
                say: "Added an ESP32-C3 and a USB-C port — the sheet now shows its power, brain and radio.",
                focus: brainSelectId,
                cause: "Added electronics",
              })
            }
          >
            <Icon icon={Add01Icon} size={16} />
            Add electronics
          </button>
        </div>
      )}
    </Section>
  );
}

// ───────────────────────────── Inside ─────────────────────────────

/** Everything the build will make, in one place and in plain words: the
 *  board, each part on it and what it does, and what is wired to it off
 *  the board. Read-only — every part is changed in the section it belongs
 *  to — so it carries no tag and no Reset. */
export function InsideSection({ product }: Props) {
  const { spec, parts } = product;
  const inside = insideOf(spec, parts);
  const rows: [string, React.ReactNode][] = [["Circuit board", <span key="b" className="tabular-nums">{inside.board}</span>]];
  if (inside.on.length) {
    rows.push([
      "On the board",
      <ul key="on" role="list" className="flex flex-col gap-[4px]">
        {inside.on.map((r, i) => (
          <li key={`${r.name}-${i}`}>
            {r.name} <span className="text-text-tertiary">— {r.does}</span>
          </li>
        ))}
      </ul>,
    ]);
  }
  if (inside.wired.length) rows.push(["Wired to it", inside.wired.join(" · ")]);
  return (
    <Section id="inside" title="Inside">
      <Rows rows={rows} />
    </Section>
  );
}
