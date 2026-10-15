// "Contact IDEEZA support" from a blog (owner D-3, D-4): the app's one Report a
// problem dialog, opened with the blog named ("Blog removed: <title>") as the
// start of "What happened?" (only when the writer hasn't written there yet).

import { openReportProblem } from "../support/open-report";

export function askBlogSupport(subject: string): void {
  openReportProblem({ details: subject });
}

export const removedSubject = (title: string) => `Blog removed: ${title}`;
