// /settings/get-paid/tax-residence — the address your earnings are taxed at.

import type { Metadata } from "next";
import { TaxResidencePage } from "@/components/settings/get-paid/tax";

export const metadata: Metadata = { title: "Tax Residence · Get Paid · Settings · IDEEZA" };

export default function TaxResidenceRoute() {
  return <TaxResidencePage />;
}
