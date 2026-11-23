"use client";

// KYC verification on the phone (/m/settings/kyc, /m/settings/kyc/1|2|3;
// mobile Figma "Level 1", "Level 2", "Level 3").
// · Level 1 is the web's demo identity check (lib/commerce/kyc.ts): the full
//   legal name (saved as your one private legal name) and the country of
//   residence, both required, no seller terms (web V10), and nothing else —
//   the Figma's mobile number, its code and the read-only email are gone, as
//   a flow the web has follows the web's steps (MON-6). One screen, Verify in
//   the Bottom action bar (identity-fields.tsx, shared with the first
//   withdrawal's first step). The country isn't kept; the check keeps only
//   that you verified, and when. `?next=` may name Get paid, KYC or a
//   project's Earn, where Verify sends you back. Verified shows the date and
//   Reset. Offline, Verify waits with its reason.
// · Levels 2 and 3 (Intermediate from $1,000 of sales, Advanced from $5,000)
//   need documents and a reviewer the app doesn't have, so a Demo ID check
//   stands in for the provider (lib/commerce/kyc-levels.ts): Start KYC
//   verification → the camera pre-prompt (KIT-PM-01) → submitted, Under
//   review; the ⋯ menu's Demo reviewer approves or rejects (prototype only).
//   Nothing is uploaded or kept, and nothing is limited by them.

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Alert02Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  LinkSquare02Icon,
  Shield01Icon,
  ShieldUserIcon,
  UserIdVerificationIcon,
  Camera01Icon,
  RefreshIcon,
} from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { Skeleton } from "@/components/ideeza/skeleton";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { LEVEL_AT, levelStatusOf, reviewLevel, startBlockOf, submitLevel, type HigherLevel, type LevelStatus } from "@/lib/commerce/kyc-levels";
import { resetKycDemo, useKyc } from "@/lib/commerce/use-commerce";
import { clearKycLevels, updateKycLevels, useKycLevels } from "@/lib/commerce/use-kyc-levels";
import { cn } from "@/lib/utils";
import { BottomBar } from "../kit/bottom-bar";
import { ConfirmSheet } from "../kit/confirm-sheet";
import { Chevron, LIST_CARD, LIST_DIVIDERS, LIST_ROW, ListCard, ListRow } from "../kit/list";
import { ActionSheet, Sheet } from "../kit/sheet";
import { NotFoundState } from "../kit/state";
import { OfflineBanner, useOnline } from "../kit/states";
import { useToast } from "../kit/toast";
import { MORE_ICON, TopBar } from "../top-bar";
import { Screen } from "../screen";
import { T } from "../type";
import { LEVEL_NEEDS, SAVE_FAILED } from "./get-paid-screen";
import { IDENTITY_WHY, IdentityFields, useIdentityForm } from "./identity-fields";
import { BulletList, OFFLINE_REASON, dateOf, n } from "./parts";

const STATUS_BADGE: Record<LevelStatus, { tone: "neutral" | "warning" | "error" | "success"; label: string }> = {
  none: { tone: "neutral", label: "Not submitted" },
  review: { tone: "warning", label: "Under review" },
  rejected: { tone: "error", label: "Rejected" },
  approved: { tone: "success", label: "Approved" },
};

const LEVELS: { n: 1 | 2 | 3; title: string; icon: IconValue; line: string }[] = [
  { n: 1, title: "Verify your identity", icon: UserIdVerificationIcon, line: IDENTITY_WHY },
  { n: 2, title: "Intermediate KYC", icon: Shield01Icon, line: `Asked from $${n(LEVEL_AT.intermediate)} of total sales.` },
  { n: 3, title: "Advanced KYC", icon: ShieldUserIcon, line: `Asked from $${n(LEVEL_AT.advanced)} of total sales.` },
];

const levelOf = (k: 2 | 3): HigherLevel => (k === 2 ? "intermediate" : "advanced");

function LevelMark({ icon }: { icon: IconValue }) {
  return (
    <span aria-hidden className="inline-flex size-[40px] shrink-0 items-center justify-center rounded-full bg-bg-brand text-text-on-brand">
      <Icon icon={icon} size={20} />
    </span>
  );
}

// ── the levels ─────────────────────────────────────────────────────────

