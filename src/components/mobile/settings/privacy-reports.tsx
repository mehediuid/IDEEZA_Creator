"use client";

// Settings › Privacy & safety › Your reports (mobile Figma "Settings · 2026
// update" 10688:2): ST-35 the list with each report's status, ST-35b one
// report read-only in a sheet (What, Reason, Sent, Status; KIT-RB-32b's note,
// reference and Open), ST-35c empty; Shared kit KIT-RB-32 / 32b / 33b.
// The reports are the web's (components/settings/your-reports.tsx,
// lib/data/reports.ts): every report this browser sent — profiles, posts,
// comments, messages and problem reports. Nobody reviews them in the app yet,
// so each reads received, not reviewed; nothing here changes them.

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bug01Icon, Comment01Icon, Flag01Icon, Image01Icon, Message01Icon, UserIcon } from "@hugeicons/core-free-icons";
import { type IconValue } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { usePostLookup, useStoredThreads } from "@/components/settings/use-data-reads";
import { normalizeSentReports, reportsYouMade, SENT_REPORTS_KEY, type MadeKind, type ReportRow } from "@/lib/data/reports";
import { parseStored, useStoredKey } from "@/lib/key-store";
import { normalizeMessages } from "@/lib/messages/normalize";
import { MESSAGES_KEY } from "@/lib/messages/types";
import { directory, personById, profileHrefOf } from "@/lib/people/ids";
import { REPORTS_KEY, normalizeReports } from "@/lib/people/reports";
import { useDates } from "@/lib/settings/use-dates";
import { Sheet } from "../kit/sheet";
import { cn } from "@/lib/utils";
import { EmptyState } from "../kit/state";
import { LIST_CARD, LIST_DIVIDERS } from "../kit/list";
import { T } from "../type";
import { SettingsGroup, SettingsNote, SettingsRow, SettingsScreen } from "./kit";

const REPORTED_POSTS_KEY = "ideeza:innovations:reported-posts";
const SAMPLE_PEOPLE = directory({ name: "", latinName: "" });

const KIND_ICON: Record<MadeKind, IconValue> = {
  profile: UserIcon,
  post: Image01Icon,
  comment: Comment01Icon,
  message: Message01Icon,
  problem: Bug01Icon,
};

const KIND_TITLE: Record<MadeKind, string> = {
  profile: "Report profile",
  post: "Report post",
  comment: "Report comment",
  message: "Report message",
  problem: "Problem report",
};

const OPEN_LABEL: Record<MadeKind, string> = {
  profile: "Open the profile",
  post: "Open the post",
  comment: "Open the post",
  message: "Open the conversation",
  problem: "",
};

/** Every report you made, newest first; null until every source is read. */
export function useReportsYouMade(): ReportRow[] | null {
  const profiles = useStoredKey(REPORTS_KEY);
  const posts = useStoredKey(REPORTED_POSTS_KEY);
  const messages = useStoredKey(MESSAGES_KEY);
  const problems = useStoredKey(SENT_REPORTS_KEY);
  const threads = useStoredThreads();
  const { hydrated: projectsRead, post } = usePostLookup();
  const ready = profiles.hydrated && posts.hydrated && messages.hydrated && problems.hydrated && projectsRead && threads !== null;
  return React.useMemo(() => {
    if (!ready || !threads) return null;
    const postIds = parseStored(posts.raw).value;
    return reportsYouMade(
      {
        profiles: normalizeReports(parseStored(profiles.raw).value),
        posts: Array.isArray(postIds) ? postIds.filter((x): x is string => typeof x === "string") : [],
        comments: threads,
        messages: normalizeMessages(parseStored(messages.raw).value),
        problems: normalizeSentReports(parseStored(problems.raw).value),
      },
      {
        person: (id) => personById(SAMPLE_PEOPLE, id)?.name ?? null,
        personHref: (id) => profileHrefOf(id),
        post: (id) => post(id),
      },
    );
  }, [ready, threads, posts.raw, profiles.raw, messages.raw, problems.raw, post]);
}

