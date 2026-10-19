"use client";

// /settings/notifications (User Panel V2 Preferences | Notification settings
// 22048:33859, all-collapsed 22048:33706, one row open 22700:47363; spec
// §5.6). Figma's two cards: "What notification you receive" — the ten kinds,
// each opening to its three channels — and "Where you receive notification"
// (this browser). Web is live; Email and Mobile Application wait for sign-in
// (D18), and nothing is locked on (D8). Then the cards the interviews added:
// Digest, Quiet hours, Bids and offers, Muted projects.
//
// Everything saves as it changes (a toggle, a radio, a select), into the
// `notifications` section of `ideeza:settings`; the bell, the toasts and the
// editor's bell read it at once (components/notifications).

import * as React from "react";
import Link from "next/link";
import {
  ArrowDown01Icon,
  BrowserIcon,
  Mail01Icon,
  SmartPhone01Icon,
} from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { Button, SelectMenu, TextInput, Toggle, type SelectOption } from "@/components/ideeza";
import { useManualProjects } from "@/lib/manual/projects";
import { quietWindowStart } from "@/lib/notifications/filter";
import { NOTICE_KIND_LABELS } from "@/lib/notifications/types";
import { NOTICE_KINDS, updateSettings, type NoticeKind, type SettingsV1 } from "@/lib/settings/prefs";
import { useSettings } from "@/lib/settings/use-settings";
import { CREDITS_HREF } from "@/lib/create/credit-pricing";
import { cn } from "@/lib/utils";
import { unmuteProject, useNoticeClock } from "@/components/notifications/use-notices";
import { SAVE_FAILED, SettingsCard, SettingsRow } from "./settings-card";
import { ChoiceRow } from "./settings-choice";
import { SettingsFrame } from "./settings-frame";

type Prefs = SettingsV1["notifications"];

/** What each kind carries in this app, said plainly (D7). */
const COVERS: Record<NoticeKind, React.ReactNode> = {
  marketplace: "A sale of your listing or a copy of it, a bid or offer on yours, and your auction ending within an hour.",
  product: "A build that is ready to review, needs a retry or is paused for credits, and a video take that is ready.",
  coin: (
    <>
      Credits under your low mark, bought credits close to expiring, and your plan renewing within three days. Set the
      low mark and the reminder in{" "}
      <Link href={CREDITS_HREF} className="font-medium text-text-link underline-offset-2 hover:text-text-link-hover hover:underline">
        Plan &amp; pricing
      </Link>
      .
    </>
  ),
  comments: "Comments and replies by others on the projects you shared on Innovations.",
  message: "A new message in your Inbox and a new Request.",
  following: "When people you follow share something new. Nothing sends these yet.",
  teams: "Messages in your project teams' conversations.",
  blog: "Your Blog's review results, and a blog the IDEEZA team featured or removed.",
  policy: "News about reports you made. Nobody reviews reports yet, so none arrive.",
  other: "Anything else from IDEEZA. Nothing sends these yet.",
};

const SIGN_IN = "Arrives with sign-in";

// A row whose control is wide (two times, a select): under it on a narrow page.
const STACK = "[@container(max-width:640px)]:flex-col [@container(max-width:640px)]:items-start";

// The settings-card arrival outline, for the rows this page draws itself.
const ARRIVED =
  "scroll-mt-24 data-[arrived]:rounded-lg data-[arrived]:outline data-[arrived]:outline-2 data-[arrived]:outline-offset-4 data-[arrived]:outline-border-focus";

const save = (patch: Partial<Prefs>) => updateSettings("notifications", patch);

