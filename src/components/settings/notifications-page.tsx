"use client";

// /settings/notifications (Settings v2, V5). The bell lists everything; this
// page chooses what pops up and what adds to the bell's count:
// - Pop-ups: right away, once a day or paused; quiet hours (sales held back
//   unless let through); keep pop-ups until closed; the browser's own pop-ups
//   outside this tab, with its permission.
// - What you hear about: the seven kinds that have events, each with its own
//   switch (`channels[kind].web`), the bid threshold under Sales and bids, and
//   one line for email and phone, which come with sign-in.
// - Muted projects.
// Everything saves as it changes, into `ideeza:settings` (notifications, and
// appearance.keepNotices); the bell, the toasts and the pop-ups read it at once.

import * as React from "react";
import Link from "next/link";
import { Button, SelectMenu, TextInput, Toggle, type SelectOption } from "@/components/ideeza";
import { requestPopups, usePopupPermission } from "@/components/notifications/browser-popups";
import { unmuteProject, useNoticeClock } from "@/components/notifications/use-notices";
import { DEMO_USD_RATES } from "@/lib/account/payout";
import { CREDIT_ALERTS_HREF } from "@/lib/create/credit-limits";
import { useManualProjects } from "@/lib/manual/projects";
import { popupModeOf, popupModePatch, quietWindowStart, type PopupMode } from "@/lib/notifications/filter";
import type { PopupPermission } from "@/lib/notifications/popups";
import { KIND_LABELS, SHOWN_KINDS, type ShownKind } from "@/lib/notifications/types";
import { updateSettings, type SettingsV1 } from "@/lib/settings/prefs";
import { useSettings } from "@/lib/settings/use-settings";
import { cn } from "@/lib/utils";
import { SAVE_FAILED, SettingsCard, SettingsRow } from "./settings-card";
import { ChoiceRow } from "./settings-choice";
import { SettingsFrame } from "./settings-frame";

type Prefs = SettingsV1["notifications"];

// A row whose control is wide (two times, a select): under it on a narrow page.
const STACK = "[@container(max-width:640px)]:flex-col [@container(max-width:640px)]:items-start";
// A switch's hit area grows to 44 px on a phone, as on the other settings pages.
const TOGGLE_TAP = "max-md:after:absolute max-md:after:-inset-[10px] max-md:after:content-['']";
// The settings-card arrival outline, for the blocks this page draws itself (kept out of cn()).
const ARRIVED =
  " scroll-mt-24 data-[arrived]:rounded-lg data-[arrived]:outline data-[arrived]:outline-2 data-[arrived]:outline-offset-4 data-[arrived]:outline-border-focus";
const LINK = "font-medium text-text-link underline-offset-2 hover:text-text-link-hover hover:underline";

const save = (patch: Partial<Prefs>) => updateSettings("notifications", patch);

export function NotificationsPage() {
  const s = useSettings();
  const n = s.notifications;
  const mode = popupModeOf(s);
  const [failed, setFailed] = React.useState<string | null>(null);
  const write = (card: string, ok: boolean) => setFailed(ok ? null : card);
  const error = (card: string) =>
    failed === card ? (
      <p role="alert" className="m-0 mt-[8px] text-md leading-md text-text-error">
        {SAVE_FAILED}
      </p>
    ) : null;
  const toggleKind = (k: ShownKind) =>
    write("kinds", save({ channels: { ...n.channels, [k]: { ...n.channels[k], web: !n.channels[k].web } } }));

  return (
    <SettingsFrame page="notifications" description="Everything lands in the bell. Here you choose what pops up and what adds to its count.">
      <SettingsCard id="popups-card" title="Pop-ups">
        <PopupsChoice mode={mode} onChange={(m) => write("popups", save(popupModePatch(m)))} />
        <QuietHours prefs={n} onChange={(patch) => write("popups", save(patch))} />
        <SettingsRow
          id="keep-notices"
          label="Keep notices until I close them"
          help={
            mode === "paused"
              ? "Pop-ups are paused, so there's nothing to keep."
              : "Pop-ups stay on screen until you close them, instead of going after a few seconds."
          }
          control={
            <Toggle
              className={TOGGLE_TAP}
              checked={s.appearance.keepNotices}
              disabled={mode === "paused"}
              aria-label="Keep notices until I close them"
              onChange={() => write("popups", updateSettings("appearance", { keepNotices: !s.appearance.keepNotices }))}
            />
          }
        />
        <BrowserPopups mode={mode} />
        {error("popups")}
      </SettingsCard>

      <SettingsCard
        id="kinds"
        title="What you hear about"
        description="Switched off, a kind still lists in the bell but doesn't pop up or add to its count."
      >
        {SHOWN_KINDS.map((k) => (
          <React.Fragment key={k}>
            <KindRow kind={k} on={n.channels[k].web} onToggle={() => toggleKind(k)} />
            {k === "marketplace" && (
              <BidThreshold
                value={n.bidThreshold}
                salesOn={n.channels.marketplace.web}
                onChange={(bidThreshold) => write("kinds", save({ bidThreshold }))}
              />
            )}
          </React.Fragment>
        ))}
        <p id="email" className={"m-0 pt-[12px] text-sm leading-sm text-text-tertiary" + ARRIVED}>
          Email and phone notifications come with sign-in.
        </p>
        {error("kinds")}
      </SettingsCard>

      <SettingsCard
        id="muted-projects"
        title="Muted projects"
        description="Their notices still list in the bell, but don't pop up or add to its count."
      >
        <MutedProjects ids={n.mutedProjects} onFail={() => setFailed("muted-projects")} />
        {error("muted-projects")}
      </SettingsCard>
    </SettingsFrame>
  );
}

