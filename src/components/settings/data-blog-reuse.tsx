"use client";

// Settings › AI & your data › Blog reuse: the blogs where you chose "Give
// access to IDEEZA to future use", each with Revoke and, with two or more,
// Revoke all. A blog IDEEZA has already shared can't be revoked here (the
// blog's own lock rule, lib/data/blog-reuse.ts); its row offers support.

import * as React from "react";
import Link from "next/link";
import { Button, ConfirmDialog, buttonVariants } from "@/components/ideeza";
import { REUSE_SCOPE, supportTopic } from "@/lib/blog/consent";
import { dayDate } from "@/lib/blog/dates";
import { updateBlog, useBlog } from "@/lib/blog/store";
import { askBlogSupport } from "@/lib/blog/support";
import { reuseGrants, revokeReuse, type ReuseGrant } from "@/lib/data/blog-reuse";
import { cn } from "@/lib/utils";
import { SAVE_FAILED, SettingsCard, SettingsRow } from "./settings-card";

const NOTE = "m-0 max-w-[62ch] text-md leading-md text-text-secondary";
/** 44 px tall where the pointer is a finger. */
const TAP = "[@media(pointer:coarse)]:h-[var(--touch-min)]";

export function BlogReuseCard() {
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
          <Button type="button" hierarchy="secondary" size="sm" className={TAP} onClick={() => setConfirmAll(true)}>
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
          <Link href="/blog" className={buttonVariants({ hierarchy: "ghost", size: "sm", className: `-ml-[12px] ${TAP}` })}>
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
                <Button type="button" hierarchy="ghost" size="sm" className={TAP} onClick={() => askBlogSupport(supportTopic(g.title))}>
                  Contact support
                </Button>
              ) : (
                <Button type="button" hierarchy="secondary" size="sm" className={TAP} aria-label={`Revoke access to “${g.title}”`} onClick={() => revoke([g])}>
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
