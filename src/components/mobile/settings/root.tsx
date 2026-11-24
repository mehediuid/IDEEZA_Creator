"use client";

// ST-01 · Settings, in the web registry's order: Find a setting, the account
// card, Preferences (each page with its state as the row's value), Money
// (Plan & pricing; Get paid → the Get paid page; Wallet balance → the phone's
// Wallet Balance, where the IDZ lives; Payment method → how you pay; Verify
// your identity, which the master page's Profile settings draws as Creator
// Verification), Support (Help), the neutral Sign out (AU-50) and the version.
// ST-02: the rows wait as bones until the stores are read. ST-03 / 03b: what
// Find a setting finds ("Page › Row", opening the page at the row), or none.
// The search reads the web's registry (lib/settings/search.ts) and sends each
// hit to its phone screen with the phone's words; the settings only the phone
// has (2-step, devices, delete account, sign out…) are PHONE_ROWS.
// Two of the web home's status facts (settings-home.tsx; SET-14) sit where a
// phone reads them: under the account card, that the work lives on this
// phone only, with a way to keep a download; and a break that is on, on the
// Privacy row.

import * as React from "react";
import {
  AiBrain01Icon,
  Alert02Icon,
  CheckmarkBadge01Icon,
  Coins01Icon,
  CreditCardIcon,
  CreditCardPosIcon,
  HelpCircleIcon,
  Invoice01Icon,
  LanguageSkillIcon,
  Logout01Icon,
  Notification01Icon,
  PaintBoardIcon,
  Shield01Icon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import { useMakerIdz } from "@/components/balance/use-maker-idz";
import { Avatar } from "@/components/ideeza/avatar";
import { SearchInput } from "@/components/ideeza/search-input";
import { useGetPaidData } from "@/components/settings/get-paid/parts";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/lib/account/auth";
import { balanceOf, formatUsd } from "@/lib/account/payout";
import { creditTotals } from "@/lib/account/summary";
import { usePayout } from "@/lib/account/use-payout";
import { useKyc } from "@/lib/commerce/use-commerce";
import { useCredits } from "@/lib/create/credits";
import { useCreatePlan } from "@/lib/create/plan";
import { popupModeOf } from "@/lib/notifications/filter";
import { quietModeOn } from "@/lib/settings/prefs";
import { useDates } from "@/lib/settings/use-dates";
import { displayNameOf, initialsOf, ownHandleOf } from "@/lib/people/ids";
import { useMyPhoto } from "@/lib/people/photo-store";
import { useMyProfile } from "@/lib/people/profile-store";
import { searchSettings, type SettingsHit } from "@/lib/settings/search";
import { useSettings } from "@/lib/settings/use-settings";
import { Chevron, LIST_CARD } from "../kit/list";
import { useDataRowValue } from "./data";
import { BILLING_DETAILS_HREF, CREDIT_ALERTS_HREF, HELPER_LINK, SettingsGroup, SettingsRow, SettingsScreen } from "./kit";
import { cn } from "@/lib/utils";
import { T } from "../type";
import { SignOutSheet } from "./sign-out";

/** The app's version as the Figma prints it under the list. */
const VERSION = "1.1.5.451";

const POPUP_WORDS = { now: "Right away", daily: "Once a day", paused: "Paused" } as const;
const THEME_WORDS = { light: "Light", dark: "Dark", system: "Match system" } as const;

const GET_PAID = "/m/settings/idz-pay";

/** Where a web settings row lives on the phone. */
export function mobileSettingsHref(hit: SettingsHit): string {
  const row = hit.rowId;
  const at = (path: string) => (row ? `${path}#${row}` : path);
  switch (hit.page) {
    case "account":
      if (row === "deactivate") return "/m/settings/deactivate";
      if (row === "delete-account") return "/m/settings/delete";
      return row === "sign-in" ? "/m/settings/security" : row === "handle" ? "/m/settings/account/handle" : at("/m/settings/account");
    case "privacy":
      if (row === "blocked") return "/m/settings/privacy/blocked";
      if (row === "hidden-words") return "/m/settings/privacy/hidden-words";
      if (row === "reports") return "/m/settings/privacy/reports";
      return at("/m/settings/privacy");
    case "data":
      if (row === "activity") return "/m/settings/data/search-history";
      if (row === "blog-reuse") return "/m/settings/data/blog-reuse";
      if (row === "download") return "/m/settings/data/download";
      if (row === "restore") return "/m/settings/data/restore";
      return at("/m/settings/data");
    case "notifications":
    case "language":
    case "appearance":
      return at(`/m/settings/${hit.page}`);
    case "plan":
      if (row === "credit-alerts") return CREDIT_ALERTS_HREF ?? "/m/plans?tab=credits";
      if (row === "billing-details") return BILLING_DETAILS_HREF ?? "/m/plans?tab=billing";
      if (row === "credits") return "/m/plans?tab=credits";
      if (row === "billing") return "/m/plans?tab=billing";
      if (row === "payment") return "/m/settings/payments";
      return "/m/plans";
    case "get-paid":
      if (row === "identity") return "/m/settings/kyc/1";
      if (row === "withdraw") return `${GET_PAID}/withdraw`;
      if (row === "history") return `${GET_PAID}/history`;
      return GET_PAID;
    default:
      return "/m/settings";
  }
}

/** The phone's words where the web's row is named for a browser or reads differently here. */
const PHONE_LABELS: Record<string, string> = {
  "account:sign-in": "Sign-in & security",
  "data:storage": "Keep this phone from clearing it",
  "data:erase": "Erase IDEEZA from this phone",
  "data:activity": "Search history",
  "notifications:browser-popups": "Push notifications",
  "notifications:email": "Email and text messages",
};
const phoneLabelOf = (h: SettingsHit) => PHONE_LABELS[`${h.page}:${h.rowId}`] ?? h.label;

/** Web rows the phone leaves out on purpose, so a search never lands on a page without them
 *  (Single-key shortcuts: a phone has no keyboard for them; appearance.tsx; SET-11). */
const WEB_ONLY = new Set(["appearance:single-key"]);

type PhoneRow = { label: string; page: string; words: string; href?: string; signOut?: true };

/** Settings only the phone has, or that sit somewhere else on it. */
const PHONE_ROWS: PhoneRow[] = [
  { label: "2-step sign-in", page: "Sign-in & security", words: "two 2fa factor authenticator code backup codes", href: "/m/settings/security#two-step" },
  { label: "Your devices", page: "Sign-in & security", words: "device phones sessions history signed other", href: "/m/settings/security#devices" },
  { label: "Change email", page: "Sign-in & security", words: "address mail", href: "/m/settings/security/email" },
  { label: "Change password", page: "Sign-in & security", words: "passcode reset", href: "/m/settings/security/password" },
  { label: "Deactivate account", page: "Sign-in & security", words: "pause disable hide temporarily deactivate close", href: "/m/settings/deactivate" },
  { label: "Delete account", page: "Sign-in & security", words: "close remove leave permanently erase", href: "/m/settings/delete" },
  { label: "Sign out", page: "Settings", words: "log logout signout", signOut: true },
  { label: "Wallet balance", page: "Money", words: "idz coins tokens", href: "/m/earn/wallet" },
  { label: "Payment method", page: "Money", words: "pay card paypal wallet connect", href: "/m/settings/payments" },
];

const FILLER = new Set("a an and the my of to in on i how do can change turn set with for".split(" "));

/** Every word typed starts a word of the row ("2-step", "devices"). */
function phoneRowsFor(query: string): PhoneRow[] {
  const words = query.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w && !FILLER.has(w));
  if (!words.length) return [];
  return PHONE_ROWS.filter((r) => {
    const hay = `${r.label} ${r.words}`.toLowerCase().split(/[^a-z0-9]+/);
    return words.every((w) => hay.some((h) => h.startsWith(w)));
  });
}

