"use client";

// Profile tab root (master page "Ideeza-Main Profile" 10702:230343 and its
// open-Settings state 10702:230445), with the facts of PR-01 "You hub"
// (10674:659) folded in, laid out as grouped inset lists (the iOS Settings
// pattern, mobile UX pass 2026-11-15): the top bar with settings and search
// (a tab root, so no Back), your card (photo, name, headline, "@handle · View
// profile", your level and its XP against the next level) that opens your
// profile, then Wallet with your IDZ, Refer and Earn and Plan & pricing with
// your credits (on a paid plan the day they refill, the web sidebar's card) and the web account
// menu's plan line ("Free plan · Upgrade to Builder", CL-032), which opens
// Plans on that plan (MON-4); while the welcome offer runs and its sheet is
// closed, the row is the offer instead, as the web sidebar's Upgrade card
// becomes it (CL-004, AUTH-3); Projects with how many you have and Saved
// Items; Settings, which opens in place on General · Payment method · Get paid
// · Sign-in & security · Help · Others — each row named as the screen it
// opens (SET-4); and Sign out as a row. Every row that opens something
// carries the chevron. No Friends (D-1).

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AllBookmarkIcon,
  ArrowDown01Icon,
  CreditCardPosIcon,
  Globe02Icon,
  HelpCircleIcon,
  Logout01Icon,
  MenuSquareIcon,
  Note03Icon,
  Search01Icon,
  SecurityPasswordIcon,
  Settings01Icon,
  Share01Icon,
  Tag01Icon,
  Wallet01Icon,
  Wallet03Icon,
} from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { useMakerIdz } from "@/components/balance/use-maker-idz";
import { Avatar } from "@/components/ideeza/avatar";
import { Badge } from "@/components/ideeza/badge";
import { Skeleton } from "@/components/ideeza/skeleton";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { OfferSticker, useWelcomeOffer } from "@/components/credits/welcome-offer";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/account/auth";
import { OFFER_OFF, countdown } from "@/lib/account/welcome-offer";
import { creditTotals, levelOf, xpOf } from "@/lib/account/summary";
import { runningLow } from "@/lib/create/credit-limits";
import { useCredits } from "@/lib/create/credits";
import { useCreatePlan } from "@/lib/create/plan";
import { displayNameOf, initialsOf, ownHandleOf, ME } from "@/lib/people/ids";
import { PHONE_SETTINGS_GENERAL_HREF, PHONE_SETTINGS_OTHERS_HREF, compactCount, phoneProfileHref } from "@/lib/people/phone-profile";
import { useMyPhoto } from "@/lib/people/photo-store";
import { useMyProfile } from "@/lib/people/profile-store";
import { useSettings } from "@/lib/settings/use-settings";
import { Chevron, LIST_CARD, LIST_DIVIDERS, LIST_ROW, ListCard, ListRow } from "../kit/list";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { T } from "../type";
import { SignOutSheet } from "../settings/sign-out";
import { usePhonePitch, usePlanLine, useRefillDay } from "../plans/upsell";
import { useMyProjectsCount } from "./use-profile";

/** A row's value at its end ("Free · 28 credits", "5"); the warning ink once credits run low. */
export function HubValue({ children, warning }: { children: React.ReactNode; warning?: boolean }) {
  return <span className={cn("tabular-nums", warning && "text-text-warning")}>{children}</span>;
}

// The Figma's in-place list, each row named (and drawn) as the screen it opens and as Settings
// itself names it — "Get paid", not "$IDZ Pay" (SET-4; lib/settings/registry.ts, settings/root.tsx).
const SETTINGS: readonly { href: string; icon: IconValue; label: string }[] = [
  { href: PHONE_SETTINGS_GENERAL_HREF, icon: Globe02Icon, label: "General" },
  { href: "/m/settings/payments", icon: CreditCardPosIcon, label: "Payment method" },
  { href: "/m/settings/idz-pay", icon: Wallet01Icon, label: "Get paid" },
  { href: "/m/settings/security", icon: SecurityPasswordIcon, label: "Sign-in & security" },
  { href: "/m/help", icon: HelpCircleIcon, label: "Help" },
  { href: PHONE_SETTINGS_OTHERS_HREF, icon: MenuSquareIcon, label: "Others" },
];

/** Whether the in-place Settings list is open, kept for this tab so Back from General lands on it open. */
const SETTINGS_OPEN_KEY = "ideeza:m:profile:settings-open";

let settingsOpenNow: boolean | null = null;
const settingsOpenListeners = new Set<() => void>();

function readSettingsOpen(): boolean {
  if (settingsOpenNow === null) {
    try {
      settingsOpenNow = sessionStorage.getItem(SETTINGS_OPEN_KEY) === "1";
    } catch {
      // Storage refused: the list starts closed.
      settingsOpenNow = false;
    }
  }
  return settingsOpenNow;
}

