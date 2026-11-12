"use client";

// The two lists the Profile hub's in-place Settings opens on its own routes
// (master "Ideeza- Profile settings" 10702:240249): General — Light Mode,
// Notification, Language, Pricing Plan — and Others — Sign Out, Delete
// Account, the app version. Each row opens the Settings page that already
// does the work, under that page's own (web) name; nothing is set here.

import * as React from "react";
import {
  Delete02Icon,
  DashboardSquare01Icon,
  LanguageSkillIcon,
  Logout01Icon,
  Notification01Icon,
  PaintBoardIcon,
  Tag01Icon,
} from "@hugeicons/core-free-icons";
import { useTheme } from "@/components/theme-provider";
import { useCreatePlan } from "@/lib/create/plan";
import { popupModeOf } from "@/lib/notifications/filter";
import { PHONE_APP_VERSION } from "@/lib/people/phone-profile";
import { useSettings } from "@/lib/settings/use-settings";
import { Screen } from "../screen";
import { SignOutSheet } from "../settings/sign-out";
import { TopBar } from "../top-bar";
import { HubRow, HubValue } from "./hub";

const POPUP_WORDS = { now: "Right away", daily: "Once a day", paused: "Paused" } as const;
const THEME_WORDS = { light: "Light", dark: "Dark", system: "Match system" } as const;

function IndexScreen({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Screen top={<TopBar back="/m/profile" title={title} />}>
      <ul aria-label={title} className="m-0 flex list-none flex-col gap-4 px-8 pb-12 pt-2">
        {React.Children.map(children, (row) => (
          <li>{row}</li>
        ))}
      </ul>
    </Screen>
  );
}

/** /m/profile/settings/general */
export function GeneralSettingsIndex() {
  const settings = useSettings();
  const { theme } = useTheme();
  const { hydrated, plan } = useCreatePlan();
  return (
    <IndexScreen title="General">
      <HubRow href="/m/settings/appearance" icon={PaintBoardIcon} label="Appearance & accessibility" value={<HubValue>{THEME_WORDS[theme]}</HubValue>} />
      <HubRow href="/m/settings/notifications" icon={Notification01Icon} label="Notifications" value={<HubValue>{POPUP_WORDS[popupModeOf(settings)]}</HubValue>} />
      <HubRow href="/m/settings/language" icon={LanguageSkillIcon} label="Language & region" value={<HubValue>English</HubValue>} />
      <HubRow href="/m/plans" icon={Tag01Icon} label="Plan & pricing" value={hydrated ? <HubValue>{plan.name}</HubValue> : undefined} />
    </IndexScreen>
  );
}

/** /m/profile/settings/others */
export function OtherSettingsIndex() {
  const [signOut, setSignOut] = React.useState(false);
  return (
    <>
      <IndexScreen title="Others">
        <HubRow icon={Logout01Icon} label="Sign out" onClick={() => setSignOut(true)} />
        <HubRow href="/m/settings/delete" icon={Delete02Icon} label="Delete account" danger />
        <HubRow icon={DashboardSquare01Icon} label="App version" value={<HubValue>{PHONE_APP_VERSION}</HubValue>} />
      </IndexScreen>
      <SignOutSheet open={signOut} onClose={() => setSignOut(false)} />
    </>
  );
}
