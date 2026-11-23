// Help's questions (mobile Figma "Faq and Contact Support" › FAQs). The web
// has no help FAQ of its own, so every answer here says what the app really
// does today, in the web's words (Plan & pricing's FAQs, Get paid, the
// identity check, the testnet demo). The Figma's own questions are kept
// where the app has an answer to them; each answer may name the phone screen
// that does it. Search folds case and matches every typed word anywhere in
// the question or the answer, questions first.
//
// Pure. A build's pieces are named from the build's own table
// (lib/create/pieces.ts), as the AI tab names them (SET-17), so the answer
// never drifts from what a build makes.

import { PICKABLE_KINDS, PIECES, WHOLE_PRODUCT_COSTS } from "../create/pieces";

/** "PCB, Code, 3D Module, Assembly and Wiring": the pieces a build makes for each product. */
const names = PICKABLE_KINDS.map((k) => PIECES[k].name);
export const BUILD_PIECES = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names.join("");

export type FaqItem = { id: string; q: string; a: string; link?: { label: string; href: string } };

export const FAQS: readonly FaqItem[] = [
  {
    id: "no-knowledge",
    q: "Can I use IDEEZA without knowing hardware design?",
    a: `Yes. Describe your idea in plain words on the AI tab. AI draws concepts for each product, and a build makes ${BUILD_PIECES} for each one, plus its parts list.`,
    link: { label: "Start with an idea", href: "/m/ai" },
  },
  {
    id: "electronics",
    q: "I'm not familiar with the electronics part. How do I go about it?",
    a: "You don't need to be. The build makes the PCB, the code and the 3D model for you. If you want to change them, each piece opens in its own editor on a computer; on the phone you can look at every piece and ask for changes in words.",
  },
  {
    id: "credits",
    q: "What does a credit pay for?",
    a: `AI work. A concept drawing (a first draft, a refine or a regenerate) uses 1 credit, and a build uses ${WHOLE_PRODUCT_COSTS} for each product in it, by its Quality (Low, Medium or High), less when you pick fewer pieces. Your plan adds credits every month, and you can buy more any time.`,
    link: { label: "See your credits", href: "/m/plans/credits" },
  },
  {
    id: "pricing",
    q: "Pricing & availability",
    a: "Free is $0 with 10 AI credits a month. Tinkerer is $8 a month (50 credits), Builder $10 (300 credits) and Disruptor $20 (1,200 credits). Paying yearly takes 20% off. Every plan, Free included, can mint, list and buy.",
    link: { label: "Compare plans", href: "/m/plans" },
  },
  {
    id: "change-plan",
    q: "Can I change or cancel my plan?",
    a: "Yes. An upgrade starts now, and the unused time of your current plan comes off its price. A smaller plan, monthly billing or a cancel starts when your period ends. Nothing you made is deleted.",
    link: { label: "Open Billing", href: "/m/plans?tab=billing" },
  },
  {
    id: "pay",
    q: "How do I pay?",
    a: "Payments aren't on yet. In this demo you pay with test USDT or IDZ from the demo wallet, on testnet, and no real money moves. Card and PayPal come later.",
    link: { label: "Payment method", href: "/m/settings/payments" },
  },
  {
    id: "get-paid",
    q: "How do I get paid when I sell?",
    a: "Your share of each sale lands in Get paid, after the 2.5% IDEEZA fee and any splits. Withdraw it whenever you like to a wallet address; you sign each withdrawal in your demo wallet.",
    link: { label: "Open Get paid", href: "/m/settings/idz-pay" },
  },
  {
    id: "payout-status",
    q: "How does my payout status work?",
    a: "A withdrawal you sign is recorded as Complete, with a reference to quote. A payout you asked for in a project's Earn before Get paid existed shows as Pending. No coins move in the testnet demo.",
    link: { label: "Withdrawal history", href: "/m/settings/idz-pay/history" },
  },
  {
    id: "identity",
    q: "Why do I need to verify my identity?",
    a: "Your first withdrawal asks for it, and so does selling physical copies. Level 1 asks your legal name and your country. From $1,000 and from $5,000 of total sales, fuller checks with ID documents are asked. Nothing is checked or limited in this demo.",
    link: { label: "KYC verification", href: "/m/settings/kyc" },
  },
  {
    id: "shipping",
    q: "How does shipping work?",
    a: "Nothing ships yet. Physical copies can be listed and sold on the marketplace in the testnet demo, but no checkout sends a physical item to anyone.",
  },
  {
    id: "where-kept",
    q: "Where is my work kept?",
    a: "Your account, projects, profile and wallet are kept in this browser. Come back in the same browser and sign in to find them.",
  },
  {
    id: "real-money",
    q: "Is any of the money real?",
    a: "No. The wallet, minting, the marketplace, plans and credits are a testnet demo: test coins only, and nothing is written to a real blockchain.",
  },
  {
    id: "earn-idz",
    q: "How can I earn IDZ?",
    a: "Refer other creators, stake IDZ, and watch tutorial videos once they're out (each pays 2 IDZ once). Everything you earn lands in your demo wallet.",
    link: { label: "Earn Coin", href: "/m/earn" },
  },
  {
    id: "report",
    q: "How do I report a problem?",
    a: "Use Report a problem: say what it's about, how much it's in your way and what happened, and add up to 3 screenshots. It goes to the IDEEZA team with a reference you can quote.",
    link: { label: "Report a problem", href: "/m/help/report" },
  },
];

/** The words of a query, folded. */
function wordsOf(s: string): string[] {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/** Every item holding every typed word, questions that hold them all first; all of them for an empty query. */
export function searchFaqs(items: readonly FaqItem[], query: string): FaqItem[] {
  const words = wordsOf(query);
  if (!words.length) return items.slice();
  const scored: { item: FaqItem; score: number; at: number }[] = [];
  items.forEach((item, at) => {
    const q = wordsOf(item.q).join(" ");
    const all = `${q} ${wordsOf(item.a).join(" ")}`;
    if (!words.every((w) => all.includes(w))) return;
    scored.push({ item, score: words.filter((w) => q.includes(w)).length, at });
  });
  return scored.sort((a, b) => b.score - a.score || a.at - b.at).map((s) => s.item);
}
