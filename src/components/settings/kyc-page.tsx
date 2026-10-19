"use client";

// /settings/kyc (User Panel V2 "General | KYC verification" 41537:214832,
// Advanced 41537:215986; Settings spec §5.5, D6). Figma's three levels in one
// bordered box: the levels on the left, each with its status badge, and the
// chosen level on the right (below on a narrow page).
// - Verify Your Identity (Level 1) is the app's demo identity check
//   (lib/commerce/kyc.ts): Full Legal Name, Country of Residence and the
//   seller terms, Submit for Review → Approved at once, labelled Testnet demo.
//   Only the outcome is kept; the name and country are never stored. An
//   approved Level 1 can be reset. Figma's email and phone OTP rows wait for
//   sign-in (D18) and aren't shown.
// - Intermediate ($1,000) and Advanced ($5,000) need documents and a reviewer,
//   which the app doesn't have: each shows your live total of sales against
//   its threshold, what it will ask, and a disabled Start with the reason.
// The Earn ladder's Verify identity opens this page with `?from=`, and the
// header then offers the way back to the project.

import * as React from "react";
import { CheckmarkCircle02Icon, Shield01Icon, SecurityCheckIcon, UserAccountIcon, LinkSquare02Icon } from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { Badge, Banner, Button, Checkbox, ProgressBar, SelectMenu, TestnetDemoBadge, TextInput, type BadgeTone } from "@/components/ideeza";
import { formatUsd } from "@/lib/account/payout";
import { KYC_NAME_MAX, kycFormProblems, kycLevelsOf, type KycLevel, type KycLevelId, type KycLevelStatus } from "@/lib/commerce/kyc";
import { resetKycDemo, useKyc, verifyKycDemo } from "@/lib/commerce/use-commerce";
import { moveTab } from "@/lib/ui/tab-keys";
import { cn } from "@/lib/utils";
import { countryOptions, formatDay, ReturnLink, useEarnings } from "./get-paid/parts";
import { SAVE_FAILED } from "./settings-card";
import { SettingsFrame } from "./settings-frame";

const IDS: readonly KycLevelId[] = ["level-1", "intermediate", "advanced"];

const STATUS: Record<KycLevelStatus, { word: string; tone: BadgeTone }> = {
  "not-submitted": { word: "Not Submitted", tone: "neutral" },
  "under-review": { word: "Under Review", tone: "warning" },
  rejected: { word: "Rejected", tone: "error" },
  approved: { word: "Approved", tone: "success" },
};

const LEVEL: Record<KycLevelId, { title: string; icon: IconValue; line: string; expect: string[] }> = {
  "level-1": {
    title: "Verify Your Identity",
    icon: UserAccountIcon,
    line: "Needed to sell physical copies and to withdraw your earnings.",
    expect: [],
  },
  intermediate: {
    title: "Intermediate KYC",
    icon: Shield01Icon,
    line: "Unlocks at $1,000 total transactions.",
    expect: [
      "All Level 1 data (pre-collected)",
      "Government-issued Photo ID (passport, national ID, or driver's licence)",
      "Date of Birth",
      "Full Residential Address",
      "Confirm tax residency country",
    ],
  },
  advanced: {
    title: "Advanced KYC",
    icon: SecurityCheckIcon,
    line: "Unlocks at $5,000 total transactions. Removes all transaction limits.",
    expect: [
      "All Level 1 + Level 2 data (pre-collected)",
      "Proof of Address (utility bill or bank statement, at most 3 months old)",
      "Liveness Check (selfie + blink / head-turn prompt)",
      "Source of Funds declaration (employment, business, savings, investment, other)",
      "Tax Identification Number (jurisdiction-dependent)",
    ],
  },
};

const LABEL = "text-md font-medium leading-md text-text-primary";
const ERROR = "m-0 text-sm leading-sm text-text-error";
const TAP = "max-md:min-h-[var(--touch-min)]";

