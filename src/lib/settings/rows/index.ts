// Every settings page's searchable rows, by page id. Each page keeps its rows
// in its own file, so a page's change never touches another's. Legacy pages
// (folded into others in Settings v2) have none.

import type { SettingsPageId } from "../registry";
import type { SettingsRowEntry } from "./types";
import { accountRows } from "./account";
import { appearanceRows } from "./appearance";
import { dataRows } from "./data";
import { getPaidRows } from "./get-paid";
import { homeRows } from "./home";
import { languageRows } from "./language";
import { notificationsRows } from "./notifications";
import { planRows } from "./plan";
import { privacyRows } from "./privacy";

export type { SettingsRowEntry } from "./types";

export const SETTINGS_ROWS: Partial<Record<SettingsPageId, SettingsRowEntry[]>> = {
  home: homeRows,
  account: accountRows,
  notifications: notificationsRows,
  privacy: privacyRows,
  language: languageRows,
  appearance: appearanceRows,
  data: dataRows,
  plan: planRows,
  "get-paid": getPaidRows,
};
