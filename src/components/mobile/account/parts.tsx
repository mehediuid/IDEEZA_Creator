"use client";

// Small pieces every Account screen shares (mobile Figma AU-*): the heading
// (Heading/H4, then Body/SM in text/secondary, 4 apart), the live password
// checklist, the M01 alert slot (and the one alert for a browser that won't
// save), where a new account goes first, and Splash.

import * as React from "react";
import { AiMagicIcon, CheckmarkCircle02Icon, CircleIcon, CpuIcon, Image01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { IdeezaLogo } from "@/components/brand/ideeza-logo";
import { Banner, type BannerTone } from "@/components/ideeza/banner";
import { currentAccount, needsAccountDetails, needsSourceQuestion, readAccounts, readSession } from "@/lib/account/auth";
import { phonePasswordChecks } from "@/lib/account/phone";
import { cn } from "@/lib/utils";
import { T } from "../type";

export function AccountHeading({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className={T.title}>{title}</h2>
      {children && <p className={cn(T.body, "[overflow-wrap:anywhere]")}>{children}</p>}
    </div>
  );
}

/** The Account screens' content column: 16 to the sides, 12 apart, 16 below. */
export const ACCOUNT_CONTENT = "flex flex-col gap-6 px-8 pb-8";

/** How far along a new password is, in the web's words and inks (auth-parts' LEVELS), by rules met. */
const STRENGTH = [
  { word: "Weak", ink: "text-text-error", bar: "bg-[var(--color-icon-error)]" },
  { word: "Weak", ink: "text-text-error", bar: "bg-[var(--color-icon-error)]" },
  { word: "Fair", ink: "text-text-warning", bar: "bg-[var(--color-icon-warning)]" },
  { word: "Fair", ink: "text-text-warning", bar: "bg-[var(--color-icon-warning)]" },
  { word: "Almost there", ink: "text-text-warning", bar: "bg-[var(--color-icon-warning)]" },
  { word: "Strong", ink: "text-text-success", bar: "bg-[var(--color-icon-success)]" },
] as const;

/** "Password checklist (live)": the web's five rules, each ticking (icon and
 *  text success) as it is met, under the web's strength bar (one segment a
 *  rule, Weak · Fair · Almost there · Strong). */
export function PasswordChecklist({ password, id }: { password: string; id?: string }) {
  const checks = phonePasswordChecks(password);
  const met = checks.filter((c) => c.met).length;
  const level = STRENGTH[password ? met : 0];
  return (
    <div id={id} className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <div aria-hidden className="flex flex-1 gap-2">
          {checks.map((c, i) => (
            <span key={c.id} className={cn("h-[4px] flex-1 rounded-full", password && i < met ? level.bar : "bg-[var(--color-border-default)]")} />
          ))}
        </div>
        <span className={cn(T.meta, password ? level.ink : "text-text-tertiary")}>{password ? level.word : "Password rules"}</span>
      </div>
      <ul aria-label="Password rules" className="flex flex-col gap-2">
        {checks.map((c) => (
          <li key={c.id} className={cn(T.meta, "flex items-center gap-4", c.met && "text-text-success")}>
            <span className={c.met ? "text-[color:var(--color-icon-success)]" : "text-[color:var(--color-icon-secondary)]"}>
              <Icon icon={c.met ? CheckmarkCircle02Icon : CircleIcon} size={16} />
            </span>
            {c.label}
            <span className="sr-only">{c.met ? "(done)" : "(not yet)"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export type AlertSpec = { tone: BannerTone; title: string; body: React.ReactNode; action?: React.ReactNode };

/** One M01 alert at a time, under the heading (never two errors at once, MFR-13). */
export function AccountAlert({ alert }: { alert: AlertSpec | null }) {
  if (!alert) return null;
  return (
    <Banner tone={alert.tone} title={alert.title} action={alert.action}>
      {alert.body}
    </Banner>
  );
}

/** The browser refused to save (storage full or blocked): the web's words, on every way-in screen. */
export const REFUSED_ALERT: AlertSpec = {
  tone: "error",
  title: "Couldn’t save",
  body: "This browser wouldn’t save that. Check that it allows this site to store data, then try again.",
};

/** Where a new account goes once it is in, as on the web: the one question
 *  ("Where did you hear about IDEEZA?") when the link that brought it didn't
 *  say — after Sign up's date of birth and Terms box when Google or Facebook
 *  made the account (AUTH-2) — then where it set out for (AUTH-4: the web goes
 *  straight to `next`), or the Welcome map when that is Home. Nothing else is
 *  asked: the handle and the rest of the profile wait in Settings and Edit
 *  profile, as on the web. */
export function landingAfterSignUp(next: string): string {
  const account = currentAccount(readAccounts(), readSession());
  if (account && (needsAccountDetails(account) || needsSourceQuestion(account))) {
    return `/m/source${next === "/m" ? "" : `?next=${encodeURIComponent(next)}`}`;
  }
  return afterSignUpQuestions(next);
}

/** After the questions: the Welcome map for a plain sign-up, else straight on to the page it set
 *  out for (AUTH-4), never dropping it. */
export function afterSignUpQuestions(next: string): string {
  return next === "/m" ? "/m/welcome-map" : next;
}

/** AU-01 · Splash: IDEEZA's brand moment while the app works out where to
 *  open (AU-04a adds "Signing you in…" under it). Always on the brand's night
 *  (the dark theme's tokens, whatever the phone's theme), like the landing
 *  page: a violet and blue glow, faint circuit traces, the logo with a
 *  breathing light behind it and the landing's line, and in place of a
 *  spinner the three steps IDEEZA takes — Idea, Concept, Build — lighting up
 *  in turn. Under reduced motion it stands still, every step lit. */
export function SplashBody({ text }: { text?: string }) {
  return (
    <div
      role="status"
      aria-label={text ?? "Opening IDEEZA"}
      data-theme="dark"
      className="relative isolate flex flex-1 flex-col items-center overflow-hidden bg-bg-page px-8 text-text-primary"
    >
      <SplashBackdrop />
      <div className="flex flex-1 flex-col items-center justify-center gap-8">
        <span className="relative flex items-center justify-center">
          <span
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 size-[240px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,var(--color-violet-500)_0%,transparent_65%)] opacity-60 motion-safe:animate-[m-splash-breathe_2.4s_ease-in-out_infinite_alternate]"
          />
          <IdeezaLogo height={72} decorative className="relative" />
        </span>
        <p className={cn(T.bodyLg, "max-w-[280px] text-balance text-center text-text-secondary")}>Build Hardware at the Speed of Software</p>
      </div>
      <div className="flex flex-col items-center gap-6 pb-[72px]">
        <SplashSteps />
        <p className={cn(T.meta, "min-h-[18px]")}>{text ?? ""}</p>
      </div>
    </div>
  );
}

const SPLASH_STEPS = [
  { label: "Idea", icon: AiMagicIcon },
  { label: "Concept", icon: Image01Icon },
  { label: "Build", icon: CpuIcon },
] as const;

/** Idea → Concept → Build, each lighting up in turn: the splash's progress. */
function SplashSteps() {
  return (
    <div aria-hidden className="flex items-start">
      {SPLASH_STEPS.map((step, i) => (
        <React.Fragment key={step.label}>
          {i > 0 && <span className="mt-[22px] h-[1px] w-[28px] bg-[linear-gradient(90deg,var(--color-violet-500),var(--color-blue-500))] opacity-50" />}
          <span className="flex w-[56px] flex-col items-center gap-2">
            <span
              style={{ animationDelay: `${i * 0.5}s` }}
              className="flex size-[44px] items-center justify-center rounded-xl border-[length:var(--border-width-1)] border-solid border-[var(--color-violet-400)] [background-color:color-mix(in_srgb,var(--color-violet-500)_22%,transparent)] text-[color:var(--color-violet-300)] motion-safe:animate-[m-splash-step_1.5s_ease-in-out_infinite]"
            >
              <Icon icon={step.icon} size={20} />
            </span>
            <span className={T.micro}>{step.label}</span>
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}

/** The night behind the splash: a violet wash from the top, two soft glows and faint circuit traces. */
export function SplashBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute inset-0 bg-[radial-gradient(120%_65%_at_50%_0%,var(--color-violet-950)_0%,transparent_75%)]" />
      <div className="absolute -left-[96px] top-[180px] size-[300px] rounded-full bg-[var(--color-violet-600)] opacity-35 blur-[90px]" />
      <div className="absolute -right-[96px] bottom-[140px] size-[260px] rounded-full bg-[var(--color-blue-600)] opacity-25 blur-[90px]" />
      <svg
        viewBox="0 0 375 812"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 size-full text-[color:var(--color-violet-300)] opacity-[0.14] [mask-image:radial-gradient(70%_55%_at_50%_45%,#000_20%,transparent_100%)]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      >
        <path d="M0 210h64l24 24h70" />
        <path d="M375 168h-58l-30 30v56" />
        <path d="M30 0v96l26 26v64" />
        <path d="M330 0v70l-22 22h-60" />
        <path d="M0 560h78l30-30h56" />
        <path d="M375 610h-70l-26 26v80" />
        <path d="M52 812v-92l30-30h40" />
        <path d="M300 812v-60l-34-34h-48" />
        <path d="M150 0v40l20 20h36" />
        <path d="M0 400h40" />
        <path d="M375 380h-46l-18 18" />
        <g fill="currentColor" stroke="none">
          <circle cx="158" cy="234" r="3" />
          <circle cx="287" cy="254" r="3" />
          <circle cx="56" cy="186" r="3" />
          <circle cx="248" cy="92" r="3" />
          <circle cx="164" cy="530" r="3" />
          <circle cx="279" cy="716" r="3" />
          <circle cx="122" cy="690" r="3" />
          <circle cx="218" cy="718" r="3" />
          <circle cx="206" cy="60" r="3" />
          <circle cx="40" cy="400" r="3" />
          <circle cx="311" cy="398" r="3" />
        </g>
      </svg>
    </div>
  );
}