export function SettingsRoot() {
  const [query, setQuery] = React.useState("");
  const [signOut, setSignOut] = React.useState(false);
  const hits = React.useMemo(() => searchSettings(query).filter((h) => !WEB_ONLY.has(`${h.page}:${h.rowId}`)), [query]);
  const phoneHits = React.useMemo(() => phoneRowsFor(query), [query]);
  const searching = query.trim().length > 0;
  const profileRead = useMyProfile().hydrated;
  const planRead = useCreatePlan().hydrated;
  const creditsRead = useCredits().hydrated;

  return (
    <SettingsScreen title="Settings" offlineNote={false} loading={!(profileRead && planRead && creditsRead)}>
      <SearchInput
        value={query}
        onValueChange={setQuery}
        onClear={() => setQuery("")}
        placeholder="Find a setting"
        aria-label="Find a setting"
        enterKeyHint="search"
        size="xl"
      />
      {searching ? (
        <SearchResults
          query={query}
          hits={hits}
          phoneHits={phoneHits}
          onSignOut={() => {
            setQuery("");
            setSignOut(true);
          }}
        />
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <AccountCard />
            {/* The web's "This browser" card in one line (SET-14). */}
            <p className={T.meta}>
              Your work is kept on this phone only.{" "}
              <Link href="/m/settings/data/download" className={HELPER_LINK}>
                Keep a download
              </Link>
              .
            </p>
          </div>
          <Preferences />
          <Money />
          <SettingsGroup label="Support">
            <SettingsRow icon={HelpCircleIcon} label="Help" href="/m/help" />
          </SettingsGroup>
          <SettingsGroup>
            <SettingsRow id="sign-out" icon={Logout01Icon} label="Sign out" plain onClick={() => setSignOut(true)} />
          </SettingsGroup>
          <p className={cn(T.meta, "text-center text-text-tertiary")}>Version {VERSION}</p>
        </>
      )}
      <SignOutSheet open={signOut} onClose={() => setSignOut(false)} />
    </SettingsScreen>
  );
}

