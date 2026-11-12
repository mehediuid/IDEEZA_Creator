"use client";

// Settings › Notifications (mobile Figma "Settings · 2026 update" 10688:2):
// ST-20 the page — On this phone (push, how often, quiet hours with Between
// and Let sales through, keep notices), What you hear about (the seven kinds
// and the bid amount), the note, Muted projects; ST-20b / 20c push blocked and
// its pre-prompt (notifications-push.tsx); ST-21 the quiet hours sheet and
// ST-24 the bids sheet (notifications-sheets.tsx); ST-23 How often.
// The record and its rules are the web's (components/settings/
// notifications-page.tsx): `ideeza:settings` notifications, and
// appearance.keepNotices. Toggles save as they change (ST-92 when refused);
// sheets save on Done. Each kind says what it covers, in the web's words;
// "Credits and plan" links to the low mark once the phone has that page.

import * as React from "react";
import Link from "next/link";
import { usePopupPermission } from "@/components/notifications/browser-popups";
import { useNoticeClock } from "@/components/notifications/use-notices";
import { popupModeOf, popupModePatch, quietWindowStart, type PopupMode } from "@/lib/notifications/filter";
import { KIND_LABELS, SHOWN_KINDS, type ShownKind } from "@/lib/notifications/types";
import { updateSettings, type SettingsV1 } from "@/lib/settings/prefs";
import { useSettings } from "@/lib/settings/use-settings";
import { useOnline } from "../kit/states";
import { cn } from "@/lib/utils";
import { T } from "../type";
import { CREDIT_ALERTS_HREF, ChoiceSheet, HELPER_LINK, SaveFailed, SettingsGroup, SettingsRow, SettingsScreen, useSaver, type ChoiceOption } from "./kit";
import { PhoneSettingsLink, PushBlockedSheet, PushPrompt, PushRow } from "./notifications-push";
import { BidsSheet, QuietHoursSheet, dollars } from "./notifications-sheets";

type Prefs = SettingsV1["notifications"];

const save = (patch: Partial<Prefs>) => updateSettings("notifications", patch);

const noSubscribe = () => () => {};
/** False on the server and while hydrating: the stored choices are only known in the browser. */
const useRunning = () => React.useSyncExternalStore(noSubscribe, () => true, () => false);

const MODES: ChoiceOption<PopupMode>[] = [
  { value: "now", label: "Right away", hint: "As things happen." },
  { value: "daily", label: "Once a day", hint: "The first time you open IDEEZA each day, one pop-up sums up what came in." },
  { value: "paused", label: "Paused", hint: "Nothing pops up. Everything is still listed and counted." },
];

const ROW_IDS: Record<ShownKind, string> = {
  marketplace: "sales",
  product: "builds",
  coin: "credits",
  message: "messages",
  comments: "comments",
  teams: "teams",
  blog: "blog",
};

/** What each kind covers (the web's COVERS, with the phone's places). */
const COVERS: Record<ShownKind, React.ReactNode> = {
  marketplace: "A sale of yours, a bid on your auction, and its last hour.",
  product: "A build ready to review, needing a retry or paused, and a video take that’s ready.",
  coin: (
    <>
      Credits at or under your low mark, bought credits about to expire, your plan renewing, and a withdrawal method added, removed or made your
      default.
      {CREDIT_ALERTS_HREF && (
        <>
          {" "}
          <Link href={CREDIT_ALERTS_HREF} className={HELPER_LINK}>
            Set the low mark
          </Link>
        </>
      )}
    </>
  ),
  message: "A new message or request. These count on the Messages badge, not the bell.",
  comments: "Comments and replies by others on the projects you shared.",
  teams: "New messages in your project teams’ conversations. These count on the Messages badge.",
  blog: "Your blog’s review result, and a blog the IDEEZA team featured or removed.",
};

/** The web's quiet hours line, live. */
function quietStatus(s: SettingsV1, now: number): string {
  const q = s.notifications.quietHours;
  if (!q.on) return "When on, nothing pops up between two times and the count waits.";
  if (q.from === q.to) return "Start and end are the same time, so quiet hours never start.";
  return now && quietWindowStart(s, now) !== null ? `Quiet now, until ${q.to}.` : `Next quiet hours start at ${q.from}.`;
}

type Open = null | "often" | "quiet" | "bids" | "ask" | "blocked";

