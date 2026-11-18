"use client";

// The landing page's footer — Figma IDEEZA Website V-2, "Footer Section"
// instance 18590:19178 (1440 × 778): the faint IDEEZA wordmark behind four
// link columns and the newsletter, then the logo and the copyright. At xl the
// 1260 block sits 172 px down, as in Figma; below xl the columns wrap.
//
// Links go to the app's real pages where one exists. The rest (and the social
// accounts, which have no published URL) are drawn as in Figma but named
// "Coming soon" instead of leading to a 404. The newsletter has no backend
// yet: the field checks the address and then says sign-up isn't open, and
// nothing is saved.

import * as React from "react";
import Link from "next/link";
import { useEntry } from "@/components/auth/use-entry";
import { cn } from "@/lib/utils";

const ASSET = "/landing/footer";

type FooterLink = { label: string; href?: string };

// Figma I18590:19178;18590:16561 / 16570 / 16580 / 16588 — Label/LG titles,
// Body/SM Medium links (gap 16), 24 between them.
const COLUMNS: { title: string; node: string; width: string; links: FooterLink[] }[] = [
  {
    title: "Company",
    node: "18590:16561",
    width: "xl:w-[167px]",
    links: [
      { label: "About" },
      { label: "Blog", href: "/blog" },
      { label: "NFT Marketplace", href: "/marketplace" },
      { label: "Careers" },
      { label: "Become an Investor" },
      { label: "Mobile App", href: "#mobile-app" },
    ],
  },
  {
    title: "Product",
    node: "18590:16570",
    width: "xl:w-[165px]",
    links: [
      { label: "Air Drop" },
      { label: "I'm Manufacturer" },
      { label: "NFT Marketplace", href: "/marketplace" },
      { label: "Pricing", href: "/settings/plan" },
      { label: "Mobile App", href: "#mobile-app" },
      { label: "Success Story" },
      { label: "Sign In", href: "/sign-in" },
    ],
  },
  {
    title: "Legal",
    node: "18590:16580",
    width: "xl:w-[192px]",
    links: [
      { label: "Privacy Policy" },
      { label: "Terms & Conditions" },
      { label: "API License agreement" },
      { label: "Community Guidelines" },
      { label: "Copyright & DMCA Policy" },
    ],
  },
  {
    title: "Support",
    node: "18590:16588",
    width: "xl:w-[179px]",
    links: [{ label: "FAQ" }, { label: "Contact" }],
  },
];

const LINK =
  "w-fit rounded-xs text-md font-medium leading-md tracking-normal text-[color:var(--color-text-tertiary)] transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:shadow-focus-brand";

function FooterItem({ link }: { link: FooterLink }) {
  if (!link.href) {
    return (
      <span role="link" aria-disabled="true" title="Coming soon" className={cn(LINK, "cursor-default")}>
        {link.label}
      </span>
    );
  }
  const className = cn(LINK, "hover:text-[color:var(--color-text-primary)]");
  // An in-page anchor (the Mobile App section above) needs no router.
  return link.href.startsWith("#") ? (
    <a href={link.href} className={className}>
      {link.label}
    </a>
  ) : (
    <Link href={link.href} className={className}>
      {link.label}
    </Link>
  );
}

// The social tiles drawn in CSS in Figma (Discord, Telegram, X): bg/page
// under a raw violet gradient fill, with a raw #dfd4fe gradient stroke (the
// same paint the three exported tiles carry).
const GLYPH_TILE =
  "flex size-[36px] items-center justify-center rounded-lg border-solid border border-transparent [background:linear-gradient(50.455deg,rgba(175,148,253,0.096)_24.149%,rgba(175,148,251,0.48)_51.899%,rgba(175,148,253,0.144)_82.944%)_padding-box,linear-gradient(var(--color-bg-page),var(--color-bg-page))_padding-box,linear-gradient(36.22deg,rgba(223,212,254,0)_0%,rgba(223,212,254,0.6)_44.46%,rgba(223,212,254,0)_94.54%)_border-box]";

