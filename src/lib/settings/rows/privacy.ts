import type { SettingsRowEntry } from "./types";

export const privacyRows: SettingsRowEntry[] = [
  { id: "search-engines", label: "Link with search engine", help: "Let search engines link to your profile", keywords: ["google", "index", "seo"] },
  { id: "blog-reuse", label: "Blog reuse", help: "Blogs you gave IDEEZA access to for future use", keywords: ["consent", "future use", "revoke"] },
  { id: "cookies", label: "Cookies and analytics", keywords: ["tracking", "consent"] },
];
