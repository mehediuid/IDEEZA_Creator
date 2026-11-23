"use client";

// Two of Create account's fields (AU-10, the web's components/auth/sign-up-form.tsx), shared with
// "Finish your account" after Google or Facebook (details-step.tsx, AUTH-2): the date of birth —
// day, month and year, each from a pick-one sheet — and the consent line with its Terms link.

import * as React from "react";
import { FIELD_ERROR, FIELD_LABEL } from "@/components/auth/auth-parts";
import { Checkbox } from "@/components/ideeza/checkbox";
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

export function BirthDateField({
  value,
  onChange,
  error,
  now,
  ids,
}: {
  value: BirthDate;
  onChange: (part: keyof BirthDate, v: string) => void;
  error?: React.ReactNode;
  /** Today, for the years offered (fixed while the form is open). */
  now: number;
  ids: { day: Ids; month: Ids; year: Ids; birthday: Ids };
}) {
  const yearOptions = React.useMemo(() => {
    const year = new Date(now).getFullYear();
    return Array.from({ length: year - 1899 }, (_, i) => ({ value: String(year - i), label: String(year - i) }));
  }, [now]);
  const chosen = !!value.day && !!value.month && !!value.year;
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-[6px] border-0 p-0" aria-describedby={error ? ids.birthday.errorId : undefined}>
      <legend className={cn(FIELD_LABEL, "mb-[6px] p-0")}>Date of birth</legend>
      <div className="grid grid-cols-[1fr_1.4fr_1.2fr] gap-4">
        <SheetSelect
          id={ids.day.id}
          title="Day"
          placeholder="Day"
          value={value.day}
          options={DAY_OPTIONS}
          onChange={(v) => onChange("day", v)}
          invalid={!!error && (!value.day || chosen)}
        />
        <SheetSelect
          id={ids.month.id}
          title="Month"
          placeholder="Month"
          value={value.month}
          options={MONTH_OPTIONS}
          onChange={(v) => onChange("month", v)}
          invalid={!!error && !value.month}
        />
        <SheetSelect
          id={ids.year.id}
          title="Year"
          placeholder="Year"
          value={value.year}
          options={yearOptions}
          onChange={(v) => onChange("year", v)}
          invalid={!!error && !value.year}
        />
      </div>
      {error && (
        <p id={ids.birthday.errorId} className={FIELD_ERROR}>
          {error}
        </p>
      )}
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
