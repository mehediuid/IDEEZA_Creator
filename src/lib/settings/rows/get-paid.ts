import type { SettingsRowEntry } from "./types";

export const getPaidRows: SettingsRowEntry[] = [
  { id: "balance", label: "Balance", help: "Your earnings from every project", keywords: ["earnings", "withdraw", "payout", "idz pay"] },
  { id: "methods", label: "Withdrawal methods", help: "Where your money goes", keywords: ["payout wallet", "bank", "payoneer", "paypal", "crypto wallet"] },
  { id: "get-paid-in", label: "Get paid in", help: "The token you receive", keywords: ["token", "usdt", "idz", "currency"] },
  { id: "tax-residence", label: "Tax Residence", help: "Update your tax details", keywords: ["tax", "address"] },
  { id: "tax-identification", label: "Tax Identification", help: "W-9 or W-8 information", keywords: ["tax", "ssn", "ein", "tin", "w-9", "w-8"] },
  { id: "history", label: "Withdrawal History", keywords: ["statement", "payouts", "download statement"] },
];
