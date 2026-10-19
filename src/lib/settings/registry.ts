// Settings — the pages, in side-nav order (User Panel V2 "Settings Sidenav
// V2"; spec §2). The side-nav, the breadcrumbs, the page titles, search and
// ⌘K all read this list, so a page is named in one place.

export type SettingsGroup = "General" | "Preferences" | "Audience" | "Policy & Privacy";

export type SettingsPageId =
  | "home"
  | "profile"
  | "personal-information"
  | "security"
  | "kyc"
  | "get-paid"
  | "notifications"
  | "language"
  | "appearance"
  | "ai"
  | "profile-locking"
  | "profile-share"
  | "blocking"
  | "plan"
  | "privacy"
  | "personal-data"
  | "activity"
  | "report";

export interface SettingsPage {
  id: SettingsPageId;
  /** The side-nav label (Figma). */
  label: string;
  /** The page's h1 (Figma's heading, where it differs from the label). */
  title: string;
  group: SettingsGroup | null;
  href: string;
  /** The Figma frame the page follows; null for a page the interviews added. */
  figma: string | null;
}

export const SETTINGS_HOME = "/settings";

export const SETTINGS_PAGES: readonly SettingsPage[] = [
  { id: "home", label: "Settings", title: "Settings", group: null, href: SETTINGS_HOME, figma: "22048:28753" },
  { id: "profile", label: "Profile", title: "My Profile", group: "General", href: "/settings/profile", figma: "22048:28793" },
  { id: "personal-information", label: "Personal Information", title: "Personal Information", group: "General", href: "/settings/personal-information", figma: "22048:29733" },
  { id: "security", label: "Security", title: "Security Information", group: "General", href: "/settings/security", figma: "22048:30800" },
  { id: "kyc", label: "KYC Verification", title: "KYC Verification", group: "General", href: "/settings/kyc", figma: "41537:214832" },
  { id: "get-paid", label: "Get Paid", title: "Get Paid", group: "General", href: "/settings/get-paid", figma: "41537:182104" },
  { id: "notifications", label: "Notification", title: "Notification Settings", group: "Preferences", href: "/settings/notifications", figma: "22048:33859" },
  { id: "language", label: "Language", title: "Language Settings", group: "Preferences", href: "/settings/language", figma: "22048:34238" },
  { id: "appearance", label: "Appearance & accessibility", title: "Appearance & accessibility", group: "Preferences", href: "/settings/appearance", figma: null },
  { id: "ai", label: "AI Properties", title: "AI Properties", group: "Preferences", href: "/settings/ai", figma: null },
  { id: "profile-locking", label: "Profile locking", title: "Profile Locking", group: "Audience", href: "/settings/profile-locking", figma: "22550:47505" },
  { id: "profile-share", label: "Profile & Share", title: "Profile & Share", group: "Audience", href: "/settings/profile-share", figma: "22048:34433" },
  { id: "blocking", label: "Blocking", title: "Manage Blocking", group: "Audience", href: "/settings/blocking", figma: "22048:34661" },
  { id: "plan", label: "Plan & Pricing", title: "Plan & pricing", group: null, href: "/settings/plan", figma: "16838:713648" },
  { id: "privacy", label: "Privacy", title: "Privacy", group: "Policy & Privacy", href: "/settings/privacy", figma: "22048:35155" },
  { id: "personal-data", label: "Personal Data", title: "Your Information & Permission", group: "Policy & Privacy", href: "/settings/personal-data", figma: "22048:35199" },
  { id: "activity", label: "Activity", title: "Your activity", group: null, href: "/settings/activity", figma: "22048:35243" },
  { id: "report", label: "Report", title: "Report", group: null, href: "/settings/report", figma: "22550:48543" },
];

export const SETTINGS_GROUPS: readonly SettingsGroup[] = ["General", "Preferences", "Audience", "Policy & Privacy"];

export function settingsPage(id: SettingsPageId): SettingsPage {
  const page = SETTINGS_PAGES.find((p) => p.id === id);
  if (!page) throw new Error(`Unknown settings page: ${id}`);
  return page;
}

/** The page whose href is `pathname` (or the deepest one it starts with). */
export function settingsPageAt(pathname: string): SettingsPage | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  let best: SettingsPage | null = null;
  for (const p of SETTINGS_PAGES) {
    if (path === p.href || path.startsWith(`${p.href}/`)) {
      if (!best || p.href.length > best.href.length) best = p;
    }
  }
  return best;
}

export type Crumb = { label: string; href?: string };

/** Settings › Group › Page (Figma). The group links to its first page. */
export function settingsCrumbs(id: SettingsPageId): Crumb[] {
  const page = settingsPage(id);
  if (page.id === "home") return [{ label: "Settings" }];
  const crumbs: Crumb[] = [{ label: "Settings", href: SETTINGS_HOME }];
  if (page.group) {
    const first = SETTINGS_PAGES.find((p) => p.group === page.group);
    crumbs.push({ label: page.group, href: first && first.id !== page.id ? first.href : undefined });
  }
  crumbs.push({ label: page.label });
  return crumbs;
}

/** The nav as groups and single links, in order. */
export type NavEntry =
  | { kind: "group"; group: SettingsGroup; pages: SettingsPage[] }
  | { kind: "page"; page: SettingsPage };

export function settingsNav(): NavEntry[] {
  const out: NavEntry[] = [];
  for (const p of SETTINGS_PAGES) {
    if (p.id === "home") continue;
    if (!p.group) {
      out.push({ kind: "page", page: p });
      continue;
    }
    const last = out[out.length - 1];
    if (last && last.kind === "group" && last.group === p.group) last.pages.push(p);
    else out.push({ kind: "group", group: p.group, pages: [p] });
  }
  return out;
}
