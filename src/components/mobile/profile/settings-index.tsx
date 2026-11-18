"use client";

// The two lists the Profile hub's in-place Settings opens on its own routes
// (master "Ideeza- Profile settings" 10702:240249): General — Light Mode,
// Notification, Language, Pricing Plan — and Others — Sign Out, Delete
// Account, the app version. Each row opens the Settings page that already
// does the work, under that page's own (web) name; nothing is set here. Laid
// out as the hub is: one grouped inset list, a chevron on every row that
// opens something; the app version is a fact in a group of its own.

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
import { ListCard, ListRow } from "../kit/list";
import { Screen } from "../screen";
import { SignOutSheet } from "../settings/sign-out";
import { TopBar } from "../top-bar";
import { HubValue } from "./hub";

const POPUP_WORDS = { now: "Right away", daily: "Once a day", paused: "Paused" } as const;
const THEME_WORDS = { light: "Light", dark: "Dark", system: "Match system" } as const;

function IndexScreen({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Screen top={<TopBar back="/m/profile" title={title} />}>
      <div className="flex flex-col gap-8 px-8 pb-12 pt-2">{children}</div>
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
      <ListCard label="General">
        <ListRow href="/m/settings/appearance" icon={PaintBoardIcon} title="Appearance & accessibility" value={<HubValue>{THEME_WORDS[theme]}</HubValue>} />
        <ListRow href="/m/settings/notifications" icon={Notification01Icon} title="Notifications" value={<HubValue>{POPUP_WORDS[popupModeOf(settings)]}</HubValue>} />
        <ListRow href="/m/settings/language" icon={LanguageSkillIcon} title="Language & region" value={<HubValue>English</HubValue>} />
        <ListRow href="/m/plans" icon={Tag01Icon} title="Plan & pricing" value={hydrated ? <HubValue>{plan.name}</HubValue> : undefined} />
      </ListCard>
    </IndexScreen>
  );
}

/** /m/profile/settings/others */
export function OtherSettingsIndex() {
  const [signOut, setSignOut] = React.useState(false);
  return (
    <>
      <IndexScreen title="Others">
        <ListCard label="Others">
          <ListRow icon={Logout01Icon} title="Sign out" onClick={() => setSignOut(true)} />
          <ListRow href="/m/settings/delete" icon={Delete02Icon} title="Delete account" danger />
        </ListCard>
        <ListCard label="About this app">
          <ListRow icon={DashboardSquare01Icon} title="App version" value={<HubValue>{PHONE_APP_VERSION}</HubValue>} />
        </ListCard>
      </IndexScreen>
      <SignOutSheet open={signOut} onClose={() => setSignOut(false)} />
    </>
  );
}
