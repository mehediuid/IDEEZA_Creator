"use client";

// /settings (Settings v2, laid out again 2026-11-24, owner: "best UX, make it
// look good"). The home answers, in order:
//   1. Whose settings are these? — the account band: photo, name, the email
//      you're signed in with, your handle and plan, Edit profile. "Find a
//      setting" sits in the same band, so the top of the page is one unit.
//   2. Where is the thing I want? — on a phone the page list comes next (the
//      side-nav isn't beside the page there); on a wider screen it's the side-nav.
//   3. Where do I stand? — status cards, money first, then safety:
//      - Plan and credits: your plan, renewal, what's left; Buy credits.
//      - Get paid: only once something of yours is listed or sold (until then
//        there is nothing to stand on): what's available; Withdraw.
//      - This browser: your work lives only here; back it up or restore it.
//        Never backed up = the one primary button on the page.
//      - Privacy at a glance: open or locked, who can message you, location;
//        View as public.
// Every card is drawn the same way: its page's icon and title with an arrow
// to that page, the facts as rows, and its own action at the foot (the foot
// lines up across a row). The Phase 1 "Most visited" tiles went (nothing
// counts visits, so the title wasn't true) and so did the two legal cards
// that led nowhere.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert02Icon, ArrowRight01Icon, Download04Icon, PencilEdit02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Avatar, Badge, buttonVariants, SearchInput, Skeleton } from "@/components/ideeza";
import { useAuth } from "@/lib/account/auth";
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
import { cleanHandle } from "@/lib/people/handle";
import { displayNameOf, handleProblem, initialsOf, ownHandleOf } from "@/lib/people/ids";
import { useMyPhoto } from "@/lib/people/photo-store";
import { useMyProfile } from "@/lib/people/profile-store";
import { quietModeOn } from "@/lib/settings/prefs";
import { settingsPage, type SettingsPageId } from "@/lib/settings/registry";
import { searchSettings } from "@/lib/settings/search";
import { useDates } from "@/lib/settings/use-dates";
import { useSettings } from "@/lib/settings/use-settings";
import { cn } from "@/lib/utils";
import { useGetPaidData } from "./get-paid/parts";
import { PAGE_ICON } from "./nav-icons";
import { SettingsFrame } from "./settings-frame";
import { SettingsNav } from "./settings-nav";

/** Phones get 44 px targets. */
const TAP = "[@media(pointer:coarse)]:min-h-[var(--touch-min)] max-md:min-h-[var(--touch-min)]";
const SECTION_TITLE = "m-0 text-lg font-semibold leading-lg text-text-primary";
const ACTION = (hierarchy: "primary" | "tonal" | "ghost") => buttonVariants({ hierarchy, size: "md", className: TAP });

export function SettingsHome() {
  return (
    <SettingsFrame page="home">
      <AccountBand />

      <section aria-labelledby="all-settings" className="flex flex-col gap-[12px] [@container(min-width:768px)]:hidden">
        <h2 id="all-settings" className={SECTION_TITLE}>
          All settings
        </h2>
        <SettingsNav current="home" />
      </section>

      <section aria-label="Where you stand" className="grid grid-cols-1 gap-[16px] [@container(min-width:900px)]:grid-cols-2">
        <PlanCard />
        <GetPaidCard />
        <ThisBrowserCard />
        <PrivacyCard />
      </section>
    </SettingsFrame>
  );
}

// ─────────────────────────── the account band ───────────────────────────

