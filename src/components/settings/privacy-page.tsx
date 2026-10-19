"use client";

// /settings/privacy — Privacy & safety (Settings v2, owner-approved
// 2026-10-20). Phase 1's Profile locking, Profile & Share, Blocking and Report
// in one page, keeping only the rows that change something today (V4 hides
// the five "who can" rows nothing reads yet; their fields stay in the record):
// - Your profile: View as public, Lock your profile (and what stays public),
//   Show my location and local time, Search engines.
// - Who can reach you: Who can message you (Messages' own store, D13), Who can
//   comment on your shared projects, Take a break.
// - Blocked people (one list, their conversations named), Hidden words, and
//   Your reports.
// Every row saves at once and its effect shows where it bites: the profile
// (locked, location, robots), Messages' start check and Requests, and the
// comments on Innovations posts (lib/innovations/comments.ts).

import * as React from "react";
import Link from "next/link";
import { Toggle } from "@/components/ideeza";
import { setAllowNewFor } from "@/lib/messages/actions";
import { allowNewOf } from "@/lib/messages/rules";
import { useMessages } from "@/lib/messages/store";
import { ME, type AllowNew } from "@/lib/messages/types";
import { useMyProfile } from "@/lib/people/profile-store";
import { quietUntilFor, type QuietChoice } from "@/lib/settings/audience";
import { quietModeOn, updateSettings, type Reach } from "@/lib/settings/prefs";
import { useDates } from "@/lib/settings/use-dates";
import { useSettings } from "@/lib/settings/use-settings";
import { ChoiceSettingRow, TOUCH_AREA, ToggleSettingRow, reachOptions } from "./audience-controls";
import { BlockedPeopleCard } from "./blocked-people";
import { HiddenWordsCard } from "./hidden-words";
import { SAVE_FAILED, SettingsCard, SettingsRow } from "./settings-card";
import type { ChoiceOption } from "./settings-choice";
import { SettingsFrame } from "./settings-frame";
import { YourReportsCard } from "./your-reports";

const INLINE_LINK =
  "rounded-sm font-medium text-text-brand underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-border-focus";

export function PrivacyPage() {
  return (
    <SettingsFrame page="privacy">
      <ProfileCard />
      <ReachCard />
      <BlockedPeopleCard />
      <HiddenWordsCard />
      <YourReportsCard />
    </SettingsFrame>
  );
}

function ProfileCard() {
  const { audience, privacy } = useSettings();
  const { hydrated, fields } = useMyProfile();
  const [lockFailed, setLockFailed] = React.useState(false);
  const noCity = hydrated && !fields.location.trim();

  return (
    <SettingsCard title="Your profile">
      <SettingsRow
        id="view-public"
        label="View as public"
        help="See your profile the way people who don't work with you see it."
        href="/creators/me?view=public"
      />
      <SettingsRow
        id="lock"
        label="Lock your profile"
        help={
          <>
            <span className="block">
              People who don&apos;t work with you on a project see only your name, your photo and “This profile is locked”. Your project
              teams still see all of it.
            </span>
            <span className="mt-[4px] block">
              Still public while it&apos;s locked: the projects you shared on Innovations, your marketplace listings and your comments.
              People can still message you if your message rule lets them.
            </span>
            {lockFailed && (
              <span role="alert" className="mt-[4px] block text-text-error">
                {SAVE_FAILED}
              </span>
            )}
          </>
        }
        control={
          <Toggle
            checked={audience.locked}
            aria-label="Lock your profile"
            className={TOUCH_AREA}
            onChange={() => setLockFailed(!updateSettings("audience", { locked: !audience.locked }))}
          />
        }
      />
      <ToggleSettingRow
        id="local-time"
        label="Show my location and local time"
        help={
          noCity ? (
            <>
              Others see your city and the time where you are under your name. Add your city first with Edit profile on{" "}
              <Link href="/creators/me" className={INLINE_LINK}>
                your profile
              </Link>
              .
            </>
          ) : (
            "Others see your city and the time where you are under your name. While it's off, only you see your city."
          )
        }
        checked={audience.showLocalTime}
        onChange={(showLocalTime) => updateSettings("audience", { showLocalTime })}
      />
      <ToggleSettingRow
        id="search-engines"
        label="Search engines"
        help="Let search engines link to your profile. While it's off, your profile page asks them not to list it."
        checked={privacy.searchEngines}
        onChange={(searchEngines) => updateSettings("privacy", { searchEngines })}
      />
    </SettingsCard>
  );
}

