"use client";

// The landing page's top bar — Figma IDEEZA Website V-2, "NAV Bar Style"
// 18559:65842 (NAV For Waitlist 18559:65583). It stays over the page while
// it scrolls, blurred like the frame's 32px background blur.
//
// Where a link has no page in the app yet (Airdrop, I'm Manufacturer, About
// Us) it is shown as in Figma but greyed for the pointer and named "Coming
// soon", rather than leading to a 404.
//
// The way in (owner 2026-11-04: one domain, website and platform together;
// useEntry): signed out, Log in → Sign in, Join Us → Sign up, Start Project →
// Sign up (Sign in once this browser has an account), each going on into the
// app; signed in, Log in goes and Join Us reads Open IDEEZA, straight to Home.

import * as React from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, Menu01Icon, Cancel01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { buttonVariants } from "@/components/ideeza/button";
import { LANDING_SECONDARY } from "@/components/landing/buttons";
import { useEntry } from "@/components/auth/use-entry";
import { cn } from "@/lib/utils";

type NavLink = { label: string; href?: string };

const LINKS: NavLink[] = [
  { label: "Airdrop" },
  { label: "NFT Marketplace", href: "/marketplace" },
  { label: "I'm Manufacturer" },
  { label: "Pricing", href: "/settings/plan" },
  { label: "ICO", href: "/balance/buy" },
  { label: "About Us" },
];

const RESOURCES: NavLink[] = [
  { label: "Tutorials", href: "/tutorials" },
  { label: "Blog", href: "/blog" },
];

// Figma "Navigation Item": 44 tall, 12/8 padding, Body/MD Medium.
const ITEM =
  "flex h-[44px] items-center justify-center gap-2 whitespace-nowrap rounded-[100px] px-6 py-4 font-display text-lg font-medium leading-lg tracking-normal text-[color:var(--color-text-primary)] transition-colors duration-fast ease-standard hover:bg-[var(--color-glass-border-subtle)] focus-visible:outline-none focus-visible:shadow-focus-brand";

const SOON = "cursor-default opacity-100 hover:bg-transparent";

function NavItem({ link, className }: { link: NavLink; className?: string }) {
  if (!link.href) {
    return (
      <span role="link" aria-disabled="true" title="Coming soon" className={cn(ITEM, SOON, className)}>
        {link.label}
      </span>
    );
  }
  return (
    <Link href={link.href} className={cn(ITEM, className)}>
      {link.label}
    </Link>
  );
}

/** A small menu under a trigger; closes on outside click and Escape. */
function useDisclosure() {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return { open, setOpen, ref };
}

const MENU =
  "absolute top-[calc(100%+var(--spacing-4))] z-dropdown flex min-w-[180px] flex-col rounded-xl border-solid border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-2 shadow-overlay";
const MENU_ITEM =
  "flex h-[40px] items-center gap-4 rounded-lg px-6 font-display text-md font-medium leading-md text-[color:var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)] focus-visible:outline-none focus-visible:bg-[var(--color-bg-subtle)]";

