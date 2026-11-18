"use client";

// Settings › AI & your data › Blog reuse (mobile Figma "Settings · 2026
// update" 10688:2): ST-62 the list with Revoke on each and Revoke access for
// all your blogs, ST-62b its destructive confirm, ST-62c empty. What is
// listed is the web's (lib/data/blog-reuse.ts): your blogs where you chose
// "Give access to IDEEZA to future use" (what that means is the list's ⓘ;
// Revoke access for all is the red row at the foot). A blog IDEEZA has already shared
// is locked by the blog's own rule; only support can change it.

import * as React from "react";
import { News01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ideeza/button";
import { REUSE_SCOPE } from "@/lib/blog/consent";
import { updateBlog, useBlog } from "@/lib/blog/store";
import { reuseGrants, revokeReuse, type ReuseGrant } from "@/lib/data/blog-reuse";
import { useDates } from "@/lib/settings/use-dates";
import { ConfirmSheet } from "../kit/confirm-sheet";
import { EmptyState } from "../kit/state";
import { useOnline } from "../kit/states";
import { useToast } from "../kit/toast";
import { SaveFailed, SettingsGroup, SettingsNote, SettingsRow, SettingsScreen, useSaver } from "./kit";

export function BlogReuseSettings() {
  const { hydrated, data, unreadable } = useBlog();
  const grants = React.useMemo(() => reuseGrants(data), [data]);
  const open = grants.filter((g) => !g.sharedOn);
  const dates = useDates();
  const online = useOnline();
  const toast = useToast();
  const saver = useSaver();
  const [confirmAll, setConfirmAll] = React.useState(false);
  const off = !online || unreadable;

  const revoke = (list: readonly ReuseGrant[]) => {
    const ok = saver.run("blogs", () => updateBlog((d) => revokeReuse(d, list.map((g) => g.id), Date.now())).ok);
    if (ok) toast({ title: list.length === 1 ? `IDEEZA can no longer reuse “${list[0].title}”` : `IDEEZA can no longer reuse your ${list.length} blogs` });
  };

  const day = (at: number) => dates.date(at, { style: "medium" });

  return (
    <SettingsScreen title="Blog reuse" loading={!hydrated}>
      {unreadable ? (
        <SettingsNote>Your blogs can’t be read on this phone, so nothing here can change.</SettingsNote>
      ) : grants.length === 0 ? (
        <EmptyState
          icon={News01Icon}
          title="No blog gives IDEEZA access"
          body="You choose “Give access to IDEEZA to future use” when you publish a blog, and you can take it back here."
        />
      ) : (
        <>
          <SettingsGroup
            label="Blogs IDEEZA can reuse"
            info={{
              title: "Blog reuse",
              body: (
                <>
                  <p>The blogs where you chose “Give access to IDEEZA to future use”.</p>
                  <p>{REUSE_SCOPE}</p>
                </>
              ),
            }}
          >
            {grants.map((g) => (
              <SettingsRow
                key={g.id}
                label={<span className="[overflow-wrap:anywhere]">{g.title}</span>}
                helper={
                  g.sharedOn
                    ? `Shared on ${g.sharedOn.where} · ${day(g.sharedOn.at)}. This can’t be taken back here. Contact support to change it.`
                    : g.at
                      ? `Access given ${day(g.at)}`
                      : "Access given"
                }
                trailing={
                  g.sharedOn ? undefined : (
                    <Button hierarchy="secondary" size="sm" className="shrink-0" disabled={off} aria-label={`Revoke access to “${g.title}”`} onClick={() => revoke([g])}>
                      Revoke
                    </Button>
                  )
                }
              />
            ))}
          </SettingsGroup>
          <SaveFailed saver={saver} group="blogs" />
          {open.length > 1 && (
            <SettingsGroup>
              <SettingsRow id="revoke-all" label="Revoke access for all your blogs" danger onClick={() => setConfirmAll(true)} disabled={off} />
            </SettingsGroup>
          )}
        </>
      )}
      <ConfirmSheet
        open={confirmAll}
        onClose={() => setConfirmAll(false)}
        title="Revoke access for all your blogs?"
        destructive
        verb="Revoke all"
        body={`IDEEZA won’t reuse these ${open.length} blogs. To give access again, tick “Give access to IDEEZA to future use” when you next publish or update a blog.${grants.length > open.length ? " A blog IDEEZA has already shared stays as it is." : ""}`}
        onConfirm={() => revoke(open)}
      />
    </SettingsScreen>
  );
}
