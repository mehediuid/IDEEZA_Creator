"use client";

// M14 Tabs, Line (Shared kit SK-05 10612:9231, MS-01 10678:4790, Earn Coin
// 10702:228883): the one tab strip every /m screen uses. 40 tall over a
// border/default baseline; each label is Body/SM Medium (T.rowTitle) — brand
// with a 2 px border/brand line under it when on, text/tertiary when off, so
// only the colour and the line change and no label shifts width on a tap.
// `width="full"` shares the row equally, `"hug"` sits the tabs from the left
// (the Figma variant per screen). A count reads "Inbox 1" (PR-02 "Projects 6").
//
// One Tab stop; the arrows, Home and End move the selection and focus with it
// (lib/ui/tab-keys). Pair each panel with `tabPanelProps(idBase, value)`.
//
// A tab is client state, never a navigation: `useTabParam` keeps it in the
// address (`?tab=requests`) with history.replaceState, which Next keeps in
// step with useSearchParams — so a tap never waits for the server, works
// offline and adds no Back step, while a reload or a shared link opens the
// same tab. Never switch tabs with router.push / router.replace or a <Link>.
//
//   const [tab, setTab] = useTabParam("tab", ["inbox", "requests"], "inbox");
//   <MobileTabs label="Messages" idBase="inbox" value={tab} onChange={setTab}
//     tabs={[{ value: "inbox", label: "Inbox", count: 1 }, { value: "requests", label: "Requests" }]} />
//   <div {...tabPanelProps("inbox", tab)}>…</div>

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { moveTab } from "@/lib/ui/tab-keys";
import { cn } from "@/lib/utils";
import { T } from "../type";

export type MobileTab<V extends string> = {
  value: V;
  label: string;
  /** Shown after the label ("Inbox 1"); 0 or none shows nothing. */
  count?: number;
  /** Spoken in place of the count ("1 unread"). */
  countLabel?: string;
  disabled?: boolean;
};

const tabId = (idBase: string, value: string) => `${idBase}-tab-${value}`;
const panelId = (idBase: string, value: string) => `${idBase}-panel-${value}`;

/** The tab named in the address (`?<name>=<value>`), `fallback` when it names none of `values`,
 *  and its setter: the tab changes at once, and the address follows by replaceState (no fetch, no
 *  history entry; the fallback leaves the param out). Back and Forward still move it. */
export function useTabParam<V extends string>(name: string, values: readonly V[], fallback: V): [V, (value: V) => void] {
  const params = useSearchParams();
  const raw = params.get(name);
  const parsed = raw !== null && (values as readonly string[]).includes(raw) ? (raw as V) : fallback;
  // Shown at once; dropped as soon as the address (or Back) says otherwise.
  const [picked, setPicked] = React.useState<V | null>(null);
  const [seen, setSeen] = React.useState(raw);
  if (raw !== seen) {
    setSeen(raw);
    setPicked(null);
  }
  const set = React.useCallback(
    (value: V) => {
      setPicked(value);
      const q = new URLSearchParams(window.location.search);
      if (value === fallback) q.delete(name);
      else q.set(name, value);
      const search = q.toString();
      window.history.replaceState(null, "", `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`);
    },
    [name, fallback],
  );
  return [picked ?? parsed, set];
}

/** The props of the panel the selected tab shows. */
export function tabPanelProps(idBase: string, value: string) {
  return { id: panelId(idBase, value), role: "tabpanel" as const, "aria-labelledby": tabId(idBase, value), tabIndex: 0 };
}

export function MobileTabs<V extends string>({
  tabs,
  value,
  onChange,
  label,
  idBase,
  width = "full",
  className,
}: {
  tabs: readonly MobileTab<V>[];
  value: V;
  onChange: (value: V) => void;
  /** The strip's name for assistive tech ("Project", "Messages"). */
  label: string;
  /** Ties each tab to its panel (`tabPanelProps`); without it the tabs name no panel. */
  idBase?: string;
  width?: "full" | "hug";
  className?: string;
}) {
  const enabled = tabs.filter((t) => !t.disabled).map((t) => t.value);
  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={(e) => moveTab(e, enabled, value, onChange)}
      className={cn(
        "flex shrink-0 border-b-[length:var(--border-width-1)] border-solid border-border",
        width === "hug" && "gap-8",
        className,
      )}
    >
      {tabs.map((t) => {
        const on = t.value === value;
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            data-tab={t.value}
            id={idBase ? tabId(idBase, t.value) : undefined}
            aria-controls={idBase ? panelId(idBase, t.value) : undefined}
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            disabled={t.disabled}
            onClick={() => onChange(t.value)}
            className={cn(
              T.rowTitle,
              "-mb-[var(--border-width-1)] flex h-[40px] min-w-0 items-center justify-center gap-2 whitespace-nowrap border-b-[length:var(--border-width-2)] border-solid px-2 outline-none transition-colors duration-fast focus-visible:bg-bg-subtle disabled:cursor-not-allowed disabled:text-text-disabled",
              width === "full" && "flex-1",
              on ? "border-[var(--color-border-brand)] text-text-brand" : "border-transparent text-text-tertiary hover:text-text-secondary",
            )}
          >
            <span className="truncate">{t.label}</span>
            {t.count ? (
              <>
                <span aria-hidden className="tabular-nums">
                  {t.count}
                </span>
                <span className="sr-only">{t.countLabel ?? String(t.count)}</span>
              </>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
