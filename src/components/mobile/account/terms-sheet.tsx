"use client";

// AU-11 · Terms / Privacy viewer: a full-height sheet over Create account (an
// in-app web view on a phone), so the form underneath keeps what was typed.
// The words are the Figma's, section by section.

import { Sheet } from "../kit/sheet";
import { T } from "../type";

const SECTIONS: readonly { title: string; body: string }[] = [
  {
    title: "Your account",
    body: "One account per person. Keep your sign-in details safe, and tell us at support@ideeza.com if someone else gets in.",
  },
  {
    title: "What you make",
    body: "Projects, products and designs you make on IDEEZA stay yours. You choose what to share to the Feed and what to sell.",
  },
  {
    title: "Buying and selling",
    body: "Copies are sold as Physical or Virtual NFTs, for Personal use or Business use. The listing shows what each copy includes.",
  },
  {
    title: "Testnet demo",
    body: "Money actions run on a test network for now. Test funds only; nothing is written to a real blockchain.",
  },
];

export function TermsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Terms of Service" description="ideeza.com/terms · Updated Oct 1, 2026">
      {SECTIONS.map((s) => (
        <section key={s.title} className="flex flex-col gap-2">
          <h3 className={T.section}>{s.title}</h3>
          <p className={T.body}>{s.body}</p>
        </section>
      ))}
    </Sheet>
  );
}
