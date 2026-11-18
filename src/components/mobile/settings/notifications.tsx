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
// sheets save on Done. Each kind is a switch with no paragraph: what it covers,
// in the web's words, is the group's ⓘ sheet; "Set the low mark" is a row
// under Credits and plan (as Bids to hear about sits under Sales). While push
// is blocked, the Push row itself opens "Allow notifications" (ST-20b's
// "Open phone settings" link was the same sheet twice).

import * as React from "react";
import { usePopupPermission } from "@/components/notifications/browser-popups";
import { useNoticeClock } from "@/components/notifications/use-notices";
import { popupModeOf, popupModePatch, quietWindowStart, type PopupMode } from "@/lib/notifications/filter";
import { KIND_LABELS, SHOWN_KINDS, type ShownKind } from "@/lib/notifications/types";
import { updateSettings, type SettingsV1 } from "@/lib/settings/prefs";
import { useSettings } from "@/lib/settings/use-settings";
import { useOnline } from "../kit/states";
import { cn } from "@/lib/utils";
import { T } from "../type";
import { LIST_DIVIDERS } from "../kit/list";
import { CREDIT_ALERTS_HREF, ChoiceSheet, SaveFailed, SettingsGroup, SettingsRow, SettingsScreen, useSaver, type ChoiceOption } from "./kit";
import { PushBlockedSheet, PushPrompt, PushRow } from "./notifications-push";
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

/** What each kind covers (the web's COVERS, with the phone's places): the group's ⓘ sheet. */
const COVERS: Record<ShownKind, string> = {
  marketplace: "A sale of yours, a bid on your auction, and its last hour.",
  product: "A build ready to review, needing a retry or paused, and a video take that’s ready.",
  coin: "Credits at or under your low mark, bought credits about to expire, your plan renewing, and a withdrawal method added, removed or made your default.",
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

      {/* Each kind is a switch; what it covers is one tap away in the group's ⓘ, and the phone's
          email / sound line is the group's footer. */}
      <SettingsGroup
        id="email"
        label="What you hear about"
        info={{
          title: "What each one covers",
          body: (
            <dl className={cn("flex flex-col", LIST_DIVIDERS)}>
              {SHOWN_KINDS.map((k) => (
                <div key={k} className="flex flex-col gap-1 py-4">
                  <dt className={T.rowTitle}>{KIND_LABELS[k]}</dt>
                  <dd className={T.meta}>{COVERS[k]}</dd>
                </div>
              ))}
            </dl>
          ),
        }}
        footer="Email and text messages aren’t sent yet. Sound and vibration follow your phone’s settings."
      >
        {SHOWN_KINDS.map((k) => (
          <React.Fragment key={k}>
            <SettingsRow id={ROW_IDS[k]} label={KIND_LABELS[k]} toggle={{ checked: n.channels[k].web, onChange: () => toggleKind(k) }} disabled={off} />
            {k === "coin" && CREDIT_ALERTS_HREF && <SettingsRow id="low-mark" label="Set the low mark" href={CREDIT_ALERTS_HREF} />}
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
