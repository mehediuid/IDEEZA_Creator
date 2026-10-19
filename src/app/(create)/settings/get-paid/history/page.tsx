// /settings/get-paid/history — Withdrawal History: totals by status, the statement download, the table.

import type { Metadata } from "next";
import { HistoryPage } from "@/components/settings/get-paid/history";

export const metadata: Metadata = { title: "Withdrawal History · Get Paid · Settings · IDEEZA" };

export default function HistoryRoute() {
  return <HistoryPage />;
}
