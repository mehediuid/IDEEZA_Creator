// Every settings page's searchable rows, by page id. Each page keeps its rows
// in its own file, so a page's change never touches another's.

import type { SettingsPageId } from "../registry";
import type { SettingsRowEntry } from "./types";
import { activityRows } from "./activity";
import { aiRows } from "./ai";
import { appearanceRows } from "./appearance";
import { blockingRows } from "./blocking";
import { getPaidRows } from "./get-paid";
import { homeRows } from "./home";
import { kycRows } from "./kyc";
import { languageRows } from "./language";
import { notificationsRows } from "./notifications";
import { personalDataRows } from "./personal-data";
import { personalInformationRows } from "./personal-information";
import { planRows } from "./plan";
import { privacyRows } from "./privacy";
import { profileRows } from "./profile";
import { profileLockingRows } from "./profile-locking";
import { profileShareRows } from "./profile-share";
import { reportRows } from "./report";
import { securityRows } from "./security";

export type { SettingsRowEntry } from "./types";

export const SETTINGS_ROWS: Record<SettingsPageId, SettingsRowEntry[]> = {
  home: homeRows,
  profile: profileRows,
  "personal-information": personalInformationRows,
  security: securityRows,
  kyc: kycRows,
  "get-paid": getPaidRows,
  notifications: notificationsRows,
  language: languageRows,
  appearance: appearanceRows,
  ai: aiRows,
  "profile-locking": profileLockingRows,
  "profile-share": profileShareRows,
  blocking: blockingRows,
  plan: planRows,
  privacy: privacyRows,
  "personal-data": personalDataRows,
  activity: activityRows,
  report: reportRows,
};
