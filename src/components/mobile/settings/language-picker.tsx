"use client";

// Kit searchable picker (Settings "Language & region", ST-41 / 41b / 41c): a
// screen of its own with the page's top bar, a 44 search field, an Automatic
// row pinned first (no flags), then the choices as A08 radios with their hint.
// A tap saves the choice, says "Saved" and goes back; nothing matching says
// so in one line (41b).

import * as React from "react";
import { useRouter } from "next/navigation";
import { Radio } from "@/components/ideeza/checkbox";
import { SearchInput } from "@/components/ideeza/search-input";
import { cn } from "@/lib/utils";
import { useOnline } from "../kit/states";
import { T } from "../type";
import { useToast } from "../kit/toast";
import { LIST_CARD } from "../kit/list";
import { SettingsScreen, leaveTo } from "./kit";

export type PickOption = { value: string; label: string; hint?: string };

const matches = (o: PickOption, q: string) => `${o.label} ${o.hint ?? ""}`.toLowerCase().replace(/_/g, " ").includes(q);

function Choice({
  option,
  checked,
  disabled,
  onPick,
  pinned,
}: {
  option: PickOption;
  checked: boolean;
  disabled: boolean;
  onPick: () => void;
  pinned?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      disabled={disabled}
      onClick={onPick}
      className={cn(
        "flex w-full text-left outline-none disabled:cursor-not-allowed",
        pinned
          ? "min-h-[48px] items-center gap-6 px-8 py-6 transition-colors duration-fast hover:bg-bg-subtle focus-visible:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus"
          : "min-h-[44px] items-start gap-8 rounded-md py-2 focus-visible:ring-2 focus-visible:ring-border-focus",
      )}
    >
      {!pinned && <Radio checked={checked} disabled={disabled} decorative className="shrink-0" />}
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className={cn(pinned ? T.body : T.bodyLg, disabled ? "text-text-disabled" : "text-text-primary")}>{option.label}</span>
        {option.hint && <span className={T.meta}>{option.hint}</span>}
      </span>
      {pinned && <Radio checked={checked} disabled={disabled} decorative className="shrink-0" />}
    </button>
  );
}

export function PickerScreen({
  title,
  placeholder,
  noMatch,
  autoFocus,
  pinned,
  options,
  value,
  onPick,
  backTo,
  note,
}: {
  title: string;
  placeholder: string;
  /** 41b: "No time zone matches “Dhka”." */
  noMatch: (query: string) => string;
  /** The keyboard comes up at once (the time zone list is long: you type a city). */
  autoFocus?: boolean;
  pinned: PickOption;
  options: readonly PickOption[];
  value: string;
  /** False when the browser refused: the picker stays and says so. */
  onPick: (value: string) => boolean;
  /** Where Back goes when the picker was opened from outside the app. */
  backTo: string;
  note?: React.ReactNode;
}) {
  const router = useRouter();
  const toast = useToast();
  const online = useOnline();
  const [query, setQuery] = React.useState("");
  const [failed, setFailed] = React.useState(false);
  const q = query.trim().toLowerCase();
  const shown = React.useMemo(() => (q ? options.filter((o) => matches(o, q)) : options), [options, q]);
  const pinnedShown = !q || matches(pinned, q);

  const leave = () => leaveTo(router, backTo);
  const pick = (v: string) => {
    if (v === value) return leave();
    if (!onPick(v)) return setFailed(true);
    toast({ title: "Saved" });
    leave();
  };

  return (
    <SettingsScreen title={title} back={backTo}>
      <SearchInput
        value={query}
        onValueChange={setQuery}
        placeholder={placeholder}
        aria-label={placeholder}
        autoFocus={autoFocus}
        disabled={!online}
        size="xl"
        containerClassName="mt-2"
      />
      {failed && (
        <p role="alert" className={cn(T.meta, "text-text-error")}>
          Couldn’t save. Nothing changed.
        </p>
      )}
      <div role="radiogroup" aria-label={title} className="flex flex-col gap-6">
        {pinnedShown && (
          <div className={cn(LIST_CARD, "rounded-lg")}>
            <Choice option={pinned} pinned checked={value === pinned.value} disabled={!online} onPick={() => pick(pinned.value)} />
          </div>
        )}
        {shown.length > 0 && (
          <div className="flex flex-col gap-2">
            {shown.map((o) => (
              <Choice key={o.value} option={o} checked={value === o.value} disabled={!online} onPick={() => pick(o.value)} />
            ))}
          </div>
        )}
      </div>
      {!pinnedShown && shown.length === 0 && (
        <p role="status" className={cn(T.body, "text-center")}>
          {noMatch(query.trim())}
        </p>
      )}
      {note && <p className={T.meta}>{note}</p>}
    </SettingsScreen>
  );
}