// ─────────────────────────── pop-ups ───────────────────────────

const MODES: { value: PopupMode; label: string; help: string }[] = [
  {
    value: "now",
    label: "Right away",
    help: "As things happen: builds and Blog reviews on the page, and what's switched on below outside this tab.",
  },
  {
    value: "daily",
    label: "Once a day",
    help: "Nothing pops up as it happens. The first time you open IDEEZA each day, one pop-up sums up what came in, and the bell groups it by day.",
  },
  { value: "paused", label: "Paused", help: "Nothing pops up. The bell still lists and counts everything." },
];

function PopupsChoice({ mode, onChange }: { mode: PopupMode; onChange: (mode: PopupMode) => void }) {
  const name = React.useId();
  const legendId = React.useId();
  const helpId = React.useId();
  return (
    <div id="popups" className={"flex flex-col gap-[4px] border-b border-solid border-border pb-[12px]" + ARRIVED}>
      <span id={legendId} className="text-md font-medium leading-md text-text-primary">
        Show pop-ups
      </span>
      <div role="radiogroup" aria-labelledby={legendId} aria-describedby={helpId} className="-mx-[12px] flex flex-col">
        {MODES.map((o) => (
          <ChoiceRow key={o.value} name={name} option={{ value: o.value, label: o.label }} checked={mode === o.value} onChange={onChange} />
        ))}
      </div>
      <p id={helpId} className="m-0 max-w-[62ch] text-sm leading-sm text-text-tertiary">
        {MODES.find((o) => o.value === mode)?.help}
      </p>
    </div>
  );
}

const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;

function QuietHours({ prefs, onChange }: { prefs: Prefs; onChange: (patch: Partial<Prefs>) => void }) {
  const q = prefs.quietHours;
  const now = useNoticeClock();
  const s = useSettings();
  const since = now ? quietWindowStart(s, now) : null;
  const set = (patch: Partial<Prefs["quietHours"]>) => onChange({ quietHours: { ...q, ...patch } });
  const status = !q.on
    ? "Off. When on, nothing pops up between two times and the bell's count waits."
    : q.from === q.to
      ? "Start and end are the same time, so quiet hours never start."
      : since !== null
        ? `Quiet now, until ${q.to}.`
        : `Next quiet hours start at ${q.from}.`;

  return (
    <>
      <SettingsRow
        id="quiet-hours"
        label="Quiet hours"
        help={status}
        control={<Toggle className={TOGGLE_TAP} checked={q.on} onChange={() => set({ on: !q.on })} aria-label="Quiet hours" />}
      />
      {q.on && (
        <>
          <SettingsRow
            id="quiet-hours-time"
            label="Between"
            className={cn("pl-[16px]", STACK)}
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
            id="quiet-hours-sales"
            label="Let sales through"
            className="pl-[16px]"
            help="A sale still pops up and counts on the bell during quiet hours."
            control={
              <Toggle
                className={TOGGLE_TAP}
                checked={q.urgentBreaksThrough}
                onChange={() => set({ urgentBreaksThrough: !q.urgentBreaksThrough })}
                aria-label="Let sales through"
              />
            }
          />
        </>
      )}
    </>
  );
}