function SearchResults({
  query,
  hits,
  phoneHits,
  onSignOut,
}: {
  query: string;
  hits: SettingsHit[];
  phoneHits: PhoneRow[];
  onSignOut: () => void;
}) {
  // A phone row stands in for the web row that would open the same place.
  const taken = new Set(phoneHits.map((r) => r.href));
  const webHits = hits.filter((h) => !taken.has(mobileSettingsHref(h)));
  const total = phoneHits.length + webHits.length;
  if (!total) {
    return <p className={cn(T.body, "py-8 text-center")}>No setting matches “{query.trim()}”.</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      <p aria-live="polite" className={cn(T.meta, "text-text-tertiary")}>
        {total === 1 ? "1 result" : `${total} results`}
      </p>
      <SettingsGroup>
        {phoneHits.map((r) =>
          r.href ? (
            <SettingsRow key={r.label} label={r.label} helper={`${r.page} › ${r.label}`} href={r.href} />
          ) : (
            <SettingsRow key={r.label} label={r.label} helper={`${r.page} › ${r.label}`} onClick={onSignOut} />
          ),
        )}
        {webHits.map((h) => (
          <SettingsRow
            key={h.href}
            label={phoneLabelOf(h)}
            helper={h.rowId ? `${h.pageLabel} › ${phoneLabelOf(h)}` : "Settings page"}
            href={mobileSettingsHref(h)}
          />
        ))}
      </SettingsGroup>
    </div>
  );
}

function AccountCard() {
  const { account } = useAuth();
  const { hydrated, fields } = useMyProfile();
  const photo = useMyPhoto();
  const name = displayNameOf(fields.name || `${account?.firstName ?? ""} ${account?.lastName ?? ""}`.trim());
  const handle = ownHandleOf(fields.handle);
  return (
    <Link
      href="/m/settings/account"
      className={cn(LIST_CARD, "flex-row items-center gap-6 rounded-lg px-8 py-6 outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus")}
    >
      <Avatar size="lg" initials={initialsOf(name, fields.latinName || null)} src={photo.url ?? undefined} className="shrink-0" />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className={cn(T.name, "truncate")}>{hydrated ? name : " "}</span>
        <span className={cn(T.meta, "truncate")}>{fields.handle ? `Account · @${handle}` : "Account"}</span>
      </span>
      <Chevron />
    </Link>
  );
}