export function NotificationsPage() {
  const s = useSettings();
  const n = s.notifications;
  const [failed, setFailed] = React.useState<string | null>(null);
  const write = (card: string, patch: Partial<Prefs>) => setFailed(save(patch) ? null : card);
  const error = (card: string) =>
    failed === card ? (
      <p role="alert" className="m-0 mt-[8px] text-md leading-md text-text-error">
        {SAVE_FAILED}
      </p>
    ) : null;

  return (
    <SettingsFrame page="notifications">
      <SettingsCard id="kinds" title="What notification you receive">
        <KindRows prefs={n} onChange={(patch) => write("kinds", patch)} />
        {error("kinds")}
      </SettingsCard>

      <SettingsCard id="where" title="Where you receive notification">
        <SettingsRow
          id="browser"
          label="Browser"
          help={
            <>
              See which browser you are currently active
              <span className="mt-[4px] block text-text-secondary">
                <ThisBrowser />. Notices show in the bell, and builds and Blog results also as a short message on the
                page.
              </span>
            </>
          }
        />
      </SettingsCard>

      <SettingsCard id="digest" title="Digest" description="How notices reach you in this browser.">
        <DigestChoice value={n.digest} onChange={(digest) => write("digest", { digest })} />
        {error("digest")}
      </SettingsCard>

      <SettingsCard
        id="quiet-hours"
        title="Quiet hours"
        description="Between these times nothing pops up on the page and the bell's count doesn't grow. The bell still lists everything."
      >
        <QuietHours prefs={n} onChange={(patch) => write("quiet-hours", patch)} />
        {error("quiet-hours")}
      </SettingsCard>

      <SettingsCard id="bid-threshold" title="Bids and offers">
        <BidThreshold value={n.bidThreshold} onChange={(bidThreshold) => write("bid-threshold", { bidThreshold })} />
        {error("bid-threshold")}
      </SettingsCard>

      <SettingsCard id="muted-projects" title="Muted projects" description="Notices about a muted project don't show.">
        <MutedProjects ids={n.mutedProjects} onFail={() => setFailed("muted-projects")} />
        {error("muted-projects")}
      </SettingsCard>
    </SettingsFrame>
  );
}

// ─────────────────────────── the ten kinds ───────────────────────────

