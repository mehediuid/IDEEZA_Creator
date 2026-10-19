import type { SettingsRowEntry } from "./types";

export const getPaidRows: SettingsRowEntry[] = [
  { id: "balance", label: "Balance", help: "What your projects earned", keywords: ["earnings", "money", "income", "sales"] },
  { id: "withdraw", label: "Withdraw", keywords: ["withdraw", "cash out", "payout", "get my money"] },
  { id: "methods", label: "Withdrawal methods", keywords: ["payout wallet", "wallet address", "bank", "network"] },
  { id: "get-paid-in", label: "Get paid in", keywords: ["token", "usdt", "idz", "currency"] },
  { id: "identity", label: "Verify your identity", keywords: ["kyc", "identity", "verification", "verify"] },
  { id: "history", label: "Withdrawal history and statement", keywords: ["statement", "csv", "tax", "accountant", "history"] },
];
