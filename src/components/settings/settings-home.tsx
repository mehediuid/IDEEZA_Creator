"use client";

// /settings (User Panel V2 "Settings" 22048:28753): "Find a setting" over
// every page and row, the four "Most visited settings" tiles, and "Looking
// for something else" — the privacy policy and the terms, which the app
// doesn't have yet, so both say so instead of linking nowhere. On a phone the
// side-nav isn't beside the page, so the page list follows.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AiBrain01Icon,
  Agreement02Icon,
  CreditCardIcon,
  NoteIcon,
  UserBlock01Icon,
  Wallet03Icon,
} from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { SearchInput } from "@/components/ideeza";
import { searchSettings } from "@/lib/settings/search";
import { SettingsFrame } from "./settings-frame";
import { SettingsNav } from "./settings-nav";

const TILES: { label: string; href: string; icon: IconValue }[] = [
  { label: "IDEEZA Pay", href: "/settings/get-paid", icon: Wallet03Icon },
  { label: "Blocking", href: "/settings/blocking", icon: UserBlock01Icon },
  { label: "AI Properties", href: "/settings/ai", icon: AiBrain01Icon },
  { label: "Payment", href: "/settings/plan?tab=payment", icon: CreditCardIcon },
];

const SECTION_TITLE = "m-0 text-lg font-semibold leading-lg text-text-primary";

export function SettingsHome() {
  return (
    <SettingsFrame page="home">
      <FindSetting />

      <section aria-labelledby="most-visited" className="flex flex-col gap-[16px]">
        <h2 id="most-visited" className={SECTION_TITLE}>
          Most visited settings
        </h2>
        <ul role="list" className="grid grid-cols-2 gap-[16px] [@container(min-width:900px)]:grid-cols-4">
          {TILES.map((t) => (
            <li key={t.label}>
              <Link
                href={t.href}
                className="flex min-h-[96px] flex-col items-center justify-center gap-[10px] rounded-xl bg-bg-subtle px-[12px] py-[20px] text-center text-md font-medium leading-md text-text-primary outline-none transition-colors duration-fast hover:bg-bg-brand-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                <span className="text-text-brand">
                  <Icon icon={t.icon} size={24} />
                </span>
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="something-else" className="flex flex-col gap-[16px]">
        <h2 id="something-else" className={SECTION_TITLE}>
          Looking for something else
        </h2>
        <ul role="list" className="flex flex-col gap-[16px]">
          <LegalCard id="privacy-policy" icon={NoteIcon} title="IDEEZA Privacy & Policy" body="View IDEEZA updated privacy & Policy" />
          <LegalCard id="terms" icon={Agreement02Icon} title="Terms & Conditions" body="View IDEEZA updated terms & conditions" />
        </ul>
      </section>

      <section aria-labelledby="all-settings" className="flex flex-col gap-[12px] [@container(min-width:768px)]:hidden">
        <h2 id="all-settings" className={SECTION_TITLE}>
          All settings
        </h2>
        <SettingsNav current="home" />
      </section>
    </SettingsFrame>
  );
}

/** A legal page the app doesn't have yet: the card stays, says so, and links nowhere. */
function LegalCard({ id, icon, title, body }: { id: string; icon: IconValue; title: string; body: string }) {
  return (
    <li
      id={id}
      className="flex items-start gap-[12px] rounded-xl border border-solid border-border px-[16px] py-[14px] data-[arrived]:outline data-[arrived]:outline-2 data-[arrived]:outline-offset-4 data-[arrived]:outline-border-focus"
    >
      <span className="mt-[2px] shrink-0 text-text-tertiary">
        <Icon icon={icon} size={20} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
        <span className="text-md font-semibold leading-md text-text-disabled">{title}</span>
        <span className="text-sm leading-sm text-text-tertiary">{body}</span>
      </span>
      <span className="shrink-0 text-sm leading-sm text-text-tertiary">Not available yet</span>
    </li>
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
            <p className="m-0 text-md leading-md text-text-secondary">No setting matches “{trimmed}”. Try a shorter word.</p>
          ))}
      </div>
    </section>
  );
}
