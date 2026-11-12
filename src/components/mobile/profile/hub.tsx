"use client";

// Profile tab root (master page "Ideeza-Main Profile" 10702:230343 and its
// open-Settings state 10702:230445), with the facts of PR-01 "You hub"
// (10674:659) folded in: the top bar with settings and search, your card
// (photo, name, headline, "@handle · View profile", your level) that opens
// your profile, then Wallet with your IDZ, Refer and Earn, Plan & pricing with
// your plan and credits, Projects with how many you have, Saved Items,
// Settings (opens in place on General · Payments · $IDZ Pay · Security · Help
// and Support · Others) and Sign out. No Friends row (D-1).

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AllBookmarkIcon,
  ArrowDown01Icon,
  CreditCardIcon,
  Globe02Icon,
  HelpCircleIcon,
  MenuSquareIcon,
  Note03Icon,
  Search01Icon,
  SecurityPasswordIcon,
  Settings01Icon,
  Share01Icon,
  Tag01Icon,
  Wallet03Icon,
} from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { useMakerIdz } from "@/components/balance/use-maker-idz";
import { Avatar } from "@/components/ideeza/avatar";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { Skeleton } from "@/components/ideeza/skeleton";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/account/auth";
import { creditTotals, levelOf, xpOf } from "@/lib/account/summary";
import { runningLow } from "@/lib/create/credit-limits";
import { useCredits } from "@/lib/create/credits";
import { useCreatePlan } from "@/lib/create/plan";
import { useManualProjects } from "@/lib/manual/projects";
import { displayNameOf, initialsOf, ownHandleOf, ME } from "@/lib/people/ids";
import { PHONE_SETTINGS_GENERAL_HREF, PHONE_SETTINGS_OTHERS_HREF, compactCount, phoneProfileHref } from "@/lib/people/phone-profile";
import { useMyPhoto } from "@/lib/people/photo-store";
import { useMyProfile } from "@/lib/people/profile-store";
import { useSettings } from "@/lib/settings/use-settings";
import { LIST_CARD } from "../kit/list";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { T } from "../type";
import { SignOutSheet } from "../settings/sign-out";

/** A hub tile (master M26 List Item 10702:230373): 44 tall, a 24 px icon, the name in Body/MD Medium. */
export const HUB_ROW =
  "flex min-h-[44px] w-full items-center gap-8 rounded-md bg-bg-surface px-6 py-4 text-left outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus";

type HubRowProps = {
  icon: IconValue;
  label: string;
  value?: React.ReactNode;
  danger?: boolean;
} & ({ href: string; onClick?: never } | { onClick: () => void; href?: never } | { href?: never; onClick?: never });

/** One tile of the hub and of its Settings lists: a link, a button, or (with neither) a fact. */
export function HubRow(props: HubRowProps) {
  const { icon, label, value, danger } = props;
  const body = (
    <>
      <span className={cn("shrink-0", danger ? "text-[color:var(--color-icon-error)]" : "text-[color:var(--color-icon-default)]")}>
        <Icon icon={icon} size={24} />
      </span>
      <span className={cn(T.bodyStrong, "min-w-0 flex-1 truncate", danger && "text-text-error")}>{label}</span>
      {value}
    </>
  );
  if (props.href)
    return (
      <Link href={props.href} className={HUB_ROW}>
        {body}
      </Link>
    );
  if (props.onClick)
    return (
      <button type="button" onClick={props.onClick} className={HUB_ROW}>
        {body}
      </button>
    );
  return <div className={cn(HUB_ROW, "hover:bg-bg-surface")}>{body}</div>;
}

/** A tile's value at its end ("Free · 28 credits", "5"). */
export function HubValue({ children, warning }: { children: React.ReactNode; warning?: boolean }) {
  return <span className={cn(T.body, "max-w-[55%] shrink-0 truncate text-right tabular-nums", warning && "text-text-warning")}>{children}</span>;
}

const SETTINGS: readonly { href: string; icon: IconValue; label: string }[] = [
  { href: PHONE_SETTINGS_GENERAL_HREF, icon: Globe02Icon, label: "General" },
  { href: "/m/settings/payments", icon: CreditCardIcon, label: "Payments" },
  { href: "/m/settings/idz-pay", icon: CreditCardIcon, label: "$IDZ Pay" },
  { href: "/m/settings/security", icon: SecurityPasswordIcon, label: "Security" },
  { href: "/m/help", icon: HelpCircleIcon, label: "Help and Support" },
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
  if (!idz.read) return <Skeleton shape="text" size="md" className="w-[64px]" />;
  if (!idz.connected || idz.idz === null) return <HubValue>Not connected</HubValue>;
  return (
    <span className="flex shrink-0 items-center gap-4">
      <TestnetDemoBadge />
      <span className={cn(T.rowTitle, "tabular-nums text-text-brand")}>{compactCount(Number(idz.idz))} IDZ</span>
    </span>
  );
}

