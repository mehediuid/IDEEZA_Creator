"use client";

// Report a problem — User Panel V2's "Report a Issue", rebuilt on the design
// system. The requirements are V2's; the form is shorter (problem-report.ts
// says why): what it's about, how much it's in the way, what happened, and
// optional images. The page, browser and recent errors are captured when the
// dialog opens and shown as one line the maker can untick.
//
// One dialog for the whole app, mounted at the root like the videos dialog,
// because the editors sit outside the app shell. Anything opens it
// with openReportProblem() (lib/support/open-report.ts). The draft lives
// here, not in the dialog, so closing it (to take a screenshot, or by a
// stray Esc) loses nothing; its text also survives a reload. Only a sent
// report or "Clear" empties it.
//
// Sending posts to /api/reports, which keeps the report in the project's
// private store. Success says so, with a reference to quote, and promises no
// reply: nothing in the app can answer one yet.

import * as React from "react";
import { Camera01Icon, Cancel01Icon, ImageAdd01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Banner, Button, Checkbox, IconButton, ModalFrame, Segmented, SelectMenu, Spinner, Textarea } from "@/components/ideeza";
import { useTheme } from "@/components/theme-provider";
import { useManualProjects } from "@/lib/manual/projects";
import { REPORT_EVENT, type ReportPrefill } from "@/lib/support/open-report";
import { rememberSentReport } from "@/lib/data/reports";
import { deviceOf, namesFor, pageRefFor, placeLine } from "@/lib/support/page-context";
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
  type DraftField,
  type ReportContext,
  type ReportImpact,
  type ReportKind,
  type ReportPayload,
} from "@/lib/support/problem-report";
import { recentErrors } from "@/lib/support/recent-errors";
import {
  canCaptureTab,
  captureTab,
  imageFilesOf,
  pastedImages,
  shrinkFile,
  type ReportImage,
} from "@/lib/support/report-images";
import { cn } from "@/lib/utils";

const DRAFT_KEY = "ideeza:report-draft";
/** Errors older than this are about something else. */
const ERRORS_WINDOW_MS = 30 * 60 * 1000;
const TAP = "max-md:min-h-[var(--touch-min)]";
// The field type set SelectMenu draws, so every field in the form reads alike.
const LABEL = "w-fit text-[length:var(--font-size-md)] text-[color:var(--color-input-label)]";
const HINT = "text-[length:var(--font-size-sm)] text-[color:var(--color-input-helper)]";
const ERROR = "text-[length:var(--font-size-sm)] text-[color:var(--color-input-error-text)]";

type Draft = {
  id: string;
  kind: ReportKind | null;
  impact: ReportImpact | null;
  details: string;
  includeContext: boolean;
  images: ReportImage[];
};

// getRandomValues, not randomUUID: randomUUID exists only on secure origins,
// and a phone testing the dev server over the LAN is plain http.
const newId = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
const emptyDraft = (): Draft => ({ id: newId(), kind: null, impact: null, details: "", includeContext: true, images: [] });
const isBlank = (d: Draft) => !d.kind && !d.impact && !d.details.trim() && d.images.length === 0;

/** The text of an unsent draft. Images stay in memory: they would crowd
 *  out the projects this browser's storage is for. */
function loadDraft(): Draft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    const d = raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
    if (d && isReportId(d.id)) {
      return {
        id: d.id,
        kind: isKind(d.kind) ? d.kind : null,
        impact: isImpact(d.impact) ? d.impact : null,
        details: typeof d.details === "string" ? d.details.slice(0, DETAILS_MAX) : "",
        includeContext: d.includeContext !== false,
        images: [],
      };
    }
  } catch {
    // Unreadable or blocked storage: start a fresh draft.
  }
  return emptyDraft();
}

function keepDraft(d: Draft): void {
  try {
    if (isBlank(d)) localStorage.removeItem(DRAFT_KEY);
    else {
      const { id, kind, impact, details, includeContext } = d;
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ id, kind, impact, details, includeContext }));
    }
  } catch {
    // A full or blocked storage only costs the draft's survival of a reload.
  }
}

const noSubscribe = () => () => {};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

