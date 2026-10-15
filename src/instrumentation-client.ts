// Runs before the app hydrates (Next instrumentation-client). It only keeps
// the last few uncaught errors of this tab, so a problem report can say what
// broke: nothing is sent anywhere until the maker sends a report with
// "Send page and device details" ticked.

import { cleanMessage, isNoise, recordError, whereOf } from "@/lib/support/recent-errors";
import { pageRefFor } from "@/lib/support/page-context";

const pageNow = () => pageRefFor(location.pathname, location.search).page;

window.addEventListener("error", (e) => {
  const message = String(e.message ?? "");
  if (isNoise(message, e.filename, (e.error as Error | undefined)?.name)) return;
  recordError({ at: Date.now(), message: cleanMessage(message), where: whereOf(e.filename, e.lineno), page: pageNow() });
});

window.addEventListener("unhandledrejection", (e) => {
  const reason = e.reason as { message?: unknown; name?: unknown } | undefined;
  const message = String(reason?.message ?? e.reason ?? "");
  if (isNoise(message, "", typeof reason?.name === "string" ? reason.name : "")) return;
  recordError({ at: Date.now(), message: cleanMessage(message), page: pageNow() });
});
