"use client";

// /settings/profile-share (User Panel V2 "Audience | Profile & Tagging"
// 22048:34433, its radio modal 22048:34563). Figma's friends and groups read
// in our model (D9): "Viewing & Sharing" — who can add you to a project team,
// who can see who you follow, saving and linking your shared projects; "Who
// can find you" — who can follow you, who can invite you to a team
// conversation. Each "who can" opens the Figma modal: Anyone · People you
// work with · Only me.
//
// Added from the interviews (spec §5.10): Who can message you (D13: its one
// home, written to Messages' own store; the Messages gear opens it), showing
// your location and local time, who can comment on your shared projects,
// quiet mode (no new message requests, and only people you work with can
// comment, until it ends) and View as public.

import * as React from "react";
import { setAllowNewFor } from "@/lib/messages/actions";
import { allowNewOf } from "@/lib/messages/rules";
import { useMessages } from "@/lib/messages/store";
import { ME, type AllowNew } from "@/lib/messages/types";
import { quietEndLabel, quietUntilFor, type QuietChoice } from "@/lib/settings/audience";
import { quietModeOn, updateSettings, type Reach } from "@/lib/settings/prefs";
import { useSettings } from "@/lib/settings/use-settings";
import { ChoiceSettingRow, ToggleSettingRow, reachOptions } from "./audience-controls";
import { SettingsCard, SettingsRow } from "./settings-card";
import type { ChoiceOption } from "./settings-choice";
import { SettingsFrame } from "./settings-frame";

const MESSAGE_OPTIONS: ChoiceOption<AllowNew>[] = [
  { value: "everyone", label: "Anyone", hint: "People you haven't worked with land in your Requests." },
  {
    value: "known",
    label: "People you work with or who own a copy or hold a share",
    hint: "No one else can start a conversation with you. Questions about your listings still reach you.",
  },
  { value: "nobody", label: "No one new", hint: "Only people you already have a conversation with can write to you." },
];

type QuietPick = QuietChoice | "keep";

/** A clock, so "On until …" reads Off once quiet mode ends. */
function useNow(everyMs: number): number {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), everyMs);
    return () => window.clearInterval(id);
  }, [everyMs]);
  return now;
}

export function ProfileSharePage() {
  const settings = useSettings();
  const a = settings.audience;
  const messages = useMessages();
  const now = useNow(30_000);
  const quietOn = quietModeOn(settings, now) && a.quietUntil !== null;
  const reach = (key: "addToTeam" | "seeFollowing" | "follow" | "teamConversation" | "comment") => (v: Reach) =>
    updateSettings("audience", { [key]: v });

  const quietOptions: ChoiceOption<QuietPick>[] = [
    ...(quietOn && a.quietUntil !== null
      ? [{ value: "keep" as const, label: "Keep it on", hint: `Until ${quietEndLabel(a.quietUntil)}` }]
      : []),
    { value: "24h", label: "24 hours", hint: `Until ${quietEndLabel(quietUntilFor("24h", now) ?? now)}` },
    { value: "7d", label: "7 days", hint: `Until ${quietEndLabel(quietUntilFor("7d", now) ?? now)}` },
    { value: "off", label: "Off", hint: "New requests and comments follow your rules above." },
  ];

  return (
    <SettingsFrame page="profile-share">
      <SettingsCard title="Viewing & Sharing">
        <ChoiceSettingRow
          id="add-to-team"
          label="Who can add you to a project team"
          help="Control who can invite you to work on their project."
          dialogTitle="Who can add you to a project team?"
          options={reachOptions({
            everyone: "Anyone on IDEEZA can add you to their team",
            work: "Only people on your project teams can add you",
            nobody: "No one can add you to a team",
          })}
          value={a.addToTeam}
          onSave={reach("addToTeam")}
        />
        <ChoiceSettingRow
          id="see-following"
          label="Who can see who you follow"
          help="Control who can see the people you follow."
          dialogTitle="Who can see who you follow?"
          options={reachOptions({
            everyone: "Anyone who opens your profile",
            work: "Only people on your project teams",
            nobody: "Only you see who you follow",
          })}
          value={a.seeFollowing}
          onSave={reach("seeFollowing")}
        />
        <ToggleSettingRow
          id="link-save"
          label="Allow others to save and link your shared projects"
          help="When it's off, only you can save your shared projects or copy their links."
          checked={a.allowLinkSave}
          onChange={(allowLinkSave) => updateSettings("audience", { allowLinkSave })}
        />
        <ToggleSettingRow
          id="local-time"
          label="Show my location and local time on my profile"
          help="Your city and the time where you are show under your name."
          checked={a.showLocalTime}
          onChange={(showLocalTime) => updateSettings("audience", { showLocalTime })}
        />
        <SettingsRow id="view-public" label="View as public" help="See your profile as others see it." href="/creators/me?view=public" />
      </SettingsCard>

      <SettingsCard title="Who can find you">
        <ChoiceSettingRow
          id="follow"
          label="Who can follow you"
          help="Control who can follow you."
          dialogTitle="Who can follow you?"
          options={reachOptions({
            everyone: "Anyone on IDEEZA can follow you",
            work: "Only people on your project teams can follow you",
            nobody: "No one can follow you",
          })}
          value={a.follow}
          onSave={reach("follow")}
        />
        <ChoiceSettingRow
          id="team-conversation"
          label="Who can invite you to a team conversation"
          help="Control who can invite you into a project team's conversation."
          dialogTitle="Who can invite you to a team conversation?"
          options={reachOptions({
            everyone: "Anyone on IDEEZA can invite you",
            work: "Only people on your project teams can invite you",
            nobody: "No one can invite you",
          })}
          value={a.teamConversation}
          onSave={reach("teamConversation")}
        />
        <ChoiceSettingRow
          id="message"
          label="Who can message you"
          help="Control who can start a conversation with you."
          dialogTitle="Who can message you?"
          options={MESSAGE_OPTIONS}
          value={allowNewOf(messages.data, ME)}
          disabled={!messages.hydrated || messages.unreadable}
          onSave={(v) => setAllowNewFor(ME, v).ok}
        />
      </SettingsCard>

      <SettingsCard title="Comments and quiet mode">
        <ChoiceSettingRow
          id="comment"
          label="Who can comment on your shared projects"
          help="Control who can comment on the projects you share on Innovations."
          dialogTitle="Who can comment on your shared projects?"
          options={reachOptions({
            everyone: "Anyone on IDEEZA can comment",
            work: "Only people on your project teams can comment",
            nobody: "Only you can comment",
          })}
          value={a.comment}
          onSave={reach("comment")}
        />
        <ChoiceSettingRow<QuietPick>
          id="quiet-mode"
          label="Quiet mode"
          help={
            quietOn
              ? "No new message requests reach you, and only people you work with can comment."
              : "Pause new message requests, and let only people you work with comment."
          }
          dialogTitle="Quiet mode"
          dialogDescription="For a while, no new message requests reach you and only people you work with can comment."
          options={quietOptions}
          value={quietOn ? "keep" : "off"}
          valueLabel={quietOn && a.quietUntil !== null ? `On until ${quietEndLabel(a.quietUntil)}` : "Off"}
          onSave={(v) => (v === "keep" ? true : updateSettings("audience", { quietUntil: quietUntilFor(v, Date.now()) }))}
        />
      </SettingsCard>
    </SettingsFrame>
  );
}
