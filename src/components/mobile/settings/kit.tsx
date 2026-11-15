"use client";

// The Settings pages' shared parts (mobile Figma "Settings · 2026 update"
// 10688:2, MFR-23):
// · SettingsScreen — bg/page, the top bar (Back, the page's title), content 16
//   to the sides and 12 apart; bones while the page's data loads (ST-90), the
//   M01 offline banner with "Connect to change this." (ST-91).
// · SettingsGroup — a Body/XS text/tertiary label 4 above a card (bg/surface,
//   border/default, radius/lg) of rows.
// · SettingsRow — "Kit / Settings row" 10689:70: a 24 icon, Body/SM label and
//   Body/XS helper, a Body/SM value or an A17 badge, then a chevron (Link) or
//   an A10 toggle. Plain (Sign out) and Danger (Erase) end with nothing: no
//   chevron. 12 / 16 padding, 12 apart. A value that doesn't fit beside its
//   label drops under it (320 wide), so the two never run into each other.
//   The card, its lines, the row's padding and the chevron are the shared
//   kit's (kit/list.tsx); Settings keeps radius/lg (10690:137).
// · ChoiceSheet — a pick-one row's M09 radio sheet, a hint per option, Done /
//   Cancel; Done saves and says "Saved" (ST-93).
// · SaveFailed — "Couldn’t save. Nothing changed." with Try again under the
//   group whose control snapped back (ST-92). Toggles save silently.
// · InfoButton — the ⓘ: a 44 px icon button that opens the kit Sheet with the
//   words that don't fit on the row or under a heading (the mobile UX pass:
//   one short line inline, the rest one tap away). A group takes it beside its
//   label (`info`), a toggle or plain row at its end (`info`); a group's one
//   line of footer under the card (`footer`), as iOS Settings does.

