// /settings/report — the reports you made, and (once reviews exist) the
// reports about your work.

import type { Metadata } from "next";
import { ReportPage } from "@/components/settings/report-page";

export const metadata: Metadata = { title: "Report · Settings · IDEEZA" };

export default function ReportRoute() {
  return <ReportPage />;
}
