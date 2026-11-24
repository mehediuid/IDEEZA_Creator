// Report a problem about the screen you're on (SET-2; the web keeps it in the sidebar on every page): the
// main screens' ⋯ (project, product, AI chat, Earn) open /m/help/report with this screen's address as
// `from`, so the report's Page line names the screen, its project and its product (lib/support/page-context).

/** Read at tap time, so the address is the one on screen (the phone app's own frame). */
export function reportProblemHref(): string {
  const { pathname, search } = window.location;
  return `/m/help/report?from=${encodeURIComponent(`${pathname}${search}`)}`;
}

export const REPORT_PROBLEM = "Report a problem";
