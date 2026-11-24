"use client";

// Edit spec, as the phone's accordion sheet (07–14): one group per part of
// the product, in the web sheet's order (spec-sheet.tsx) — Size · Power (a
// standalone charger's Charges, a spare pack's Pack in its place) · Moves ·
// Add a part · Wireless · Case · Mounting · Brain · Inside; a product with no
// electronics gets Size · Case · Mounting · Electronics (Add electronics) —
// each with its tag (You set / Suggested) and its value, tapped open to
// change it. Every change is the web's own spec edit (lib/spec/edits.ts,
// written to the answered question through `setSpecEdits`), saved as it goes
// and free; the card, the Build line and the build read the edited parts.
// A built product's spec is read only: its values as text. Moves, Mounting,
// Charges, Pack, Electronics and Brain's Add / Remove a chip follow the web's
// spec-sections.tsx with its words (CRE-7); a count is picked from 0–8 in the
// pick sheet, the phone's way to set a number from a short list.

import * as React from "react";
import { Add01Icon, ArrowDown01Icon, ArrowUp01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { TextInput } from "@/components/ideeza/text-input";
import { CELL_WORDS, cellOptions, counted, driverNote, fromConcept } from "@/components/create/spec-sections";
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
  chargeCellsOf,
  chargePortOf,
  chargerOf,
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
import { blocksBuild, canAddBrain, deriveSpec, productKind, smallestPack } from "@/lib/spec/derive";
import {
  CHIP_ROLES,
  addableFor,
  asPart,
  chargePortChoices,
  removePart,
  resetSection,
  sectionEdited,
  withBrain,
  withCharges,
  withElectronics,
  withSupply,
  withoutBrain,
  withoutElectronics,
  type ChipRole,
} from "@/lib/spec/edits";
import { DOES_LABEL, chargesOf, insideOf, needsNoPower, readableName, replacedNotRecharged, standaloneOf } from "@/lib/spec/facts";
import { COUNT_MAX, MM_MAX, MM_MIN, WALL_MAX_MM, WALL_MIN_MM, WALL_STEP_MM, asMm3, cleanEdits } from "@/lib/spec/hints";
import {
  ENVIRONMENT_KEYS,
  MATERIALS,
  MCU_KEYS,
  MOTOR_KEYS,
  MOUNTING_KEYS,
  SERVO_KEYS,
  type AddableKey,
  type BatteryKey,
  type ChargeCellKey,
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
import type { ConceptPart } from "@/lib/create/concept";
import { cn } from "@/lib/utils";
import { T } from "../type";
import { Sheet } from "../kit/sheet";
import { LIST_CARD, LIST_DIVIDERS } from "../kit/list";
import { PickField } from "./pick-sheet";
import type { ConceptFlow } from "./use-concept-flow";

const PACKS = BATTERIES.filter((b) => b.key !== "none" && b.key !== "adapter");
const WALLS = Array.from({ length: Math.round((WALL_MAX_MM - WALL_MIN_MM) / WALL_STEP_MM) + 1 }, (_, i) => Number((WALL_MIN_MM + i * WALL_STEP_MM).toFixed(1)));
type PowerMode = "battery" | "usb" | "wall";
const MODE_WORD: Record<PowerMode, string> = { battery: "Battery", usb: "USB cable", wall: "Wall adapter" };

type Group = "size" | "charges" | "pack" | "power" | "moves" | "add" | "wireless" | "case" | "mounting" | "brain" | "inside" | "electronics";
/** "How many": a count of 0–8 (the web's CountField range), picked in the sheet. */
const COUNTS = Array.from({ length: COUNT_MAX + 1 }, (_, i) => ({ value: String(i), label: String(i) }));

export function SpecSheet({ flow, productId, onClose }: { flow: ConceptFlow; productId: string | null; onClose: () => void }) {
  const row = productId ? flow.rail.rows.find((r) => r.productId === productId) : undefined;
  const turn = row ? flow.state.products.find((t) => t.id === row.turnId) : undefined;
  const spec = turn ? flow.state.specs.get(turn.id) ?? null : null;
  const [openGroup, setOpenGroup] = React.useState<Group | null>(null);
  const open = !!turn && !!spec && !!productId;
  return (
    <Sheet
      open={open}
      onClose={() => {
        setOpenGroup(null);
        onClose();
      }}
      title={row?.name ?? "Spec"}
      description={
        turn && flow.state.locked.has(turn.id)
          ? `Concept ${flow.labels.get(turn.id) ?? "1"} · Built — this is what was built`
          : `Concept ${turn ? flow.labels.get(turn.id) ?? "1" : "1"} · tap a group to change it`
      }
      // Changes save as they're made, so the foot only says so: ✕, swipe and the scrim close the sheet —
      // no Done that only closes (kit rule).
      actions={<p className={cn(T.meta, "text-center text-text-tertiary")}>Changes save as you go · the build uses these parts · the image stays as the look</p>}
    >
      {open && turn && spec && productId && <Groups flow={flow} productId={productId} turnId={turn.id} openGroup={openGroup} setOpenGroup={setOpenGroup} />}
    </Sheet>
  );
}

function Groups({
  flow,
  productId,
  turnId,
  openGroup,
  setOpenGroup,
}: {
  flow: ConceptFlow;
  productId: string;
  turnId: string;
  openGroup: Group | null;
  setOpenGroup: (g: Group | null) => void;
}) {
  const { state } = flow;
  const spec = state.specs.get(turnId)!;
  const parts = state.parts.get(turnId) ?? [];
  const concept = state.concepts.get(turnId);
  const conceptParts = concept?.parts ?? [];
  const hints = concept?.hints;
  const edits = state.edits.get(turnId) ?? {};
  const locked = state.locked.has(turnId);
  // A product left out of the build isn't built yet: its spec stays open, so a
  // size that doesn't fit can be fixed before it is built into the build later.
  const editable = !locked && (!flow.held || flow.leftOutProducts.some((p) => p.id === productId));
  const edit = (next: SpecEdits) => {
    if (editable) flow.editSpec(productId, cleanEdits(next));
  };
  const tag = (edited: boolean) => (edited ? "You set" : "Suggested");
  // A charger or a spare pack, read off the concept: one given a chip is still what it was drawn as (the web's rule).
  const standalone = standaloneOf(conceptParts);
  const mechanical = spec.kind === "mechanical";
  const chip = parts.find(isMcu);
  const peerLinks = flow.network.show && flow.network.onLink.has(productId);

  const toggle = (g: Group) => setOpenGroup(openGroup === g ? null : g);
  const groups: React.ReactNode[] = [];

  /** Each pack with what it would give this product, worked out as if it were picked (the web's packOptions). */
  const packOptions = () =>
    PACKS.map((b) => {
      const s = deriveSpec(conceptParts, hints, cleanEdits(withSupply(edits, b.key, conceptParts)));
      const weak = b.maxMa < s.drawMa;
      const r = runtimeLabel(s.runtimeH);
      return {
        value: b.key,
        label: b.label,
        disabled: weak,
        sub: weak
          ? `Too weak for this — gives ${currentLabel(b.maxMa)}, needs ${currentLabel(s.drawMa)}`
          : [r ? `${r} here` : null, b.body ? mm3(b.body) : null, replacedNotRecharged(b.key) ? "replace, not recharge" : "rechargeable"].filter(Boolean).join(" · "),
      };
    });
  const powerEdited = sectionEdited(edits, "power", conceptParts);
  const powerReset = editable && powerEdited ? () => edit(resetSection(edits, "power", conceptParts)) : undefined;

  // ── Size ──
  groups.push(
    <SizeGroup
      key="size"
      open={openGroup === "size"}
      onToggle={() => toggle("size")}
      spec={spec}
      edits={edits}
      edit={editable ? edit : undefined}
      tag={tag(spec.sizeSource === "you")}
      conceptParts={conceptParts}
    />,
  );

  // ── Charges: a standalone charger's, in place of a power source it isn't choosing ──
  if (!mechanical && standalone === "charger") {
    const charges = chargesOf(parts) ?? chargesOf(conceptParts);
    const port = chargePortOf(parts);
    const portPart = parts.find(isChargePort);
    const cell = charges ? (CELL_WORDS[charges.cell] ?? charges.cell) : "Batteries";
    const plugs = port && port !== "none" ? CHARGE_PORTS[port].label : (charges?.port ?? "Nothing");
    groups.push(
      <GroupRow
        key="charges"
        title="Charges"
        tag={tag(powerEdited)}
        value={`${charges?.cell ?? "Batteries"} · ${plugs}`}
        open={openGroup === "charges"}
        onToggle={() => toggle("charges")}
        onReset={powerReset}
      >
        {editable ? (
          <>
            <Label>Pack it charges</Label>
            <PickField
              title="Pack it charges"
              // Cells the catalog has no charger for (3S, AA) are the concept's.
              placeholder={fromConcept(chargerOf(parts), "Choose what it charges")}
              value={chargeCellsOf(parts)}
              options={cellOptions(conceptParts)}
              onChange={(v) => edit(withCharges(edits, v as ChargeCellKey, conceptParts))}
            />
            <Label>Plugs into</Label>
            <PickField
              title="Plugs into"
              placeholder={fromConcept(portPart, "Choose a port")}
              value={port}
              options={chargePortChoices(spec.battery, conceptParts).map((k) => ({ value: k, label: CHARGE_PORTS[k].label }))}
              onChange={(v) => edit({ ...edits, chargePort: v as ChargePortKey })}
            />
          </>
        ) : (
          <Rows
            rows={[
              ["Pack it charges", cell],
              ["Plugs into", plugs],
            ]}
          />
        )}
      </GroupRow>,
    );
  }

  // ── Pack: a spare pack's — it is the power, so there is no battery, USB or wall adapter to choose ──
  if (!mechanical && standalone === "pack") {
    const pack = batteryOf(spec.battery);
    // What its lead ends in: the concept's own connector, not a case fitting.
    const connector = parts.find((p) => p.category === "Connector & mech" && !isMounting(p) && !isGasket(p));
    groups.push(
      <GroupRow key="pack" title="Pack" tag={tag(powerEdited)} value={pack.label} open={openGroup === "pack"} onToggle={() => toggle("pack")} onReset={powerReset}>
        {editable && (
          <>
            <Label>Pack</Label>
            <PickField
              title="Pack"
              placeholder="Choose a pack"
              value={spec.battery === "none" || spec.battery === "adapter" ? null : spec.battery}
              options={packOptions()}
              onChange={(v) => edit(withSupply(edits, v as BatteryKey, conceptParts))}
            />
          </>
        )}
        <Rows
          rows={[
            ...(editable ? [] : [["Pack", pack.label] as [string, string]]),
            ["Plugs in with", connector ? readableName(connector) : editable ? "Nothing named yet" : "Nothing named"],
          ]}
        />
        {pack.mAh > 0 && (
          <Note>
            {pack.mAh} mAh at {pack.volts} V{replacedNotRecharged(spec.battery) ? " — replace, not recharge." : "."}
          </Note>
        )}
      </GroupRow>,
    );
  }

  // ── Power ──
  if (!mechanical && !standalone) {
    const edited = powerEdited;
    const mode: PowerMode = spec.battery === "none" ? "usb" : spec.battery === "adapter" ? "wall" : "battery";
    const port = chargePortOf(parts);
    const portPart = parts.find(isChargePort);
    const replaced = mode === "battery" && replacedNotRecharged(spec.battery);
    const portLabel = mode === "battery" && !replaced ? "Charge port" : "Power port";
    const over = spec.drawMa > spec.budgetMa;
    const numbers = `${currentLabel(spec.drawMa)} of ${currentLabel(spec.budgetMa)}`;
    const runtime = runtimeLabel(spec.runtimeH)?.replace(/^~/, "");
    const line = needsNoPower(spec)
      ? "Nothing in it draws current."
      : over
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
    const setMode = (m: PowerMode) => {
      if (m === mode) return;
      const battery: BatteryKey = m === "usb" ? "none" : m === "wall" ? "adapter" : smallestPack(spec.drawMa, hints?.runtimeGoalH, hints?.useCase);
      edit(withSupply(edits, battery, conceptParts));
    };
    groups.push(
      <GroupRow
        key="power"
        title="Power"
        tag={tag(edited)}
        value={mode === "battery" ? batteryOf(spec.battery).label : MODE_WORD[mode]}
        open={openGroup === "power"}
        onToggle={() => toggle("power")}
        onReset={powerReset}
      >
        {editable && !(needsNoPower(spec) && !edited) ? (
          <>
            <Label>How it is powered</Label>
            <Chips<PowerMode> value={mode} options={(["battery", "usb", "wall"] as const).map((m) => ({ value: m, label: MODE_WORD[m] }))} onChange={setMode} />
            {mode === "battery" && (
              <>
                <Label>Pack</Label>
                <PickField title="Pack" value={spec.battery} options={packOptions()} onChange={(v) => edit(withSupply(edits, v as BatteryKey, conceptParts))} />
              </>
            )}
            <Label>{portLabel}</Label>
            <PickField
              title={portLabel}
              placeholder={portPart ? readableName(portPart) : "Choose a port"}
              value={port}
              options={chargePortChoices(spec.battery, conceptParts).map((k) => ({ value: k, label: CHARGE_PORTS[k].label }))}
              onChange={(v) => edit({ ...edits, chargePort: v as ChargePortKey })}
            />
          </>
        ) : (
          <Rows
            rows={[
              ["Power source", MODE_WORD[mode]],
              ...(mode === "battery" ? [["Pack", batteryOf(spec.battery).label] as [string, string]] : []),
              [portLabel, port ? CHARGE_PORTS[port].label : portPart ? readableName(portPart) : "None"],
            ]}
          />
        )}
        {spec.noUsbPort && <Note tone="warn">USB powered, but nothing takes the power in{editable ? " — pick a port" : ""}.</Note>}
        <Note tone={over ? "error" : "plain"}>{line}</Note>
      </GroupRow>,
    );
  }

  // ── Moves: the drive motors, then the servos apart (the web's MovesSection) ──
  // What the edits hold, when they hold it: a count of 0 takes the motors out of the parts, and
  // the group has to stay to bring them back.
  const motors = edits.motors ?? motorsOf(parts);
  const servos = edits.servos ?? servosOf(parts);
  if (!mechanical && (motors || servos)) {
    const edited = sectionEdited(edits, "moves", conceptParts);
    const motorPart = parts.find(isDriveMotor);
    const servoPart = parts.find(isServo);
    const driver = parts.find(isMotorDriver);
    const motorLine = motors ? (motorPart ? counted(motorPart) : "No drive motors") : null;
    const servoLine = servos ? (servoPart ? counted(servoPart) : "No servos") : null;
    groups.push(
      <GroupRow
        key="moves"
        title="Moves"
        tag={tag(edited)}
        value={[motorLine, servoLine].filter(Boolean).join(" · ")}
        open={openGroup === "moves"}
        onToggle={() => toggle("moves")}
        onReset={editable && edited ? () => edit(resetSection(edits, "moves", conceptParts)) : undefined}
      >
        {motors &&
          (editable ? (
            <>
              <div className="grid grid-cols-[minmax(0,1fr)_96px] items-end gap-4">
                <div className="flex min-w-0 flex-col gap-4">
                  <Label>Motor</Label>
                  <PickField
                    title="Motor"
                    placeholder={fromConcept(motorPart, "Choose a motor")}
                    value={motors.kind}
                    options={MOTOR_KEYS.map((k) => ({ value: k, label: MOTORS[k].label, sub: MOTORS[k].forWhat }))}
                    onChange={(v) => edit({ ...edits, motors: { kind: v as MotorKey, count: Math.max(1, motors.count) } })}
                  />
                </div>
                <div className="flex min-w-0 flex-col gap-4">
                  <Label>How many</Label>
                  {/* A count is a count of a catalog motor: one the catalog doesn't list can't be multiplied without being swapped. */}
                  <PickField
                    title="How many motors"
                    value={String(motors.count)}
                    options={COUNTS}
                    disabled={motors.kind === null}
                    onChange={(v) => motors.kind && edit({ ...edits, motors: { kind: motors.kind, count: Number(v) } })}
                  />
                </div>
              </div>
              {motors.kind === null ? (
                <Note>Pick a motor from the list to change how many.</Note>
              ) : driver ? (
                <Note>{driverNote(driver, motors.kind, motors.count)}</Note>
              ) : motors.count === 0 ? (
                <Note>No drive motors — the product stays where it is put.</Note>
              ) : null}
            </>
          ) : (
            <Rows rows={[["Motor", motorLine ?? "No drive motors"]]} />
          ))}
        {servos ? (
          editable ? (
            <div className="grid grid-cols-[minmax(0,1fr)_96px] items-end gap-4">
              <div className="flex min-w-0 flex-col gap-4">
                <Label>Servo</Label>
                <PickField
                  title="Servo"
                  placeholder={fromConcept(servoPart, "Choose a servo")}
                  value={servos.kind}
                  options={SERVO_KEYS.map((k) => ({ value: k, label: SERVOS[k].label, sub: SERVOS[k].role }))}
                  onChange={(v) => edit({ ...edits, servos: { kind: v as ServoKey, count: Math.max(1, servos.count) } })}
                />
              </div>
              <div className="flex min-w-0 flex-col gap-4">
                <Label>How many</Label>
                <PickField
                  title="How many servos"
                  value={String(servos.count)}
                  options={COUNTS}
                  disabled={servos.kind === null}
                  onChange={(v) => servos.kind && edit({ ...edits, servos: { kind: servos.kind, count: Number(v) } })}
                />
              </div>
            </div>
          ) : (
            <Rows rows={[["Servo", servoLine ?? "No servos"]]} />
          )
        ) : (
          // The one way a moving product gains a servo: Add a part leaves servos out while Moves shows.
          editable && (
            <TextAction icon={Add01Icon} onClick={() => edit({ ...edits, servos: { kind: "sg90", count: 1 } })}>
              Add a servo — steering, flaps or an arm
            </TextAction>
          )
        )}
      </GroupRow>,
    );
  }

  // ── Add a part (and the parts added, by what they do) ──
  if (chip) {
    const roles = CHIP_ROLES.map((role) => ({ role, own: parts.filter((p) => partRole(p) === role) })).filter((r) => r.own.length > 0);
    const edited = CHIP_ROLES.some((r) => sectionEdited(edits, r, conceptParts));
    // The web's menu: a motor or a servo first (under Moves) while the product has none, then the
    // parts by what they do.
    const hasMotors = !!motors;
    const movesShown = hasMotors || !!servos;
    const options = [
      ...(hasMotors ? [] : MOTOR_KEYS.map((k) => ({ value: `motor:${k}`, label: MOTORS[k].label, sub: MOTORS[k].forWhat, group: "Moves" }))),
      ...(movesShown ? [] : SERVO_KEYS.map((k) => ({ value: `servo:${k}`, label: SERVOS[k].label, sub: SERVOS[k].role, group: "Moves" }))),
      ...ADD_GROUPS.flatMap((g) =>
        addableFor(parts)
          .filter((k) => ADDABLE[k].group === g)
          .map((k) => ({ value: `part:${k}`, label: ADDABLE[k].plain, sub: ADDABLE[k].label, group: g as string })),
      ),
    ];
    const add = (v: string) => {
      const [kind, key] = v.split(":");
      if (kind === "motor") edit({ ...edits, motors: { kind: key as MotorKey, count: 1 } });
      else if (kind === "servo") edit({ ...edits, servos: { kind: key as ServoKey, count: 1 } });
      else edit({ ...edits, added: [...(edits.added ?? []), key as AddableKey] });
    };
    groups.push(
      <GroupRow
        key="add"
        title="Add a part"
        tag={edited ? tag(true) : undefined}
        value={edits.added?.length ? `${edits.added.length} added` : "Not added"}
        open={openGroup === "add"}
        onToggle={() => toggle("add")}
        onReset={editable && edited ? () => edit(CHIP_ROLES.reduce((e, r: ChipRole) => resetSection(e, r, conceptParts), edits)) : undefined}
      >
        {editable && (
          <>
            <Label>Part</Label>
            <PickField title="Add a part" placeholder="Choose a sensor, control, display…" value={null} options={options} onChange={add} />
            <Note>Adding a part may change the size and the board.</Note>
          </>
        )}
        {roles.map(({ role, own }) => (
          <div key={role} className="flex flex-col gap-2">
            <Label>{DOES_LABEL[role]}</Label>
            <ul className="flex flex-wrap gap-3">
              {own.map((p, i) => (
                <li key={`${p.name}-${i}`} className={cn(T.meta, "inline-flex min-h-[32px] items-center gap-2 rounded-full bg-bg-surface pl-5 pr-2 text-text-primary ring-1 ring-border-subtle")}>
                  {readableName(p)}
                  {editable && (
                    <button
                      type="button"
                      aria-label={`Take out ${readableName(p)}`}
                      onClick={() => edit(removePart(edits, p, conceptParts))}
                      className="relative inline-flex size-[28px] items-center justify-center rounded-full text-[color:var(--color-icon-default)] after:absolute after:-inset-4 after:content-[''] hover:bg-bg-subtle active:bg-bg-subtle"
                    >
                      <Icon icon={Cancel01Icon} size={12} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </GroupRow>,
    );
  }

  // ── Wireless ──
  if (chip) {
    const edited = sectionEdited(edits, "connects", conceptParts);
    const key = radioKeyOf(parts);
    const radioPart = parts.find(isRadioPart);
    const current = key ? RADIOS[key].label : radioPart ? readableName(radioPart) : "No wireless";
    const radioLinks = state.products.length > 1 ? flow.network.links.filter((l) => l.from === productId || l.to === productId) : [];
    groups.push(
      <GroupRow
        key="wireless"
        title="Wireless"
        tag={tag(edited)}
        value={current}
        open={openGroup === "wireless"}
        onToggle={() => toggle("wireless")}
        onReset={editable && edited && !peerLinks ? () => edit(resetSection(edits, "connects", conceptParts)) : undefined}
      >
        {editable && !peerLinks ? (
          <>
            <Label>Radio</Label>
            <PickField
              title="Radio"
              placeholder={radioPart ? readableName(radioPart) : "Choose a radio"}
              value={key}
              options={radioChoices(parts).map((c) => ({ value: c.key, label: c.label, sub: radioSub(c.key, c.builtIn) }))}
              onChange={(v) => edit({ ...edits, radio: v as RadioKey })}
            />
          </>
        ) : (
          <Rows rows={[["Radio", current]]} />
        )}
        {peerLinks && editable && <Note>It talks over the project&apos;s network — change it with Change link on the Network card.</Note>}
        {radioLinks.length === 0 && key === "wifi" && spec.battery !== "none" && spec.battery !== "adapter" && <Note>Wi-Fi needs mains power — it drains a battery fast.</Note>}
      </GroupRow>,
    );
  }

  // ── Case ── (where it's used only for an electronic product: a plate has nothing inside to keep dry)
  {
    const sealing = !mechanical;
    const edited = sectionEdited(edits, "case", conceptParts);
    const environment = edits.environment ?? environmentOf(parts, hints);
    groups.push(
      <GroupRow
        key="case"
        title="Case"
        tag={tag(edited || spec.materialSource === "you" || spec.wallSource === "you")}
        value={[spec.material, `${spec.wallMm.toFixed(1)} mm`, sealing ? ENVIRONMENTS[environment].label : null].filter(Boolean).join(" · ")}
        open={openGroup === "case"}
        onToggle={() => toggle("case")}
        onReset={
          editable && (edited || spec.materialSource === "you" || spec.wallSource === "you")
            ? () => edit({ ...resetSection(edits, "case", conceptParts), material: undefined, wallMm: undefined })
            : undefined
        }
      >
        {editable ? (
          <>
            <Label>Plastic</Label>
            <Chips value={spec.material} options={MATERIALS.map((m) => ({ value: m, label: m }))} onChange={(m) => edit({ ...edits, material: m })} />
            <Label>Wall</Label>
            <PickField
              title="Wall"
              value={spec.wallMm.toFixed(1)}
              options={WALLS.map((w) => ({ value: w.toFixed(1), label: `${w.toFixed(1)} mm`, sub: wallNote(w) }))}
              onChange={(v) => edit({ ...edits, wallMm: Number(v) })}
            />
            {sealing && (
              <>
                <Label>Where it&apos;s used</Label>
                <Chips<EnvironmentKey>
                  value={environment}
                  options={ENVIRONMENT_KEYS.map((k) => ({ value: k, label: ENVIRONMENTS[k].label }))}
                  onChange={(v) => edit({ ...edits, environment: v })}
                />
              </>
            )}
          </>
        ) : (
          <Rows
            rows={[
              ["Plastic", spec.material],
              ["Wall", `${spec.wallMm.toFixed(1)} mm`],
              ...(sealing ? [["Where it's used", ENVIRONMENTS[environment].label] as [string, string]] : []),
            ]}
          />
        )}
      </GroupRow>,
    );
  }

  // ── Mounting: always on a product with no electronics (how it is held), else only once it has one ──
  {
    const current = edits.mounting ?? mountingOf(parts);
    if (current || mechanical) {
      const edited = sectionEdited(edits, "mounting", conceptParts);
      const part = current ? MOUNTINGS[current] : null;
      groups.push(
        <GroupRow
          key="mounting"
          title="Mounting"
          tag={edited || current ? tag(edited) : undefined}
          value={part ? part.label : "None"}
          open={openGroup === "mounting"}
          onToggle={() => toggle("mounting")}
          onReset={editable && edited ? () => edit(resetSection(edits, "mounting", conceptParts)) : undefined}
        >
          {editable ? (
            <Chips<MountingKey> value={current} options={MOUNTING_KEYS.map((k) => ({ value: k, label: MOUNTINGS[k].label }))} onChange={(v) => edit({ ...edits, mounting: v })} />
          ) : (
            <Rows rows={[["Mounting", part ? part.label : "None"]]} />
          )}
          <Note>
            {part
              ? `${counted(asPart(part))} — ${part.role.charAt(0).toLowerCase()}${part.role.slice(1)}.`
              : `Nothing holds it where it sits${editable ? " yet" : ""}.`}
          </Note>
        </GroupRow>,
      );
    }
  }

  // ── Electronics: a product with no parts to power says so, and can be given some ──
  if (mechanical) {
    groups.push(
      <GroupRow key="electronics" title="Electronics" value="None" open={openGroup === "electronics"} onToggle={() => toggle("electronics")}>
        <ReadOnly>None — this product has no parts to power.</ReadOnly>
        {editable && (
          <Button hierarchy="secondary" size="lg" className="w-full" iconLeading={<Icon icon={Add01Icon} size={16} />} onClick={() => edit(withElectronics(edits))}>
            Add electronics
          </Button>
        )}
      </GroupRow>,
    );
  }

  // ── Brain ──
  if (chip) {
    const key = mcuKeyOf(parts);
    // Electronics a plate was given are undone as one thing — taking the chip out alone would
    // leave its port on a board of its own. A chip a charger or a pack was given comes out with
    // its radio, by its own button.
    const givenElectronics = productKind(conceptParts) === "mechanical";
    const givenChip = canAddBrain(conceptParts) && !!edits.mcu;
    const edited = givenElectronics || givenChip || sectionEdited(edits, "brain", conceptParts);
    groups.push(
      <GroupRow
        key="brain"
        title="Brain"
        tag={tag(edited)}
        value={key ? MCUS[key].label : readableName(chip)}
        open={openGroup === "brain"}
        onToggle={() => toggle("brain")}
        onReset={editable && edited && !givenElectronics && !givenChip ? () => edit(resetSection(edits, "brain", conceptParts)) : undefined}
      >
        {editable ? (
          <>
            <Label>Chip that runs it</Label>
            <PickField
              title="Chip that runs it"
              placeholder={readableName(chip)}
              value={key}
              options={MCU_KEYS.map((k) => ({ value: k, label: MCUS[k].label, sub: MCUS[k].forWhat }))}
              onChange={(v) => edit({ ...edits, mcu: v as McuKey })}
            />
            {key && <Note>{MCUS[key].forWhat}</Note>}
          </>
        ) : (
          <Rows rows={[["Chip that runs it", key ? MCUS[key].label : readableName(chip)]]} />
        )}
        {givenElectronics && editable && (
          <>
            <Button hierarchy="secondary" size="lg" className="w-full" onClick={() => edit(withoutElectronics(edits))}>
              Remove electronics
            </Button>
            <Note>Takes the chip, its port and anything added back out.</Note>
          </>
        )}
        {givenChip && editable && (
          <>
            <Button hierarchy="secondary" size="lg" className="w-full" onClick={() => edit(withoutBrain(edits))}>
              Remove chip
            </Button>
            <Note>Takes the chip and its radio back out.</Note>
          </>
        )}
      </GroupRow>,
    );
  } else if (!mechanical && canAddBrain(parts)) {
    // Electronics with nothing to run them — a charger, a spare pack — can be given a chip, which
    // opens its radio and the parts it can run.
    groups.push(
      <GroupRow key="brain" title="Brain" value="No chip" open={openGroup === "brain"} onToggle={() => toggle("brain")}>
        <ReadOnly>{editable ? "No chip — add one to give it sensors, a screen or wireless" : "No chip"}</ReadOnly>
        {editable && (
          <Button hierarchy="secondary" size="lg" className="w-full" iconLeading={<Icon icon={Add01Icon} size={16} />} onClick={() => edit(withBrain(edits))}>
            Add a chip
          </Button>
        )}
      </GroupRow>,
    );
  }

  // ── Inside ── (an electronic product's: a product with no electronics has nothing inside to list)
  if (!mechanical) {
    const inside = insideOf(spec, parts);
    groups.push(
      <GroupRow
        key="inside"
        title="Inside"
        value={spec.board ? `${spec.board.layers}-layer board · ${spec.board.parts} parts` : "No board"}
        open={openGroup === "inside"}
        onToggle={() => toggle("inside")}
      >
        <Rows
          rows={[
            ["Circuit board", inside.board],
            ...(inside.on.length ? [["On the board", inside.on.map((r) => `${r.name} — ${r.does}`).join(" · ")] as [string, string]] : []),
            ...(inside.wired.length ? [["Wired to it", inside.wired.join(" · ")] as [string, string]] : []),
          ]}
        />
      </GroupRow>,
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <span className="w-fit">
        <Badge tone={blocksBuild(spec) ? "error" : "success"}>{blocksBuild(spec) ? "● Doesn't fit" : "● Ready"}</Badge>
      </span>
      <ul aria-label="Spec" className={cn(LIST_CARD, LIST_DIVIDERS)}>{groups}</ul>
    </div>
  );
}

// ─────────────────────────── Size ───────────────────────────

function SizeGroup({
  open,
  onToggle,
  spec,
  edits,
  edit,
  tag,
  conceptParts,
}: {
  open: boolean;
  onToggle: () => void;
  spec: ReturnType<typeof deriveSpec>;
  edits: SpecEdits;
  edit?: (next: SpecEdits) => void;
  tag: string;
  /** The concept's own parts: the smaller pack keeps the concept's port (the web's withSupply). */
  conceptParts: ConceptPart[];
}) {
  const asDraft = (m: { l: number; w: number; h: number }) => ({ l: String(m.l), w: String(m.w), h: String(m.h) });
  const [draft, setDraft] = React.useState(() => asDraft(spec.size));
  const [seed, setSeed] = React.useState(mm3(spec.size));
  const [error, setError] = React.useState<string | null>(null);
  if (seed !== mm3(spec.size)) {
    setSeed(mm3(spec.size));
    setDraft(asDraft(spec.size));
  }
  const commit = () => {
    if (!edit) return;
    const box = asMm3({ l: Number(draft.l), w: Number(draft.w), h: Number(draft.h) });
    if (!box || ![draft.l, draft.w, draft.h].every((v) => /^\d+$/.test(v.trim()))) {
      setError(`Use whole millimetres, ${MM_MIN}–${MM_MAX}.`);
      return;
    }
    setError(null);
    if (box.l === spec.size.l && box.w === spec.size.w && box.h === spec.size.h) return;
    edit({ ...edits, size: box, draftAtSize: false });
  };
  const conflict = blocksBuild(spec);
  return (
    <GroupRow
      title="Size"
      tag={tag}
      value={mm3(spec.size)}
      valueTone={conflict ? "error" : spec.draftAtSize ? "warn" : "plain"}
      open={open}
      onToggle={onToggle}
      onReset={edit && spec.sizeSource === "you" ? () => edit({ ...edits, size: undefined, draftAtSize: false }) : undefined}
    >
      {edit ? (
        <div className="grid grid-cols-3 gap-4">
          {(["l", "w", "h"] as const).map((k) => (
            <label key={k} className="flex flex-col gap-2">
              <span className={T.meta}>{k === "l" ? "Length" : k === "w" ? "Width" : "Height"}, mm</span>
              <TextInput
                size="lg"
                inputMode="numeric"
                value={draft[k]}
                invalid={!!error}
                aria-label={`${k === "l" ? "Length" : k === "w" ? "Width" : "Height"} in millimetres`}
                onValueChange={(v) => setDraft((d) => ({ ...d, [k]: v }))}
                onBlur={commit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commit();
                }}
              />
            </label>
          ))}
        </div>
      ) : (
        <Rows rows={[["Size", mm3(spec.size)]]} />
      )}
      {error && <Note tone="error">{error}</Note>}
      {conflict ? (
        <>
          <Note tone="error">Doesn&apos;t fit — needs at least {mm3(spec.minSize)}.</Note>
          {edit && (
            <div className="flex flex-col gap-3">
              <Button hierarchy="secondary" size="lg" className="w-full" onClick={() => edit({ ...edits, size: spec.minSize, draftAtSize: false })}>
                Use {mm3(spec.minSize)}
              </Button>
              {spec.smallerBattery && (
                <Button hierarchy="secondary" size="lg" className="w-full" onClick={() => edit({ ...withSupply(edits, spec.smallerBattery!.key, conceptParts), size: spec.size })}>
                  {batteryOf(spec.smallerBattery.key).label} — fits
                </Button>
              )}
              <Button hierarchy="ghost" size="lg" className="w-full" onClick={() => edit({ ...edits, draftAtSize: true })}>
                Build at this size anyway
              </Button>
            </div>
          )}
        </>
      ) : (
        <Note>Smallest the parts fit is {mm3(spec.minSize)} — give or take 15%.</Note>
      )}
      {spec.draftAtSize && <Note tone="warn">Building at this size as Draft — the parts need at least {mm3(spec.minSize)}.</Note>}
      {spec.estimated.length > 0 && <Note>Sized by type, not by datasheet: {spec.estimated.join(", ")}.</Note>}
    </GroupRow>
  );
}

// ─────────────────────────── parts ───────────────────────────

function GroupRow({
  title,
  tag,
  value,
  valueTone = "plain",
  open,
  onToggle,
  onReset,
  children,
}: {
  title: string;
  tag?: string;
  value: string;
  valueTone?: "plain" | "warn" | "error";
  open: boolean;
  onToggle: () => void;
  onReset?: () => void;
  children: React.ReactNode;
}) {
  const id = React.useId();
  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={onToggle}
        className={cn("flex min-h-[64px] w-full items-center gap-4 px-7 py-5 text-left outline-none transition-colors duration-fast active:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus", open && "bg-bg-subtle")}
      >
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-center gap-3">
            <span className={T.bodyStrong}>{title}</span>
            {tag && <span className={cn(T.meta, "text-text-blue")}>{tag}</span>}
          </span>
          <span className={cn(T.meta, "truncate", valueTone === "error" ? "text-text-error" : valueTone === "warn" ? "text-text-warning" : "text-text-secondary")}>{value}</span>
        </span>
        <span className="text-[color:var(--color-icon-default)]">
          <Icon icon={open ? ArrowUp01Icon : ArrowDown01Icon} size={18} />
        </span>
      </button>
      {open && (
        <div id={id} className="flex flex-col gap-4 bg-bg-subtle px-7 pb-7">
          {children}
          {onReset && (
            <button type="button" onClick={onReset} className={cn(T.rowTitle, "-my-3 min-h-[44px] w-fit text-text-brand hover:underline")}>
              Reset to suggested
            </button>
          )}
        </div>
      )}
    </li>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className={cn(T.label, "text-text-secondary")}>{children}</p>;
}

/** A value said as text, where the web's ReadOnly says it. */
function ReadOnly({ children }: { children: React.ReactNode }) {
  return <p className={cn(T.body, "text-text-primary")}>{children}</p>;
}

/** A quiet way in inside a group ("Add a servo — …"): brand text, 44 px tall, like Reset to suggested. */
function TextAction({ icon, onClick, children }: { icon: IconValue; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={cn(T.rowTitle, "-my-3 inline-flex min-h-[44px] w-fit items-center gap-2 text-left text-text-brand hover:underline")}>
      <Icon icon={icon} size={16} />
      {children}
    </button>
  );
}

function Note({ children, tone = "plain" }: { children: React.ReactNode; tone?: "plain" | "warn" | "error" }) {
  return <p className={cn(T.meta, tone === "error" ? "text-text-error" : tone === "warn" ? "text-text-warning" : "text-text-secondary")}>{children}</p>;
}

function Rows({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="flex flex-col">
      {rows.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[112px_1fr] gap-4 border-b-[length:var(--border-width-1)] border-solid border-border-subtle py-3 last:border-b-0">
          <dt className={T.meta}>{k}</dt>
          <dd className={cn(T.meta, "text-text-primary")}>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** One of a few, as chips (Mounting may have none picked yet). */
function Chips<T extends string>({ value, options, onChange }: { value: T | null; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" className="flex flex-wrap gap-3">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={cn(
              T.meta, "inline-flex min-h-[44px] items-center gap-2 rounded-full border-[length:var(--border-width-1-5)] border-solid px-5 outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
              on ? "border-border-brand bg-bg-surface text-text-brand" : "border-border-subtle bg-bg-surface text-text-primary",
            )}
          >
            {on && <span aria-hidden className="size-[6px] rounded-full bg-bg-brand" />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}