import * as React from "react";
import { InformationCircleIcon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { Badge, type BadgeTone } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { IconButton } from "@/components/ideeza/icon-button";
import { Radio } from "@/components/ideeza/checkbox";
import { Skeleton } from "@/components/ideeza/skeleton";
import { Toggle } from "@/components/ideeza/toggle";
import { ARRIVED_ATTR } from "@/components/settings/use-arrival-highlight";
import { cn } from "@/lib/utils";
import { TEXT_LINK } from "../kit/bottom-bar";
import { Chevron, LIST_CARD, LIST_DIVIDERS, LIST_ROW } from "../kit/list";
import { OfflineBanner, useOnline } from "../kit/states";
import { T } from "../type";
import { Sheet } from "../kit/sheet";
import { useToast } from "../kit/toast";
import { canGoBack } from "../nav-trail";
import { Screen } from "../screen";
import { TopBar, type TopBarAction } from "../top-bar";

/** The Plans area's phone pages for the web's "Credit alerts and limits" and "Billing details".
 *  The Settings rows, the search hits and the "Set the low mark" link show only with a route (null
 *  hides them), so nothing points at a page that isn't there. */
export const CREDIT_ALERTS_HREF: string | null = "/m/settings/credit-alerts";
export const BILLING_DETAILS_HREF: string | null = "/m/settings/billing";

/** A03 Link SM inside a helper line (the scale's caption role, medium, brand). */
export const HELPER_LINK = cn(T.caption, "font-medium text-text-brand outline-none hover:underline focus-visible:underline");

/** Kept out of cn() (tailwind-merge drops a bare `outline`): the row a search or link lands on. */
export const ARRIVED =
  " scroll-mt-24 data-[arrived]:outline data-[arrived]:outline-2 data-[arrived]:-outline-offset-2 data-[arrived]:outline-border-focus";

/** Arriving at a page's #row (search, a link): the row scrolls into view and is outlined once —
 *  the web's rule, run again once the page's bones give way to its rows. */
function useArrival(ready: boolean) {
  React.useEffect(() => {
    if (!ready) return;
    let timer: number | undefined;
    const mark = () => {
      const el = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
      if (!el) return;
      el.scrollIntoView({ block: "center" });
      el.setAttribute(ARRIVED_ATTR, "");
      window.clearTimeout(timer);
      timer = window.setTimeout(() => el.removeAttribute(ARRIVED_ATTR), 2400);
    };
    const first = window.setTimeout(mark, 0);
    window.addEventListener("hashchange", mark);
    return () => {
      window.clearTimeout(first);
      window.clearTimeout(timer);
      window.removeEventListener("hashchange", mark);
    };
  }, [ready]);
}

export function SettingsScreen({
  title,
  back = true,
  actions,
  loading,
  offlineNote = true,
  footer,
  children,
}: {
  title: string;
  back?: string | true;
  actions?: TopBarAction[];
  /** The page's data is still being read: ST-90's bones under the real top bar. */
  loading?: boolean;
  /** Offline, "Connect to change this." under the banner (pages whose controls go off). */
  offlineNote?: boolean;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const online = useOnline();
  useArrival(!loading);
  return (
    <Screen top={<TopBar back={back} title={title} actions={actions} />} footer={footer} className="bg-bg-page">
      <div className="flex flex-col gap-6 px-8 pb-8">
        {loading ? (
          <PageBones />
        ) : (
          <>
            {!online && (
              <div className="flex flex-col gap-6">
                <OfflineBanner />
                {offlineNote && <p className={T.meta}>Connect to change this.</p>}
              </div>
            )}
            {children}
          </>
        )}
      </div>
    </Screen>
  );
}

/** ST-90: three cards of list-row bones. */
export function PageBones() {
  return (
    <div role="status" aria-label="Loading" className="flex flex-col gap-6">
      {[4, 3, 3].map((rows, i) => (
        <div key={i} aria-hidden className={cn(LIST_CARD, "rounded-lg bg-transparent px-4")}>
          {Array.from({ length: rows }, (_, j) => (
            <div key={j} className="flex items-center gap-6 py-4">
              <Skeleton shape="circle" size="lg" />
              <div className="flex flex-col gap-4">
                <Skeleton shape="text" size="md" />
                <Skeleton shape="text" size="sm" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** What an ⓘ opens: the sheet's title and the words. */
export type InfoText = { title: string; body: React.ReactNode };

/** ⓘ — opens the kit Sheet with the words that don't fit inline. 44 px target, pulled into the line. */
export function InfoButton({ info, label, className }: { info: InfoText; label?: string; className?: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <IconButton
        type="button"
        hierarchy="ghost"
        size="xl"
        aria-label={label ?? `About ${info.title}`}
        aria-haspopup="dialog"
        icon={
          <span className="inline-flex text-[color:var(--color-icon-secondary)]">
            <Icon icon={InformationCircleIcon} size={20} />
          </span>
        }
        onClick={() => setOpen(true)}
        className={cn("-my-7 shrink-0", className)}
      />
      <Sheet open={open} onClose={() => setOpen(false)} title={info.title}>
        <div className={cn(T.body, "flex flex-col gap-4 [overflow-wrap:anywhere]")}>{info.body}</div>
      </Sheet>
    </>
  );
}

export function SettingsGroup({
  label,
  id,
  info,
  footer,
  children,
}: {
  label?: string;
  id?: string;
  /** ⓘ beside the label: the words that explain the whole group. */
  info?: InfoText;
  /** One line under the card (an iOS group footer). */
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const labelId = React.useId();
  return (
    <section id={id} aria-labelledby={label ? labelId : undefined} className={"flex flex-col gap-2 rounded-lg" + ARRIVED}>
      {(label || info) && (
        <div className="flex min-h-[18px] items-center justify-between gap-4">
          {label ? (
            <h2 id={labelId} className={cn(T.meta, "text-text-tertiary")}>
              {label}
            </h2>
          ) : (
            <span />
          )}
          {info && <InfoButton info={info} className="-mr-6" />}
        </div>
      )}
      <div className={cn(LIST_CARD, LIST_DIVIDERS, "rounded-lg")}>{children}</div>
      {footer && <p className={T.meta}>{footer}</p>}
    </section>
  );
}

/** A line of Body/XS under a group (what a page's rows mean, "Email and text messages aren't sent yet."). */
export function SettingsNote({ children }: { children: React.ReactNode }) {
  return <p className={T.meta}>{children}</p>;
}

export type RowBadge = { tone: BadgeTone; text: string };

type RowBase = {
  id?: string;
  icon?: IconValue;
  label: React.ReactNode;
  helper?: React.ReactNode;
  value?: React.ReactNode;
  badge?: RowBadge;
  /** The Danger type: the label in text/error, no chevron. */
  danger?: boolean;
  /** The Plain type: an action with no trailing control (Sign out). */
  plain?: boolean;
  /** Greyed with its reason, which reads as the helper. */
  disabled?: boolean;
  reason?: React.ReactNode;
  /** Anything else at the end (Copy, Edit). */
  trailing?: React.ReactNode;
  /** ⓘ at the end with the full words, on a toggle or plain row only (a row that is a link or a
   *  button can't hold another control). */
  info?: InfoText;
};

type RowAction =
  | { href: string; onClick?: never; toggle?: never }
  | { onClick: () => void; href?: never; toggle?: never }
  | { toggle: { checked: boolean; onChange: () => void }; href?: never; onClick?: never }
  | { href?: never; onClick?: never; toggle?: never };

export type SettingsRowProps = RowBase & RowAction;

/** A row that opens nothing keeps the kit row's padding without its press states. */
const STILL = "hover:bg-transparent";

export function SettingsRow(props: SettingsRowProps) {
  const { id, icon, label, helper, value, badge, danger, plain, disabled, reason, trailing } = props;
  const chevron = !!(props.href || props.onClick) && !danger && !plain;
  const info = props.info && !props.href && !props.onClick ? <InfoButton info={props.info} /> : null;
  const body = (
    <>
      {icon && (
        <span
          className={cn(
            "shrink-0",
            disabled ? "text-[color:var(--color-icon-disabled)]" : danger ? "text-[color:var(--color-icon-error)]" : "text-[color:var(--color-icon-default)]",
          )}
        >
          <Icon icon={icon} size={24} />
        </span>
      )}
      {/* The label keeps its own width; a value that doesn't fit beside it wraps under it. */}
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-6 gap-y-1">
        <span className="flex max-w-full flex-[1_0_auto] flex-col gap-1">
          <span className={cn(T.body, disabled ? "text-text-disabled" : danger ? "text-text-error" : "text-text-primary")}>{label}</span>
          {(disabled && reason) || helper ? <span className={T.meta}>{disabled && reason ? reason : helper}</span> : null}
        </span>
        {value != null && value !== "" && (
          <span className={cn(T.body, "min-w-0 max-w-full truncate", disabled && "text-text-disabled")}>{value}</span>
        )}
      </span>
      {badge && (
        <Badge tone={badge.tone} className="shrink-0">
          {badge.text}
        </Badge>
      )}
      {trailing}
      {info}
      {chevron && <Chevron disabled={disabled} />}
    </>
  );

  if (props.toggle) {
    const t = props.toggle;
    return (
      <div id={id} className={cn(LIST_ROW, STILL) + ARRIVED}>
        {body}
        <Toggle
          checked={t.checked}
          onChange={t.onChange}
          disabled={disabled}
          aria-label={typeof label === "string" ? label : undefined}
        />
      </div>
    );
  }
  if (props.href && !disabled) {
    return (
      <Link id={id} href={props.href} className={LIST_ROW + ARRIVED}>
        {body}
      </Link>
    );
  }
  if (props.onClick || (props.href && disabled)) {
    return (
      <button id={id} type="button" disabled={disabled} onClick={props.onClick} className={cn(LIST_ROW, disabled && STILL, disabled && "cursor-not-allowed") + ARRIVED}>
        {body}
      </button>
    );
  }
  return (
    <div id={id} className={cn(LIST_ROW, STILL) + ARRIVED}>
      {body}
    </div>
  );
}

export type ChoiceOption<T extends string> = { value: T; label: string; hint?: string; disabled?: boolean; reason?: string };

/** A pick-one row's sheet: nothing changes until Done, which saves and says "Saved". */
export function ChoiceSheet<T extends string>({
  open,
  onClose,
  title,
  description,
  options,
  value,
  onSave,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  options: readonly ChoiceOption<T>[];
  value: T;
  /** False when the browser refused: the sheet stays open and says so. */
  onSave: (value: T) => boolean;
  /** Under the options (the Minimum bid field). */
  children?: (picked: T) => React.ReactNode;
}) {
  const toast = useToast();
  const [picked, setPicked] = React.useState(value);
  const [failed, setFailed] = React.useState(false);
  const [wasOpen, setWasOpen] = React.useState(open);
  const name = React.useId();
  // Opening starts from the saved value again.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setPicked(value);
      setFailed(false);
    }
  }
  const done = () => {
    if (!onSave(picked)) return setFailed(true);
    onClose();
    toast({ title: "Saved" });
  };
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      actions={
        <>
          <Button size="xl" className="w-full" onClick={done}>
            Done
          </Button>
          <Button hierarchy="secondary" size="xl" className="w-full" onClick={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      <div role="radiogroup" aria-label={title} className="flex flex-col gap-4">
        {options.map((o) => (
          <label
            key={o.value}
            className={cn(
              "relative flex min-h-[44px] items-start gap-8 rounded-md py-2 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-border-focus",
              o.disabled ? "cursor-not-allowed" : "cursor-pointer",
            )}
          >
            <input
              type="radio"
              className="sr-only"
              name={name}
              checked={picked === o.value}
              disabled={o.disabled}
              onChange={() => setPicked(o.value)}
            />
            <Radio checked={picked === o.value} disabled={o.disabled} decorative className="mt-1" />
            <span className="flex flex-col gap-1">
              <span className={cn(T.bodyLg, o.disabled ? "text-text-disabled" : "text-text-primary")}>{o.label}</span>
              {(o.disabled ? o.reason : o.hint) && <span className={T.meta}>{o.disabled ? o.reason : o.hint}</span>}
            </span>
          </label>
        ))}
      </div>
      {children?.(picked)}
      {failed && <p className={cn(T.meta, "text-text-error")}>Couldn’t save. Nothing changed.</p>}
    </Sheet>
  );
}

/** Back to where a sub-screen was opened from once its work is done (Back, so the history
 *  doesn't hold the finished screen); opened straight from a link, `path` takes its place.
 *  The app's own trail decides (nav-trail), so it never steps out of the app. */
export function leaveTo(router: { back: () => void; replace: (href: string) => void }, path: string): void {
  if (canGoBack()) router.back();
  else router.replace(path);
}

/** Saving a control that saves on change: false from `write` snaps it back and shows ST-92 under its group. */
export function useSaver() {
  const [failed, setFailed] = React.useState<{ group: string; retry: () => void } | null>(null);
  const run = React.useCallback((group: string, write: () => boolean) => {
    if (write()) {
      setFailed((f) => (f?.group === group ? null : f));
      return true;
    }
    const retry = () => {
      if (write()) setFailed(null);
    };
    setFailed({ group, retry });
    return false;
  }, []);
  return { failed, run };
}

/** ST-92: under the group whose control snapped back. */
export function SaveFailed({ saver, group }: { saver: ReturnType<typeof useSaver>; group: string }) {
  if (saver.failed?.group !== group) return null;
  return (
    <div role="alert" className="-mt-2 flex items-center justify-between gap-4">
      <span className={cn(T.meta, "text-text-error")}>Couldn’t save. Nothing changed.</span>
      <button
        type="button"
        onClick={saver.failed.retry}
        className={TEXT_LINK}
      >
        Try again
      </button>
    </div>
  );
}
