"use client";

// Report a problem on the phone (/m/help/report?from=<screen>; mobile Figma
// "Report a Issue" and Help's "Help and feedback" form — one report, one
// home). The web's Report a problem decides the fields and words
// (lib/support/problem-report.ts): what it's about, how much it's in the way
// (not asked for an idea), one box whose question follows the kind (the
// title is made from its first line, so there is no separate title), up to 3
// screenshots shrunk in the browser, the page it is about (captured from
// where you came, not typed) and "Send page and device details" (unticked).
// It goes to /api/reports; "Report sent" gives the reference to quote.
// Offline or a failed send keeps everything for Try again. The words and
// picks are the web's draft (`ideeza:report-draft`), so leaving the screen
// or reloading loses nothing but the screenshots (kept in memory only, and
// it says so); a link may fill an empty draft (`?details=`, `?kind=`).

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { CheckmarkCircle02Icon, Delete02Icon, Upload04Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button } from "@/components/ideeza/button";
import { Checkbox, Radio } from "@/components/ideeza/checkbox";
import { Spinner } from "@/components/ideeza/spinner";
import { Textarea } from "@/components/ideeza/text-input";
import { Field, useFieldIds } from "@/components/auth/auth-parts";
import { rememberSentReport } from "@/lib/data/reports";
import { deviceOf, namesFor, pageRefFor, placeLine } from "@/lib/support/page-context";
import { useManualProjects } from "@/lib/manual/projects";
import {
  DETAILS_COUNTER_FROM,
  DETAILS_MAX,
  IMAGES_MAX,
  IMPACTS,
  KINDS,
  admitImages,
  asksImpact,
  detailsCopy,
  draftErrors,
  isImpact,
  isKind,
  isReportId,
  titleOf,
  type ReportContext,
  type ReportImpact,
  type ReportKind,
  type ReportPayload,
} from "@/lib/support/problem-report";
import { recentErrors } from "@/lib/support/recent-errors";
import { imageFilesOf, shrinkFile, type ReportImage } from "@/lib/support/report-images";
import { cn } from "@/lib/utils";
import { BottomBar } from "../kit/bottom-bar";
import { Sheet } from "../kit/sheet";
import { SheetSelect } from "../kit/sheet-select";
import { OfflineBanner, useOnline } from "../kit/states";
import { useGoBack } from "../nav-trail";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { T } from "../type";

/** A report's id: 32 hex digits, minted with the draft so a retry sends the same report. */
export function newReportId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** What the phone can say about where you were: the screen you came from, this browser, this window. */
export function phoneContext(from: string): ReportContext {
  const [path, query = ""] = from.split("?");
  const ref = pageRefFor(path, query);
  const { browser, os } = deviceOf(navigator.userAgent, navigator.maxTouchPoints);
  const dark = document.documentElement.getAttribute("data-theme") === "dark" || window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  return {
    page: ref.page,
    route: ref.route,
    browser,
    os,
    viewport: `${window.innerWidth}×${window.innerHeight}`,
    theme: dark ? "Dark" : "Light",
    errors: recentErrors(),
  };
}

/** Sends a report to the team: its reference, or null when it didn't arrive. */
export async function postReport(payload: ReportPayload & { images: { width: number; height: number }[] }, images: readonly ReportImage[]): Promise<{ status: number; ref: string | null }> {
  const body = new FormData();
  body.set("report", JSON.stringify(payload));
  images.forEach((im, i) => body.set(`image${i}`, im.blob, `${i + 1}`));
  const res = await fetch("/api/reports", { method: "POST", body });
  const data = (await res.json().catch(() => null)) as { ok?: boolean; ref?: string } | null;
  return { status: res.status, ref: res.ok && data?.ok ? (data.ref ?? null) : null };
}

type Shot = ReportImage & { url: string };

/** The web's unsent draft (components/support/report-problem.tsx): one per browser, words only. */
const DRAFT_KEY = "ideeza:report-draft";
type Draft = { id: string; kind: ReportKind | null; impact: ReportImpact | null; details: string; includeContext: boolean };