type Stores = {
  projects: ReturnType<typeof useManualProjects>["projects"];
  activeProjectId: string | null;
  storageFull: boolean;
  theme: string;
  resolvedTheme: "light" | "dark";
};

/** Everything the report carries about where it came from, taken once, when
 *  the dialog opens, so it can't drift while the maker writes. */
function snapshot(s: Stores): ReportContext {
  const ref = pageRefFor(location.pathname, location.search);
  const { browser, os } = deviceOf(navigator.userAgent, navigator.maxTouchPoints);
  const dpr = Math.round((window.devicePixelRatio || 1) * 10) / 10;
  const since = Date.now() - ERRORS_WINDOW_MS;
  return {
    page: ref.page,
    route: ref.route,
    ...namesFor(ref, s.projects, s.activeProjectId),
    browser,
    os,
    viewport: `${window.innerWidth}×${window.innerHeight}${dpr > 1 ? ` @${dpr}x` : ""}`,
    theme: s.theme === "system" ? `${cap(s.resolvedTheme)} (system)` : cap(s.resolvedTheme),
    ...(s.storageFull ? { storageFull: true } : null),
    errors: recentErrors().filter((e) => e.at >= since),
  };
}

/** The one dialog, mounted once in the root layout. Renders nothing until
 *  something asks for it. */
export function ReportProblemHost() {
  const { projects, activeProjectId, writeError } = useManualProjects();
  const { theme, resolvedTheme } = useTheme();

  const [open, setOpen] = React.useState(false);
  const [capturing, setCapturing] = React.useState(false);
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [context, setContext] = React.useState<ReportContext | null>(null);
  const [sentRef, setSentRef] = React.useState<string | null>(null);

  const onOpen = React.useEffectEvent((prefill?: ReportPrefill) => {
    setContext(snapshot({ projects, activeProjectId, storageFull: Boolean(writeError), theme, resolvedTheme }));
    setDraft((d) => {
      const base = d ?? loadDraft();
      const details = prefill?.details?.trim();
      return details && !base.details.trim() ? { ...base, details: details.slice(0, DETAILS_MAX) } : base;
    });
    setSentRef(null);
    setOpen(true);
  });
  React.useEffect(() => {
    const listener = (e: Event) => onOpen((e as CustomEvent<ReportPrefill | undefined>).detail);
    window.addEventListener(REPORT_EVENT, listener);
    return () => window.removeEventListener(REPORT_EVENT, listener);
  }, []);

  React.useEffect(() => {
    if (draft) keepDraft(draft);
  }, [draft]);

  if (!draft || !context) return null;
  return (
    <ReportDialog
      open={open}
      capturing={capturing}
      setCapturing={setCapturing}
      draft={draft}
      setDraft={setDraft as React.Dispatch<React.SetStateAction<Draft>>}
      context={context}
      sentRef={sentRef}
      onSent={(ref) => {
        setSentRef(ref);
        setDraft(emptyDraft());
      }}
      onClose={() => setOpen(false)}
    />
  );
}