export function KycPage({ from }: { from: string | null }) {
  const kyc = useKyc();
  const { ready, salesUsd } = useEarnings();
  const levels = kycLevelsOf(kyc ?? null, salesUsd);
  const [tab, setTab] = React.useState<KycLevelId>("level-1");
  const [said, setSaid] = React.useState("");
  const tabsId = React.useId();

  // Arriving at #intermediate or #advanced (search, ⌘K) opens that level.
  React.useEffect(() => {
    const pick = () => {
      const hash = decodeURIComponent(window.location.hash.slice(1));
      if ((IDS as readonly string[]).includes(hash)) setTab(hash as KycLevelId);
    };
    pick();
    window.addEventListener("hashchange", pick);
    return () => window.removeEventListener("hashchange", pick);
  }, []);

  const current = levels.find((l) => l.id === tab)!;

  return (
    <SettingsFrame page="kyc" actions={<ReturnLink from={from} />}>
      <p role="status" aria-live="polite" className="sr-only">
        {said}
      </p>
      <div className="@container">
        <div className="flex flex-col overflow-hidden rounded-xl border border-solid border-border [@container(min-width:720px)]:flex-row">
          <div
            role="tablist"
            aria-orientation="vertical"
            aria-label="KYC levels"
            onKeyDown={(e) => moveTab(e, IDS, tab, setTab)}
            className="flex shrink-0 flex-col gap-[12px] bg-bg-subtle p-[16px] [@container(min-width:720px)]:w-[40%]"
          >
            {levels.map((l) => (
              <LevelTab key={l.id} level={l} selected={tab === l.id} panelId={`${tabsId}-panel`} onSelect={() => setTab(l.id)} />
            ))}
          </div>
          <div
            role="tabpanel"
            id={`${tabsId}-panel`}
            aria-labelledby={`${current.id}`}
            className="flex min-w-0 flex-1 flex-col gap-[24px] bg-bg-surface p-[16px] [@container(min-width:720px)]:p-[32px]"
          >
            {current.id === "level-1" ? (
              <LevelOne level={current} onSay={setSaid} />
            ) : (
              <HigherLevel level={current} salesUsd={salesUsd} ready={ready} />
            )}
            <p className="m-0 flex items-start gap-[10px] border-t border-solid border-border pt-[16px] text-md leading-md text-text-secondary">
              <span aria-hidden className="mt-[2px] shrink-0 text-text-tertiary">
                <Icon icon={Shield01Icon} size={16} />
              </span>
              <span>
                <span className="font-semibold text-text-primary">Data in this demo: </span>
                only that you verified, and when, is kept in this browser. Your name and country are not stored or sent anywhere.
              </span>
            </p>
          </div>
        </div>
      </div>
    </SettingsFrame>
  );
}

function LevelTab({ level, selected, panelId, onSelect }: { level: KycLevel; selected: boolean; panelId: string; onSelect: () => void }) {
  const info = LEVEL[level.id];
  const status = STATUS[level.status];
  return (
    <button
      id={level.id}
      type="button"
      role="tab"
      data-tab={level.id}
      aria-selected={selected}
      aria-controls={panelId}
      tabIndex={selected ? 0 : -1}
      onClick={onSelect}
      className={cn(
        "flex w-full scroll-mt-24 items-start gap-[12px] rounded-xl border border-solid bg-bg-surface p-[16px] text-left outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus",
        "data-[arrived]:outline data-[arrived]:outline-2 data-[arrived]:outline-offset-4 data-[arrived]:outline-border-focus",
        selected ? "border-border-brand" : "border-transparent hover:border-border",
      )}
    >
      <span aria-hidden className={cn("mt-[2px] shrink-0", selected ? "text-text-brand" : "text-text-tertiary")}>
        <Icon icon={info.icon} size={20} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-[4px]">
        <span className="flex items-start justify-between gap-[8px]">
          <span className="min-w-0 text-lg font-semibold leading-lg text-text-primary">{info.title}</span>
          <Badge tone={status.tone} className="mt-[2px] shrink-0">
            {status.word}
          </Badge>
        </span>
        <span className="text-md leading-md text-text-secondary">{info.line}</span>
      </span>
    </button>
  );
}

function PanelHeading({ icon, title, aside }: { icon: IconValue; title: string; aside?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-[12px]">
      <span aria-hidden className="text-text-brand">
        <Icon icon={icon} size={24} />
      </span>
      <h2 className="m-0 text-2xl font-semibold leading-2xl text-text-primary">{title}</h2>
      {aside}
    </div>
  );
}

function LevelOne({ level, onSay }: { level: KycLevel; onSay: (s: string) => void }) {
  const [refused, setRefused] = React.useState(false);
  if (level.status === "approved") {
    return (
      <div className="flex flex-col gap-[16px]">
        <PanelHeading icon={CheckmarkCircle02Icon} title="Verification complete" aside={<TestnetDemoBadge />} />
        <p className="m-0 max-w-[62ch] text-md leading-md text-text-primary">
          Your identity is verified for this demo. You can sell physical copies and withdraw your earnings.
        </p>
        {level.at !== null && <p className="m-0 text-md leading-md text-text-secondary">Verified on {formatDay(level.at)}</p>}
        <div className="flex flex-col gap-[8px]">
          <Button
            type="button"
            hierarchy="secondary"
            size="md"
            className={cn("self-start", TAP)}
            onClick={() => {
              if (!resetKycDemo()) {
                setRefused(true);
                return;
              }
              setRefused(false);
              onSay("Verification reset. Level 1 is not submitted.");
            }}
          >
            Reset verification
          </Button>
          <p className="m-0 max-w-[62ch] text-md leading-md text-text-tertiary">
            Removes the demo verification from this browser. You can verify again at any time.
          </p>
          {refused && (
            <p role="alert" className={ERROR}>
              {SAVE_FAILED}
            </p>
          )}
        </div>
      </div>
    );
  }
  return <LevelOneForm onSay={onSay} />;
}