/** PR-01 "Plan & pricing · Free · 28 credits", in the warning ink once credits run low (the web's rule). */
function PlanValue() {
  const { hydrated: planRead, plan } = useCreatePlan();
  const { hydrated: creditsRead, ledger } = useCredits();
  const { lowAt } = useSettings().credits;
  if (!planRead || !creditsRead) return <Skeleton shape="text" size="md" className="w-[96px]" />;
  const credits = creditTotals(ledger).remaining;
  return (
    <HubValue warning={runningLow(credits, lowAt)}>
      {plan.name} · {credits.toLocaleString("en-US")} {credits === 1 ? "credit" : "credits"}
    </HubValue>
  );
}

function ProjectsValue() {
  const { hydrated, projects } = useManualProjects();
  if (!hydrated) return <Skeleton shape="text" size="md" className="w-[24px]" />;
  return <HubValue>{projects.length}</HubValue>;
}

/** Your level, as the web's account menu shows it ("Maker", 620 XP); only you see it. */
function LevelBadge() {
  const { hydrated, ledger } = useCredits();
  if (!hydrated) return null;
  const level = levelOf(xpOf(ledger));
  return (
    <span className="flex shrink-0 flex-col items-end gap-1">
      <Badge tone="brand">{level.name}</Badge>
      <span className={cn(T.micro, "tabular-nums")}>{level.xp.toLocaleString("en-US")} XP</span>
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
  const card = cn(LIST_CARD, "flex-row items-center gap-6 px-8 py-6");

  return (
    <Screen
      top={
        <TopBar
          back
          title="Profile"
          actions={[
            { icon: Settings01Icon, label: "Settings", onClick: () => router.push("/m/settings") },
            { icon: Search01Icon, label: "Search", onClick: () => router.push("/m/profile/search") },
          ]}
        />
      }
    >
      <div className="flex flex-col gap-12 px-8 pb-12 pt-2">
        {hydrated && photo.hydrated ? (
          <Link
            href={me}
            aria-label={`${name}, view your profile`}
            className={cn(card, "outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus")}
          >
            <Avatar size="md" initials={initialsOf(name, fields.latinName || null)} src={photo.url ?? undefined} />
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className={cn(T.bodyStrong, "truncate")}>{name}</span>
              {fields.headline && <span className={cn(T.body, "truncate")}>{fields.headline}</span>}
              <span className={cn(T.meta, "truncate")}>{handle === ME ? "View profile" : `@${handle} · View profile`}</span>
            </span>
            <LevelBadge />
          </Link>
        ) : (
          <div aria-hidden className={card}>
            <Skeleton shape="circle" className="size-[40px]" />
            <div className="flex flex-col gap-4">
              <Skeleton shape="text" size="md" className="w-[120px]" />
              <Skeleton shape="text" size="sm" className="w-[160px]" />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-16">
            <nav aria-label="Your account" className="flex flex-col gap-6">
              <HubRow href="/m/earn/wallet" icon={Wallet03Icon} label="Wallet" value={<WalletValue />} />
              <HubRow href="/m/earn/refer" icon={Share01Icon} label="Refer and Earn" />
              <HubRow href="/m/plans" icon={Tag01Icon} label="Plan & pricing" value={<PlanValue />} />
              <HubRow href="/m/projects" icon={Note03Icon} label="Projects" value={<ProjectsValue />} />
              <HubRow href="/m/saved" icon={AllBookmarkIcon} label="Saved Items" />
            </nav>

            <div className="flex flex-col gap-4">
              <button
                type="button"
                aria-expanded={settingsOpen}
                aria-controls={settingsId}
                onClick={toggleSettings}
                className={cn(HUB_ROW, "bg-transparent px-8")}
              >
                <span className="shrink-0 text-[color:var(--color-icon-default)]">
                  <Icon icon={Settings01Icon} size={24} />
                </span>
                <span className={cn(T.bodyStrong, "min-w-0 flex-1 truncate")}>Settings</span>
                <span
                  className={cn(
                    "shrink-0 text-[color:var(--color-icon-default)] transition-transform duration-normal ease-decelerate motion-reduce:transition-none",
                    settingsOpen && "rotate-180",
                  )}
                >
                  <Icon icon={ArrowDown01Icon} size={24} />
                </span>
              </button>
              {settingsOpen && (
                <ul id={settingsId} aria-label="Settings" className="m-0 flex list-none flex-col gap-4 p-0">
                  {SETTINGS.map((s) => (
                    <li key={s.href}>
                      <HubRow href={s.href} icon={s.icon} label={s.label} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <Button hierarchy="secondary" size="xl" className="w-full" onClick={() => setSignOut(true)}>
            Sign out
          </Button>
        </div>
      </div>
      <SignOutSheet open={signOut} onClose={() => setSignOut(false)} />
    </Screen>
  );
}