function ReportDialog({
  open,
  capturing,
  setCapturing,
  draft,
  setDraft,
  context,
  sentRef,
  onSent,
  onClose,
}: {
  open: boolean;
  capturing: boolean;
  setCapturing: (v: boolean) => void;
  draft: Draft;
  setDraft: React.Dispatch<React.SetStateAction<Draft>>;
  context: ReportContext;
  sentRef: string | null;
  onSent: (ref: string) => void;
  onClose: () => void;
}) {
  const uid = React.useId();
  const kindId = `${uid}-kind`;
  const impactId = `${uid}-impact`;
  const impactLabelId = `${uid}-impact-label`;
  const impactErrorId = `${uid}-impact-error`;
  const detailsId = `${uid}-details`;
  const detailsHintId = `${uid}-details-hint`;
  const detailsErrorId = `${uid}-details-error`;
  const imagesLabelId = `${uid}-images`;

  const [tried, setTried] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [sendError, setSendError] = React.useState<string | null>(null);
  const [preparing, setPreparing] = React.useState(0);
  /** Images held or being shrunk, counted as they're claimed: two drops
   *  before a render must not both see room for three. */
  const slots = React.useRef(0);
  const [imageNote, setImageNote] = React.useState<string | null>(null);
  const [announce, setAnnounce] = React.useState("");
  const [showAll, setShowAll] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const canShoot = React.useSyncExternalStore(noSubscribe, canCaptureTab, () => false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const addRef = React.useRef<HTMLButtonElement>(null);
  const shotRef = React.useRef<HTMLButtonElement>(null);
  const doneRef = React.useRef<HTMLButtonElement>(null);
  const removeRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const [focusAfterShot, setFocusAfterShot] = React.useState(false);
  const sendingRef = React.useRef(false);
  /** Where focus goes once the next render lands: after a remove or a Clear
   *  the focused control is gone. An effect, not requestAnimationFrame, which
   *  a background tab never runs. */
  const focusNext = React.useRef<(() => HTMLElement | null | undefined) | null>(null);
  React.useEffect(() => {
    const pick = focusNext.current;
    if (!pick) return;
    focusNext.current = null;
    pick()?.focus();
  });

  React.useEffect(() => {
    if (sentRef) doneRef.current?.focus();
  }, [sentRef]);



  const errors = tried ? draftErrors(draft) : [];
  const errorOf = (f: DraftField) => errors.find((e) => e.field === f)?.message;
  const showImpact = asksImpact(draft.kind);
  const copy = detailsCopy(draft.kind);
  const atCap = draft.images.length + preparing >= IMAGES_MAX;

  const patch = (p: Partial<Draft>) => {
    setSendError(null);
    setDraft((d) => ({ ...d, ...p }));
  };

  const addFiles = async (all: File[]) => {
    if (!all.length) return;
    const files = imageFilesOf(all);
    const other = all.find((f) => !files.includes(f));
    const { take, note } = admitImages(slots.current, files.length);
    slots.current += take;
    const notes: string[] = [other ? `${other.name} isn't an image. Use a PNG, JPG or WebP.` : null, note].filter(
      (n): n is string => Boolean(n),
    );
    const picked = files.slice(0, take);
    setPreparing((n) => n + picked.length);
    const results = await Promise.all(picked.map((f) => shrinkFile(f, newId())));
    setPreparing((n) => n - picked.length);
    const ok: ReportImage[] = [];
    for (const r of results) {
      if (r.ok) ok.push(r.image);
      else {
        notes.unshift(r.reason);
        slots.current -= 1;
      }
    }
    if (ok.length) {
      setDraft((d) => ({ ...d, images: [...d.images, ...ok].slice(0, IMAGES_MAX) }));
      setAnnounce(ok.length === 1 ? `Added ${ok[0].name}` : `Added ${ok.length} images`);
    }
    setImageNote(notes[0] ?? null);
  };

  const remove = (i: number) => {
    const gone = draft.images[i];
    slots.current -= 1;
    setDraft((d) => ({ ...d, images: d.images.filter((_, j) => j !== i) }));
    setImageNote(null);
    setAnnounce(`Removed ${gone?.name ?? "image"}`);
    // Focus to the next ✕, else the previous one, else Add images.
    focusNext.current = () => removeRefs.current[i] ?? removeRefs.current[i - 1] ?? addRef.current;
  };

  const shoot = async () => {
    if (slots.current >= IMAGES_MAX) {
      setImageNote(admitImages(IMAGES_MAX, 1).note);
      return;
    }
    try {
      const shot = await captureTab(() => setCapturing(true));
      if (shot && slots.current < IMAGES_MAX) {
        slots.current += 1;
        const name = `Screenshot of ${context.page}`;
        setDraft((d) => ({ ...d, images: [...d.images, { key: newId(), name, ...shot }].slice(0, IMAGES_MAX) }));
        setImageNote(null);
        setAnnounce("Screenshot added");
      }
    } catch {
      setImageNote("Couldn't take a screenshot. You can paste one instead.");
    } finally {
      setFocusAfterShot(true);
      setCapturing(false);
    }
  };

  // While the form is up: an image pasted anywhere attaches (text pastes stay
  // text), and a file dropped just outside the drop area mustn't open in the
  // tab and take the draft with it.
  const live = open && !capturing && !sentRef;
  const addPasted = React.useEffectEvent((files: File[]) => void addFiles(files));
  React.useEffect(() => {
    if (!live) return;
    const onPaste = (e: ClipboardEvent) => {
      const files = pastedImages(e.clipboardData);
      if (!files.length) return;
      e.preventDefault();
      addPasted(files);
    };
    const hold = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) e.preventDefault();
    };
    document.addEventListener("paste", onPaste);
    document.addEventListener("dragover", hold);
    document.addEventListener("drop", hold);
    return () => {
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("dragover", hold);
      document.removeEventListener("drop", hold);
    };
  }, [live]);

  const focusField = (f: DraftField) => {
    const el =
      f === "impact"
        ? document.querySelector<HTMLElement>(`#${CSS.escape(impactId)} [role="radio"][tabindex="0"]`)
        : document.getElementById(f === "kind" ? kindId : detailsId);
    el?.focus();
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  const send = async () => {
    if (sendingRef.current || preparing) return;
    setTried(true);
    const errs = draftErrors(draft);
    if (errs.length) {
      focusField(errs[0].field);
      return;
    }
    if (!navigator.onLine) {
      setSendError("You're offline. Your report is kept here, so send it when you're back online.");
      return;
    }
    sendingRef.current = true;
    setSending(true);
    setSendError(null);
    const kind = draft.kind as ReportKind;
    const payload: ReportPayload & { images: { width: number; height: number }[] } = {
      id: draft.id,
      kind,
      impact: asksImpact(kind) ? draft.impact : null,
      details: draft.details.trim(),
      title: titleOf(draft.details, kind),
      context: draft.includeContext ? context : null,
      images: draft.images.map((i) => ({ width: i.width, height: i.height })),
    };
    const post = async (id: string) => {
      const body = new FormData();
      body.set("report", JSON.stringify({ ...payload, id }));
      draft.images.forEach((im, i) => body.set(`image${i}`, im.blob, `${i + 1}`));
      const res = await fetch("/api/reports", { method: "POST", body });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; ref?: string } | null;
      return { status: res.status, ref: res.ok && data?.ok ? (data.ref ?? null) : null };
    };
    try {
      let r = await post(draft.id);
      // Another report already holds this draft's id (it was restored in a
      // second tab after the first one sent it): send under a new one.
      if (r.status === 409) {
        const fresh = newId();
        setDraft((d) => ({ ...d, id: fresh }));
        r = await post(fresh);
      }
      if (!r.ref) throw new Error(`status ${r.status}`);
      setTried(false);
      slots.current = 0;
      rememberSentReport({ ref: r.ref, kind, title: payload.title, at: Date.now() });
      onSent(r.ref);
    } catch {
      setSendError("Couldn't send your report. Nothing was lost, so try again.");
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  // The next open starts with nothing flagged, and focus where the dialog
  // normally puts it.
  const close = () => {
    if (sending) return;
    setTried(false);
    setSendError(null);
    setShowAll(false);
    setFocusAfterShot(false);
    onClose();
  };

  // Clear goes away with the draft it cleared, so focus moves to the first
  // field rather than dropping to the page behind.
  const clear = () => {
    slots.current = 0;
    setDraft(emptyDraft());
    setTried(false);
    setSendError(null);
    setImageNote(null);
    focusNext.current = () => document.getElementById(kindId);
  };

  // Focus can still leave the dialog: a click on its plain text lands on the
  // page. Keys from there would reach the editor behind (Backspace deleting
  // the selected parts), so while the dialog is up they stop at `window`,
  // Escape still closes it, and Tab comes back into it.
  const visible = open && !capturing;
  const fromOutside = React.useEffectEvent((e: KeyboardEvent) => {
    if (e.type !== "keydown") return;
    if (e.key === "Escape") close();
    else if (e.key === "Tab") (sentRef ? doneRef.current : document.getElementById(kindId))?.focus();
    else return;
    e.preventDefault();
  });
  React.useEffect(() => {
    if (!visible) return;
    const guard = (e: KeyboardEvent) => {
      const t = e.target;
      if (t instanceof Element && t.closest('[aria-modal="true"], [data-select-menu-panel]')) return;
      e.stopImmediatePropagation();
      fromOutside(e);
    };
    window.addEventListener("keydown", guard, true);
    window.addEventListener("keyup", guard, true);
    return () => {
      window.removeEventListener("keydown", guard, true);
      window.removeEventListener("keyup", guard, true);
    };
  }, [visible]);

  // Keys typed in the dialog stop with it. React runs its handlers from
  // `document`, so this also has to hold back the listeners added there
  // after it (the Connection map's Delete, the layouts' ⌘K, My projects' "/")
  // as well as the editors' on `window`. Tab goes on: the focus trap is one
  // of those document listeners.
  const stopKeys = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key !== "Tab") e.nativeEvent.stopImmediatePropagation();
  };

  const footer = sentRef ? (
    <Button ref={doneRef} type="button" hierarchy="primary" size="lg" className={cn("ml-auto", TAP)} onClick={close}>
      Done
    </Button>
  ) : (
    <>
      {!isBlank(draft) && (
        <Button
          type="button"
          hierarchy="ghost"
          size="lg"
          className={TAP}
          disabled={sending}
          onClick={clear}
        >
          Clear
        </Button>
      )}
      <Button
        type="button"
        hierarchy="primary"
        size="lg"
        className={cn("ml-auto", TAP, "aria-disabled:cursor-not-allowed aria-disabled:opacity-60")}
        disabled={sending}
        aria-busy={sending || undefined}
        aria-disabled={preparing > 0 || undefined}
        onClick={send}
      >
        {sending ? (
          <span className="inline-flex items-center gap-[var(--spacing-3)]">
            <Spinner size={16} />
            Sending…
          </span>
        ) : preparing > 0 ? (
          "Preparing images…"
        ) : (
          "Send report"
        )}
      </Button>
    </>
  );

  return (
    // The dialog's own Escape runs first, deeper in the tree.
    <div className="contents" onKeyDown={stopKeys} onKeyUp={stopKeys}>
      <ModalFrame
        open={visible}
        onClose={close}
        title="Report a problem"
        size="sm"
        sheet
        closeUnavailable={sending}
        initialFocus={focusAfterShot ? shotRef : undefined}
        footer={footer}
      >
        {sentRef ? (
          <div role="status" className="flex max-w-[62ch] flex-col gap-[var(--spacing-3)]">
            <p className="text-md font-semibold leading-md text-text-primary">Report sent</p>
            <p className="text-md leading-md text-text-secondary">
              Reference <span className="font-medium text-text-primary">{sentRef}</span>. It&apos;s with the IDEEZA team now.
              We can&apos;t reply in the app yet.
            </p>
          </div>
        ) : (
          <div
            className={cn(
              "flex flex-col gap-8 rounded-xl",
              dragging && "outline-dashed outline-2 outline-offset-4 outline-[var(--color-border-brand)]",
            )}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void send();
              }
            }}
            onDragOver={(e) => {
              if (!e.dataTransfer.types.includes("Files")) return;
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              void addFiles(Array.from(e.dataTransfer.files));
            }}
          >
            <SelectMenu<ReportKind>
              id={kindId}
              label="What's it about?"
              placeholder="Choose one"
              value={draft.kind}
              options={KINDS.map((k) => ({ value: k.value, label: k.label, sub: k.sub }))}
              onChange={(kind) => patch({ kind })}
              error={errorOf("kind")}
            />

            {showImpact && (
              <div className="flex flex-col gap-[var(--spacing-3)]">
                <span id={impactLabelId} className={LABEL}>
                  How much is this getting in your way?
                </span>
                <div id={impactId}>
                  <Segmented<ReportImpact | "">
                    label="How much is this getting in your way?"
                    value={draft.impact ?? ""}
                    options={IMPACTS}
                    onChange={(v) => patch({ impact: v || null })}
                    invalid={Boolean(errorOf("impact"))}
                    describedBy={errorOf("impact") ? impactErrorId : undefined}
                    className="max-w-full"
                  />
                </div>
                {errorOf("impact") && (
                  <span id={impactErrorId} className={ERROR}>
                    {errorOf("impact")}
                  </span>
                )}
              </div>
            )}

            <div className="flex flex-col gap-[var(--spacing-3)]">
              <label htmlFor={detailsId} className={LABEL}>
                {copy.label}
              </label>
              <span id={detailsHintId} className={HINT}>
                {copy.hint}
              </span>
              <Textarea
                id={detailsId}
                rows={5}
                maxLength={DETAILS_MAX}
                value={draft.details}
                onValueChange={(details) => patch({ details })}
                invalid={Boolean(errorOf("details"))}
                aria-invalid={errorOf("details") ? true : undefined}
                aria-describedby={errorOf("details") ? `${detailsErrorId} ${detailsHintId}` : detailsHintId}
              />
              {errorOf("details") ? (
                <span id={detailsErrorId} className={ERROR}>
                  {errorOf("details")}
                </span>
              ) : draft.details.length >= DETAILS_COUNTER_FROM ? (
                <span className={cn(HINT, "tabular-nums")} aria-live="polite">
                  {draft.details.length.toLocaleString("en-US")} / {DETAILS_MAX.toLocaleString("en-US")}
                </span>
              ) : null}
            </div>

            <div className="flex flex-col gap-[var(--spacing-3)]" role="group" aria-labelledby={imagesLabelId}>
              <span id={imagesLabelId} className={LABEL}>
                Images (optional)
              </span>
              <div className="flex flex-wrap items-center gap-[var(--spacing-4)]">
                <Button
                  ref={addRef}
                  type="button"
                  hierarchy="secondary"
                  size="md"
                  className={cn(TAP, "aria-disabled:cursor-not-allowed aria-disabled:opacity-60")}
                  iconLeading={<Icon icon={ImageAdd01Icon} />}
                  aria-disabled={atCap || undefined}
                  title={atCap ? `${IMAGES_MAX} images max. Remove one to add another.` : undefined}
                  onClick={() => (atCap ? setImageNote(admitImages(IMAGES_MAX, 1).note) : fileRef.current?.click())}
                >
                  Add images
                </Button>
                {canShoot && (
                  <Button
                    ref={shotRef}
                    type="button"
                    hierarchy="secondary"
                    size="md"
                    className="aria-disabled:cursor-not-allowed aria-disabled:opacity-60"
                    iconLeading={<Icon icon={Camera01Icon} />}
                    aria-disabled={atCap || undefined}
                    onClick={shoot}
                  >
                    Screenshot this page
                  </Button>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                tabIndex={-1}
                onChange={(e) => {
                  void addFiles(Array.from(e.target.files ?? []));
                  e.target.value = "";
                }}
              />
              <span className={HINT}>Or paste or drop them here. Up to {IMAGES_MAX}.</span>
              {(draft.images.length > 0 || preparing > 0) && (
                <ul aria-label={`Images, ${draft.images.length} of ${IMAGES_MAX}`} className="flex flex-wrap gap-[var(--spacing-4)]">
                  {draft.images.map((im, i) => (
                    <li key={im.key} className="relative">
                      <Thumb image={im} />
                      <IconButton
                        ref={(el) => {
                          removeRefs.current[i] = el;
                        }}
                        hierarchy="secondary"
                        size="sm"
                        aria-label={`Remove ${im.name}`}
                        icon={<Icon icon={Cancel01Icon} />}
                        className="absolute right-[var(--spacing-2)] top-[var(--spacing-2)] shadow-1 max-md:size-[var(--touch-min)]"
                        onClick={() => remove(i)}
                      />
                    </li>
                  ))}
                  {Array.from({ length: preparing }, (_, i) => (
                    <li
                      key={`preparing-${i}`}
                      aria-label="Preparing image"
                      className="flex size-[var(--spacing-40)] items-center justify-center rounded-lg border border-solid border-border bg-bg-subtle text-text-tertiary"
                    >
                      <Spinner size={20} />
                    </li>
                  ))}
                </ul>
              )}
              {imageNote && (
                <span role="alert" className={ERROR}>
                  {imageNote}
                </span>
              )}
              <span aria-live="polite" className="sr-only">
                {announce}
              </span>
            </div>

            <ContextRow
              context={context}
              checked={draft.includeContext}
              onChange={(includeContext) => patch({ includeContext })}
              showAll={showAll}
              setShowAll={setShowAll}
            />

            {sendError && <Banner tone="error">{sendError}</Banner>}
          </div>
        )}
      </ModalFrame>
    </div>
  );
}

