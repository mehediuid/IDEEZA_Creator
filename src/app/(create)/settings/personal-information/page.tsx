// /settings/personal-information — bio and About, addresses, skills and top
// specialities, connected accounts, time zone and the languages you speak.

import type { Metadata } from "next";
import { PersonalInformationPage } from "@/components/settings/profile/personal-information";

export const metadata: Metadata = { title: "Personal Information · Settings · IDEEZA" };

export default function PersonalInformationRoute() {
  return <PersonalInformationPage />;
}