function subscribeSettingsOpen(onChange: () => void) {
  settingsOpenListeners.add(onChange);
  return () => {
    settingsOpenListeners.delete(onChange);
  };
}

function toggleSettingsOpen() {
  settingsOpenNow = !readSettingsOpen();
  try {
    sessionStorage.setItem(SETTINGS_OPEN_KEY, settingsOpenNow ? "1" : "0");
  } catch {
    // Storage refused: the list still opens and closes for this visit.
  }
  settingsOpenListeners.forEach((fn) => fn());
}

function useSettingsOpen(): [boolean, () => void] {
  const open = React.useSyncExternalStore(subscribeSettingsOpen, readSettingsOpen, () => false);
  return [open, toggleSettingsOpen];
}

/** The Wallet row's figure: your IDZ while the demo wallet is connected. */
function WalletValue() {
  const idz = useMakerIdz();
  if (!idz.read) return <Skeleton shape="text" size="md" className="inline-block w-[64px]" />;
  if (!idz.connected || idz.idz === null) return <HubValue>Not connected</HubValue>;
  return (
    <span className="inline-flex items-center gap-4">
      <TestnetDemoBadge />
      <span className={cn(T.rowTitle, "tabular-nums text-text-brand")}>{compactCount(Number(idz.idz))} IDZ</span>
    </span>
  );
}

/** PR-01 "Plan & pricing · 28 credits", in the warning ink once credits run low (the web's rule), and
 *  on a paid plan under it the day its monthly credits come back, as the web sidebar's card says it
 *  ("· refills 8 Dec", CL-032, MON-16). Free has no such line: its credits come once (owner
 *  2026-11-24). The plan itself is the row's meta line (usePlanLine). */
function PlanValue() {
  const { hydrated: planRead } = useCreatePlan();
  const { hydrated: creditsRead, ledger } = useCredits();
  const { lowAt } = useSettings().credits;
  const refill = useRefillDay();
  if (!planRead || !creditsRead) return <Skeleton shape="text" size="md" className="inline-block w-[72px]" />;
  const credits = creditTotals(ledger).remaining;
  return (
    <span className="inline-flex flex-col items-end">
      <HubValue warning={runningLow(credits, lowAt)}>
        {credits.toLocaleString("en-US")} {credits === 1 ? "credit" : "credits"}
      </HubValue>
      {refill && <span className={cn(T.micro, "tabular-nums")}>refills {refill}</span>}
    </span>
  );
}

const OFF = `${Math.round(OFFER_OFF * 100)}%`;

/** The Plan & pricing row: the web account menu's plan line as its meta ("Builder plan · Upgrade to
 *  Disruptor", CL-032). It opens Plans on the plan that line names, so its bar reads "Upgrade to
 *  Disruptor" — the web's link opens that plan's checkout (MON-4); on Disruptor, Plans as it is.
 *  While the welcome offer runs and its sheet has been closed, the row is the offer, as the web
 *  sidebar's Upgrade card becomes it (CL-004, AUTH-3): the gift and its clock as the meta, the OFF
 *  sticker at the end, opening Plans, where every plan shows its offer price. */
function PlanRow() {
  const line = usePlanLine();
  const pitch = usePhonePitch();
  const offer = useWelcomeOffer();
  if (offer.ready && offer.live && offer.entry?.closedAt != null)
    return (
      <ListRow
        href="/m/plans"
        icon={Tag01Icon}
        title="Plan & pricing"
        meta={
          <>
            Welcome gift: {OFF} off · ends in <span className="tabular-nums">{countdown(offer.left)}</span>
          </>
        }
        trailing={<OfferSticker size="sm" />}
      />
    );
  return (
    <ListRow
      href={pitch ? `/m/plans?pick=${pitch.plan.tier}` : "/m/plans"}
      icon={Tag01Icon}
      title="Plan & pricing"
      meta={line ?? undefined}
      value={<PlanValue />}
    />
  );
}

/** The Projects row's number is My projects' All, the page it opens: your projects and the projects
 *  you bought from (a whole project bought counts once, as yours) — owner 2026-11-24, one number. */
function ProjectsValue() {
  const count = useMyProjectsCount();
  if (count === null) return <Skeleton shape="text" size="md" className="inline-block w-[24px]" />;
  return <HubValue>{count}</HubValue>;
}

/** Your level, as the web's account menu shows it ("Maker", "620 / 1,000 XP" — how far to the next
 *  level, SET-19; just the XP at the top level); only you see it. */
