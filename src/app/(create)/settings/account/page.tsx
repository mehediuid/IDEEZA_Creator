// /settings/account — handle, legal name, the way to Edit profile, the wallet, sign-in.

import type { Metadata } from "next";
import { AccountPage } from "@/components/settings/account-page";

export const metadata: Metadata = { title: "Account · Settings · IDEEZA" };

export default function AccountRoute() {
  return <AccountPage />;
}