/** The object URL lives exactly as long as the <img> holds it. */
function Thumb({ image }: { image: ReportImage }) {
  const attach = React.useCallback(
    (img: HTMLImageElement | null) => {
      if (!img) return;
      const url = URL.createObjectURL(image.blob);
      img.src = url;
      return () => URL.revokeObjectURL(url);
    },
    [image.blob],
  );
  return (
    <span className="block size-[var(--spacing-40)] overflow-hidden rounded-lg border border-solid border-border bg-bg-subtle">
      {/* eslint-disable-next-line @next/next/no-img-element -- a local blob: URL, nothing for next/image to optimise */}
      <img ref={attach} alt="" className="size-full object-cover" />
    </span>
  );
}

/** "Send page and device details": what is attached, said plainly, and a
 *  way to see every value before it goes. */
function ContextRow({
  context,
  checked,
  onChange,
  showAll,
  setShowAll,
}: {
  context: ReportContext;
  checked: boolean;
  onChange: (v: boolean) => void;
  showAll: boolean;
  setShowAll: (v: boolean) => void;
}) {
  const listId = React.useId();
  const rows: [string, string][] = [
    ["Page", context.page],
    ...(context.project ? ([["Project", context.project]] as [string, string][]) : []),
    ...(context.product ? ([["Product", context.product]] as [string, string][]) : []),
    ["Browser", `${context.browser} on ${context.os}`],
    ["Window", context.viewport],
    ["Theme", context.theme],
    ...(context.storageFull ? ([["Storage", "Full: the last change wasn't saved"]] as [string, string][]) : []),
    [
      "Recent errors",
      context.errors.length ? context.errors.map((e) => (e.count > 1 ? `${e.message} (×${e.count})` : e.message)).join(" · ") : "None",
    ],
  ];
  const boxId = React.useId();
  return (
    <div className="flex items-start gap-[var(--spacing-4)]">
      <input
        id={boxId}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <label
        htmlFor={boxId}
        className="mt-[var(--spacing-1)] inline-flex cursor-pointer rounded-sm peer-focus-visible:ring-2 peer-focus-visible:ring-border-focus"
      >
        <Checkbox checked={checked} decorative />
      </label>
      <div className="flex min-w-0 flex-1 flex-col gap-[var(--spacing-2)]">
        <label htmlFor={boxId} className="cursor-pointer">
          <span className="block text-md font-medium leading-md text-text-primary">Send page and device details</span>
          <span className="block text-sm leading-sm text-text-secondary">
            {placeLine(context)} · {context.browser} on {context.os}
          </span>
        </label>
        <button
          type="button"
          aria-expanded={showAll}
          aria-controls={listId}
          onClick={() => setShowAll(!showAll)}
          className="w-fit rounded-sm text-sm font-medium leading-sm text-text-brand underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-border-focus max-md:min-h-[var(--touch-min)]"
        >
          {showAll ? "Hide details" : "See what's sent"}
        </button>
        {showAll && (
          <div id={listId} className="flex flex-col gap-[var(--spacing-3)]">
            <dl
              className={cn(
                "grid grid-cols-[auto_1fr] gap-x-[var(--spacing-6)] gap-y-[var(--spacing-2)] text-sm leading-sm",
                !checked && "opacity-60",
              )}
            >
              {rows.map(([k, v]) => (
                <React.Fragment key={k}>
                  <dt className="text-text-tertiary">{k}</dt>
                  <dd className="min-w-0 break-words text-text-secondary">{v}</dd>
                </React.Fragment>
              ))}
            </dl>
            <p className="text-sm leading-sm text-text-tertiary">
              {checked ? "Your designs, prompts and messages are never sent." : "None of this is sent while the box is unticked."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