function ResourcesMenu() {
  const { open, setOpen, ref } = useDisclosure();
  return (
    <div ref={ref} className="relative">
      {/* Figma 18559:65807 — semibold with a 20px chevron. */}
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(ITEM, "border-solid border-0 bg-transparent font-semibold")}
      >
        Resources
        <HugeiconsIcon icon={ArrowDown01Icon} size={20} color="currentColor" strokeWidth={1.5} />
      </button>
      {open ? (
        <div role="menu" className={cn(MENU, "left-0")}>
          {RESOURCES.map((r) => (
            <Link key={r.label} role="menuitem" href={r.href!} className={MENU_ITEM} onClick={() => setOpen(false)}>
              {r.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function LanguageMenu() {
  const { open, setOpen, ref } = useDisclosure();
  return (
    <div ref={ref} className="relative">
      {/* Figma 18586:13555 — A01 ghost, 48 tall, label then a 24px chevron. */}
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Language: English"
        onClick={() => setOpen((v) => !v)}
        className="flex h-[48px] items-center justify-center gap-2 rounded-full border-solid border-0 bg-transparent py-6 pl-6 pr-0 font-display text-lg font-semibold leading-lg tracking-wide text-[color:var(--color-button-secondary-text)] focus-visible:outline-none focus-visible:shadow-focus-brand"
      >
        EN
        <HugeiconsIcon icon={ArrowDown01Icon} size={24} color="currentColor" strokeWidth={1.5} />
      </button>
      {open ? (
        <div role="menu" className={cn(MENU, "right-0")}>
          <button
            type="button"
            role="menuitemradio"
            aria-checked="true"
            className={cn(MENU_ITEM, "justify-between border-solid border-0 bg-transparent")}
            onClick={() => setOpen(false)}
          >
            English
            <HugeiconsIcon icon={Tick02Icon} size={18} color="currentColor" strokeWidth={1.8} />
          </button>
        </div>
      ) : null}
    </div>
  );
}

// Start Project wears the page's one secondary look (landing/buttons.ts), like
// every Explore button; Figma draws it with a plain #dfd4fe line (owner
// 2026-11-04: one secondary style on the page).
const START = LANDING_SECONDARY;

export function LandingNav() {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const { signedIn, into, signInHref, signUpHref } = useEntry();
  const join = signedIn ? { label: "Open IDEEZA", href: "/" } : { label: "Join Us", href: signUpHref };

  return (
    <header className="fixed inset-x-0 top-0 z-sticky backdrop-blur-[32px]">
      <nav
        aria-label="Main"
        className="mx-auto flex h-[80px] w-full max-w-[1440px] items-center justify-between px-8 py-8 lg:px-40"
      >
        {/* Figma "logo 3" 18586:11566 — 48 tall, the mark inset 3.765. */}
        <Link href="/landing" aria-label="IDEEZA home" className="flex h-[48px] shrink-0 items-start p-[3.765px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/landing/nav/logo.svg" alt="IDEEZA" width={80.941} height={33.962} className="mt-[3.73px] block h-[33.962px] w-[80.941px]" />
        </Link>

        <div className="hidden items-center xl:flex">
          {LINKS.map((l) => (
            <NavItem key={l.label} link={l} className={l.label === "About Us" ? "font-semibold" : undefined} />
          ))}
          <ResourcesMenu />
        </div>

        <div className="flex items-center justify-end gap-6">
          <div className="hidden sm:block">
            <LanguageMenu />
          </div>
          <div className="hidden items-center gap-6 sm:flex">
            {!signedIn ? (
              <Link href={signInHref} className={ITEM}>
                Log in
              </Link>
            ) : null}
            <Link href={into()} className={cn(buttonVariants({ hierarchy: "secondary", size: "2xl" }), START)}>
              Start Project
            </Link>
            <Link href={join.href} className={cn(buttonVariants({ hierarchy: "primary", size: "2xl" }), "rounded-full")}>
              {join.label}
            </Link>
          </div>
          <button
            type="button"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            className="flex size-[44px] items-center justify-center rounded-full border-solid border-0 bg-transparent text-[color:var(--color-text-primary)] xl:hidden focus-visible:outline-none focus-visible:shadow-focus-brand"
          >
            <HugeiconsIcon icon={mobileOpen ? Cancel01Icon : Menu01Icon} size={24} color="currentColor" strokeWidth={1.5} />
          </button>
        </div>
      </nav>

      {mobileOpen ? (
        <div className="border-solid border-0 border-t border-[var(--color-glass-border-subtle)] bg-[var(--color-bg-page)] px-8 pb-8 xl:hidden">
          <div className="flex flex-col py-4">
            {[...LINKS, ...RESOURCES].map((l) => (
              <NavItem key={l.label} link={l} className="justify-start" />
            ))}
            {!signedIn ? <NavItem link={{ label: "Log in", href: signInHref }} className="justify-start sm:hidden" /> : null}
          </div>
          <div className="flex gap-6 sm:hidden">
            <Link href={into()} className={cn(buttonVariants({ hierarchy: "secondary", size: "2xl" }), START, "flex-1")}>
              Start Project
            </Link>
            <Link href={join.href} className={cn(buttonVariants({ hierarchy: "primary", size: "2xl" }), "flex-1 rounded-full")}>
              {join.label}
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
