"use client";

// AU-18 · Welcome map (after Sign up and the one question; tour first): the web's five stages, the
// free credits the account has to start with (its live balance, as the web's
// Welcome reads it), and what a phone is for. Look around first is the
// primary and starts the phone's tour (components/mobile/account/phone-tour),
// which ends where they were going; Start with my idea opens the AI tab.

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ideeza/button";
import { AccountHeading } from "@/components/mobile/account/parts";
import { BottomBar } from "@/components/mobile/kit/bottom-bar";
import { Screen } from "@/components/mobile/screen";
import { T } from "@/components/mobile/type";
import { mobileNext, updatePhone } from "@/lib/account/phone";
import { CONCEPT_COST, useCredits } from "@/lib/create/credits";
import { cn } from "@/lib/utils";

const STAGES = [
  { title: "Describe your idea", body: "In plain words, or start by hand." },
  { title: "See your concept", body: "AI draws each product; change it in plain words." },
  { title: "Build it", body: "AI makes the PCB, code, 3D model, assembly, wiring and parts list." },
  { title: "Make it yours", body: "Change anything in the editors." },
  { title: "Own it, sell it or share it", body: "Mint it as yours, sell it or copies, or show it off." },
];

export default function WelcomeMapPage() {
  const router = useRouter();
  const next = mobileNext(useSearchParams().get("next"));
  const credits = useCredits();
  return (
    <Screen
      footer={
        <BottomBar>
          <Button
            size="xl"
            className="w-full"
            onClick={() => {
              updatePhone({ tourPending: true });
              router.replace(next);
            }}
          >
            Look around first
          </Button>
          <Button hierarchy="ghost" size="xl" className="w-full" onClick={() => router.replace("/m/ai")}>
            Start with my idea
          </Button>
        </BottomBar>
      }
    >
      <div className="flex flex-col gap-6 p-8">
        <AccountHeading title="Welcome to IDEEZA">
          Turn an idea into a real electronic product, with AI or by hand.
          {credits.hydrated && ` You have ${credits.balance} free ${credits.balance === 1 ? "credit" : "credits"} to start. A concept uses ${CONCEPT_COST}.`}
        </AccountHeading>
        <ol className="flex flex-col gap-8">
          {STAGES.map((s, i) => (
            <li key={s.title} className="flex gap-6">
              <span
                aria-hidden
                className={cn(
                  T.rowTitle,
                  "inline-flex size-[32px] shrink-0 items-center justify-center rounded-md border-[length:var(--border-width-1)] border-solid border-border bg-bg-surface",
                )}
              >
                {i + 1}
              </span>
              <span className="flex flex-col gap-1">
                <span className={T.section}>{s.title}</span>
                <span className={T.body}>{s.body}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className={cn(T.meta, "text-text-tertiary")}>
          On a phone you can send ideas, follow builds, sell and share. Editing a design needs a computer.
        </p>
      </div>
    </Screen>
  );
}
