// The settings side-nav's icons (User Panel V2 "Settings Sidenav V2"), one per
// group and per page, from the DS icon set.

import {
  AiBrain01Icon,
  Analytics01Icon,
  CreditCardIcon,
  DashboardSquare02Icon,
  Database01Icon,
  File02Icon,
  Notification03Icon,
  PaintBoardIcon,
  Shield01Icon,
  ShieldUserIcon,
  SquareLock02Icon,
  TranslateIcon,
  UserAccountIcon,
  UserBlock01Icon,
  UserIcon,
  UserIdVerificationIcon,
  UserMultiple02Icon,
  UserSettings01Icon,
  Wallet03Icon,
} from "@hugeicons/core-free-icons";
import type { IconValue } from "@/components/dashboard/icon";
import type { SettingsGroup, SettingsPageId } from "@/lib/settings/registry";

export const GROUP_ICON: Record<SettingsGroup, IconValue> = {
  General: DashboardSquare02Icon,
  Preferences: UserSettings01Icon,
  Audience: UserMultiple02Icon,
  "Policy & Privacy": ShieldUserIcon,
};

export const PAGE_ICON: Record<SettingsPageId, IconValue> = {
  home: DashboardSquare02Icon,
  profile: UserIcon,
  "personal-information": UserAccountIcon,
  security: Shield01Icon,
  kyc: UserIdVerificationIcon,
  "get-paid": Wallet03Icon,
  notifications: Notification03Icon,
  language: TranslateIcon,
  appearance: PaintBoardIcon,
  ai: AiBrain01Icon,
  "profile-locking": SquareLock02Icon,
  "profile-share": UserMultiple02Icon,
  blocking: UserBlock01Icon,
  plan: CreditCardIcon,
  privacy: Shield01Icon,
  "personal-data": Database01Icon,
  activity: Analytics01Icon,
  report: File02Icon,
};