/** Whose settings these are, and "Find a setting", as one unit at the top. */
function AccountBand() {
  const { hydrated: authReady, account } = useAuth();
  const { hydrated: profileReady, fields } = useMyProfile();
  const photo = useMyPhoto();
  const { hydrated: planReady, plan } = useCreatePlan();
  const ready = authReady && profileReady && photo.hydrated;
  const name = displayNameOf(fields.name);
  const profileHref = `/creators/${ownHandleOf(fields.handle)}`;
  const handle = fields.handle && handleProblem(fields.handle) === null ? `@${cleanHandle(fields.handle)}` : null;
  const meta = [account?.email, handle].filter(Boolean).join(" · ");
  return (
    <section
      aria-label="Your account"
      className="flex flex-col gap-[20px] rounded-2xl border border-solid border-border bg-[radial-gradient(80%_140%_at_100%_0%,var(--color-bg-brand-subtle)_0%,transparent_65%)] p-[20px] max-md:p-[16px]"
    >
      <div className="flex flex-wrap items-center gap-x-[16px] gap-y-[12px]">
        {ready ? (
          <Avatar size="lg" initials={initialsOf(name, fields.latinName || null)} src={photo.url ?? undefined} className="shrink-0" />
        ) : (
          <Skeleton shape="circle" size="lg" className="shrink-0" />
        )}
        {/* Its 220 px basis makes Edit profile wrap to its own line when the band is narrow. */}
        <div className="flex min-w-0 flex-1 basis-[220px] flex-col gap-[2px]">
          {ready ? (
            <>
              <div className="flex flex-wrap items-center gap-x-[8px] gap-y-[4px]">
                <Link
                  href={profileHref}
                  className="rounded-sm text-2xl font-semibold leading-2xl text-text-primary outline-none [overflow-wrap:anywhere] hover:text-text-brand focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  {name}
                </Link>
                {planReady && <Badge tone="brand">{plan.name} plan</Badge>}
              </div>
              {meta && <p className="m-0 text-md leading-md text-text-secondary [overflow-wrap:anywhere]">{meta}</p>}
            </>
          ) : (
            <>
              <Skeleton shape="text" size="lg" className="my-[4px] w-[200px] max-w-full" />
              <Skeleton shape="text" size="md" className="w-[260px] max-w-full" />
            </>
          )}
        </div>
        {/* On a phone it wraps under the name, lined up with it. */}
        <Link href={`${profileHref}?edit=1`} className={cn(ACTION("tonal"), "max-md:ml-[64px]")}>
          <Icon icon={PencilEdit02Icon} size={16} />
          Edit profile
        </Link>
      </div>
      <FindSetting />
    </section>
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
    <div className="flex flex-col gap-[8px]">
      <form
        role="search"
        aria-label="Find a setting"
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
          containerClassName="w-full"
        />
      </form>
      <div id={resultsId} aria-live="polite">
        {trimmed &&
          (hits.length ? (
            <ul role="list" className="flex flex-col overflow-hidden rounded-xl border border-solid border-border bg-bg-surface">
              {hits.map((h) => (
                <li key={h.href} className="border-b border-solid border-border last:border-b-0">
                  <Link
                    href={h.href}
                    className="flex items-center gap-[12px] px-[16px] py-[10px] outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus"
                  >
                    <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
                      <span className="text-md font-medium leading-md text-text-primary">{h.label}</span>
                      <span className="text-sm leading-sm text-text-tertiary">
                        {h.rowId ? h.pageLabel : "Page"}
                        {h.help ? ` · ${h.help}` : ""}
                      </span>
                    </span>
                    <span aria-hidden className="shrink-0 text-text-tertiary">
                      <Icon icon={ArrowRight01Icon} size={16} />
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
    </div>
  );
}

// ─────────────────────────── the status cards ───────────────────────────

/** One status card: its page's icon and title with an arrow to that page, facts, then its action. */
function StatusCard({
  id,
  page,
  title,
  description,
  children,
  actions,
}: {
  id: string;
  page: SettingsPageId;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  actions: React.ReactNode;
}) {
  const titleId = React.useId();
  const to = settingsPage(page);
  return (
    <section
      id={id}
      aria-labelledby={titleId}
      className="flex min-w-0 flex-col rounded-2xl border border-solid border-border bg-bg-surface p-[20px] max-md:p-[16px]"
    >
      <div className="flex items-center gap-[12px]">
        <span aria-hidden className="flex shrink-0 text-text-secondary">
          <Icon icon={PAGE_ICON[page]} size={20} />
        </span>
        <h2 id={titleId} className="m-0 min-w-0 flex-1 text-lg font-semibold leading-lg text-text-primary">
          {title}
        </h2>
        <Link
          href={to.href}
          aria-label={`Open ${to.label}`}
          title={to.label}
          className={cn(buttonVariants({ hierarchy: "ghost", size: "sm", iconOnly: true }), "group -my-[4px] -mr-[6px] text-text-tertiary", TAP)}
        >
          <span className="inline-flex transition-transform duration-fast group-hover:translate-x-[2px] motion-reduce:transition-none motion-reduce:group-hover:translate-x-0">
            <Icon icon={ArrowRight01Icon} size={16} />
          </span>
        </Link>
      </div>
      {description != null && <p className="m-0 mt-[8px] max-w-[62ch] text-md leading-md text-text-secondary">{description}</p>}
      <div className="mt-[12px] flex flex-col">{children}</div>
      <div className="mt-auto flex flex-wrap items-center gap-[8px] pt-[16px]">{actions}</div>
    </section>
  );
}

type Fact = { term: string; hint?: string; value: React.ReactNode };

/** A status card's facts: a term (and its hint) and its value per line. */
function Facts({ items }: { items: Fact[] }) {
  return (
    <dl className="m-0 flex flex-col">
      {items.map((it) => (
        <div
          key={it.term}
          className="flex items-center justify-between gap-[16px] border-b border-solid border-border py-[10px] last:border-b-0"
        >
          <dt className="flex min-w-0 flex-col gap-[2px]">
            <span className="text-md leading-md text-text-secondary">{it.term}</span>
            {it.hint && <span className="text-sm leading-sm text-text-tertiary">{it.hint}</span>}
          </dt>
          <dd className="m-0 shrink-0 text-right text-md font-medium leading-md text-text-primary">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** A value still loading. */
const LOADING = <Skeleton shape="text" size="sm" className="ml-auto w-[64px]" />;

function PlanCard() {
  const { hydrated: planReady, plan, sub } = useCreatePlan();
  const { hydrated: creditsReady, ledger } = useCredits();
  const { lowAt } = useSettings().credits;
  const { date } = useDates();
  const remaining = creditTotals(ledger).remaining;
  const low = creditsReady && runningLow(remaining, lowAt);
  const renews = sub.renewsAt === null ? "No renewal on Free" : `${sub.autoRenew ? "Renews" : "Ends"} ${date(sub.renewsAt)}`;
  return (
    <StatusCard
      id="plan-credits"
      page="plan"
      title="Plan and credits"
      actions={
        <Link href={CREDITS_HREF} className={ACTION("tonal")}>
          Buy credits
        </Link>
      }
    >
      <Facts
        items={[
          { term: "Plan", value: planReady ? plan.name : LOADING },
          { term: "Renewal", value: planReady ? renews : LOADING },
          {
            term: "Credits left",
            value: creditsReady ? (
              <span className="inline-flex items-center gap-[8px]">
                {low && <Badge tone="warning">Running low</Badge>}
                <span className="tabular-nums">{remaining}</span>
              </span>
            ) : (
              LOADING
            ),
          },
        ]}
      />
    </StatusCard>
  );
}

/** Shown once something of yours is listed or sold; before that Get paid only says what will happen. */
function GetPaidCard() {
  const store = usePayout();
  const data = useGetPaidData();
  if (!store || !data.ready || data.stageOf(store) === "setup") return null;
  const balance = balanceOf(data.earnings, store.withdrawals);
  const methods = store.methods.length;
  return (
    <StatusCard
      id="get-paid-glance"
      page="get-paid"
      title="Get paid"
      actions={
        <>
          <Link href="/settings/get-paid#withdraw" className={ACTION("tonal")}>
            Withdraw
          </Link>
          <span className="ml-auto text-sm leading-sm text-text-tertiary">In dollars at demo rates.</span>
        </>
      }
    >
      <Facts
        items={[
          { term: "Available to withdraw", value: <span className="tabular-nums">{formatUsd(balance.available)}</span> },
          { term: "Withdrawn so far", value: <span className="tabular-nums">{formatUsd(balance.withdrawn)}</span> },
          methods
            ? { term: "Withdrawal methods", value: String(methods) }
            : { term: "Withdrawal methods", hint: "Asked at your first withdrawal", value: "None yet" },
        ]}
      />
    </StatusCard>
  );
}

function ThisBrowserCard() {
  const backup = useLastBackup();
  const storage = useStorageStatus();
  const { date } = useDates();
  const never = backup.hydrated && backup.at === null;
  const kept =
    !storage.ready || !storage.supported || storage.persisted === null
      ? null
      : storage.persisted
        ? "Until you clear it"
        : "Until space runs low";
  return (
    <StatusCard
      id="this-browser"
      page="data"
      title="This browser"
      description="Everything you make is kept in this browser only. Clearing its data, or opening IDEEZA in another browser, starts empty unless you restore a backup."
      actions={
        <>
          <Link href="/settings/data#download" className={ACTION(never ? "primary" : "tonal")}>
            <Icon icon={Download04Icon} size={16} />
            Download a backup
          </Link>
          <Link href="/settings/data#restore" className={ACTION("ghost")}>
            Restore
          </Link>
        </>
      }
    >
      <Facts
        items={[
          {
            term: "Last backup",
            value:
              !backup.hydrated ? (
                LOADING
              ) : backup.at === null ? (
                <span className="inline-flex items-center gap-[6px] text-text-warning">
                  <Icon icon={Alert02Icon} size={16} />
                  Never
                </span>
              ) : (
                date(backup.at)
              ),
          },
          ...(kept ? [{ term: "The browser keeps it", value: kept }] : []),
        ]}
      />
    </StatusCard>
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
    <StatusCard
      id="privacy-glance"
      page="privacy"
      title="Privacy at a glance"
      actions={
        <Link href="/creators/me?view=public" className={ACTION("tonal")}>
          View as public
        </Link>
      }
    >
      <Facts
        items={[
          { term: "Your profile", value: a.locked ? "Locked" : "Open to everyone" },
          { term: "Who can message you", value: messages.hydrated ? MESSAGE_REACH[allowNewOf(messages.data, ME)] : LOADING },
          { term: "Location and local time", value: a.showLocalTime ? "Shown" : "Hidden" },
          ...(breakUntil !== null ? [{ term: "Taking a break", value: `Until ${dateTime(breakUntil)}` }] : []),
        ]}
      />
    </StatusCard>
  );
}
