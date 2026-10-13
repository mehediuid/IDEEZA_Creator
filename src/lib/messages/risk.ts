// The scam warning (spec §5): a received message that names a wallet address, a
// seed phrase or a private key, or asks to pay outside the marketplace, gets
// one line under it for the reader. A hint, not a filter: nothing is blocked.
// Pure.

export const RISK_NOTE =
  "Careful: this message mentions a wallet or paying outside IDEEZA. Pay only through the marketplace.";

const PATTERNS: readonly RegExp[] = [
  /\b0x[a-f0-9]{40}\b/i,
  /\b(seed|recovery|secret|mnemonic)\s+(phrase|words?)\b/i,
  /\bprivate\s+key\b/i,
  /\b(12|twelve|24|twenty[-\s]four)\s+words\b/i,
  /\b(send|transfer|pay)\b[^.?!\n]{0,40}\b(my|this|the)\s+wallet\b/i,
  /\bpay\b[^.?!\n]{0,30}\b(outside|directly|off[-\s]?platform)\b/i,
  /\b(bank\s+transfer|wire\s+transfer|western\s+union|paypal|venmo|cash\s*app|zelle|bkash|nagad)\b/i,
  /\b(whats\s?app|telegram)\b[^.?!\n]{0,40}\b(pay|payment|price|deal|money)\b/i,
  /\b(pay|payment|price|deal|money)\b[^.?!\n]{0,40}\b(whats\s?app|telegram)\b/i,
];

export function isRisky(text: string): boolean {
  return PATTERNS.some((p) => p.test(text));
}
