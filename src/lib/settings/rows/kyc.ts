import type { SettingsRowEntry } from "./types";

export const kycRows: SettingsRowEntry[] = [
  { id: "level-1", label: "Verify Your Identity", help: "Needed to sell physical copies and to withdraw", keywords: ["kyc", "identity", "verification", "verify", "reset"] },
  { id: "intermediate", label: "Intermediate KYC", help: "Unlocks at $1,000 total transactions", keywords: ["kyc", "limit", "photo id"] },
  { id: "advanced", label: "Advanced KYC", help: "Unlocks at $5,000 total transactions", keywords: ["kyc", "limit", "proof of address"] },
];
