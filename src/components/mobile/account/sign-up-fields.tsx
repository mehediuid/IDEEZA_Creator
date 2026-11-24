"use client";

// Two of Create account's fields (AU-10, the web's components/auth/sign-up-form.tsx), shared with
// "Finish your account" after Google or Facebook (details-step.tsx, AUTH-2): the date of birth —
// day, month and year, each from a pick-one sheet, each with the web's own error under it
// ("Choose a day.", AUTH-14) — and the consent line with its Terms link.

import * as React from "react";
import { FIELD_ERROR, FIELD_LABEL } from "@/components/auth/auth-parts";
import { Checkbox } from "@/components/ideeza/checkbox";
import { birthDateOf } from "@/lib/account/auth";
import { cn } from "@/lib/utils";
import { SheetSelect } from "../kit/sheet-select";
import { T } from "../type";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }));
const MONTH_OPTIONS = MONTHS.map((m, i) => ({ value: String(i + 1), label: m }));

type Ids = { id: string; errorId: string };
export type BirthDate = { day: string; month: string; year: string };

/** "4", "3", "1998" from a stored "1998-03-04" (Verify's "Wrong email?" carries it back, AUTH-6); empty when there is none. */
export function birthDateParts(iso: string): BirthDate {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? { year: m[1], month: String(Number(m[2])), day: String(Number(m[3])) } : { day: "", month: "", year: "" };
}

/** A day, month or year read from a link: kept only when it is one of the field's choices. */
export function birthDateFromQuery(params: URLSearchParams, now: number): BirthDate {
  const inRange = (raw: string | null, lo: number, hi: number) => {
    const n = Number(raw);
    return raw && /^\d+$/.test(raw) && n >= lo && n <= hi ? String(n) : "";
  };
  return {
    day: inRange(params.get("day"), 1, 31),
    month: inRange(params.get("month"), 1, 12),
    year: inRange(params.get("year"), 1900, new Date(now).getFullYear()),
  };
}

/** The web's words for each picker (sign-up-form.tsx's dateError): a missing day, month or year
 *  under its own picker; a date that can't be (31 February, or not yet) under the day. */
export function birthDateErrors(value: BirthDate, now: number): Partial<Record<keyof BirthDate, string>> {
  const bad = !!value.day && !!value.month && !!value.year && !birthDateOf(value.day, value.month, value.year, now);
  return {
    ...(!value.day ? { day: "Choose a day." } : bad ? { day: "That date doesn't exist." } : {}),
    ...(!value.month ? { month: "Choose a month." } : {}),
    ...(!value.year ? { year: "Choose a year." } : {}),
  };
}

const PARTS = ["day", "month", "year"] as const;

export function BirthDateField({
  value,
  onChange,
  shown,
  now,
  ids,
}: {
  value: BirthDate;
  onChange: (part: keyof BirthDate, v: string) => void;
  /** Whether the errors show: Create account (or Continue) was pressed, or all three are chosen. */
  shown: boolean;
  /** Today, for the years offered and "not in the future" (fixed while the form is open). */
  now: number;
  ids: { day: Ids; month: Ids; year: Ids };
}) {
  const yearOptions = React.useMemo(() => {
    const year = new Date(now).getFullYear();
    return Array.from({ length: year - 1899 }, (_, i) => ({ value: String(year - i), label: String(year - i) }));
  }, [now]);
  const errors = shown ? birthDateErrors(value, now) : {};
  const described = PARTS.filter((p) => errors[p]).map((p) => ids[p].errorId);
  const pickers = {
    day: { title: "Day", options: DAY_OPTIONS },
    month: { title: "Month", options: MONTH_OPTIONS },
    year: { title: "Year", options: yearOptions },
  };
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-[6px] border-0 p-0" aria-describedby={described.length ? described.join(" ") : undefined}>
      <legend className={cn(FIELD_LABEL, "mb-[6px] p-0")}>Date of birth</legend>
      <div className="grid grid-cols-[1fr_1.4fr_1.2fr] gap-x-4 gap-y-[6px]">
        {PARTS.map((p) => (
          <SheetSelect
            key={p}
            id={ids[p].id}
            title={pickers[p].title}
            placeholder={pickers[p].title}
            value={value[p]}
            options={pickers[p].options}
            onChange={(v) => onChange(p, v)}
            invalid={!!errors[p]}
          />
        ))}
        {/* A date that can't be is about all three: its line runs the row's width (it is the day's, as on the web). */}
        {described.length > 0 &&
          (errors.day && value.day ? (
            <p id={ids.day.errorId} className={cn(FIELD_ERROR, "col-span-3")}>
              {errors.day}
            </p>
          ) : (
            PARTS.map((p) =>
              errors[p] ? (
                <p key={p} id={ids[p].errorId} className={FIELD_ERROR}>
                  {errors[p]}
                </p>
              ) : (
                <span key={p} aria-hidden />
              ),
            )
          ))}
      </div>
    </fieldset>
  );
}

/** "I agree to the IDEEZA Privacy policy and Terms and conditions." — the box and its error. */
export function ConsentCheck({
  checked,
  onChange,
  error,
  ids,
  onTerms,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  error?: React.ReactNode;
  ids: Ids;
  onTerms: () => void;
}) {
  return (
    <div className="flex flex-col gap-[6px]">
      <label className="relative flex cursor-pointer items-start gap-6 rounded-md has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-border-focus">
        <input
          id={ids.id}
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          {...(error ? { "aria-invalid": true, "aria-describedby": ids.errorId } : {})}
        />
        <Checkbox checked={checked} decorative className="mt-[2px]" />
        <span className={T.meta}>
          I agree to the IDEEZA Privacy policy and{" "}
          <button
            type="button"
            className="font-medium text-text-brand hover:underline"
            onClick={(e) => {
              e.preventDefault();
              onTerms();
            }}
          >
            Terms and conditions
          </button>
          .
        </span>
      </label>
      {error && (
        <p id={ids.errorId} className={FIELD_ERROR}>
          {error}
        </p>
      )}
    </div>
  );
}