function LevelOneForm({ onSay }: { onSay: (s: string) => void }) {
  const [name, setName] = React.useState("");
  const [country, setCountry] = React.useState<string | null>(null);
  const [terms, setTerms] = React.useState(false);
  const [shown, setShown] = React.useState(false);
  const [refused, setRefused] = React.useState(false);
  const nameRef = React.useRef<HTMLInputElement>(null);
  const ids = { name: React.useId(), nameMsg: React.useId(), country: React.useId(), terms: React.useId() };
  const options = React.useMemo(() => countryOptions(), []);

  const problems = kycFormProblems({ name, country: country ?? "", terms });
  const show = (k: keyof typeof problems) => (shown ? problems[k] : undefined);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (problems.name || problems.country || problems.terms) {
      setShown(true);
      if (problems.name) nameRef.current?.focus();
      else if (problems.country) document.getElementById(ids.country)?.focus();
      else document.getElementById(ids.terms)?.focus();
      return;
    }
    if (!verifyKycDemo()) {
      setRefused(true);
      return;
    }
    onSay("Identity verified (demo). Level 1 is approved.");
  };

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-[20px]">
      <PanelHeading icon={UserAccountIcon} title="Identity Verification" aside={<TestnetDemoBadge />} />
      <Banner tone="attention">Demo: nothing is checked, and nothing you type here is stored or sent anywhere.</Banner>

      <div className="flex flex-col gap-[8px]">
        <label htmlFor={ids.name} className={LABEL}>
          Full Legal Name
        </label>
        <TextInput
          ref={nameRef}
          id={ids.name}
          size="xl"
          value={name}
          maxLength={KYC_NAME_MAX}
          onValueChange={setName}
          autoComplete="off"
          spellCheck={false}
          placeholder="Enter your full legal name"
          invalid={!!show("name")}
          aria-invalid={!!show("name") || undefined}
          aria-describedby={show("name") ? ids.nameMsg : undefined}
        />
        {show("name") && (
          <p id={ids.nameMsg} className={ERROR}>
            {show("name")}
          </p>
        )}
      </div>

      <SelectMenu
        id={ids.country}
        label="Country of Residence"
        placeholder="Select country"
        value={country}
        onChange={setCountry}
        options={options}
        error={show("country")}
      />

      <div className="flex flex-col gap-[6px]">
        <label className="flex cursor-pointer items-start gap-[12px] rounded-lg has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-border-focus">
          <input
            id={ids.terms}
            type="checkbox"
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
            className="sr-only"
            aria-invalid={!!show("terms") || undefined}
          />
          <Checkbox checked={terms} decorative size="lg" className="mt-[1px]" />
          <span className="text-md leading-md text-text-secondary">
            I agree to the Marketplace Seller Terms and understand that my information will be used for identity verification
            purposes
          </span>
        </label>
        {show("terms") && <p className={ERROR}>{show("terms")}</p>}
      </div>

      {refused && (
        <p role="alert" className={ERROR}>
          {SAVE_FAILED}
        </p>
      )}
      <Button type="submit" hierarchy="primary" size="lg" className={cn("self-end max-sm:w-full", TAP)}>
        Submit for Review
      </Button>
    </form>
  );
}

function HigherLevel({ level, salesUsd, ready }: { level: KycLevel; salesUsd: number; ready: boolean }) {
  const info = LEVEL[level.id];
  const reasonId = React.useId();
  const threshold = level.threshold ?? 0;
  const pct = threshold ? (salesUsd / threshold) * 100 : 0;
  const total = formatUsd(String(Math.max(0, salesUsd)));
  const limit = `$${threshold.toLocaleString("en-US")}`;
  return (
    <div className="flex flex-col gap-[20px]">
      <PanelHeading icon={info.icon} title={info.title} />
      <div className="flex flex-col gap-[8px]">
        <p className="m-0 text-lg font-semibold leading-lg text-text-primary">
          {level.needed ? `Needed now: your sales have passed ${limit}` : "Not needed yet"}
        </p>
        <p className="m-0 text-md leading-md tabular-nums text-text-secondary">
          {ready ? `Your sales so far: ${total} of ${limit}` : "Reading your sales…"}
        </p>
        {ready && <ProgressBar value={pct} label={`Your sales toward ${limit}`} />}
        <p className="m-0 text-sm leading-sm text-text-tertiary">
          Total transactions: the full price of every sale of your projects, in dollars at the demo rates.
        </p>
      </div>

      <div className="flex flex-col gap-[8px] rounded-xl bg-bg-subtle p-[16px]">
        <p className="m-0 text-md font-semibold leading-md text-text-primary">What to Expect:</p>
        <ul className="m-0 flex list-disc flex-col gap-[4px] pl-[20px] text-md leading-md text-text-secondary">
          {info.expect.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-[8px]">
        <Button type="button" hierarchy="primary" size="lg" disabled aria-describedby={reasonId} className={cn("self-start max-sm:w-full", TAP)}>
          Start KYC Verification
          <Icon icon={LinkSquare02Icon} size={18} />
        </Button>
        <p id={reasonId} className="m-0 max-w-[62ch] text-md leading-md text-text-tertiary">
          Not available yet. This level needs documents and a reviewer, which the app doesn&apos;t have, so nothing is limited in this demo.
        </p>
      </div>
    </div>
  );
}
