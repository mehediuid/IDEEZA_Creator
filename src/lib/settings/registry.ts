// Settings — the pages, in side-nav order (Settings v2, owner-approved
// 2026-10-20: one flat list, no groups, each nav label is its page title).
// The side-nav, the breadcrumbs, the page titles, search and ⌘K all read this
// list, so a page is named in one place.
//
// Legacy ids are the Phase 1 pages that v2 folded into others. Their routes
// redirect to the new home of their rows; they stay here (nav: false) only so
// a page component that hasn't moved yet still compiles.

export type SettingsPageId =
  | "home"
  | "account"
  | "notifications"
  | "privacy"
  | "language"
  | "appearance"
  | "data"
  | "plan"
  | "get-paid"
  // legacy (Phase 1), not in the nav
  | "profile"
  | "personal-information"
  | "security"
  | "kyc"
  | "ai"
  | "profile-locking"
  | "profile-share"
  | "blocking"
  | "personal-data"
  | "activity"
  | "report";

export interface SettingsPage {
  id: SettingsPageId;
  /** The side-nav label, and the page's h1. */
  label: string;
  title: string;
  href: string;
  /** In the side-nav and in search. */
  nav: boolean;
  /** Where a legacy page's content now lives. */
  movedTo?: string;
}

export const SETTINGS_HOME = "/settings";

const page = (id: SettingsPageId, label: string, href: string, nav = true, movedTo?: string): SettingsPage => ({
  id,
  label,
  title: label,
  href,
  nav,
  movedTo,
});

export const SETTINGS_PAGES: readonly SettingsPage[] = [
  page("home", "Settings", SETTINGS_HOME),
  page("account", "Account", "/settings/account"),
  page("notifications", "Notifications", "/settings/notifications"),
  page("privacy", "Privacy & safety", "/settings/privacy"),
  page("language", "Language & region", "/settings/language"),
  page("appearance", "Appearance & accessibility", "/settings/appearance"),
  page("data", "AI & your data", "/settings/data"),
  page("plan", "Plan & billing", "/settings/plan"),
  page("get-paid", "Get paid", "/settings/get-paid"),
  // legacy → where their rows went
  page("profile", "Profile", "/settings/profile", false, "/settings/account"),
  page("personal-information", "Personal Information", "/settings/personal-information", false, "/settings/account"),
  page("security", "Security", "/settings/security", false, "/settings/account#sign-in"),
  page("kyc", "KYC Verification", "/settings/kyc", false, "/settings/get-paid#identity"),
  page("ai", "AI Properties", "/settings/ai", false, "/settings/data#ai"),
  page("profile-locking", "Profile locking", "/settings/profile-locking", false, "/settings/privacy#lock"),
  page("profile-share", "Profile & Share", "/settings/profile-share", false, "/settings/privacy"),
  page("blocking", "Blocking", "/settings/blocking", false, "/settings/privacy#blocked"),
  page("personal-data", "Personal Data", "/settings/personal-data", false, "/settings/data#download"),
  page("activity", "Activity", "/settings/activity", false, "/settings/data#activity"),
  page("report", "Report", "/settings/report", false, "/settings/privacy#reports"),
];

/** The side-nav, in order (home not included). */
export const NAV_PAGES: readonly SettingsPage[] = SETTINGS_PAGES.filter((p) => p.nav && p.id !== "home");

export function settingsPage(id: SettingsPageId): SettingsPage {
  const p = SETTINGS_PAGES.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown settings page: ${id}`);
  return p;
}

/** The nav page whose href is `pathname` (or the deepest one it starts with). */
export function settingsPageAt(pathname: string): SettingsPage | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  let best: SettingsPage | null = null;
  for (const p of SETTINGS_PAGES) {
    if (!p.nav) continue;
    if (path === p.href || path.startsWith(`${p.href}/`)) {
      if (!best || p.href.length > best.href.length) best = p;
    }
  }
  return best;
}

export type Crumb = { label: string; href?: string };

/** Settings › Page. */
export function settingsCrumbs(id: SettingsPageId): Crumb[] {
  const p = settingsPage(id);
  if (p.id === "home") return [{ label: "Settings" }];
  return [{ label: "Settings", href: SETTINGS_HOME }, { label: p.label }];
}

/** Where a legacy settings route sends you now; null for a v2 page. */
export function movedHref(id: SettingsPageId): string | null {
  return settingsPage(id).movedTo ?? null;
}
