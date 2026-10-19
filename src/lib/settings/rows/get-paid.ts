import type { SettingsRowEntry } from "./types";

// The hub's rows, then the rows of its sub-pages (balance, history), which
// open there by `href`.
export const getPaidRows: SettingsRowEntry[] = [
  { id: "balance", label: "Balance", help: "Your earnings from every project", keywords: ["earnings", "payout", "idz pay", "money"] },
  { id: "tax-residence", label: "Tax Residence", help: "Update your tax details", keywords: ["tax", "address", "country"] },
  { id: "tax-identification", label: "Tax Identification", help: "W-9 or W-8 information", keywords: ["tax", "ssn", "ein", "tin", "w-9", "w-8", "us person"] },
  { id: "withdraw", label: "Withdraw Money", help: "Withdraw your balance", keywords: ["withdraw", "payout", "cash out"], href: "/settings/get-paid/balance#balance" },
  { id: "methods", label: "Withdrawal methods", help: "Where your money goes", keywords: ["payout wallet", "crypto wallet", "bank", "payoneer", "paypal", "default"], href: "/settings/get-paid/balance#methods" },
  { id: "get-paid-in", label: "Get paid in", help: "The token you receive", keywords: ["token", "usdt", "idz", "currency"], href: "/settings/get-paid/balance#get-paid-in" },
  { id: "history", label: "Withdrawal History", help: "Every withdrawal and its status", keywords: ["statement", "payouts", "download statement", "csv"], href: "/settings/get-paid/history" },
];
