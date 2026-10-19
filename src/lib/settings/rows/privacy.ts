import type { SettingsRowEntry } from "./types";

export const privacyRows: SettingsRowEntry[] = [
  { id: "search-engines", label: "Link with search engine", help: "Let search engines link to your profile", keywords: ["google", "index", "seo", "noindex"] },
  { id: "blog-reuse", label: "Blog reuse", help: "Blogs you gave IDEEZA access to for future use; revoke it", keywords: ["consent", "future use", "revoke", "medium"] },
  { id: "cookies", label: "Cookies and analytics", help: "What this app keeps and where", keywords: ["tracking", "consent", "storage"] },
];