function LevelBadge() {
  const { hydrated, ledger } = useCredits();
  if (!hydrated) return null;
  const level = levelOf(xpOf(ledger));
  const xp = level.cap === null ? `${level.xp.toLocaleString("en-US")} XP` : `${level.xp.toLocaleString("en-US")} / ${level.cap.toLocaleString("en-US")} XP`;
  return (
    <span className="flex shrink-0 flex-col items-end gap-1">
      <Badge tone="brand">{level.name}</Badge>
      <span className={cn(T.micro, "tabular-nums")}>{xp}</span>
    </span>
  );
}

export function ProfileHub() {
  const router = useRouter();
  const { account } = useAuth();
  const { hydrated, fields } = useMyProfile();
  const photo = useMyPhoto();
  const [settingsOpen, toggleSettings] = useSettingsOpen();
  const [signOut, setSignOut] = React.useState(false);
  const settingsId = React.useId();

  // The same rule as Settings › Account: your profile name, else the name on your account.
  const name = displayNameOf(fields.name || `${account?.firstName ?? ""} ${account?.lastName ?? ""}`.trim());
  const handle = ownHandleOf(fields.handle);
  const me = phoneProfileHref(handle);

  return (
    <Screen
      top={
        <TopBar
          title="Profile"
          actions={[
            { icon: Settings01Icon, label: "Settings", onClick: () => router.push("/m/settings") },
            { icon: Search01Icon, label: "Search", onClick: () => router.push("/m/profile/search") },
          ]}
        />
      }
    >
      <div className="flex flex-col gap-8 px-8 pb-12 pt-2">
        {hydrated && photo.hydrated ? (
          <div className={LIST_CARD}>
            <Link href={me} aria-label={`${name}, view your profile`} className={cn(LIST_ROW, "py-8")}>
              <Avatar size="lg" phone initials={initialsOf(name, fields.latinName || null)} src={photo.url ?? undefined} />
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className={cn(T.section, "truncate")}>{name}</span>
                {fields.headline && <span className={cn(T.body, "truncate")}>{fields.headline}</span>}
                <span className={cn(T.meta, "truncate")}>{handle === ME ? "View profile" : `@${handle} · View profile`}</span>
              </span>
              <LevelBadge />
              <Chevron />
            </Link>
          </div>
        ) : (
          <div aria-hidden className={cn(LIST_CARD, "flex-row items-center gap-6 px-8 py-8")}>
            <Skeleton shape="circle" className="size-[48px]" />
            <div className="flex flex-col gap-4">
              <Skeleton shape="text" size="md" className="w-[120px]" />
              <Skeleton shape="text" size="sm" className="w-[160px]" />
            </div>
          </div>
        )}

        <nav aria-label="Your account" className="flex flex-col gap-8">
          <ListCard label="Money">
            <ListRow href="/m/earn/wallet" icon={Wallet03Icon} title="Wallet" value={<WalletValue />} />
            <ListRow href="/m/earn/refer" icon={Share01Icon} title="Refer and Earn" />
            <PlanRow />
          </ListCard>
          <ListCard label="Your work">
            <ListRow href="/m/projects" icon={Note03Icon} title="Projects" value={<ProjectsValue />} />
            <ListRow href="/m/saved" icon={AllBookmarkIcon} title="Saved Items" />
          </ListCard>
        </nav>

        <ListCard>
          <li>
            <button type="button" aria-expanded={settingsOpen} aria-controls={settingsId} onClick={toggleSettings} className={LIST_ROW}>
              <span className="shrink-0 text-[color:var(--color-icon-default)]">
                <Icon icon={Settings01Icon} size={24} />
              </span>
              <span className={cn(T.body, "min-w-0 flex-1 truncate text-text-primary")}>Settings</span>
              <span
                aria-hidden
                className={cn(
                  "shrink-0 text-[color:var(--color-icon-default)] transition-transform duration-normal ease-decelerate motion-reduce:transition-none",
                  settingsOpen && "rotate-180",
                )}
              >
                <Icon icon={ArrowDown01Icon} size={24} />
              </span>
            </button>
          </li>
          {settingsOpen && (
            <li>
              <ul id={settingsId} aria-label="Settings" className={cn("m-0 flex list-none flex-col p-0", LIST_DIVIDERS)}>
                {SETTINGS.map((s) => (
                  <ListRow key={s.href} href={s.href} icon={s.icon} title={s.label} />
                ))}
              </ul>
            </li>
          )}
        </ListCard>

        <ListCard>
          <li>
            <button type="button" onClick={() => setSignOut(true)} className={LIST_ROW}>
              <span className="shrink-0 text-[color:var(--color-icon-default)]">
                <Icon icon={Logout01Icon} size={24} />
              </span>
              <span className={cn(T.body, "min-w-0 flex-1 truncate text-text-primary")}>Sign out</span>
            </button>
          </li>
        </ListCard>
      </div>
      <SignOutSheet open={signOut} onClose={() => setSignOut(false)} />
    </Screen>
  );
}