// Figma I18590:19178;18716:36089 — six 36 px tiles, gap 10.
const SOCIALS: { name: string; node: string; src: string; glyph?: { w: string; width: number; height: number } }[] = [
  { name: "Discord", node: "18716:36090", src: "discord.svg", glyph: { w: "h-[13.775px] w-[18px]", width: 18, height: 14 } },
  { name: "Facebook", node: "18716:36097", src: "facebook-tile.svg" },
  { name: "LinkedIn", node: "18716:36099", src: "linkedin-tile.svg" },
  { name: "Telegram", node: "18716:36101", src: "telegram.svg", glyph: { w: "h-[13.995px] w-[15px]", width: 15, height: 14 } },
  { name: "X", node: "18716:36105", src: "x.svg", glyph: { w: "h-[14px] w-[15.75px]", width: 16, height: 14 } },
  { name: "Threads", node: "18716:36108", src: "threads-tile.svg" },
];

function SocialTile({ social }: { social: (typeof SOCIALS)[number] }) {
  return (
    <span
      role="link"
      aria-disabled="true"
      title="Coming soon"
      aria-label={`${social.name} (coming soon)`}
      data-figma={social.node}
      className={cn("relative block size-[36px] shrink-0 cursor-default", social.glyph && GLYPH_TILE)}
    >
      {social.glyph ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`${ASSET}/${social.src}`} alt="" width={social.glyph.width} height={social.glyph.height} className={cn("block", social.glyph.w)} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`${ASSET}/${social.src}`} alt="" width={36} height={36} className="absolute inset-0 block size-[36px]" />
      )}
    </span>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Figma I18590:19178;18590:16593 — the newsletter title, note and field. */