const MESSAGE_OPTIONS: ChoiceOption<AllowNew>[] = [
  { value: "everyone", label: "Anyone", hint: "People you haven't worked with land in your Requests." },
  {
    value: "known",
    label: "People you work with or who own a copy or hold a share",
    hint: "No one else can start a conversation with you. Questions about your listings still reach you.",
  },
  { value: "nobody", label: "No one new", hint: "Only people you already have a conversation with can write to you." },
];

type BreakPick = QuietChoice | "keep";

/** A clock, so "On until …" reads Off once the break ends. */
function useNow(everyMs: number): number {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), everyMs);
    return () => window.clearInterval(id);
  }, [everyMs]);
  return now;
}

function ReachCard() {
  const settings = useSettings();
  const a = settings.audience;
  const messages = useMessages();
  const dates = useDates();
  const now = useNow(30_000);
  const until = quietModeOn(settings, now) ? a.quietUntil : null;
  const end = (at: number) => dates.dateTime(at);

  const breakOptions: ChoiceOption<BreakPick>[] = [
    ...(until !== null ? [{ value: "keep" as const, label: "Keep the break", hint: `Until ${end(until)}` }] : []),
    { value: "24h", label: "24 hours", hint: `Until ${end(quietUntilFor("24h", now) ?? now)}` },
    { value: "7d", label: "7 days", hint: `Until ${end(quietUntilFor("7d", now) ?? now)}` },
    { value: "off", label: "Off", hint: "Requests and comments follow your rules above." },
  ];

  return (
    <SettingsCard title="Who can reach you">
      <ChoiceSettingRow
        id="message"
        label="Who can message you"
        help="Who can start a new conversation with you. People you already talk to can always reply."
        dialogTitle="Who can message you?"
        options={MESSAGE_OPTIONS}
        value={allowNewOf(messages.data, ME)}
        disabled={!messages.hydrated || messages.unreadable}
        onSave={(v) => setAllowNewFor(ME, v).ok}
      />
      <ChoiceSettingRow
        id="comment"
        label="Who can comment on your shared projects"
        help="On the projects you share on Innovations. A comment from someone this leaves out is held off your post, and comes back if you change this."
        dialogTitle="Who can comment on your shared projects?"
        options={reachOptions({
          everyone: "Anyone on IDEEZA can comment",
          work: "Only people on your project teams can comment",
          nobody: "Only you can comment",
        })}
        value={a.comment}
        onSave={(v: Reach) => updateSettings("audience", { comment: v })}
      />
      <ChoiceSettingRow<BreakPick>
        id="take-a-break"
        label="Take a break"
        help={
          until !== null
            ? "New message requests are paused, and on your shared projects only people you work with can comment."
            : "Pause new message requests, and hold comments on your shared projects from people you don't work with."
        }
        dialogTitle="Take a break"
        dialogDescription="For a while, no new message requests reach you, and comments on your shared projects from people you don't work with are held. People you work with or already talk to, and questions about your listings, still reach you."
        options={breakOptions}
        value={until !== null ? "keep" : "off"}
        valueLabel={until !== null ? `On until ${end(until)}` : "Off"}
        onSave={(v) => (v === "keep" ? true : updateSettings("audience", { quietUntil: quietUntilFor(v, Date.now()) }))}
      />
    </SettingsCard>
  );
}