const BROWSER_HELP: Record<PopupPermission, string> = {
  unsupported: "This browser can't show them. Builds and Blog reviews still pop up on the page.",
  default: "When a build finishes and you're in another tab or app. IDEEZA asks once, when you start a build.",
  granted: "Allowed. With this tab in the background, what's switched on below pops up outside it.",
  denied: "Blocked in this browser. To allow them, open the site settings beside the address bar and allow notifications.",
};

function BrowserPopups({ mode }: { mode: PopupMode }) {
  const permission = usePopupPermission();
  const [asking, setAsking] = React.useState(false);
  const held =
    permission === "granted" && mode !== "now"
      ? mode === "paused"
        ? " Nothing pops up while pop-ups are paused."
        : " Once a day, only the summary pops up, on the page."
      : "";
  return (
    <SettingsRow
      id="browser-popups"
      label="Pop-ups outside this tab"
      help={
        <span role="status">
          {permission && BROWSER_HELP[permission]}
          {held}
        </span>
      }
      control={
        permission === "default" ? (
          <Button
            type="button"
            hierarchy="secondary"
            size="sm"
            loading={asking}
            onClick={async () => {
              setAsking(true);
              await requestPopups();
              setAsking(false);
            }}
          >
            Allow
          </Button>
        ) : undefined
      }
    />
  );
}

// ─────────────────────────── what you hear about ───────────────────────────

const ROW_IDS: Record<ShownKind, string> = {
  marketplace: "sales",
  product: "builds",
  coin: "credits",
  message: "messages",
  comments: "comments",
  teams: "teams",
  blog: "blog",
};

const COVERS: Record<ShownKind, React.ReactNode> = {
  marketplace: "A sale of yours, a bid on your auction, and its last hour.",
  product: "A build ready to review, needing a retry or paused, and a video take that's ready.",
  coin: (
    <>
      Credits at or under your low mark, bought credits about to expire, and your plan renewing.{" "}
      <Link href={CREDIT_ALERTS_HREF} className={LINK}>
        Set the low mark
      </Link>
    </>
  ),
  message: "A new message or request. These count on the Messages badge, not the bell.",
  comments: "Comments and replies by others on the projects you shared on Innovations.",
  teams: "New messages in your project teams' conversations. These count on the Messages badge.",
  blog: "Your blog's review result, and a blog the IDEEZA team featured or removed.",
};

function KindRow({ kind, on, onToggle }: { kind: ShownKind; on: boolean; onToggle: () => void }) {
  return (
    <SettingsRow
      id={ROW_IDS[kind]}
      label={KIND_LABELS[kind]}
      help={COVERS[kind]}
      control={<Toggle className={TOGGLE_TAP} checked={on} onChange={onToggle} aria-label={KIND_LABELS[kind]} />}
    />
  );
}

const EVERY = "every";
const AMOUNTS = [10, 25, 50, 100, 250, 500, 1000];
const dollars = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;

function BidThreshold({ value, salesOn, onChange }: { value: number | null; salesOn: boolean; onChange: (v: number | null) => void }) {
  const amounts = value !== null && !AMOUNTS.includes(value) ? [...AMOUNTS, value].sort((a, b) => a - b) : AMOUNTS;
  const options: SelectOption[] = [
    { value: EVERY, label: "Every bid" },
    ...amounts.map((a) => ({ value: String(a), label: `${dollars(a)} or more` })),
  ];
  const help = salesOn ? (
    <>
      {value === null ? "Every bid pops up and counts." : "Smaller bids still list in the bell."} A test ETH counts as{" "}
      {dollars(Number(DEMO_USD_RATES.ETH))} and a MATIC as {dollars(Number(DEMO_USD_RATES.MATIC))}, the demo rate Get paid uses.
    </>
  ) : (
    "Sales and bids are switched off."
  );
  return (
    <SettingsRow
      id="bid-threshold"
      label="Bids to hear about"
      className={cn("pl-[16px]", STACK)}
      help={help}
      control={
        <SelectMenu
          value={value === null ? EVERY : String(value)}
          options={options}
          placeholder="Every bid"
          ariaLabel="Bids to hear about"
          disabled={!salesOn}
          className="w-[200px] max-w-full"
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
              help={name ? "Listed in the bell, without pop-ups or a count." : "Its notices stay quiet until you unmute it."}
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
