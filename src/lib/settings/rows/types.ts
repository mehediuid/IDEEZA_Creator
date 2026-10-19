// One searchable row of a settings page. `id` is the row's DOM id on its page
// (`/settings/<page>#<id>`); `href` is set only for a control whose home is
// somewhere else (the PCB editor, the account menu, a project) — search and
// ⌘K then open that home, never a copy of the control.

export interface SettingsRowEntry {
  id: string;
  label: string;
  help?: string;
  keywords?: string[];
  href?: string;
}