export function KycScreen() {
  const router = useRouter();
  const kyc = useKyc();
  const levels = useKycLevels();
  const loaded = kyc !== undefined && levels !== undefined;
  return (
    <Screen top={<TopBar back="/m/settings" title="KYC verification" />} className="px-8 pb-12 pt-4">
      {!loaded ? (
        <Skeleton shape="block" className="h-[320px] w-full" />
      ) : (
        <div className="flex flex-col gap-8">
          <OfflineBanner />
          <ul aria-label="Verification levels" className={cn(LIST_CARD, LIST_DIVIDERS)}>
            {LEVELS.map((l) => {
              const status: LevelStatus = l.n === 1 ? (kyc ? "approved" : "none") : levelStatusOf(levels, levelOf(l.n));
              const block = l.n === 1 ? null : startBlockOf(levels, levelOf(l.n), !!kyc);
              const locked = l.n > 1 && status === "none" && !!block;
              const badge = STATUS_BADGE[status];
              return (
                <li key={l.n}>
                  <button
                    type="button"
                    onClick={() => router.push(`/m/settings/kyc/${l.n}`)}
                    aria-describedby={locked ? `level-${l.n}-why` : undefined}
                    className={cn(LIST_ROW, "items-start active:bg-bg-subtle")}
                  >
                    <LevelMark icon={l.icon} />
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className={T.meta}>Verification level {l.n}</span>
                      <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span className={T.rowTitle}>{l.title}</span>
                        <Badge tone={badge.tone}>{badge.label}</Badge>
                      </span>
                      <span className={T.meta}>{l.line}</span>
                      {locked && (
                        <span id={`level-${l.n}-why`} className={cn(T.meta, "text-text-tertiary")}>
                          {block}
                        </span>
                      )}
                    </span>
                    <Chevron className="self-center" />
                  </button>
                </li>
              );
            })}
          </ul>
          <p className={cn(T.meta, "flex flex-wrap items-center gap-3")}>
            <TestnetDemoBadge />
            Nothing is checked, sent or limited in this demo.
          </p>
        </div>
      )}
    </Screen>
  );
}

export function KycLevelScreen() {
  const { level } = useParams<{ level: string }>();
  if (level === "1") return <LevelOne />;
  if (level === "2" || level === "3") return <HigherLevelScreen k={Number(level) as 2 | 3} />;
  return (
    <Screen top={<TopBar back="/m/settings/kyc" title="KYC verification" />} className="px-8 pt-8">
      <NotFoundState thing="verification level" body="There’s no such verification level. Levels 1, 2 and 3 are on KYC verification." action={{ label: "See verification levels", href: "/m/settings/kyc" }} />
    </Screen>
  );
}

// ── Level 1 ────────────────────────────────────────────────────────────

