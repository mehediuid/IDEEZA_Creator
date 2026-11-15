"use client";

// Settings › AI & your data › Restore from a backup (mobile Figma "Settings ·
// 2026 update" 10688:2): ST-64 Choose a file, ST-64b the confirm that says
// what it replaces, ST-64c restoring, ST-64d the wrong file with Choose
// another file. The checks and the restore are the web's
// (lib/data/browser-data.ts readBackupZip, restoreBrowserData): nothing
// changes until Replace with this backup; then the phone reloads on AI & your
// data and says what it restored.

import * as React from "react";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { ProgressBar } from "@/components/ideeza/progress-bar";
import { readBackupZip, restoreBrowserData, type BackupError, type ReadBackup } from "@/lib/data/browser-data";
import { CATEGORIES } from "@/lib/data/export";
import { useDates } from "@/lib/settings/use-dates";
import { TEXT_LINK, BottomBar } from "../kit/bottom-bar";
import { cn } from "@/lib/utils";
import { LIST_DIVIDERS } from "../kit/list";
import { T } from "../type";
import { Sheet } from "../kit/sheet";
import { useOnline } from "../kit/states";
import { SettingsScreen } from "./kit";
import { DownloadStatus, useDownload } from "./data-download";
import { landOnPhone, onPhone, useRunning } from "./data-parts";

type Read = Extract<ReadBackup, { ok: true }>;
type Problem = { title: string; body: string };

const READ_ERRORS: Record<BackupError, Problem> = {
  "not-zip": { title: "That file isn’t a zip", body: "Choose the .zip you saved from Download your information." },
  foreign: { title: "This isn’t an IDEEZA backup", body: "It has no ideeza-backup folder. Choose the .zip you saved from Download your information." },
  newer: { title: "Made by a newer IDEEZA", body: "That backup was made by a newer IDEEZA than this one. Reload to get the newest IDEEZA, then choose it again." },
  damaged: { title: "This backup is damaged", body: "It’s damaged or incomplete, so nothing was changed. Download it again where it was made, or choose another copy." },
  unsupported: { title: "IDEEZA can’t open this zip", body: "It’s packed in a way IDEEZA can’t open (encrypted, or over 4 GB). Choose the zip Download made, as it is." },
};

const RESTORE_FAILED: Record<"files" | "storage", Problem> = {
  files: {
    title: "Couldn’t restore your backup",
    body: "This phone refused the photos and files (it may be full), so the restore stopped. Your projects and settings weren’t changed, but photos and files here may be missing. Free some space, then restore again.",
  },
  storage: {
    title: "Couldn’t restore your backup",
    body: "This phone ran out of room part way through, so IDEEZA’s data here is incomplete. Free some space, then restore again.",
  },
};

/** summarize()'s word for a kind with nothing in it: such a kind on both sides isn't listed. */
const NOTHING = "Nothing yet";

const OTHER_TABS = "If IDEEZA is open in another tab, close it first, or it may save its old work again.";

export function RestoreSettings() {
  const running = useRunning();
  const online = useOnline();
  const dates = useDates();
  const dl = useDownload();
  const input = React.useRef<HTMLInputElement>(null);
  const [reading, setReading] = React.useState<string | null>(null);
  const [read, setRead] = React.useState<Read | null>(null);
  const [problem, setProblem] = React.useState<Problem | null>(null);
  const [restoring, setRestoring] = React.useState(false);

  const choose = async (file: File | undefined) => {
    if (!file) return;
    setProblem(null);
    setReading(file.name);
    const r = await readBackupZip(file);
    setReading(null);
    if (input.current) input.current.value = "";
    if (r.ok) setRead(r);
    else setProblem(READ_ERRORS[r.error]);
  };

  const restore = async () => {
    if (!read || restoring) return;
    const backup = read;
    setRead(null);
    setRestoring(true);
    await dl.settled();
    const r = await restoreBrowserData(backup.backup, backup.files);
    if (r.ok) {
      landOnPhone("/m/settings/data", `Restored from your backup of ${dates.dateTime(backup.plan.madeAt, { style: "medium" })}`);
      return;
    }
    setRestoring(false);
    setProblem(RESTORE_FAILED[r.failed]);
  };

  const plan = read?.plan;
  return (
    <SettingsScreen
      title="Restore from a backup"
      loading={!running}
      footer={
        <BottomBar>
          <Button size="xl" className="w-full" loading={reading !== null} disabled={!online || restoring} onClick={() => input.current?.click()}>
            {problem ? "Choose another file" : "Choose a file"}
          </Button>
        </BottomBar>
      }
    >
      <input
        ref={input}
        type="file"
        accept=".zip,application/zip"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => void choose(e.target.files?.[0])}
      />
      {problem && (
        <Banner tone="error" title={problem.title}>
          {problem.body}
        </Banner>
      )}
      {/* The screen's only content until a file is read, so the intro stays whole (no ⓘ). */}
      <p className={cn(T.body, "text-text-primary")}>
        Choose a .zip that Download your information made, on this phone or another device. It replaces everything IDEEZA keeps on this phone, and
        you’ll see what it holds before anything changes.
      </p>
      <div aria-live="polite" className="flex flex-col gap-4 empty:hidden">
        {reading && <p className={T.body}>Reading {reading}…</p>}
        {restoring && (
          <>
            <p className={cn(T.body, "text-text-primary")}>Restoring your backup…</p>
            <ProgressBar value={100} label="Restoring your backup" className="motion-safe:animate-pulse" />
          </>
        )}
      </div>

      <Sheet
        open={!!read}
        onClose={() => setRead(null)}
        title="Restore this backup?"
        description={plan ? `Made ${dates.dateTime(plan.madeAt, { style: "medium" })}. It replaces everything IDEEZA keeps on this phone now.` : undefined}
        actions={
          <>
            <Button hierarchy="danger" size="xl" className="w-full" disabled={!!dl.busy} onClick={() => void restore()}>
              Replace with this backup
            </Button>
            <Button hierarchy="secondary" size="xl" className="w-full" onClick={() => setRead(null)}>
              Cancel
            </Button>
          </>
        }
      >
        {plan && (
          <>
            {plan.empty && <Banner tone="attention">This backup holds nothing. Restoring it leaves IDEEZA empty on this phone.</Banner>}
            <ul role="list" className={cn("flex flex-col", LIST_DIVIDERS)}>
              {CATEGORIES.filter((c) => plan.holds[c.id] !== NOTHING || plan.replaces[c.id] !== NOTHING).map((c) => (
                <li key={c.id} className="flex flex-col gap-1 py-4">
                  <span className={T.rowTitle}>{c.label.replace(/ Information$/, "")}</span>
                  <span className={T.meta}>In the backup: {onPhone(plan.holds[c.id])}</span>
                  <span className={cn(T.meta, "text-text-tertiary")}>Here now: {onPhone(plan.replaces[c.id])}</span>
                </li>
              ))}
            </ul>
            <p className={T.body}>
              {plan.files ? `It also holds ${plan.files} ${plan.files === 1 ? "photo, file or video" : "photos, files and videos"}. ` : ""}
              {OTHER_TABS}
            </p>
            <button type="button" className={`${TEXT_LINK} w-fit disabled:text-text-disabled`} disabled={!!dl.busy} onClick={() => void dl.start()}>
              Download what’s here first
            </button>
            <DownloadStatus dl={dl} />
          </>
        )}
      </Sheet>
    </SettingsScreen>
  );
}
