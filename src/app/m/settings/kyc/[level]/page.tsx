"use client";

import { KycLevelScreen } from "@/components/mobile/plans/kyc-screens";

// One KYC level: 1 (`?step=code`, `?next=`), 2 or 3.
export default function Page() {
  return <KycLevelScreen />;
}
