"use client";

// /settings (Settings v2): "Find a setting", then where you stand, as status
// cards that each lead to the page that changes them:
//   - This browser: your work lives only here; back it up or restore it.
//   - Plan and credits: your plan, what's left, Buy credits.
//   - Privacy at a glance: open or locked, who can message you, location.
//   - Get paid: only once something of yours is listed or sold (until then
//     there is nothing to stand on): what's available and the way to it.
// The Phase 1 "Most visited" tiles went (nothing counts visits, so the title
// wasn't true) and so did the two legal cards that led nowhere. On a phone
// the side-nav isn't beside the page, so the page list comes right after the
// search, before the cards.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, buttonVariants, SearchInput } from "@/components/ideeza";
import { balanceOf, formatUsd } from "@/lib/account/payout";
import { creditTotals } from "@/lib/account/summary";
import { usePayout } from "@/lib/account/use-payout";
import { runningLow } from "@/lib/create/credit-limits";
import { CREDITS_HREF } from "@/lib/create/credit-pricing";
import { useCredits } from "@/lib/create/credits";
import { useCreatePlan } from "@/lib/create/plan";
import { useLastBackup, useStorageStatus } from "@/lib/data/backup";
import { allowNewOf } from "@/lib/messages/rules";
import { useMessages } from "@/lib/messages/store";
import { ME, type AllowNew } from "@/lib/messages/types";
import { quietModeOn } from "@/lib/settings/prefs";
import { searchSettings } from "@/lib/settings/search";
import { useDates } from "@/lib/settings/use-dates";
import { useSettings } from "@/lib/settings/use-settings";
import { SettingsCard } from "./settings-card";
import { SettingsFrame } from "./settings-frame";
import { useGetPaidData } from "./get-paid/parts";
import { SettingsNav } from "./settings-nav";

const SECTION_TITLE = "m-0 text-lg font-semibold leading-lg text-text-primary";
const ACTION = (hierarchy: "secondary" | "outline-brand" | "ghost") => buttonVariants({ hierarchy, size: "md" });

export function SettingsHome() {
  return (
    <SettingsFrame page="home">
      <FindSetting />

      <section aria-labelledby="all-settings" className="flex flex-col gap-[12px] [@container(min-width:768px)]:hidden">
        <h2 id="all-settings" className={SECTION_TITLE}>
          All settings
        </h2>
        <SettingsNav current="home" />
      </section>

      <section aria-label="Where you stand" className="grid grid-cols-1 gap-[16px] [@container(min-width:900px)]:grid-cols-2">
        <ThisBrowserCard />
        <PlanCard />
        <PrivacyCard />
        <GetPaidCard />
      </section>
    </SettingsFrame>
  );
}

