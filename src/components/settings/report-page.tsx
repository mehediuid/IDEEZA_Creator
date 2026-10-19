"use client";

// /settings/report (User Panel V2 Policy & Privacy | Report 22550:48543,
// expanded 22550:48600). The Figma lists notices about reports against your
// work, each opening to its reasons and an Appeal. Nobody reviews reports in
// the app yet, so that list would always be empty and Appeal would go
// nowhere (Phase 2): the page says so plainly. What does exist is every
// report you made — profiles, posts, comments, messages and problem reports —
// shown in the Figma's opening rows, each with what, when, why and its status
// (lib/data/reports.ts).

import * as React from "react";
import Link from "next/link";
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  Bug01Icon,
  Comment01Icon,
  Image01Icon,
  Message01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { parseStored, useStoredKey } from "@/lib/key-store";
import { MESSAGES_KEY } from "@/lib/messages/types";
import { normalizeMessages } from "@/lib/messages/normalize";
import { directory, personById, profileHrefOf } from "@/lib/people/ids";
import { REPORTS_KEY, normalizeReports } from "@/lib/people/reports";
import { normalizeSentReports, reportsYouMade, SENT_REPORTS_KEY, type MadeKind, type ReportRow } from "@/lib/data/reports";
import { useDates } from "@/lib/settings/use-dates";
import { SettingsCard } from "./settings-card";
import { SettingsFrame } from "./settings-frame";
import { usePostLookup, useStoredThreads } from "./use-data-reads";

const REPORTED_POSTS_KEY = "ideeza:innovations:reported-posts";
const NOTE = "m-0 max-w-[62ch] text-md leading-md text-text-secondary";

const KIND_ICON: Record<MadeKind, IconValue> = {
  profile: UserIcon,
  post: Image01Icon,
  comment: Comment01Icon,
  message: Message01Icon,
  problem: Bug01Icon,
};

const SAMPLE_PEOPLE = directory({ name: "", latinName: "" });

function useReportsYouMade(): ReportRow[] | null {
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

export function ReportPage() {
  const rows = useReportsYouMade();
  return (
    <SettingsFrame page="report">
      <SettingsCard
        id="made"
        title="Reports you made"
        description="Every report you sent from this browser. Nobody reviews reports in the app yet, so each one is received and not reviewed."
      >
        {rows === null ? null : rows.length === 0 ? (
          <p className={`${NOTE} pt-[8px]`}>
            You haven&apos;t reported anything from this browser. To report a profile, a post, a comment or a message, use its ⋯ menu.
          </p>
        ) : (
          <ul role="list" className="m-0 flex flex-col pl-0">
            {rows.map((r) => (
              <ReportItem key={r.id} row={r} />
            ))}
          </ul>
        )}
      </SettingsCard>

      <SettingsCard
        id="about-you"
        title="Reports about your work"
        description="Nobody reviews reports in the app yet, so nothing has been decided about your projects, posts or blogs. When reviews start, each decision will show here with its reasons and a way to appeal."
      />
    </SettingsFrame>
  );
}

function ReportItem({ row }: { row: ReportRow }) {
  const dates = useDates();
  const [open, setOpen] = React.useState(false);
  const panelId = React.useId();
  return (
    <li className="border-b border-solid border-border last:border-b-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="-mx-[8px] flex min-h-[44px] w-[calc(100%+16px)] items-start gap-[12px] rounded-lg px-[8px] py-[12px] text-left outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        <span aria-hidden className="mt-[2px] flex size-[32px] shrink-0 items-center justify-center rounded-full bg-bg-brand-subtle text-text-brand">
          <Icon icon={KIND_ICON[row.kind]} size={16} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
          <span className="text-md font-medium leading-md text-text-primary [overflow-wrap:anywhere]">{row.what}</span>
          <span className="text-sm leading-sm text-text-tertiary">
            {row.at !== null ? dates.dateTime(row.at) : "Date not kept"} · {row.status}
          </span>
        </span>
        <span aria-hidden className="mt-[6px] shrink-0 text-text-tertiary">
          <Icon icon={open ? ArrowUp01Icon : ArrowDown01Icon} size={20} />
        </span>
      </button>
      {open && (
        <div id={panelId} className="mb-[12px] ml-[44px] flex flex-col gap-[8px] rounded-lg bg-bg-subtle px-[12px] py-[12px]">
          {row.quote && <p className="m-0 max-w-[62ch] text-md leading-md text-text-primary [overflow-wrap:anywhere]">“{row.quote}”</p>}
          <dl className="m-0 grid grid-cols-[max-content_1fr] gap-x-[16px] gap-y-[4px] text-md leading-md">
            <dt className="text-text-tertiary">Reason</dt>
            <dd className="m-0 text-text-primary">{row.reason ?? "Not kept for this kind of report"}</dd>
            {row.note && (
              <>
                <dt className="text-text-tertiary">Your note</dt>
                <dd className="m-0 text-text-primary [overflow-wrap:anywhere]">{row.note}</dd>
              </>
            )}
            {row.ref && (
              <>
                <dt className="text-text-tertiary">Reference</dt>
                <dd className="m-0 text-text-primary">{row.ref}</dd>
              </>
            )}
            <dt className="text-text-tertiary">Status</dt>
            <dd className="m-0 text-text-primary">
              {row.status}
              {row.kind === "problem" ? ". We can't reply in the app yet." : "."}
            </dd>
          </dl>
          {row.href && (
            <Link
              href={row.href}
              className="w-fit rounded-sm text-md font-medium leading-md text-text-brand underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              {row.kind === "profile" ? "Open the profile" : row.kind === "message" ? "Open the conversation" : "Open the post"}
            </Link>
          )}
        </div>
      )}
    </li>
  );
}