function loadDraft(): Draft {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null") as Record<string, unknown> | null;
    if (d && isReportId(d.id))
      return {
        id: d.id,
        kind: isKind(d.kind) ? d.kind : null,
        impact: isImpact(d.impact) ? d.impact : null,
        details: typeof d.details === "string" ? d.details.slice(0, DETAILS_MAX) : "",
        includeContext: d.includeContext === true,
      };
  } catch {
    // Unreadable or blocked storage: a fresh draft.
  }
  return { id: newReportId(), kind: null, impact: null, details: "", includeContext: false };
}

function keepDraft(d: Draft): void {
  try {
    if (!d.kind && !d.impact && !d.details.trim()) localStorage.removeItem(DRAFT_KEY);
    else localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  } catch {
    // A full or blocked storage only costs the draft's survival of a reload.
  }
}

function dropDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Nothing to drop.
  }
}

export function ReportScreen() {
  const params = useSearchParams();
  const online = useOnline();
  const raw = params.get("from") ?? "";
  const from = raw.startsWith("/m") ? raw : "/m/help";
  const done = useGoBack(from);
  const [taken] = React.useState(() => phoneContext(from));
  // The project and product it is about, by name, as the web's report says them (once this browser's projects are read).
  const { projects } = useManualProjects();
  const context = React.useMemo(() => {
    const [path, query = ""] = from.split("?");
    return { ...taken, ...namesFor(pageRefFor(path, query), projects, null) };
  }, [taken, from, projects]);
  const ids = useFieldIds(["kind", "impact", "details", "images"] as const);
  // The draft as kept; a link's `?details=` / `?kind=` fill only what it leaves empty (the web's prefill rule).
  const [start] = React.useState<Draft>(() => {
    const d = loadDraft();
    const prefill = params.get("details")?.trim();
    const k = params.get("kind");
    return {
      ...d,
      details: prefill && !d.details.trim() ? prefill.slice(0, DETAILS_MAX) : d.details,
      kind: !d.kind && isKind(k) ? k : d.kind,
    };
  });
  const [id, setId] = React.useState(start.id);
  const [kind, setKind] = React.useState<ReportKind | null>(start.kind);
  const [impact, setImpact] = React.useState<ReportImpact | null>(start.impact);
  const [details, setDetails] = React.useState(start.details);
  const [shots, setShots] = React.useState<Shot[]>([]);
  const [preparing, setPreparing] = React.useState(0);
  const [imageNote, setImageNote] = React.useState<string | null>(null);
  const [includeContext, setIncludeContext] = React.useState(start.includeContext);
  const [tried, setTried] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [sendError, setSendError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const shotsRef = React.useRef<Shot[]>([]);

  React.useEffect(() => {
    shotsRef.current = shots;
  }, [shots]);
  React.useEffect(() => () => shotsRef.current.forEach((s) => URL.revokeObjectURL(s.url)), []);
  // Every change is kept, so leaving the screen (or a reload) loses nothing typed; a sent report clears it.
  React.useEffect(() => {
    if (!sent) keepDraft({ id, kind, impact, details, includeContext });
  }, [id, kind, impact, details, includeContext, sent]);

  const errors = tried ? draftErrors({ kind, impact, details }) : [];
  const errorOf = (f: "kind" | "impact" | "details") => errors.find((e) => e.field === f)?.message;
  const copy = detailsCopy(kind);

  const addFiles = async (files: File[]) => {
    const { take, note } = admitImages(shots.length + preparing, files.length);
    setImageNote(note);
    const picked = files.slice(0, take);
    if (!picked.length) return;
    setPreparing((p) => p + picked.length);
    for (const file of picked) {
      const r = await shrinkFile(file, newReportId());
      setPreparing((p) => p - 1);
      if (r.ok) setShots((s) => [...s, { ...r.image, url: URL.createObjectURL(r.image.blob) }].slice(0, IMAGES_MAX));
      else setImageNote(r.reason);
    }
  };

  const remove = (key: string) =>
    setShots((s) => {
      const gone = s.find((x) => x.key === key);
      if (gone) URL.revokeObjectURL(gone.url);
      return s.filter((x) => x.key !== key);
    });

  const send = async () => {
    if (sending || preparing) return;
    setTried(true);
    const errs = draftErrors({ kind, impact, details });
    if (errs.length) {
      document.getElementById(ids[errs[0].field].id)?.focus();
      return;
    }
    if (!online) {
      setSendError("You’re offline. Your report is kept here, so send it when you’re back online.");
      return;
    }
    setSending(true);
    setSendError(null);
    const k = kind as ReportKind;
    const payload = {
      id,
      kind: k,
      impact: asksImpact(k) ? impact : null,
      details: details.trim(),
      title: titleOf(details, k),
      context: includeContext ? context : null,
      images: shots.map((s) => ({ width: s.width, height: s.height })),
    };
    try {
      let r = await postReport(payload, shots);
      if (r.status === 409) {
        const fresh = newReportId();
        setId(fresh);
        r = await postReport({ ...payload, id: fresh }, shots);
      }
      if (!r.ref) throw new Error(`status ${r.status}`);
      rememberSentReport({ ref: r.ref, kind: k, title: payload.title, at: Date.now() });
      dropDraft();
      setSent(r.ref);
    } catch {
      setSendError("Couldn’t send your report. Nothing was lost, so try again.");
    } finally {
      setSending(false);
    }
  };

  const count = details.trim().length;
  return (
    <Screen
      top={<TopBar back={from} title="Report a problem" />}
      className="px-8 pb-8 pt-4"
      footer={
        <BottomBar>
          {sendError && (
            <p role="alert" className={cn(T.caption, "text-text-error")}>
              {sendError}
            </p>
          )}
          <Button size="xl" className="w-full" loading={sending} disabled={preparing > 0} onClick={send}>
            {sending ? "Sending…" : sendError ? "Try again" : "Send report"}
          </Button>
        </BottomBar>
      }
    >
      <div className="flex flex-col gap-8">
        <OfflineBanner />
        <Field label="What’s it about?*" htmlFor={ids.kind.id} error={errorOf("kind")} errorId={ids.kind.errorId}>
          <SheetSelect
            id={ids.kind.id}
            title="What’s it about?"
            placeholder="Choose one"
            value={kind ?? ""}
            options={KINDS.map((k) => ({ value: k.value, label: k.sub ? `${k.label}: ${k.sub}` : k.label }))}
            onChange={(v) => setKind(v as ReportKind)}
            invalid={!!errorOf("kind")}
          />
        </Field>
        {asksImpact(kind) && (
          <fieldset className="flex flex-col gap-4" aria-describedby={errorOf("impact") ? ids.impact.errorId : undefined}>
            <legend id={ids.impact.id} tabIndex={-1} className={cn(T.label, "pb-4 outline-none")}>
              How much is this getting in your way?*
            </legend>
            {IMPACTS.map((im) => (
              <label key={im.value} className={cn("relative flex min-h-[44px] cursor-pointer items-center gap-5 rounded-xl border-[length:var(--border-width-1-5)] border-solid px-6 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-border-focus", impact === im.value ? "border-border-brand bg-bg-brand-subtle" : "border-border bg-bg-surface")}>
                <input type="radio" name="impact" className="sr-only" checked={impact === im.value} onChange={() => setImpact(im.value)} />
                <Radio checked={impact === im.value} decorative />
                <span className={cn(T.body, "text-text-primary")}>{im.label}</span>
              </label>
            ))}
            {errorOf("impact") && (
              <p id={ids.impact.errorId} className={cn(T.caption, "text-text-error")}>
                {errorOf("impact")}
              </p>
            )}
          </fieldset>
        )}
        <Field label={`${copy.label}*`} htmlFor={ids.details.id} error={errorOf("details")} errorId={ids.details.errorId}>
          <Textarea
            id={ids.details.id}
            rows={5}
            value={details}
            onValueChange={setDetails}
            placeholder="Write your comments here"
            invalid={!!errorOf("details")}
            aria-describedby={`${ids.details.id}-hint${errorOf("details") ? ` ${ids.details.errorId}` : ""}`}
          />
        </Field>
        <p id={`${ids.details.id}-hint`} className={cn(T.caption, "-mt-6 flex justify-between gap-4 text-text-tertiary")}>
          {copy.hint}
          {count >= DETAILS_COUNTER_FROM && (
            <span className={cn("tabular-nums", count > DETAILS_MAX && "text-text-error")}>
              {count}/{DETAILS_MAX}
            </span>
          )}
        </p>
        <div className="flex flex-col gap-3">
          <span className={T.label}>Page</span>
          <p className={cn(T.bodyLg, "flex h-[44px] items-center rounded-xl bg-bg-subtle px-6 text-text-secondary")}>{placeLine(context)}</p>
        </div>
        <div className="flex flex-col gap-4">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              void addFiles(imageFilesOf(e.target.files));
              e.target.value = "";
            }}
          />
          <button
            type="button"
            id={ids.images.id}
            disabled={shots.length + preparing >= IMAGES_MAX}
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center gap-3 rounded-xl bg-bg-subtle px-8 py-10 text-center outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-60"
          >
            <span aria-hidden className="text-[color:var(--color-icon-default)]">
              <Icon icon={Upload04Icon} size={22} />
            </span>
            <span className={cn(T.body, "text-text-primary")}>Tap to add a screenshot</span>
            <span className={T.meta}>PNG, JPG or WebP · up to {IMAGES_MAX}. Screenshots aren’t kept if you leave this screen.</span>
          </button>
          {(shots.length > 0 || preparing > 0) && (
            <ul className="flex gap-4">
              {shots.map((s) => (
                <li key={s.key} className="relative size-[96px] overflow-hidden rounded-lg bg-bg-subtle">
                  {/* eslint-disable-next-line @next/next/no-img-element -- a local blob preview */}
                  <img src={s.url} alt={s.name} className="size-full object-cover" />
                  <button
                    type="button"
                    aria-label={`Remove ${s.name}`}
                    onClick={() => remove(s.key)}
                    className="absolute right-1 top-1 inline-flex size-[32px] items-center justify-center rounded-full bg-bg-surface text-[color:var(--color-icon-default)] shadow-depth outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  >
                    <Icon icon={Delete02Icon} size={16} />
                  </button>
                </li>
              ))}
              {Array.from({ length: preparing }, (_, i) => (
                <li key={`p${i}`} className="flex size-[96px] items-center justify-center rounded-lg bg-bg-subtle" role="status" aria-label="Preparing the image">
                  <Spinner size={20} />
                </li>
              ))}
            </ul>
          )}
          {imageNote && <p className={T.caption}>{imageNote}</p>}
        </div>
        <label className="relative flex cursor-pointer items-start gap-5 rounded-md has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-border-focus">
          <input type="checkbox" className="sr-only" checked={includeContext} onChange={() => setIncludeContext((v) => !v)} />
          <Checkbox checked={includeContext} decorative className="mt-1" />
          <span className="flex flex-col gap-1">
            <span className={cn(T.body, "text-text-primary")}>Send page and device details</span>
            <span className={T.meta}>
              {placeLine(context)} · {context.browser} on {context.os}
            </span>
          </span>
        </label>
      </div>
      <Sheet
        open={sent !== null}
        onClose={done}
        title="Report sent"
        description="Thanks. The IDEEZA team has it."
        actions={
          <Button size="xl" className="w-full" onClick={done}>
            Done
          </Button>
        }
      >
        <span aria-hidden className="self-center text-text-success">
          <Icon icon={CheckmarkCircle02Icon} size={40} />
        </span>
        <p className={cn(T.body, "text-center text-text-primary")}>
          Your reference is <span className="font-mono font-medium">{sent}</span>. Settings › Your reports keeps it.
        </p>
      </Sheet>
    </Screen>
  );
}
