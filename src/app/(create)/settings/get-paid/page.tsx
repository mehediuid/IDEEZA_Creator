// /settings/get-paid — Get Paid: your balance from every project, and your tax information.

import type { Metadata } from "next";
import { GetPaidHub } from "@/components/settings/get-paid/hub";

export const metadata: Metadata = { title: "Get Paid · Settings · IDEEZA" };

export default function GetPaidRoute() {
  return <GetPaidHub />;
}