/** The web's safety line: IDEEZA can't act in real time. */
function Emergency() {
  return (
    <p className={T.rowTitle}>
      If you or someone else is in danger, contact your local emergency services now. IDEEZA can’t act in real time.
    </p>
  );
}

export function YourReportsSettings() {
  const rows = useReportsYouMade();
  const dates = useDates();
  const [openId, setOpenId] = React.useState<string | null>(null);
  // Kept while the sheet slides away, so its words don't blank out.
  const [shown, setShown] = React.useState<ReportRow | null>(null);
  const open = (r: ReportRow) => {
    setShown(r);
    setOpenId(r.id);
  };

  return (
    <SettingsScreen title="Your reports" loading={rows === null} offlineNote={false}>
      <Emergency />
      {rows && rows.length === 0 ? (
        <EmptyState
          icon={Flag01Icon}
          title="You haven’t reported anything"
          body="To report a profile, a post, a comment or a message, use its ⋯ menu."
        />
      ) : (
        <>
          <SettingsGroup>
            {(rows ?? []).map((r) => (
              <SettingsRow
                key={r.id}
                icon={KIND_ICON[r.kind]}
                label={<span className="[overflow-wrap:anywhere]">{r.what}</span>}
                helper={
                  <span className="flex flex-col items-start gap-2">
                    <span>{[r.reason, r.at !== null ? dates.date(r.at) : "Date not kept"].filter(Boolean).join(" · ")}</span>
                    <Badge tone="warning">{r.status}</Badge>
                  </span>
                }
                onClick={() => open(r)}
              />
            ))}
          </SettingsGroup>
          <SettingsNote>Every report you sent from this browser. Nobody reviews reports in the app yet, so each one is received and not reviewed.</SettingsNote>
        </>
      )}
      <ReportSheet row={shown} open={openId !== null} onClose={() => setOpenId(null)} />
    </SettingsScreen>
  );
}

/** ST-35b / KIT-RB-32b: one report, read-only. */
function ReportSheet({ row, open, onClose }: { row: ReportRow | null; open: boolean; onClose: () => void }) {
  const router = useRouter();
  const dates = useDates();
  if (!row) return null;
  const href = row.href;
  const lines: [string, React.ReactNode][] = [
    ["What", row.what],
    ["Reason", row.reason ?? "Not kept for this kind of report"],
    ...(row.note ? ([["Your note", row.note]] as [string, React.ReactNode][]) : []),
    ...(row.ref ? ([["Reference", row.ref]] as [string, React.ReactNode][]) : []),
    ["Sent", row.at !== null ? dates.dateTime(row.at, { style: "medium" }) : "Date not kept"],
    ["Status", <Badge key="status" tone="warning">{row.status}</Badge>],
  ];
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={KIND_TITLE[row.kind]}
      actions={
        <>
          {href && (
            <Button size="xl" className="w-full" onClick={() => router.push(href)}>
              {OPEN_LABEL[row.kind]}
            </Button>
          )}
          <Button hierarchy="secondary" size="xl" className="w-full" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      {row.quote && <p className={cn(T.body, "text-text-primary [overflow-wrap:anywhere]")}>“{row.quote}”</p>}
      <dl className={cn(LIST_CARD, LIST_DIVIDERS, "rounded-lg bg-transparent")}>
        {lines.map(([term, value]) => (
          <div key={term} className="flex items-start justify-between gap-8 px-8 py-6">
            <dt className={cn(T.body, "shrink-0")}>{term}</dt>
            <dd className={cn(T.body, "min-w-0 text-right text-text-primary [overflow-wrap:anywhere]")}>{value}</dd>
          </div>
        ))}
      </dl>
      <p className={T.meta}>
        {row.kind === "problem" ? "We can’t reply in the app yet." : "Nobody reviews reports in the app yet."}
      </p>
    </Sheet>
  );
}
