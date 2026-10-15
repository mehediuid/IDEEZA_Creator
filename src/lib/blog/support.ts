// "Contact IDEEZA support" from a blog (owner D-3, D-4): the app's one Report a
// problem dialog, asked for with the blog named ("Blog removed: <title>"). The
// subject rides on the same window event openReportProblem() sends, so the
// dialog opens today and can fill its first line from `detail.subject`.

import { REPORT_EVENT } from "../support/open-report";

export function askBlogSupport(subject: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(REPORT_EVENT, { detail: { subject } }));
}

export const removedSubject = (title: string) => `Blog removed: ${title}`;