function KindRows({ prefs, onChange }: { prefs: Prefs; onChange: (patch: Partial<Prefs>) => void }) {
  const [open, setOpen] = React.useState<ReadonlySet<NoticeKind>>(() => new Set());
  // Arriving at #<kind> (search, ⌘K) opens that row.
  React.useEffect(() => {
    const openFromHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if ((NOTICE_KINDS as readonly string[]).includes(id)) setOpen((cur) => new Set(cur).add(id as NoticeKind));
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, []);

  return (
    <div className="flex flex-col">
      {NOTICE_KINDS.map((k) => (
        <KindRow
          key={k}
          kind={k}
          web={prefs.channels[k].web}
          open={open.has(k)}
          onToggleOpen={() =>
            setOpen((cur) => {
              const next = new Set(cur);
              if (next.has(k)) next.delete(k);
              else next.add(k);
              return next;
            })
          }
          onWeb={() => onChange({ channels: { ...prefs.channels, [k]: { ...prefs.channels[k], web: !prefs.channels[k].web } } })}
        />
      ))}
    </div>
  );
}

function KindRow({
  kind,
  web,
  open,
  onToggleOpen,
  onWeb,
}: {
  kind: NoticeKind;
  web: boolean;
  open: boolean;
  onToggleOpen: () => void;
  onWeb: () => void;
}) {
  const label = NOTICE_KIND_LABELS[kind];
  const buttonId = React.useId();
  const regionId = React.useId();
  return (
    <div id={kind} className={cn("border-b border-solid border-border last:border-b-0", ARRIVED)}>
      <h3 className="m-0">
        <button
          id={buttonId}
          type="button"
          aria-expanded={open}
          aria-controls={regionId}
          onClick={onToggleOpen}
          className="-mx-[8px] flex w-[calc(100%+16px)] min-h-[44px] items-center justify-between gap-[16px] rounded-lg px-[8px] py-[14px] text-left outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
            <span className="text-lg font-medium leading-lg text-text-primary">{label}</span>
            <span className="text-md font-regular leading-md text-text-tertiary">{web ? "Web Notification" : "Off"}</span>
          </span>
          <span aria-hidden className={cn("shrink-0 text-text-secondary transition-transform duration-fast", open && "rotate-180")}>
            <Icon icon={ArrowDown01Icon} size={20} />
          </span>
        </button>
      </h3>
      {open && (
        <div id={regionId} role="region" aria-labelledby={buttonId} className="flex flex-col gap-[4px] pb-[16px] pl-[16px] max-md:pl-0">
          <p className="m-0 max-w-[62ch] text-md leading-md text-text-secondary">{COVERS[kind]}</p>
          <p className="m-0 mt-[8px] text-md font-medium leading-md text-text-primary">Where you receive these notification</p>
          <ChannelRow icon={BrowserIcon} label="Web Notification" kind={label} checked={web} onChange={onWeb} />
          <ChannelRow icon={Mail01Icon} label="Email" kind={label} checked={false} reason={SIGN_IN} />
          <ChannelRow icon={SmartPhone01Icon} label="Mobile Application" kind={label} checked={false} reason={SIGN_IN} />
        </div>
      )}
    </div>
  );
}

function ChannelRow({
  icon,
  label,
  kind,
  checked,
  onChange,
  reason,
}: {
  icon: IconValue;
  label: string;
  kind: string;
  checked: boolean;
  onChange?: () => void;
  /** Set when the channel can't be used yet: the toggle is disabled and says why. */
  reason?: string;
}) {
  const off = reason !== undefined;
  return (
    <div className="flex min-h-[44px] items-center justify-between gap-[16px] py-[4px]">
      <span className="flex min-w-0 items-start gap-[10px]">
        <span aria-hidden className={cn("mt-[2px] shrink-0", off ? "text-text-disabled" : "text-text-secondary")}>
          <Icon icon={icon} size={18} />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className={cn("text-md font-medium leading-md", off ? "text-text-disabled" : "text-text-primary")}>{label}</span>
          {off && <span className="text-sm leading-sm text-text-tertiary">{reason}</span>}
        </span>
      </span>
      <Toggle
        checked={checked}
        onChange={onChange}
        disabled={off}
        aria-label={off ? `${label} for ${kind}: ${reason}` : `${label} for ${kind}`}
      />
    </div>
  );
}

// ─────────────────────────── where ───────────────────────────

/** "Chrome on macOS", from this browser's own description of itself. */
function describeBrowser(ua: string): string {
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : "This browser";
  const os = /iPhone|iPad|iPod/.test(ua)
    ? "iOS"
    : /Android/.test(ua)
      ? "Android"
      : /Mac OS X|Macintosh/.test(ua)
        ? "macOS"
        : /Windows/.test(ua)
          ? "Windows"
          : /Linux/.test(ua)
            ? "Linux"
            : null;
  return os ? `${browser} on ${os}` : browser;
}

const noSubscribe = () => () => {};

function ThisBrowser() {
  const ua = React.useSyncExternalStore(noSubscribe, () => navigator.userAgent, () => "");
  return <>Current browser: {ua ? describeBrowser(ua) : "this browser"}</>;
}

// ─────────────────────────── digest ───────────────────────────

const DIGESTS = [
  { value: "instant", label: "Right away", hint: "Each notice shows in the bell as it happens; builds and Blog results also pop up on the page." },
  { value: "daily", label: "Daily summary", hint: "Nothing pops up. The bell groups your notices by day." },
  { value: "weekly", label: "Weekly summary", hint: "Nothing pops up. The bell groups your notices by week." },
] as const;

function DigestChoice({ value, onChange }: { value: Prefs["digest"]; onChange: (v: Prefs["digest"]) => void }) {
  const name = React.useId();
  return (
    <div role="radiogroup" aria-label="Digest" className="-mx-[12px] flex flex-col gap-[2px] pt-[4px]">
      {DIGESTS.map((o) => (
        <ChoiceRow key={o.value} name={name} option={o} checked={value === o.value} onChange={onChange} />
      ))}
    </div>
  );
}

// ─────────────────────────── quiet hours ───────────────────────────

const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;

function QuietHours({ prefs, onChange }: { prefs: Prefs; onChange: (patch: Partial<Prefs>) => void }) {
  const q = prefs.quietHours;
  const now = useNoticeClock();
  const s = useSettings();
  const since = now ? quietWindowStart(s, now) : null;
  const set = (patch: Partial<Prefs["quietHours"]>) => onChange({ quietHours: { ...q, ...patch } });
  const status = !q.on
    ? null
    : q.from === q.to
      ? "From and To are the same time, so quiet hours never start."
      : since !== null
        ? `Quiet now, until ${q.to}.`
        : `Next quiet hours start at ${q.from}.`;

  return (
    <>
      <SettingsRow
        id="quiet-hours-on"
        label="Use quiet hours"
        help={status ?? "Off"}
        control={<Toggle checked={q.on} onChange={() => set({ on: !q.on })} aria-label="Quiet hours" />}
      />
      <SettingsRow
        id="quiet-hours-time"
        label="Between"
        className={STACK}
        help="In this device's time."
        control={
          <span className="flex flex-wrap items-center gap-[8px]">
            <TextInput
              type="time"
              size="md"
              value={q.from}
              aria-label="Quiet hours start"
              containerClassName="w-[132px]"
              onValueChange={(v) => CLOCK.test(v) && set({ from: v })}
            />
            <span className="text-md leading-md text-text-secondary">and</span>
            <TextInput
              type="time"
              size="md"
              value={q.to}
              aria-label="Quiet hours end"
              containerClassName="w-[132px]"
              onValueChange={(v) => CLOCK.test(v) && set({ to: v })}
            />
          </span>
        }
      />
      <SettingsRow
        id="quiet-hours-urgent"
        label="Urgent money and security notices still come through"
        help="A sale of yours still shows at once and counts on the bell."
        control={
          <Toggle
            checked={q.urgentBreaksThrough}
            onChange={() => set({ urgentBreaksThrough: !q.urgentBreaksThrough })}
            aria-label="Urgent money and security notices still come through"
          />
        }
      />
    </>
  );
}

// ─────────────────────────── bids and offers ───────────────────────────

const EVERY = "every";
const AMOUNTS = [10, 25, 50, 100, 250, 500, 1000];
const dollars = (n: number) => `$${n.toLocaleString("en-US")}`;

function BidThreshold({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const amounts = value !== null && !AMOUNTS.includes(value) ? [...AMOUNTS, value].sort((a, b) => a - b) : AMOUNTS;
  const options: SelectOption[] = [
    { value: EVERY, label: "Every bid and offer" },
    ...amounts.map((a) => ({ value: String(a), label: `${dollars(a)} or more` })),
  ];
  return (
    <SettingsRow
      id="bid-threshold-amount"
      label="Bids and offers to show"
      className={STACK}
      help={
        <>
          {value === null ? "Every bid and offer on yours." : `Only bids and offers of ${dollars(value)} or more.`} Bids in test ETH, WETH or
          MATIC have no dollar value, so they always show.
        </>
      }
      control={
        <SelectMenu
          value={value === null ? EVERY : String(value)}
          options={options}
          placeholder="Every bid and offer"
          ariaLabel="Bids and offers to show"
          className="w-[220px] max-w-full"
          onChange={(v) => onChange(v === EVERY ? null : Number(v))}
        />
      }
    />
  );
}

// ─────────────────────────── muted projects ───────────────────────────

function MutedProjects({ ids, onFail }: { ids: string[]; onFail: () => void }) {
  const { projects } = useManualProjects();
  if (ids.length === 0) {
    return (
      <p className="m-0 max-w-[62ch] py-[8px] text-md leading-md text-text-secondary">
        No muted projects. To mute one, open the bell, choose ⋯ on a notice about that project, then Mute this project.
      </p>
    );
  }
  return (
    <ul role="list" className="m-0 flex list-none flex-col p-0">
      {ids.map((id) => {
        const name = projects.find((p) => p.id === id)?.name.trim() || null;
        return (
          <li key={id} className="border-b border-solid border-border last:border-b-0">
            <SettingsRow
              label={name ?? "A project no longer in this browser"}
              help={name ? `Notices about ${name} don't show.` : "Its notices stay hidden until you unmute it."}
              className="border-b-0"
              control={
                <Button
                  type="button"
                  hierarchy="secondary"
                  size="sm"
                  aria-label={`Unmute ${name ?? "this project"}`}
                  onClick={() => {
                    if (!unmuteProject(id)) onFail();
                  }}
                >
                  Unmute
                </Button>
              }
            />
          </li>
        );
      })}
    </ul>
  );
}
