"use client";

// /settings/profile-locking (User Panel V2 "Audience › Profile locking"
// 22550:47505): card "Profile Private" with the Lock Your Profile switch, and
// under it the profile lock dialog's "How locking works" (41537:105837) in
// our words (D9: friends are the people you work with — your project teams).
// The switch saves at once; the profile page reads it (W1 draws the locked
// view), and View as public shows it as others see it.

import Link from "next/link";
import { Search01Icon, UserGroupIcon, UserLock01Icon } from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { linkVariants } from "@/components/ideeza";
import { updateSettings } from "@/lib/settings/prefs";
import { useSettings } from "@/lib/settings/use-settings";
import { cn } from "@/lib/utils";
import { ToggleSettingRow } from "./audience-controls";
import { SettingsCard } from "./settings-card";
import { SettingsFrame } from "./settings-frame";

const HOW: { icon: IconValue; text: string }[] = [
  {
    icon: UserLock01Icon,
    text: "People you don't work with see your name, your photo and “This profile is locked”, not your projects, blogs and activity.",
  },
  { icon: UserGroupIcon, text: "People on your project teams still see all of it." },
  { icon: Search01Icon, text: "People can still find you, and message you if your message rule lets them." },
];

const LINK = cn(linkVariants({ color: "brand", size: "sm" }), "text-md font-medium leading-md max-md:min-h-[var(--touch-min)]");

export function ProfileLockingPage() {
  const { audience } = useSettings();
  return (
    <SettingsFrame page="profile-locking">
      <SettingsCard title="Profile Private">
        <ToggleSettingRow
          id="lock"
          label="Lock Your Profile"
          help="Your projects, blogs and activity will be more private"
          checked={audience.locked}
          onChange={(locked) => updateSettings("audience", { locked })}
        />
        <div className="flex flex-col gap-[12px] pt-[16px]">
          <h3 className="m-0 text-md font-semibold leading-md text-text-primary">How locking works</h3>
          <ul role="list" className="m-0 flex max-w-[62ch] flex-col gap-[10px] pl-0">
            {HOW.map((h, i) => (
              <li key={i} className="flex items-start gap-[10px] text-md leading-md text-text-secondary">
                <span aria-hidden className="mt-[2px] shrink-0 text-text-tertiary">
                  <Icon icon={h.icon} size={18} />
                </span>
                {h.text}
              </li>
            ))}
          </ul>
          <p className="m-0 flex flex-wrap gap-x-[16px] gap-y-[4px]">
            <Link href="/settings/profile-share#message" className={LINK}>
              Who can message you
            </Link>
            <Link href="/creators/me?view=public" className={LINK}>
              View as public
            </Link>
          </p>
        </div>
      </SettingsCard>
    </SettingsFrame>
  );
}
