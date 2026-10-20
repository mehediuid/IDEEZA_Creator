// The settings side-nav's icons, one per page, from the DS icon set. Legacy
// ids keep an icon only because the map is keyed by every page id.

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
  UserCircleIcon,
  UserIcon,
  UserIdVerificationIcon,
  UserMultiple02Icon,
  Wallet03Icon,
} from "@hugeicons/core-free-icons";
import type { IconValue } from "@/components/dashboard/icon";
import type { SettingsPageId } from "@/lib/settings/registry";

export const PAGE_ICON: Record<SettingsPageId, IconValue> = {
  home: DashboardSquare02Icon,
  account: UserCircleIcon,
  notifications: Notification03Icon,
  privacy: ShieldUserIcon,
  language: TranslateIcon,
  appearance: PaintBoardIcon,
  data: Database01Icon,
  plan: CreditCardIcon,
  "get-paid": Wallet03Icon,
  profile: UserIcon,
  "personal-information": UserAccountIcon,
  security: Shield01Icon,
  kyc: UserIdVerificationIcon,
  ai: AiBrain01Icon,
  "profile-locking": SquareLock02Icon,
  "profile-share": UserMultiple02Icon,
  blocking: UserBlock01Icon,
  "personal-data": Database01Icon,
  activity: Analytics01Icon,
  report: File02Icon,
};
