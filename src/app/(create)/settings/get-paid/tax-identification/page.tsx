// /settings/get-paid/tax-identification — US person or not, and a US person's SSN or EIN (last 4 kept).

import type { Metadata } from "next";
import { TaxIdentificationPage } from "@/components/settings/get-paid/tax";

export const metadata: Metadata = { title: "Tax Identification · Get Paid · Settings · IDEEZA" };

export default function TaxIdentificationRoute() {
  return <TaxIdentificationPage />;
}