/** Where Verify may send you back: Get paid's screens, KYC, or a project's Earn (any of its sections). */
const NEXT_OK = /^\/m\/(settings\/(idz-pay(\/[a-z-]+)?|kyc)|projects\/[^/?#]+\/earn(\/[a-z-]+)?)$/;

function LevelOne() {
  const kyc = useKyc();
  const toast = useToast();
  const [resetting, setResetting] = React.useState(false);
  if (kyc === undefined)
    return (
      <Screen top={<TopBar back="/m/settings/kyc" title="KYC verification" />} className="px-8 pt-4">
        <Skeleton shape="block" className="h-[320px] w-full" />
      </Screen>
    );
  if (kyc)
    return (
      <Screen top={<TopBar back="/m/settings/kyc" title="KYC verification" />} className="px-8 pb-12 pt-4">
        <div className="flex flex-col gap-10">
          <section aria-label="Verify your identity" className="flex flex-col items-center gap-4 pt-6 text-center">
            <span aria-hidden className="inline-flex size-[64px] items-center justify-center rounded-full bg-bg-success-subtle text-text-success">
              <Icon icon={CheckmarkCircle02Icon} size={32} />
            </span>
            <span className="flex flex-wrap items-center justify-center gap-4">
              <h2 className={T.title}>Verify your identity</h2>
              <Badge tone="success">Approved</Badge>
            </span>
            <p className={T.body}>Verified on {dateOf(kyc.at)} (Testnet demo). The check keeps only that you verified, and when.</p>
          </section>
          <ListCard label="Verification">
            <ListRow icon={RefreshIcon} title="Reset verification" meta="Your next withdrawal asks you to verify again." danger onClick={() => setResetting(true)} />
          </ListCard>
        </div>
        <ConfirmSheet
          open={resetting}
          onClose={() => setResetting(false)}
          title="Reset your verification?"
          body="Your next withdrawal asks you to verify again. Levels 2 and 3 are reset with it."
          verb="Reset"
          destructive
          onConfirm={() => {
            if (resetKycDemo() && clearKycLevels()) toast({ title: "Verification reset" });
            else toast({ title: SAVE_FAILED, lead: "error" });
          }}
        />
      </Screen>
    );
  return <LevelOneForm />;
}

function LevelOneForm() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const online = useOnline();
  const { fields, verify } = useIdentityForm();
  const next = params.get("next");
  const back = next && NEXT_OK.test(next) ? next : "/m/settings/kyc";

  const submit = () => {
    if (!online) return;
    const result = verify();
    if (result === "invalid") return;
    if (result === "failed") return toast({ title: SAVE_FAILED, lead: "error" });
    toast({ title: "Identity verified (demo)", lead: "success" });
    router.replace(back);
  };

  return (
    <Screen
      top={<TopBar back={back} title="KYC verification" />}
      className="px-8 pb-8 pt-4"
      footer={
        <BottomBar>
          {!online && (
            <p id="verify-why" role="status" className={T.caption}>
              {OFFLINE_REASON}
            </p>
          )}
          <Button size="xl" className="w-full" disabled={!online} aria-describedby={!online ? "verify-why" : undefined} onClick={submit}>
            Verify
          </Button>
        </BottomBar>
      }
    >
      <div className="flex flex-col gap-8">
        <OfflineBanner />
        <header className="flex flex-col gap-2">
          <span className="flex flex-wrap items-center gap-4">
            <h2 className={T.title}>Verify your identity</h2>
            <Badge tone="neutral">Not submitted</Badge>
          </span>
          <p className={T.body}>{IDENTITY_WHY}</p>
        </header>
        <IdentityFields {...fields} />
      </div>
    </Screen>
  );
}

// ── Levels 2 and 3 ─────────────────────────────────────────────────────

function HigherLevelScreen({ k }: { k: 2 | 3 }) {
  const kyc = useKyc();
  const levels = useKycLevels();
  const toast = useToast();
  const online = useOnline();
  const [demo, setDemo] = React.useState(false);
  const [reviewer, setReviewer] = React.useState(false);
  const level = levelOf(k);
  const meta = LEVELS[k - 1];
  const title = meta.title;
  if (kyc === undefined || levels === undefined)
    return (
      <Screen top={<TopBar back="/m/settings/kyc" title="KYC verification" />} className="px-8 pt-4">
        <Skeleton shape="block" className="h-[320px] w-full" />
      </Screen>
    );
  const status = levelStatusOf(levels, level);
  const block = startBlockOf(levels, level, !!kyc);
  const badge = STATUS_BADGE[status];
  const answer = (outcome: "approved" | "rejected") => {
    if (updateKycLevels((l) => reviewLevel(l, level, outcome, Date.now()))) toast({ title: outcome === "approved" ? `${title} approved (demo)` : `${title} rejected (demo)` });
    else toast({ title: SAVE_FAILED, lead: "error" });
  };
  const canStart = (status === "none" || status === "rejected") && !block;
  return (
    <Screen
      top={
        <TopBar
          back="/m/settings/kyc"
          title="KYC verification"
          actions={status === "review" ? [{ icon: MORE_ICON, label: "Demo reviewer", onClick: () => setReviewer(true) }] : []}
        />
      }
      className="px-8 pb-12 pt-4"
      footer={
        status === "none" || status === "rejected" ? (
          <BottomBar>
            {(block || !online) && (
              <p id="start-why" className={T.caption}>
                {block ?? OFFLINE_REASON}
              </p>
            )}
            <Button size="xl" className="w-full" disabled={!canStart || !online} aria-describedby={block || !online ? "start-why" : undefined} onClick={() => setDemo(true)}>
              Start KYC verification
              <Icon icon={LinkSquare02Icon} size={18} />
            </Button>
          </BottomBar>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-8">
        <OfflineBanner />
        <header className="flex flex-col gap-2">
          <span className={T.meta}>Verification level {k}</span>
          <span className="flex flex-wrap items-center gap-4">
            <h2 className={T.title}>{title}</h2>
            <Badge tone={badge.tone}>{badge.label}</Badge>
          </span>
          <p className={T.body}>
            {meta.line}
            {status === "approved" ? "" : k === 3 ? " Removes every transaction limit." : " Verification required to continue."}
          </p>
        </header>

        {status === "review" && (
          <StatusBox tone="warning" icon={Clock01Icon} title="Verification under review">
            This usually takes 24–72 hours. You’ll get a notice once it’s done. (Demo: the reviewer is in the ⋯ menu.)
          </StatusBox>
        )}
        {status === "rejected" && (
          <StatusBox tone="error" icon={Alert02Icon} title="Rejection reason">
            Unable to verify your identity. Make sure your documents are clear and match your information.
          </StatusBox>
        )}
        {status === "approved" && (
          <StatusBox tone="success" icon={CheckmarkCircle02Icon} title="KYC verification approved">
            Your identity has been verified{levels[level] ? ` on ${dateOf(levels[level]!.at)}` : ""}.
          </StatusBox>
        )}

        {(status === "none" || status === "rejected") && (
          <>
            <div className="flex flex-col gap-4">
              <p className={T.rowTitle}>What you’ll need:</p>
              <BulletList items={LEVEL_NEEDS[level]} />
            </div>
          </>
        )}
        <p className={cn(T.meta, "flex items-start gap-3")}>
          <span aria-hidden className="mt-[2px]">
            <Icon icon={Shield01Icon} size={16} />
          </span>
          <span>
            <span className="font-medium text-text-primary">Data security:</span> the identity provider handles your documents. IDEEZA never stores identity documents; this demo reads and keeps none.
          </span>
        </p>
      </div>
      <DemoProviderSheet
        open={demo}
        onClose={() => setDemo(false)}
        title={title}
        liveness={k === 3}
        onSubmit={() => {
          if (updateKycLevels((l) => submitLevel(l, level, !!kyc, Date.now()))) toast({ title: "Sent for review" });
          else toast({ title: SAVE_FAILED, lead: "error" });
        }}
      />
      <ActionSheet
        open={reviewer}
        onClose={() => setReviewer(false)}
        title="Demo reviewer (prototype only)"
        items={[
          { label: "Approve", icon: CheckmarkCircle02Icon, onSelect: () => answer("approved") },
          { label: "Reject", icon: Alert02Icon, destructive: true, onSelect: () => answer("rejected") },
        ]}
      />
    </Screen>
  );
}

function StatusBox({ tone, icon, title, children }: { tone: "warning" | "error" | "success"; icon: IconValue; title: string; children: React.ReactNode }) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-4 rounded-xl border-[length:var(--border-width-1)] border-solid p-6",
        tone === "warning" && "border-[var(--color-border-warning)] bg-badge-warning-bg",
        tone === "error" && "border-[var(--color-border-error)] bg-bg-error-subtle",
        tone === "success" && "border-[var(--color-border-success)] bg-bg-success-subtle",
      )}
    >
      <span aria-hidden className={cn("mt-[2px]", tone === "warning" ? "text-text-warning" : tone === "error" ? "text-text-error" : "text-text-success")}>
        <Icon icon={icon} size={20} />
      </span>
      <span className="flex flex-col gap-1">
        <span className={T.rowTitle}>{title}</span>
        <span className={T.meta}>{children}</span>
      </span>
    </div>
  );
}

