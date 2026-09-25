"use client";

// The spec sheet's sections below Size — what powers the product, its brain,
// its radio, what moves, senses, controls and shows, its case — each one a
// set of controls over the parts the build will use (lib/spec/edits.ts), and
// only the ones this product has. The concept image stays as the look: the
// parts change here, the drawing does not. Every edit applies as it is made
// through the sheet's `edit`, which also says what happened to a screen
// reader and puts the keyboard where the change shows.

import * as React from "react";
import { Add01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { NumberInput } from "@/components/ideeza/number-input";
import { Segmented } from "@/components/ideeza/segmented";
import { SelectMenu, type SelectOption } from "@/components/ideeza/select-menu";
import type { ConceptPart } from "@/lib/create/concept";
import { BATTERIES, batteryOf } from "@/lib/spec/batteries";
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
  builtInRadios,
  chargePortOf,
  environmentOf,
  isChargePort,
  isDriveMotor,
  isMcu,
  isMotorDriver,
  isRadioPart,
  isServo,
  mcuKeyOf,
  motorsOf,
  mountingOf,
  partRole,
  radioChoices,
  radioKeyOf,
  servosOf,
} from "@/lib/spec/catalog";
import { productKind, smallestPack } from "@/lib/spec/derive";
import {
  CHIP_ROLES,
  addableFor,
  asPart,
  removePart,
  resetSection,
  sectionEdited,
  withElectronics,
  withoutElectronics,
  type ChipRole,
} from "@/lib/spec/edits";
import { readableName } from "@/lib/spec/facts";
import { FAB_PROFILE, MATERIAL_NOTE, boardLabel, needsNoPower } from "@/lib/spec/format";
import { COUNT_MAX, WALL_MAX_MM, WALL_MIN_MM, WALL_STEP_MM } from "@/lib/spec/hints";
import {
  CHARGE_PORT_KEYS,
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
import { currentLabel, runtimeLabel } from "@/lib/spec/units";
import { OUTLINE_BUTTON } from "./buttons";
import { SPEC_SHEET_ID } from "./spec-panel";
import type { SheetProduct } from "./spec-sheet";

/** Who decided each value, in words a maker reads without a legend. */
export const DECIDED: Record<"you" | "concept" | "ai" | "rule" | "calc", string> = {
  you: "You set",
  concept: "From the concept",
  ai: "Suggested by AI",
  rule: "Default",
  calc: "Estimated",
};

/** An edit, with what to tell a screen reader it did and where the keyboard
 *  goes once it has rendered — the control that was pressed is often gone. */
export type Edit = (next: SpecEdits, after?: { say?: string; focus?: string }) => void;

type Props = { product: SheetProduct; edit?: Edit };

export const sectionId = (s: string) => `${SPEC_SHEET_ID}-${s}`;
const headingId = (s: string) => `${sectionId(s)}-title`;

/** The keyboard lands on a section's heading after its Reset — the button
 *  it pressed is gone, and the heading is where the section starts again. */
const focusHeading = (s: string) => headingId(s);

// 24 px tall to the eye; the press reaches 10 px above and below, so a
// thumb finds it (44 px) without the header row growing on a phone.
const QUIET_BUTTON =
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
  /** Who decided it — "You set", "From the concept", … */
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

function Note({ children, tone = "plain" }: { children: React.ReactNode; tone?: "plain" | "error" }) {
  return (
    <p className={["text-sm", tone === "error" ? "text-text-error" : "text-text-tertiary"].join(" ")}>
      {children}
    </p>
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
  disabled,
  describedBy,
  onCommit,
}: {
  id: string;
  value: number;
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

export function PowerSection({ product, edit }: Props) {
  const { spec, edits, parts, conceptParts, hints } = product;
  const id = "power";
  const edited = sectionEdited(edits, id, conceptParts);
  const reset = edit && edited
    ? {
        name: "Power",
        onReset: () =>
          edit(resetSection(edits, id, conceptParts), {
            say: "Power is back to the concept's.",
            focus: focusHeading(id),
          }),
      }
    : undefined;

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

  // A supply comes with the socket it needs: a wall adapter a barrel jack,
  // USB a USB-C port where there was none — so the parts the build uses can
  // take the power the sheet says. A pack keeps whatever port charges it.
  const setMode = (m: PowerMode) => {
    if (!edit || m === mode) return;
    const next: SpecEdits = { ...edits };
    if (m === "usb") {
      next.battery = "none";
      if (port === "barrel" || port === "none") next.chargePort = "usb-c";
    } else if (m === "wall") {
      next.battery = "adapter";
      if (port !== "barrel") next.chargePort = "barrel";
    } else {
      next.battery = smallestPack(spec.drawMa, hints?.runtimeGoalH, hints?.useCase);
    }
    edit(next, {
      say:
        m === "battery"
          ? `Battery: ${batteryOf(next.battery as BatteryKey).label}.`
          : m === "usb"
            ? "Powered over USB."
            : "Powered by a wall adapter.",
    });
  };

  const over = spec.drawMa > spec.budgetMa;
  const supply = spec.battery === "none" ? "USB" : batteryOf(spec.battery).label;
  // A pack's runtime is every part's typical current summed as if it never
  // slept — honest arithmetic, but "~4.8 h" alone reads as a promise. The
  // model has no duty-cycle data to do better, so the caveat rides beside
  // the number instead of implying the number is more precise than it is.
  const runtime = mode === "battery" ? runtimeLabel(spec.runtimeH) : null;
  const line = over
    ? `Draws about ${currentLabel(spec.drawMa)} — more than ${supply} gives (${currentLabel(spec.budgetMa)}).`
    : spec.battery === "none"
      ? `Draws about ${currentLabel(spec.drawMa)} of the ${currentLabel(spec.budgetMa)} USB gives.`
      : runtime
        ? `${runtime} per charge at full draw — sleep modes stretch it · draws about ${currentLabel(spec.drawMa)}`
        : spec.drawMa === 0
          ? "Draws almost nothing"
          : `Draws about ${currentLabel(spec.drawMa)}`;
  const portLabel = mode === "battery" ? "Charge port" : "Power port";

  return (
    <Section
      id={id}
      // "Power", whichever it is: the choice between a battery and a cord is
      // the section's first control, so its heading can't be one of them.
      title="Power"
      tag={edited ? DECIDED.you : DECIDED[spec.batterySource]}
      reset={reset}
    >
      {edit ? (
        <>
          <Segmented<PowerMode>
            label="Power source"
            value={mode}
            options={[
              { label: "Battery", value: "battery" },
              { label: "USB", value: "usb" },
              { label: "Wall adapter", value: "wall" },
            ]}
            onChange={setMode}
          />
          <div
            className={
              mode === "battery"
                ? "grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-[8px]"
                : "grid grid-cols-[minmax(0,1fr)] gap-[8px] sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
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
                  options={PACKS.map((b) => ({ label: b.label, value: b.key }))}
                  onChange={(v) => edit({ ...edits, battery: v }, { say: `Battery: ${batteryOf(v).label}.` })}
                />
              </Field>
            )}
            <Field id={portId} label={portLabel}>
              <SelectMenu<ChargePortKey>
                id={portId}
                ariaLabel={portLabel}
                placeholder={fromConcept(portPart, "Choose a port")}
                value={port}
                // Plugged in, the power comes through the port, so "None"
                // is a battery's alone — one that is never charged.
                options={CHARGE_PORT_KEYS.filter((k) => mode === "battery" || k !== "none").map((k) => ({
                  label: CHARGE_PORTS[k].label,
                  value: k,
                }))}
                onChange={(v) =>
                  edit({ ...edits, chargePort: v }, {
                    say: v === "none" ? "No port." : `${CHARGE_PORTS[v].label} port.`,
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
      <Note tone={over ? "error" : "plain"}>{line}</Note>
    </Section>
  );
}

// ───────────────────────────── Brain ─────────────────────────────

const RADIO_WORDS = (keys: RadioKey[]) => keys.map((k) => RADIOS[k].label);

/** "Wi-Fi, BLE and ESP-NOW built in" — what a chip speaks with no module. */
function onDieNote(k: McuKey): string {
  const words = RADIO_WORDS(builtInRadios(asPart(MCUS[k])));
  if (!words.length) return "No radio on the chip";
  const list = words.length > 1 ? `${words.slice(0, -1).join(", ")} and ${words.at(-1)}` : words[0];
  return `${list} built in`;
}

export const brainSelectId = `${sectionId("brain")}-mcu`;
export const addElectronicsId = `${sectionId("electronics")}-add`;

export function BrainSection({ product, edit }: Props) {
  const { spec, edits, parts, conceptParts } = product;
  const chip = parts.find(isMcu);
  if (!chip) return null;
  const id = "brain";
  const key = mcuKeyOf(parts);
  // Electronics a plate was given are undone as one thing — taking the chip
  // out alone would leave its port on a board of its own.
  const given = productKind(conceptParts) === "mechanical";
  const edited = given || sectionEdited(edits, id, conceptParts);
  // A plate's electronics come out with their own button, below: that takes
  // the power and the radio with it, which no one section's Reset does.
  const reset =
    edit && edited && !given
      ? {
          name: "Brain",
          onReset: () =>
            edit(resetSection(edits, id, conceptParts), {
              say: "The brain is back to the concept's.",
              focus: focusHeading(id),
            }),
        }
      : undefined;
  const rows: [string, string][] = [
    ["Circuit board", boardLabel(spec)],
    // A product with no board is not made to a board house's rules.
    ...(spec.board ? [["Made to", FAB_PROFILE] as [string, string]] : []),
  ];
  return (
    <Section
      id={id}
      title="Brain"
      tag={edited ? DECIDED.you : DECIDED.concept}
      reset={reset}
    >
      {edit ? (
        <Field id={brainSelectId} label="Microcontroller">
          <SelectMenu<McuKey>
            id={brainSelectId}
            ariaLabel="Microcontroller"
            placeholder={fromConcept(chip, "Choose a microcontroller")}
            value={key}
            options={MCU_KEYS.map((k) => ({ label: MCUS[k].label, value: k, sub: onDieNote(k) }))}
            onChange={(v) => edit({ ...edits, mcu: v }, { say: `Runs on the ${MCUS[v].label}.` })}
          />
        </Field>
      ) : (
        <ReadOnly>{readableName(chip)}</ReadOnly>
      )}
      {/* One grid, so every value starts on the same line: a wrapping row
          per pair pushed a long value (the fab profile) into a ragged block
          and dropped a short one under its label. */}
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
      {given && edit && (
        <div className="flex flex-wrap items-center gap-x-[12px] gap-y-[8px]">
          <button
            type="button"
            className={OUTLINE_BUTTON}
            onClick={() =>
              edit(withoutElectronics(edits), {
                say: "Electronics removed — this product has no parts to power.",
                focus: addElectronicsId,
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
    </Section>
  );
}

// ─────────────────────────── Connects ───────────────────────────

export function ConnectsSection({ product, edit }: Props) {
  const { edits, parts, conceptParts } = product;
  const chip = parts.find(isMcu);
  // A radio needs a chip to speak through it.
  if (!chip) return null;
  const id = "connects";
  const selectId = `${sectionId(id)}-radio`;
  const edited = sectionEdited(edits, id, conceptParts);
  const key = radioKeyOf(parts);
  const radioPart = parts.find(isRadioPart);
  const chipLabel = mcuKeyOf(parts) ? MCUS[mcuKeyOf(parts)!].label : readableName(chip);
  const options: SelectOption<RadioKey>[] = radioChoices(parts).map((c) => ({
    value: c.key,
    label: c.label,
    sub:
      c.key === "none"
        ? "No radio"
        : c.builtIn
          ? `Built into the ${chipLabel}`
          : `On a separate ${RADIOS[c.key].module?.label ?? c.label} module`,
  }));
  const current = key ? RADIOS[key].label : radioPart ? readableName(radioPart) : "No radio";
  // A plate given electronics speaks what its new chip has on its die — the
  // default, not anything its concept said.
  const given = productKind(conceptParts) === "mechanical";
  return (
    <Section
      id={id}
      title="Connects"
      tag={edited ? DECIDED.you : given ? DECIDED.rule : DECIDED.concept}
      reset={
        edit && edited
          ? {
              name: "Connects",
              onReset: () =>
                edit(resetSection(edits, id, conceptParts), {
                  say: "The radio is back to the concept's.",
                  focus: focusHeading(id),
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
              edit({ ...edits, radio: v }, { say: v === "none" ? "No radio." : `Connects over ${RADIOS[v].label}.` })
            }
          />
        </Field>
      ) : (
        <ReadOnly>{current}</ReadOnly>
      )}
    </Section>
  );
}

// ───────────────────────────── Moves ─────────────────────────────

const servoSelectId = `${sectionId("moves")}-servo`;
const motorSelectId = `${sectionId("moves")}-motor`;

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
      tag={edited ? DECIDED.you : DECIDED.concept}
      reset={
        edit && edited
          ? {
              name: "Moves",
              onReset: () =>
                edit(resetSection(edits, id, conceptParts), {
                  say: "What moves is back to the concept's.",
                  focus: focusHeading(id),
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
                  options={MOTOR_KEYS.map((k) => ({
                    label: MOTORS[k].label,
                    value: k,
                    sub: `Driver: ${MOTORS[k].driver.part.label}`,
                  }))}
                  onChange={(v) =>
                    edit(
                      { ...edits, motors: { kind: v, count: Math.max(1, motors.count) } },
                      { say: `${Math.max(1, motors.count)} × ${MOTORS[v].label}.` },
                    )
                  }
                />
              </Field>
              <Field id={motorCountId} label="How many">
                <CountField
                  id={motorCountId}
                  value={motors.count}
                  // A count is a count of a catalog motor: one the catalog
                  // doesn't list can't be multiplied without being swapped.
                  disabled={motors.kind === null}
                  describedBy={motors.kind === null ? motorHintId : undefined}
                  onCommit={(n) =>
                    motors.kind &&
                    edit(
                      { ...edits, motors: { kind: motors.kind, count: n } },
                      { say: n ? `${n} × ${MOTORS[motors.kind].label}.` : "No drive motors." },
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
              <Note>Driven by {counted(driver)}.</Note>
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
                    { say: `${Math.max(1, servos.count)} × ${SERVOS[v].label}.` },
                  )
                }
              />
            </Field>
            <Field id={servoCountId} label="How many">
              <CountField
                id={servoCountId}
                value={servos.count}
                disabled={servos.kind === null}
                onCommit={(n) =>
                  servos.kind &&
                  edit(
                    { ...edits, servos: { kind: servos.kind, count: n } },
                    { say: n ? `${n} × ${SERVOS[servos.kind].label}.` : "No servos." },
                  )
                }
              />
            </Field>
          </div>
        ) : (
          <ReadOnly>{servoPart ? counted(servoPart) : "No servos"}</ReadOnly>
        )
      ) : (
        edit && (
          <div>
            <button
              type="button"
              className={`-ml-[4px] gap-[4px] text-sm ${QUIET_BUTTON}`}
              onClick={() =>
                edit({ ...edits, servos: { kind: "sg90", count: 1 } }, {
                  say: "Added SG90 servo.",
                  focus: servoSelectId,
                })
              }
            >
              <Icon icon={Add01Icon} size={14} />
              Add a servo
            </button>
          </div>
        )
      )}
    </Section>
  );
}

// ─────────────────── Senses · Controls · Shows · … ───────────────────

const ROLE_TITLE: Record<ChipRole, string> = {
  senses: "Senses",
  controls: "Controls",
  shows: "Shows",
  sounds: "Sounds",
  switches: "Switches",
};

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
 *  took them out, so its Reset can still bring them back. */
export function ChipSections({ product, edit }: Props) {
  const { edits, parts, conceptParts } = product;
  return (
    <>
      {CHIP_ROLES.map((role) => {
        const own = parts.filter((p) => partRole(p) === role);
        const edited = sectionEdited(edits, role, conceptParts);
        if (!own.length && !edited) return null;
        return (
          <Section
            key={role}
            id={role}
            title={ROLE_TITLE[role]}
            tag={edited ? DECIDED.you : DECIDED.concept}
            reset={
              edit && edited
                ? {
                    name: ROLE_TITLE[role],
                    onReset: () =>
                      edit(resetSection(edits, role, conceptParts), {
                        say: `${ROLE_TITLE[role]} is back to the concept's.`,
                        focus: focusHeading(role),
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

/** The one "+ Add a part" menu, grouped the way the sections are — and a
 *  Moves group for a product with nothing that moves yet. Only on a product
 *  with a chip to run what it adds. */
export function AddPart({ product, edit }: Props) {
  const { edits, parts } = product;
  if (!edit || !parts.some(isMcu)) return null;
  const hasMotors = !!(edits.motors ?? motorsOf(parts));
  const hasServos = !!(edits.servos ?? servosOf(parts));
  const options: SelectOption[] = [
    ...(hasMotors
      ? []
      : MOTOR_KEYS.map((k) => ({ value: `motor:${k}`, label: MOTORS[k].label, section: "Moves" }))),
    ...(hasServos
      ? []
      : SERVO_KEYS.map((k) => ({ value: `servo:${k}`, label: SERVOS[k].label, section: "Moves" }))),
    ...ADD_GROUPS.flatMap((g) =>
      addableFor(parts)
        .filter((k) => ADDABLE[k].group === g)
        .map((k) => ({ value: `part:${k}`, label: ADDABLE[k].label, section: g })),
    ),
  ];
  const add = (v: string) => {
    const [kind, key] = v.split(":");
    if (kind === "motor") {
      const k = key as MotorKey;
      edit({ ...edits, motors: { kind: k, count: 1 } }, { say: `Added ${MOTORS[k].label}.`, focus: motorSelectId });
    } else if (kind === "servo") {
      const k = key as ServoKey;
      edit({ ...edits, servos: { kind: k, count: 1 } }, { say: `Added ${SERVOS[k].label}.`, focus: servoSelectId });
    } else {
      const k = key as keyof typeof ADDABLE;
      edit({ ...edits, added: [...(edits.added ?? []), k] }, { say: `Added ${ADDABLE[k].name}.` });
    }
  };
  return (
    <div className="border-t border-solid border-border py-[16px]">
      <Field id={addPartId} label="Add a part">
        <SelectMenu<string>
          id={addPartId}
          ariaLabel="Add a part"
          placeholder="Choose a sensor, control, display…"
          value={null}
          options={options}
          onChange={add}
        />
      </Field>
    </div>
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
      tag={edited ? DECIDED.you : DECIDED[spec.materialSource]}
      reset={
        edit && edited
          ? {
              name: "Case",
              onReset: () =>
                edit(resetSection(edits, id, conceptParts), {
                  say: "The case is back to the concept's.",
                  focus: focusHeading(id),
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
              onChange={(m) => edit({ ...edits, material: m }, { say: `${m} case.` })}
            />
          </Choice>
          <Note>
            {spec.material} — {MATERIAL_NOTE[spec.material]}
          </Note>
          <Field id={wallId} label="Wall" className="max-w-[160px]">
            <SelectMenu<string>
              id={wallId}
              ariaLabel="Wall"
              placeholder="Choose a wall"
              value={String(spec.wallMm)}
              options={WALLS.map((w) => ({ label: `${w.toFixed(1)} mm`, value: String(w) }))}
              onChange={(v) => edit({ ...edits, wallMm: Number(v) }, { say: `${Number(v).toFixed(1)} mm wall.` })}
            />
          </Field>
          {sealing && (
            <>
              <Choice label="Where it's used">
                <Segmented<EnvironmentKey>
                  label="Where it's used"
                  value={environment}
                  options={ENVIRONMENT_KEYS.map((k) => ({ label: ENVIRONMENTS[k].label, value: k }))}
                  onChange={(v) => edit({ ...edits, environment: v }, { say: `${ENVIRONMENTS[v].label}.` })}
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
      tag={edited ? DECIDED.you : current ? DECIDED.concept : undefined}
      reset={
        edit && edited
          ? {
              name: "Mounting",
              onReset: () =>
                edit(resetSection(edits, id, conceptParts), {
                  say: "Mounting is back to the concept's.",
                  focus: focusHeading(id),
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
          onChange={(v) => v !== "none" && edit({ ...edits, mounting: v }, { say: `${MOUNTINGS[v].label}.` })}
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
