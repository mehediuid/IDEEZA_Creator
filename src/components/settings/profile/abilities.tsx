"use client";

// Personal Information › Abilities (Figma 22048:29733, edit state
// 22550:44158): your skills as chips (up to 16) and Specialists (Top 3
// Skills), each with how long you have practised it. Both show on your
// profile, under About. Edit: type a skill and press Enter (or Add); tick up
// to three of your skills as specialities and choose their years.

import * as React from "react";
import { Add01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, Checkbox, SelectMenu, Tag, TextInput } from "@/components/ideeza";
import { cn } from "@/lib/utils";
import { SKILLS_MAX, SPECIALITIES_MAX, YEARS, YEARS_WORDS, cleanSkills, type Speciality, type Years } from "@/lib/people/fields";
import { saveProfile, useMyProfile } from "@/lib/people/profile-store";
import { CardFormActions, EditButton, SAVE_FAILED, SettingsCard } from "../settings-card";
import { Chips, Field, FormField, Panel, useCardEdit } from "./parts";

const YEAR_OPTIONS = YEARS.map((y) => ({ value: y, label: YEARS_WORDS[y] }));

export function AbilitiesCard() {
  const { hydrated, fields } = useMyProfile();
  const { editing, start, stop, editRef, formRef } = useCardEdit();
  return (
    <SettingsCard
      id="abilities"
      title="Abilities"
      action={
        !editing && (
          <div ref={editRef}>
            <EditButton onClick={start} aria-label="Edit abilities" />
          </div>
        )
      }
    >
      {editing ? (
        <AbilitiesForm formRef={formRef} skills={fields.skills} specialities={fields.specialities} onDone={stop} />
      ) : (
        <>
          <Field id="skills" label="Skills" ready={hydrated}>
            {fields.skills.length > 0 && <Chips chips={fields.skills} />}
          </Field>
          <Field id="specialists" label="Specialists (Top 3 Skills)" ready={hydrated}>
            {fields.specialities.length > 0 && (
              <Panel>
                <ul role="list" className="m-0 flex list-none flex-col p-0">
                  {fields.specialities.map((s) => (
                    <li key={s.skill} className="flex items-baseline justify-between gap-[16px] py-[6px]">
                      <span className="min-w-0 text-md leading-md text-text-primary [overflow-wrap:anywhere]">{s.skill}</span>
                      <span className="shrink-0 text-md leading-md text-text-secondary">{YEARS_WORDS[s.years]}</span>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}
          </Field>
        </>
      )}
    </SettingsCard>
  );
}

function AbilitiesForm({
  formRef,
  skills: initialSkills,
  specialities: initialSpecialities,
  onDone,
}: {
  formRef: React.RefObject<HTMLFormElement | null>;
  skills: string[];
  specialities: Speciality[];
  onDone: () => void;
}) {
  const ids = React.useId();
  const [skills, setSkills] = React.useState(initialSkills);
  const [specialities, setSpecialities] = React.useState(initialSpecialities);
  const [typed, setTyped] = React.useState("");
  const [note, setNote] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const full = skills.length >= SKILLS_MAX;

  const add = () => {
    const words = typed.split(",").map((w) => w.trim()).filter(Boolean);
    if (!words.length) return;
    const next = cleanSkills([...skills, ...words]);
    const added = next.length - skills.length;
    setNote(added < words.length ? (next.length >= SKILLS_MAX ? `${SKILLS_MAX} skills is the most. Remove one to add another.` : "You already have that skill.") : null);
    setSkills(next);
    setTyped("");
  };

  const removeSkill = (skill: string) => {
    setSkills((prev) => prev.filter((s) => s !== skill));
    setSpecialities((prev) => prev.filter((s) => s.skill !== skill));
    setNote(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const toggle = (skill: string) =>
    setSpecialities((prev) =>
      prev.some((s) => s.skill === skill)
        ? prev.filter((s) => s.skill !== skill)
        : prev.length >= SPECIALITIES_MAX
          ? prev
          : [...prev, { skill, years: "1-2" }],
    );
  const setYears = (skill: string, years: Years) => setSpecialities((prev) => prev.map((s) => (s.skill === skill ? { ...s, years } : s)));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const pending = typed.trim() ? cleanSkills([...skills, ...typed.split(",")]) : skills;
    const kept = specialities.filter((s) => pending.includes(s.skill));
    if (!saveProfile({ skills: pending, specialities: kept }).ok) {
      setError(SAVE_FAILED);
      return;
    }
    onDone();
  };

  const inputId = `${ids}-skill`;
  const specialitiesFull = specialities.length >= SPECIALITIES_MAX;

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="flex flex-col gap-[20px] pt-[8px]">
      <FormField
        id={inputId}
        label="Skills"
        hint={
          <span aria-live="polite">
            {note ?? `You can add up to ${SKILLS_MAX} skills`}
            <span className="tabular-nums">{` · ${skills.length} of ${SKILLS_MAX}`}</span>
          </span>
        }
      >
        <div className="flex gap-[8px]">
          <TextInput
            ref={inputRef}
            id={inputId}
            size="xl"
            value={typed}
            onValueChange={(v) => {
              setTyped(v);
              setNote(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                add();
              }
            }}
            disabled={full}
            placeholder={full ? "Remove a skill to add another" : "PCB design, firmware, 3D modelling…"}
            maxLength={120}
            aria-describedby={`${inputId}-note`}
            containerClassName="min-w-0 flex-1"
          />
          <Button
            type="button"
            hierarchy="secondary"
            size="xl"
            iconLeading={<Icon icon={Add01Icon} size={16} />}
            onClick={add}
            disabled={full || !typed.trim()}
          >
            Add
          </Button>
        </div>
      </FormField>
      {skills.length > 0 && (
        <ul role="list" aria-label="Your skills" className="m-0 -mt-[8px] flex list-none flex-wrap gap-[8px] p-0">
          {skills.map((s) => (
            <li key={s}>
              <Tag size="md" selected onDismiss={() => removeSkill(s)} dismissLabel={`Remove ${s}`}>
                {s}
              </Tag>
            </li>
          ))}
        </ul>
      )}
      <fieldset className="m-0 flex min-w-0 flex-col gap-[4px] border-0 p-0">
        <legend className="mb-[6px] p-0 text-md leading-md text-text-secondary">
          Specialists <span className="font-medium text-text-primary">(Top 3 Skills)</span>
        </legend>
        {skills.length === 0 ? (
          <p className="m-0 text-md leading-md text-text-tertiary">Add a skill above, then tick up to three as your specialities.</p>
        ) : (
          <>
            <p className="m-0 text-md leading-md text-text-tertiary" aria-live="polite">
              {specialitiesFull ? `${SPECIALITIES_MAX} chosen. Untick one to choose another.` : `Tick up to ${SPECIALITIES_MAX} and say how long you have practised each.`}
            </p>
            <ul role="list" className="m-0 flex list-none flex-col p-0">
              {skills.map((skill) => {
                const chosen = specialities.find((s) => s.skill === skill);
                const off = !chosen && specialitiesFull;
                return (
                  <li key={skill} className="flex min-h-[48px] flex-wrap items-center justify-between gap-x-[12px] gap-y-[4px] border-b border-solid border-border py-[4px] last:border-b-0">
                    <label
                      className={cn(
                        "flex min-h-[44px] min-w-0 flex-1 items-center gap-[12px] rounded-lg has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-border-focus",
                        off ? "cursor-not-allowed" : "cursor-pointer",
                      )}
                    >
                      <input type="checkbox" checked={!!chosen} disabled={off} onChange={() => toggle(skill)} className="sr-only" />
                      <Checkbox checked={!!chosen} disabled={off} decorative />
                      <span className={cn("min-w-0 text-md leading-md [overflow-wrap:anywhere]", off ? "text-text-disabled" : "text-text-primary")}>{skill}</span>
                    </label>
                    {chosen && (
                      <div className="w-[150px] shrink-0">
                        <SelectMenu
                          ariaLabel={`Years of ${skill}`}
                          placeholder="Years"
                          options={YEAR_OPTIONS}
                          value={chosen.years}
                          onChange={(v) => setYears(skill, v)}
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </fieldset>
      <CardFormActions onCancel={onDone} error={error} />
    </form>
  );
}