/** A status card's facts: a term and its value per line. */
function Facts({ items }: { items: { term: string; value: React.ReactNode }[] }) {
  return (
    <dl className="m-0 flex flex-col">
      {items.map((it) => (
        <div
          key={it.term}
          className="flex items-center justify-between gap-[16px] border-b border-solid border-border py-[10px] last:border-b-0"
        >
          <dt className="text-md leading-md text-text-secondary">{it.term}</dt>
          <dd className="m-0 text-right text-md font-medium leading-md text-text-primary">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Actions({ children }: { children: React.ReactNode }) {
  return <div className="mt-[12px] flex flex-wrap gap-[8px]">{children}</div>;
}

function ThisBrowserCard() {
  const backup = useLastBackup();
  const storage = useStorageStatus();
  const { date } = useDates();
  const kept =
    !storage.ready || !storage.supported || storage.persisted === null
      ? null
      : storage.persisted
        ? "Yes, the browser won't clear it on its own"
        : "The browser may clear it when space runs low";
  return (
    <SettingsCard
      id="this-browser"
      title="This browser"
      description="Everything you make is kept in this browser only. Clearing its data, or opening IDEEZA in another browser, starts empty unless you restore a backup."
    >
      <Facts
        items={[
          { term: "Last backup", value: backup.hydrated ? (backup.at === null ? "Never" : date(backup.at)) : "—" },
          ...(kept ? [{ term: "Kept safe", value: kept }] : []),
        ]}
      />
      <Actions>
        <Link href="/settings/data#download" className={ACTION(backup.hydrated && backup.at === null ? "outline-brand" : "secondary")}>
          Download a backup
        </Link>
        <Link href="/settings/data#restore" className={ACTION("ghost")}>
          Restore
        </Link>
      </Actions>
    </SettingsCard>
  );
}

function PlanCard() {
  const { hydrated: planReady, plan, sub } = useCreatePlan();
  const { hydrated: creditsReady, ledger } = useCredits();
  const { lowAt } = useSettings().credits;
  const { date } = useDates();
  const remaining = creditTotals(ledger).remaining;
  const low = creditsReady && runningLow(remaining, lowAt);
  const renews = sub.renewsAt === null ? "No renewal on Free" : `${sub.autoRenew ? "Renews" : "Ends"} ${date(sub.renewsAt)}`;
  return (
    <SettingsCard id="plan-credits" title="Plan and credits">
      <Facts
        items={[
          { term: "Plan", value: planReady ? plan.name : "—" },
          { term: "Renewal", value: planReady ? renews : "—" },
          {
            term: "Credits left",
            value: creditsReady ? (
              <span className="inline-flex items-center gap-[8px]">
                {low && <Badge tone="warning">Running low</Badge>}
                <span className="tabular-nums">{remaining}</span>
              </span>
            ) : (
              "—"
            ),
          },
        ]}
      />
      <Actions>
        <Link href={CREDITS_HREF} className={ACTION(low ? "outline-brand" : "secondary")}>
          Buy credits
        </Link>
        <Link href="/settings/plan" className={ACTION("ghost")}>
          Plan and billing
        </Link>
      </Actions>
    </SettingsCard>
  );
}

const MESSAGE_REACH: Record<AllowNew, string> = {
  everyone: "Anyone",
  known: "People you work with",
  nobody: "No one new",
};

function PrivacyCard() {
  const settings = useSettings();
  const a = settings.audience;
  const messages = useMessages();
  const { dateTime } = useDates();
  // Read once per visit; a break ends on its own and the next visit shows it.
  const [now] = React.useState(() => Date.now());
  const breakUntil = quietModeOn(settings, now) ? a.quietUntil : null;
  return (
    <SettingsCard id="privacy-glance" title="Privacy at a glance">
      <Facts
        items={[
          { term: "Your profile", value: a.locked ? "Locked" : "Open to everyone" },
          { term: "Who can message you", value: messages.hydrated ? MESSAGE_REACH[allowNewOf(messages.data, ME)] : "—" },
          { term: "Location and local time", value: a.showLocalTime ? "Shown" : "Hidden" },
          ...(breakUntil !== null ? [{ term: "Taking a break", value: `Until ${dateTime(breakUntil)}` }] : []),
        ]}
      />
      <Actions>
        <Link href="/settings/privacy" className={ACTION("secondary")}>
          Privacy and safety
        </Link>
        <Link href="/creators/me?view=public" className={ACTION("ghost")}>
          View as public
        </Link>
      </Actions>
    </SettingsCard>
  );
}

/** "Find a setting": the matching rows as links, Enter opens the first. */
function FindSetting() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const hits = React.useMemo(() => searchSettings(query), [query]);
  const resultsId = React.useId();
  const trimmed = query.trim();
  return (
    <section aria-label="Find a setting" className="flex flex-col gap-[8px]">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (hits[0]) router.push(hits[0].href);
        }}
      >
        <SearchInput
          value={query}
          onValueChange={setQuery}
          onClear={() => setQuery("")}
          placeholder="Find a setting"
          aria-label="Find a setting"
          aria-controls={resultsId}
          containerClassName="w-full max-w-[var(--layout-content-narrow)]"
        />
      </form>
      <div id={resultsId} aria-live="polite" className="max-w-[var(--layout-content-narrow)]">
        {trimmed &&
          (hits.length ? (
            <ul role="list" className="flex flex-col rounded-xl border border-solid border-border">
              {hits.map((h) => (
                <li key={h.href} className="border-b border-solid border-border last:border-b-0">
                  <Link
                    href={h.href}
                    className="flex flex-col gap-[2px] px-[16px] py-[10px] outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus"
                  >
                    <span className="text-md font-medium leading-md text-text-primary">{h.label}</span>
                    <span className="text-sm leading-sm text-text-tertiary">
                      {h.rowId ? h.pageLabel : "Page"}
                      {h.help ? ` · ${h.help}` : ""}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 text-md leading-md text-text-secondary">
              No setting matches “{trimmed}”. Try one word, like “theme”, “messages” or “backup”.
            </p>
          ))}
      </div>
    </section>
  );
}

/** Shown once something of yours is listed or sold; before that Get paid only says what will happen. */
function GetPaidCard() {
  const store = usePayout();
  const data = useGetPaidData();
  if (!store || !data.ready || data.stageOf(store) === "setup") return null;
  const balance = balanceOf(data.earnings, store.withdrawals);
  return (
    <SettingsCard id="get-paid-glance" title="Get paid">
      <Facts
        items={[
          { term: "Available to withdraw", value: <span className="tabular-nums">{formatUsd(balance.available)}</span> },
          { term: "Withdrawn so far", value: <span className="tabular-nums">{formatUsd(balance.withdrawn)}</span> },
          { term: "Withdrawal methods", value: store.methods.length ? String(store.methods.length) : "None yet, asked at your first withdrawal" },
        ]}
      />
      <p className="m-0 mt-[8px] text-sm leading-sm text-text-tertiary">In dollars at demo rates.</p>
      <Actions>
        <Link href="/settings/get-paid#withdraw" className={ACTION("secondary")}>
          Withdraw
        </Link>
        <Link href="/settings/get-paid" className={ACTION("ghost")}>
          Get paid
        </Link>
      </Actions>
    </SettingsCard>
  );
}