export function NotificationsSettings() {
  const s = useSettings();
  const n = s.notifications;
  const q = n.quietHours;
  const mode = popupModeOf(s);
  const online = useOnline();
  const running = useRunning();
  const permission = usePopupPermission();
  const now = useNoticeClock();
  const saver = useSaver();
  const [open, setOpen] = React.useState<Open>(null);
  const close = React.useCallback(() => setOpen(null), []);
  const off = !online;
  const salesOn = n.channels.marketplace.web;
  const muted = n.mutedProjects.length;

  const setQuiet = (patch: Partial<Prefs["quietHours"]>) => save({ quietHours: { ...q, ...patch } });
  const toggleKind = (k: ShownKind) => saver.run("kinds", () => save({ channels: { ...n.channels, [k]: { ...n.channels[k], web: !n.channels[k].web } } }));

  return (
    <SettingsScreen title="Notifications" loading={!running}>
      <SettingsGroup label="On this phone">
        <PushRow permission={permission} mode={mode} disabled={off} onAsk={() => setOpen("ask")} onBlocked={() => setOpen("blocked")} />
        <SettingsRow id="popups" label="How often" value={MODES.find((m) => m.value === mode)?.label} onClick={() => setOpen("often")} disabled={off} />
        <SettingsRow
          id="quiet-hours"
          label="Quiet hours"
          helper={quietStatus(s, now)}
          toggle={{ checked: q.on, onChange: () => saver.run("phone", () => setQuiet({ on: !q.on })) }}
          disabled={off}
        />
        {q.on && (
          <>
            <SettingsRow id="quiet-hours-time" label="Between" value={`${q.from} – ${q.to}`} onClick={() => setOpen("quiet")} disabled={off} />
            <SettingsRow
              id="quiet-hours-sales"
              label="Let sales through"
              helper="Sales still reach you during quiet hours"
              toggle={{ checked: q.urgentBreaksThrough, onChange: () => saver.run("phone", () => setQuiet({ urgentBreaksThrough: !q.urgentBreaksThrough })) }}
              disabled={off}
            />
          </>
        )}
        <SettingsRow
          id="keep-notices"
          label="Keep notices on screen until I close them"
          toggle={{
            checked: s.appearance.keepNotices,
            onChange: () => saver.run("phone", () => updateSettings("appearance", { keepNotices: !s.appearance.keepNotices })),
          }}
          disabled={off || mode === "paused"}
          reason={mode === "paused" ? "Pop-ups are paused, so there’s nothing to keep." : undefined}
        />
      </SettingsGroup>
      <SaveFailed saver={saver} group="phone" />
      {permission === "denied" && <PhoneSettingsLink onClick={() => setOpen("blocked")} disabled={off} />}

      <SettingsGroup label="What you hear about">
        {SHOWN_KINDS.map((k) => (
          <React.Fragment key={k}>
            <SettingsRow id={ROW_IDS[k]} label={KIND_LABELS[k]} helper={COVERS[k]} toggle={{ checked: n.channels[k].web, onChange: () => toggleKind(k) }} disabled={off} />
            {k === "marketplace" && (
              <SettingsRow
                id="bid-threshold"
                label="Bids to hear about"
                value={n.bidThreshold === null ? "Every bid" : `${dollars(n.bidThreshold)} or more`}
                onClick={() => setOpen("bids")}
                disabled={off || !salesOn}
                reason={salesOn ? undefined : "Sales and bids are switched off."}
              />
            )}
          </React.Fragment>
        ))}
      </SettingsGroup>
      <SaveFailed saver={saver} group="kinds" />
      <p id="email" className={cn(T.meta, "scroll-mt-24 rounded-sm data-[arrived]:outline data-[arrived]:outline-2 data-[arrived]:outline-offset-4 data-[arrived]:outline-border-focus")}>
        Email and text messages aren’t sent yet. Sound and vibration follow your phone’s settings.
      </p>

      <SettingsGroup>
        <SettingsRow id="muted-projects" label="Muted projects" value={muted ? String(muted) : undefined} href="/m/settings/notifications/muted" />
      </SettingsGroup>

      <ChoiceSheet
        open={open === "often"}
        onClose={close}
        title="How often"
        description="For notices on this phone."
        options={MODES}
        value={mode}
        onSave={(m) => save(popupModePatch(m))}
      />
      <QuietHoursSheet open={open === "quiet"} onClose={close} from={q.from} to={q.to} onSave={(from, to) => setQuiet({ from, to })} />
      <BidsSheet open={open === "bids"} onClose={close} value={n.bidThreshold} onSave={(bidThreshold) => save({ bidThreshold })} />
      <PushPrompt open={open === "ask"} onClose={close} />
      <PushBlockedSheet open={open === "blocked"} onClose={close} permission={permission} />
    </SettingsScreen>
  );
}
