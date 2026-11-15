"use client";

// AU-18 · Welcome map (after Sign up and the one question; tour first): the first screen a new
// account sees, laid out as a phone's welcome does. The IDEEZA mark and the title with the
// tagline under it; the free credits the account has to start with as one fact tile (its live
// balance, as the web's Welcome reads it, and what a concept uses); the web's five stages as a
// connected timeline under "How it works"; what a phone is for, beside a laptop icon. Look
// around first is the primary and starts the phone's tour (components/mobile/account/
// phone-tour), which ends where they were going; Start with my idea opens the AI tab.

import { useRouter, useSearchParams } from "next/navigation";
import { Coins01Icon, LaptopIcon } from "@hugeicons/core-free-icons";
import { IdeezaLogo } from "@/components/brand/ideeza-logo";
import { Icon } from "@/components/dashboard/icon";
import { Button } from "@/components/ideeza/button";
import { AccountHeading } from "@/components/mobile/account/parts";
import { BottomBar } from "@/components/mobile/kit/bottom-bar";
import { Eyebrow } from "@/components/mobile/kit/eyebrow";
import { LIST_CARD } from "@/components/mobile/kit/list";
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
      <div className="flex flex-col gap-8 px-8 pb-8 pt-12">
        <div className="flex flex-col items-start gap-6">
          <IdeezaLogo mark height={40} decorative />
          <AccountHeading title="Welcome to IDEEZA">Turn an idea into a real electronic product, with AI or by hand.</AccountHeading>
        </div>
        {credits.hydrated && (
          <div className={cn(LIST_CARD, "flex-row items-center gap-6 px-8 py-6")}>
            <span aria-hidden className="inline-flex size-[40px] shrink-0 items-center justify-center rounded-lg bg-bg-brand-subtle text-[color:var(--color-icon-brand)]">
              <Icon icon={Coins01Icon} size={20} />
            </span>
            <p className="flex min-w-0 flex-col">
              <span className={T.section}>
                {credits.balance} free {credits.balance === 1 ? "credit" : "credits"} to start
              </span>
              <span className={T.meta}>A concept uses {CONCEPT_COST}.</span>
            </p>
          </div>
        )}
        <section aria-labelledby="welcome-how" className="flex flex-col gap-6">
          <Eyebrow id="welcome-how" as="h2" tone="tertiary">
            How it works
          </Eyebrow>
          <ol className="flex flex-col gap-8">
            {STAGES.map((s, i) => (
              <li key={s.title} className="relative flex gap-6">
                {/* The line that joins one stage to the next. */}
                {i < STAGES.length - 1 && (
                  <span aria-hidden className="absolute -bottom-[12px] left-[15px] top-[36px] border-l-[length:var(--border-width-1)] border-solid border-border" />
                )}
                <span
                  aria-hidden
                  className={cn(
                    T.rowTitle,
                    "relative inline-flex size-[32px] shrink-0 items-center justify-center rounded-md border-[length:var(--border-width-1)] border-solid border-border bg-bg-surface",
                  )}
                >
                  {i + 1}
                </span>
                <span className="flex min-w-0 flex-col gap-1 pt-1">
                  <span className={T.section}>{s.title}</span>
                  <span className={T.body}>{s.body}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
        <p className={cn(T.meta, "flex items-start gap-4 text-text-tertiary")}>
          <span className="shrink-0 text-[color:var(--color-icon-secondary)]">
            <Icon icon={LaptopIcon} size={20} />
          </span>
          <span className="min-w-0 flex-1">On a phone you can send ideas, follow builds, sell and share. Editing a design needs a computer.</span>
        </p>
      </div>
    </Screen>
  );
}