function Preferences() {
  const settings = useSettings();
  const { theme } = useTheme();
  const data = useDataRowValue();
  const dates = useDates();
  // Read once per visit, as the web's Privacy at a glance: a break ends on its own and the next visit shows it.
  const [now] = React.useState(() => Date.now());
  const breakUntil = quietModeOn(settings, now) ? settings.audience.quietUntil : null;
  return (
    <SettingsGroup label="Preferences">
      <SettingsRow icon={Notification01Icon} label="Notifications" value={POPUP_WORDS[popupModeOf(settings)]} href="/m/settings/notifications" />
      <SettingsRow
        icon={Shield01Icon}
        label="Privacy & safety"
        value={settings.audience.locked ? "Profile locked" : "Profile open"}
        helper={breakUntil !== null ? `On a break until ${dates.dateTime(breakUntil, { style: "weekday" })}` : undefined}
        href="/m/settings/privacy"
      />
      <SettingsRow icon={LanguageSkillIcon} label="Language & region" value="English" href="/m/settings/language" />
      <SettingsRow icon={PaintBoardIcon} label="Appearance & accessibility" helper={THEME_WORDS[theme]} href="/m/settings/appearance" />
      <SettingsRow icon={AiBrain01Icon} label="AI & your data" value={data.value} badge={data.badge} href="/m/settings/data" />
    </SettingsGroup>
  );
}

function Money() {
  const { hydrated: planReady, plan } = useCreatePlan();
  const { hydrated: creditsReady, ledger } = useCredits();
  const idz = useMakerIdz();
  const payout = usePayout();
  const getPaid = useGetPaidData();
  const kyc = useKyc();
  const credits = creditTotals(ledger).remaining;
  const getPaidValue =
    !payout || !getPaid.ready
      ? ""
      : getPaid.stageOf(payout) === "setup"
        ? "Set up when you sell"
        : formatUsd(balanceOf(getPaid.earnings, payout.withdrawals).available);
  return (
    <SettingsGroup label="Money">
      <SettingsRow
        icon={CreditCardIcon}
        label="Plan & pricing"
        helper={planReady ? `${plan.name} plan` : undefined}
        value={creditsReady ? `${credits.toLocaleString("en-US")} ${credits === 1 ? "credit" : "credits"}` : ""}
        href="/m/plans"
      />
      {CREDIT_ALERTS_HREF && <SettingsRow id="credit-alerts" icon={Alert02Icon} label="Credit alerts and limits" href={CREDIT_ALERTS_HREF} />}
      {BILLING_DETAILS_HREF && <SettingsRow id="billing-details" icon={Invoice01Icon} label="Billing details" href={BILLING_DETAILS_HREF} />}
      <SettingsRow id="get-paid" icon={Wallet01Icon} label="Get paid" value={getPaidValue} href={GET_PAID} />
      <SettingsRow
        id="wallet-balance"
        icon={Coins01Icon}
        label="Wallet balance"
        value={idz.read ? (idz.connected && idz.idz !== null ? `${Number(idz.idz).toLocaleString("en-US")} IDZ` : "Not connected") : ""}
        href="/m/earn/wallet"
      />
      <SettingsRow id="payment-method" icon={CreditCardPosIcon} label="Payment method" href="/m/settings/payments" />
      <SettingsRow
        icon={CheckmarkBadge01Icon}
        label="Verify your identity"
        value={kyc === undefined ? "" : kyc ? "Verified" : "Not yet"}
        href="/m/settings/kyc"
      />
    </SettingsGroup>
  );
}
