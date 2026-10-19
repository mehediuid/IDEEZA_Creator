// /settings/personal-data — download what this browser keeps, as a .zip.

import type { Metadata } from "next";
import { PersonalDataPage } from "@/components/settings/personal-data-page";

export const metadata: Metadata = { title: "Personal Data · Settings · IDEEZA" };

export default function PersonalDataRoute() {
  return <PersonalDataPage />;
}