function Newsletter() {
  const [email, setEmail] = React.useState("");
  const [status, setStatus] = React.useState<"invalid" | "closed" | null>(null);
  const inputId = React.useId();
  const messageId = React.useId();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus(EMAIL_RE.test(email.trim()) ? "closed" : "invalid");
  };

  return (
    <div className="flex w-full flex-col gap-[28px]">
      {/* Figma I18590:19178;18590:16594 (gap 16) */}
      <div className="flex w-full flex-col gap-8">
        <h2 className="text-md font-semibold leading-md tracking-wide text-[color:var(--color-text-primary)]">Newsletter</h2>
        <p className="text-md font-medium leading-md tracking-normal text-[color:var(--color-text-tertiary)]">
          A monthly digest of the latest news, articles, and resources.
        </p>
      </div>
      <form noValidate onSubmit={onSubmit} className="flex w-full flex-col">
        <label htmlFor={inputId} className="sr-only">
          Email address
        </label>
        {/* Figma I18590:19178;18590:16597 — a pill with Figma's raw 1.5 px #dfd4fe
            stroke; padding 24 / 6 / 6 less the CSS border. */}
        <div className="flex w-full items-center justify-between gap-4 rounded-[100px] border-solid border-[1.5px] border-[#dfd4fe] bg-transparent py-[calc(var(--spacing-3)_-_1.5px)] pl-[calc(var(--spacing-12)_-_1.5px)] pr-[calc(var(--spacing-3)_-_1.5px)] focus-within:shadow-focus-brand">
          <input
            id={inputId}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="Your Email Address"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (status) setStatus(null);
            }}
            aria-invalid={status === "invalid" || undefined}
            aria-describedby={messageId}
            className="min-w-0 flex-1 border-0 bg-transparent p-0 font-display text-md font-regular leading-md tracking-normal text-[color:var(--color-text-primary)] outline-none placeholder:text-[color:var(--color-violet-100)] placeholder:opacity-100"
          />
          {/* Figma I18590:19178;18590:16599 — 49 × 40, bg/page, a raw violet inner glow. */}
          <button
            type="submit"
            aria-label="Sign up for the newsletter"
            className="flex h-[40px] w-[49px] shrink-0 cursor-pointer items-center justify-center rounded-[64px] border-solid border border-[var(--color-border-default)] bg-[var(--color-bg-page)] shadow-[inset_0px_4px_12px_0px_rgba(160,124,197,0.32),inset_-1px_0px_5px_0px_rgba(66,45,98,0.23),inset_0px_-3px_12px_0px_rgba(178,141,235,0.32)] focus-visible:outline-none focus-visible:border-[var(--color-border-focus)]"
          >
            {/* Figma I18590:19178;18590:16600 icon-leading */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${ASSET}/arrow-right.svg`} alt="" width={15.5} height={13.5} className="block h-[13.5px] w-[15.5px]" />
          </button>
        </div>
        <p
          id={messageId}
          role="status"
          aria-live="polite"
          className={cn(
            // Empty (and 0 tall) until there is something to say, but always present
            // so the live region is announced.
            "mt-4 text-sm font-medium leading-sm tracking-normal empty:mt-0",
            status === "invalid" ? "text-[color:var(--color-text-error)]" : "text-[color:var(--color-text-secondary)]",
          )}
        >
          {status === "invalid"
            ? "Enter a valid email address, like name@example.com."
            : status === "closed"
              ? "Newsletter sign-up isn't open yet, so your email wasn't saved."
              : ""}
        </p>
      </form>
    </div>
  );
}

export function LandingFooter() {
  const { signedIn } = useEntry();
  return (
    // Figma 18590:19178
    <footer className="relative overflow-hidden bg-[var(--color-bg-page)]">
      {/* Figma I18590:19178;18590:16552 — the 1260 block, 172 px down. */}
      <div className="relative mx-auto w-full max-w-[1260px] px-8 pb-16 pt-40 xl:px-0 xl:pb-[54px] xl:pt-[172px]">
        <div className="relative">
          {/* Figma I18590:19178;18590:16553 "Logo Text Bottom" — 1260 × 249.4. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${ASSET}/wordmark.svg`} alt="" width={1260} height={249} className="pointer-events-none absolute left-0 top-0 block h-auto w-full" />

          {/* Figma I18590:19178;18590:16559 — 160 px down at 1260 wide (12.698%), gap 80. */}
          <div className="relative flex flex-col gap-40 pt-[12.698%]">
            {/* Figma I18590:19178;18590:16560 */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-16 md:grid-cols-4 xl:flex xl:items-start xl:justify-between">
              <nav aria-label="Footer" className="contents">
                {COLUMNS.map((col) => (
                  <div key={col.title} data-figma={col.node} className={cn("flex flex-col gap-12", col.width)}>
                    <h2 className="text-md font-semibold leading-md tracking-wide text-[color:var(--color-text-primary)]">
                      {col.title}
                    </h2>
                    <div className="flex flex-col gap-8">
                      {col.links.map((link) => (
                        <FooterItem key={link.label} link={link.label === "Sign In" && signedIn ? { label: "Open IDEEZA", href: "/" } : link} />
                      ))}
                    </div>
                  </div>
                ))}
              </nav>

              {/* Figma I18590:19178;18716:38700 — newsletter, then socials (gap 44). */}
              <div className="col-span-2 flex w-full max-w-[420px] flex-col gap-[44px] md:col-span-4 xl:w-[309px] xl:max-w-none">
                <Newsletter />
                <div className="flex flex-wrap items-center gap-5">
                  {SOCIALS.map((s) => (
                    <SocialTile key={s.name} social={s} />
                  ))}
                </div>
              </div>
            </div>

            {/* Figma I18590:19178;18590:16618 — logo and copyright. */}
            <div className="flex flex-col items-start gap-8 sm:flex-row sm:items-center sm:justify-between">
              {/* Figma I18590:19178;18716:44203 — 68.8 × 32, the mark 3.17 px down. */}
              <Link
                href="/landing"
                aria-label="IDEEZA home"
                className="flex h-[32px] w-[68.8px] shrink-0 items-start rounded-xs focus-visible:outline-none focus-visible:shadow-focus-brand"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${ASSET}/logo.svg`} alt="IDEEZA" width={68.8} height={28.868} className="mt-[3.17px] block h-[28.868px] w-[68.8px]" />
              </Link>
              <p className="text-md font-medium leading-md tracking-normal text-[color:var(--color-text-tertiary)] sm:whitespace-nowrap">
                © 2026 ideeza.com Technology Limited. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
