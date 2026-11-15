"use client";

// Settings › AI & your data › Download your information (mobile Figma
// "Settings · 2026 update" 10688:2): ST-63 what the file holds and Download,
// ST-63b making your file with its progress, ST-63c back on AI & your data
// with the toast and "Last downloaded today, 14:05", ST-63d couldn't make the
// file with Try again. The zip is the web's (lib/data/export-browser.ts): made
// on this phone, nothing sent anywhere, and handed over at once; the time of
// the last one is kept (lib/data/backup.ts).
// `useDownload` and `DownloadStatus` also serve the restore and erase sheets'
// "Download … first".

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { ProgressBar } from "@/components/ideeza/progress-bar";
import { sizeOf } from "@/lib/data/backup";
import { storageSnapshot } from "@/lib/data/browser-data";
import { CATEGORIES, summarize, type CategoryId } from "@/lib/data/export";
import { createInformationZip, downloadBlob, type ExportProgress } from "@/lib/data/export-browser";
import { subscribeStores } from "@/lib/key-store";
import { BottomBar } from "../kit/bottom-bar";
import { cn } from "@/lib/utils";
import { T } from "../type";
import { useToast } from "../kit/toast";
import { SettingsGroup, SettingsRow, SettingsScreen } from "./kit";
import { onPhone, useRunning } from "./data-parts";

export type Made = { name: string; files: number; bytes: number };
type Failure = { title: string; body: string };

/** One download at a time: its progress, what it made, or why it couldn't. */
export function useDownload() {
  const [busy, setBusy] = React.useState<ExportProgress | null>(null);
  const [made, setMade] = React.useState<Made | null>(null);
  const [error, setError] = React.useState<Failure | null>(null);
  const running = React.useRef<Promise<Made | null> | null>(null);

  const start = React.useCallback((): Promise<Made | null> => {
    if (running.current) return running.current;
    setMade(null);
    setError(null);
    setBusy({ label: "Reading your information", done: 0, total: 1 });
    const job = (async () => {
      try {
        const zip = await createInformationZip(Date.now(), setBusy);
        downloadBlob(zip.blob, zip.name);
        const m = { name: zip.name, files: zip.files, bytes: zip.blob.size };
        setMade(m);
        return m;
      } catch (e) {
        const big = e instanceof Error && /4 GB|Too many/.test(e.message);
        setError({
          title: "Couldn’t make your file",
          body: big
            ? "It is over 4 GB, more than one zip can hold. Delete some videos you don’t need, then try again."
            : "Something went wrong while reading it. Nothing was changed, so try again.",
        });
        return null;
      } finally {
        setBusy(null);
        running.current = null;
      }
    })();
    running.current = job;
    return job;
  }, []);

  /** Waits for a download still running (an erase or a restore must not read under it). */
  const settled = React.useCallback(() => running.current ?? Promise.resolve(null), []);
  return { busy, made, error, start, settled };
}

export type Download = ReturnType<typeof useDownload>;

/** "Making your file…" with its bar and step. */
function Making({ busy }: { busy: ExportProgress }) {
  const counted = busy.total > 1;
  return (
    <div className="flex flex-col gap-4">
      <p className={cn(T.body, "text-text-primary")}>Making your file…</p>
      <ProgressBar value={counted ? (busy.done / busy.total) * 100 : 100} label="Making your file" className={counted ? undefined : "motion-safe:animate-pulse"} />
      <p className={T.meta}>
        {busy.label}
        {counted ? ` (${Math.min(busy.done + 1, busy.total)} of ${busy.total})` : ""}
      </p>
    </div>
  );
}

/** A download started inside a sheet: its progress, the file it handed over, or its error. */
export function DownloadStatus({ dl }: { dl: Download }) {
  return (
    <div aria-live="polite" className="flex flex-col gap-4 empty:hidden">
      {dl.busy && <Making busy={dl.busy} />}
      {dl.made && (
        <p className={T.meta}>
          {dl.made.name} is downloading ({sizeOf(dl.made.bytes)}, {dl.made.files} {dl.made.files === 1 ? "file" : "files"}). It holds your private
          details, so keep it somewhere safe.
        </p>
      )}
      {dl.error && (
        <p role="alert" className={cn(T.meta, "text-text-error")}>
          {dl.error.title}. {dl.error.body}
        </p>
      )}
    </div>
  );
}

/** What this phone holds per kind of information, read after mount and whenever a store changes. */
function useHolds(): Record<CategoryId, string> | null {
  const [holds, setHolds] = React.useState<Record<CategoryId, string> | null>(null);
  React.useEffect(() => {
    const read = () => setHolds(summarize(storageSnapshot()));
    const first = window.setTimeout(read, 0);
    const off = subscribeStores(read);
    return () => {
      window.clearTimeout(first);
      off();
    };
  }, []);
  return holds;
}

export function DownloadSettings() {
  const running = useRunning();
  const holds = useHolds();
  const dl = useDownload();
  const toast = useToast();
  const router = useRouter();
  const fromData = useSearchParams().get("from") === "data";

  const download = async () => {
    const made = await dl.start();
    if (!made) return;
    toast({ title: `Your file is downloading (${sizeOf(made.bytes)})` });
    // ST-63c: back on AI & your data, where the row now says when.
    if (fromData) router.back();
    else router.replace("/m/settings/data#download");
  };

  return (
    <SettingsScreen
      title="Download your information"
      loading={!running}
      offlineNote={false}
      footer={
        <BottomBar>
          <Button size="xl" className="w-full" loading={!!dl.busy} onClick={download}>
            {dl.error ? "Try again" : "Download"}
          </Button>
        </BottomBar>
      }
    >
      {dl.error && (
        <Banner tone="error" title={dl.error.title}>
          {dl.error.body}
        </Banner>
      )}
      {/* One line on top; the full description is the list's ⓘ, the care line its footer. */}
      <p className={cn(T.body, "text-text-primary")}>One .zip of everything IDEEZA keeps on this phone. It’s made here; nothing is sent anywhere.</p>
      <SettingsGroup
        label="The file holds"
        info={{
          title: "Download your information",
          body: "One .zip of everything IDEEZA keeps on this phone: pages you can open in any browser, your project files, your photos and videos, and a backup you can restore here or on another device. It’s made here; nothing is sent anywhere.",
        }}
        footer="Making the file can take a minute. It holds your private details, so keep it somewhere safe; it’s also your backup."
      >
        {CATEGORIES.map((c) => (
          <SettingsRow key={c.id} label={c.label} helper={holds ? onPhone(holds[c.id]) : "Reading…"} />
        ))}
      </SettingsGroup>
      {dl.busy && <Making busy={dl.busy} />}
    </SettingsScreen>
  );
}