/** The Demo ID check: stands in for the identity provider's own app (prototype only), after the camera pre-prompt. */
function DemoProviderSheet({ open, onClose, title, liveness, onSubmit }: { open: boolean; onClose: () => void; title: string; liveness: boolean; onSubmit: () => void }) {
  const [step, setStep] = React.useState<"camera" | "demo">("camera");
  const close = () => {
    setStep("camera");
    onClose();
  };
  if (step === "camera")
    return (
      <Sheet
        open={open}
        onClose={close}
        title="Use your camera"
        description={liveness ? "To photograph your proof of address and take the liveness selfie." : "To photograph your ID."}
        actions={
          <>
            <Button size="xl" className="w-full" onClick={() => setStep("demo")}>
              Continue
            </Button>
          </>
        }
      />
    );
  return (
    <Sheet
      open={open}
      onClose={close}
      title={`Demo ID check · ${title}`}
      description="Stands in for the identity provider’s app (prototype only). No camera opens, and nothing is uploaded or kept."
      actions={
        <>
          <Button
            size="xl"
            className="w-full"
            onClick={() => {
              onSubmit();
              close();
            }}
          >
            Submit for review
          </Button>
        </>
      }
    >
      <BulletList icon={Camera01Icon} items={liveness ? ["Proof of address photographed (demo)", "Liveness check passed (demo)", "Source of funds: declared (demo)"] : ["ID photographed (demo)", "Date of birth and address read from it (demo)"]} />
    </Sheet>
  );
}
