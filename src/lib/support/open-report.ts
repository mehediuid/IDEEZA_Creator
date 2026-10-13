// Opens the one Report a problem dialog from anywhere: the sidebar, ⌘K, and
// the editors' Help menus, which are built from pure data and can't reach a
// React context. It asks over a window event, the way the PCB editor's
// Appearance rows ask for a theme ("ideeza:set-theme").

export const REPORT_EVENT = "ideeza:report-problem";

export function openReportProblem(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(REPORT_EVENT));
}
