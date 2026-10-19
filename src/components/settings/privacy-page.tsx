"use client";

// /settings/privacy (User Panel V2 Policy & Privacy › Privacy 22048:35155).
// Figma's card "Social Share" held two Facebook rows and "Link with search
// engine"; the Facebook rows wait for connected accounts (D15), so the card
// keeps the one row and is called "Search". Off (the default) puts
// <meta name="robots" content="noindex"> on your profile page
// (profile-robots.tsx). Two cards the interviews asked for follow: the blogs
// where you gave IDEEZA "future use", each with Revoke and a Revoke all, and
// a plain statement of what this app keeps and where (spec §5.12).

import * as React from "react";
import Link from "next/link";
import { CookieIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, ConfirmDialog, Toggle, buttonVariants } from "@/components/ideeza";
import { REUSE_SCOPE, supportTopic } from "@/lib/blog/consent";
import { dayDate } from "@/lib/blog/dates";
import { updateBlog, useBlog } from "@/lib/blog/store";
import { askBlogSupport } from "@/lib/blog/support";
import { reuseGrants, revokeReuse, type ReuseGrant } from "@/lib/data/blog-reuse";
import { updateSettings } from "@/lib/settings/prefs";
import { cn } from "@/lib/utils";
import { useSettings } from "@/lib/settings/use-settings";
import { SAVE_FAILED, SettingsCard, SettingsRow } from "./settings-card";
import { SettingsFrame } from "./settings-frame";

const NOTE = "m-0 max-w-[62ch] text-md leading-md text-text-secondary";

export function PrivacyPage() {
  return (
    <SettingsFrame page="privacy">
      <SearchCard />
      <BlogReuseCard />
      <CookiesCard />
    </SettingsFrame>
  );
}

function SearchCard() {
  const on = useSettings().privacy.searchEngines;
  const [failed, setFailed] = React.useState(false);
  return (
    <SettingsCard id="search" title="Search">
      <SettingsRow
        id="search-engines"
        label="Link with search engine"
        help="When this setting is on, search engines may link to your profile in their results."
        control={
          <Toggle
            checked={on}
            aria-label="Link with search engine"
            onChange={() => setFailed(!updateSettings("privacy", { searchEngines: !on }))}
          />
        }
      />
      {failed && (
        <p role="alert" className="m-0 pt-[8px] text-md leading-md text-text-error">
          {SAVE_FAILED}
        </p>
      )}
    </SettingsCard>
  );
}

function BlogReuseCard() {
  const { hydrated, data, unreadable } = useBlog();
  const grants = React.useMemo(() => reuseGrants(data), [data]);
  const open = grants.filter((g) => !g.sharedOn);
  const [confirmAll, setConfirmAll] = React.useState(false);
  const [said, setSaid] = React.useState<{ text: string; error: boolean } | null>(null);

  const revoke = (list: readonly ReuseGrant[]) => {
    const res = updateBlog((d) => revokeReuse(d, list.map((g) => g.id), Date.now()));
    if (!res.ok) {
      setSaid({
        text: res.cause === "unreadable" ? "Your blogs can't be read in this browser, so nothing was changed." : SAVE_FAILED,
        error: true,
      });
      return;
    }
    setSaid({
      text:
        list.length === 1
          ? `IDEEZA can no longer reuse “${list[0].title}”.`
          : `IDEEZA can no longer reuse your ${list.length} blogs.`,
      error: false,
    });
  };

  return (
    <SettingsCard
      id="blog-reuse"
      title="Blog reuse"
      description={`The blogs where you chose “Give access to IDEEZA to future use”. ${REUSE_SCOPE}`}
      action={
        open.length > 1 ? (
          <Button type="button" hierarchy="secondary" size="sm" onClick={() => setConfirmAll(true)}>
            Revoke all
          </Button>
        ) : null
      }
    >
      {!hydrated ? null : unreadable ? (
        <p className={NOTE}>Your blogs can&apos;t be read in this browser, so nothing here can change.</p>
      ) : grants.length === 0 ? (
        <div className="flex flex-col items-start gap-[8px] pt-[8px]">
          <p className={NOTE}>No blog gives IDEEZA access for future use. You choose it when you publish a blog, and you can take it back here.</p>
          <Link href="/blog" className={buttonVariants({ hierarchy: "ghost", size: "sm", className: "-ml-[12px]" })}>
            Go to your blogs
          </Link>
        </div>
      ) : (
        <div className="flex flex-col">
          {grants.map((g) => (
          <SettingsRow
            key={g.id}
            label={
              <Link href={g.href} className="rounded-sm text-text-primary outline-none hover:text-text-brand focus-visible:ring-2 focus-visible:ring-border-focus">
                {g.title}
              </Link>
            }
            help={
              g.sharedOn
                ? `Shared on ${g.sharedOn.where} · ${dayDate(g.sharedOn.at)}. This can't be taken back here. Contact support to change it.`
                : g.at
                  ? `Access given ${dayDate(g.at)}`
                  : "Access given"
            }
            control={
              g.sharedOn ? (
                <Button type="button" hierarchy="ghost" size="sm" onClick={() => askBlogSupport(supportTopic(g.title))}>
                  Contact support
                </Button>
              ) : (
                <Button type="button" hierarchy="secondary" size="sm" aria-label={`Revoke access to “${g.title}”`} onClick={() => revoke([g])}>
                  Revoke
                </Button>
              )
            }
          />
          ))}
        </div>
      )}
      <p
        role="status"
        aria-live="polite"
        className={said ? cn("m-0 pt-[8px] text-md leading-md", said.error ? "text-text-error" : "text-text-secondary") : "sr-only"}
      >
        {said?.text ?? ""}
      </p>
      <ConfirmDialog
        open={confirmAll}
        title="Revoke access for all your blogs?"
        confirmLabel="Revoke all"
        onCancel={() => setConfirmAll(false)}
        onConfirm={() => {
          setConfirmAll(false);
          revoke(open);
        }}
      >
        <p className="m-0">
          IDEEZA won&apos;t reuse these {open.length} blogs. To give access again, tick “Give access to IDEEZA to future use” when you next publish or
          update a blog.
          {grants.length > open.length && " A blog IDEEZA has already shared stays as it is."}
        </p>
      </ConfirmDialog>
    </SettingsCard>
  );
}

const COOKIE_LINES: React.ReactNode[] = [
  "IDEEZA sets no cookies of its own, and the app has no analytics or advertising trackers.",
  <>
    Your theme, your settings and your work are kept in this browser&apos;s storage, not in cookies. Clearing this browser&apos;s site data removes
    them, so keep a copy with{" "}
    <Link href="/settings/personal-data" className="rounded-sm text-text-brand underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-border-focus">
      Download your information
    </Link>
    .
  </>,
  "The last few errors on a page are kept in that tab only. They are sent only when you send a problem report with “Send page and device details” ticked.",
];

function CookiesCard() {
  return (
    <SettingsCard id="cookies" title="Cookies and analytics">
      <ul role="list" className="m-0 flex flex-col gap-[10px] pl-0 pt-[8px]">
        {COOKIE_LINES.map((line, i) => (
          <li key={i} className="flex items-start gap-[10px] text-md leading-md text-text-secondary">
            <span aria-hidden className="mt-[2px] shrink-0 text-text-tertiary">
              <Icon icon={CookieIcon} size={16} />
            </span>
            <span className="max-w-[62ch]">{line}</span>
          </li>
        ))}
      </ul>
    </SettingsCard>
  );
}
