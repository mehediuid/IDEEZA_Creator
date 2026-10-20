"use client";

// Settings › AI & your data › your copy:
//   - Download your information: one button. The zip holds readable pages,
//     project files, every photo, attachment and clip, and the backup Restore
//     reads (lib/data/export-browser.ts). The time of the last one is kept
//     (lib/data/backup.ts), and so is whether this browser has promised not
//     to clear the data on its own (navigator.storage.persist).
//   - Restore from a backup: a zip Download made, read and checked
//     (lib/data/browser-data.ts readBackupZip); a dialog shows what it holds
//     beside what is here now, then replaces it and reloads.
//   - Erase IDEEZA from this browser: download first, confirm, clear every
//     key and database, reload to a fresh start.

import * as React from "react";
import { Banner, Button, ConfirmDialog, ModalFrame, ProgressBar } from "@/components/ideeza";
import { sizeOf, useLastBackup, useStorageStatus } from "@/lib/data/backup";
import { eraseBrowserData, readBackupZip, restoreBrowserData, storageSnapshot, type BackupError, type ReadBackup } from "@/lib/data/browser-data";
import { CATEGORIES, summarize, type CategoryId } from "@/lib/data/export";
import { createInformationZip, downloadBlob, type ExportProgress } from "@/lib/data/export-browser";
import { subscribeStores } from "@/lib/key-store";
import { useDates } from "@/lib/settings/use-dates";
import { SettingsCard, SettingsRow } from "./settings-card";

const NOTE = "m-0 max-w-[62ch] text-md leading-md text-text-secondary";
const TAP = "[@media(pointer:coarse)]:h-[var(--touch-min)]";
const OTHER_TABS = "If IDEEZA is open in another tab, close it first, or it may save its old work again.";

/** What this browser holds per kind of information, read after mount and again whenever a store changes. */
function useHolds(): Record<CategoryId, string> | null {
  const [holds, setHolds] = React.useState<Record<CategoryId, string> | null>(null);
  React.useEffect(() => {
    const read = () => setHolds(summarize(storageSnapshot()));
    read();
    return subscribeStores(read);
  }, []);
  return holds;
}

type Where = "download" | "erase" | "restore";
type Made = { name: string; files: number; bytes: number };

/** One download at a time, said where it was started. */
function useDownload() {
  const [busy, setBusy] = React.useState<ExportProgress | null>(null);
  const [from, setFrom] = React.useState<Where>("download");
  const [made, setMade] = React.useState<Made | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const start = async (where: Where) => {
    if (busy) return false;
    setFrom(where);
    setMade(null);
    setError(null);
    setBusy({ label: "Reading your information", done: 0, total: 1 });
    try {
      const zip = await createInformationZip(Date.now(), setBusy);
      downloadBlob(zip.blob, zip.name);
      setMade({ name: zip.name, files: zip.files, bytes: zip.blob.size });
      return true;
    } catch (e) {
      const big = e instanceof Error && /4 GB|Too many/.test(e.message);
      setError(
        big
          ? "Couldn't make your file: it is over 4 GB, more than one zip can hold. Delete some videos you don't need, then try again."
          : "Couldn't make your file: something went wrong while reading it. Nothing was changed, so try again.",
      );
      return false;
    } finally {
      setBusy(null);
    }
  };
  return { busy, from, made, error, start };
}

type Download = ReturnType<typeof useDownload>;

/** The download's progress, its result or its error, under the button that started it. */
function DownloadStatus({ dl, where }: { dl: Download; where: Where }) {
  if (dl.from !== where) return null;
  return (
    <div aria-live="polite" className="flex flex-col gap-[8px] empty:hidden">
      {dl.busy && (
        <>
          <p className={NOTE}>
            {dl.busy.label}
            {dl.busy.total > 1 ? ` (${Math.min(dl.busy.done + 1, dl.busy.total)} of ${dl.busy.total})` : ""}…
          </p>
          <ProgressBar value={dl.busy.total > 1 ? (dl.busy.done / dl.busy.total) * 100 : 100} label="Making your file" />
        </>
      )}
      {dl.made && (
        <p className={NOTE}>
          {dl.made.name} is downloading ({sizeOf(dl.made.bytes)}, {dl.made.files} {dl.made.files === 1 ? "file" : "files"}). It holds your private
          details, so keep it somewhere safe.
        </p>
      )}
      {dl.error && (
        <p role="alert" className="m-0 text-md leading-md text-text-error">
          {dl.error}
        </p>
      )}
    </div>
  );
}

export function DataCopy() {
  const dl = useDownload();
  return (
    <>
      <DownloadCard dl={dl} />
      <RestoreCard dl={dl} />
      <EraseCard dl={dl} />
    </>
  );
}

function DownloadCard({ dl }: { dl: Download }) {
  const holds = useHolds();
  const { hydrated, at } = useLastBackup();
  const dates = useDates();
  return (
    <SettingsCard
      id="download"
      title="Download your information"
      description="One zip of everything IDEEZA keeps in this browser: pages you can open in any browser, your project files, your photos and videos, and a backup you can restore here or in another browser. It's made here; nothing is sent anywhere."
    >
      <ul role="list" className="m-0 grid grid-cols-1 gap-x-[24px] pl-0 [@container(min-width:720px)]:grid-cols-2">
        {CATEGORIES.map((c) => (
          <li key={c.id} className="flex flex-col gap-[2px] border-b border-solid border-border py-[12px]">
            <span className="text-md font-medium leading-md text-text-primary">{c.label}</span>
            <span className="text-sm leading-sm text-text-tertiary">{holds ? holds[c.id] : "Reading…"}</span>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-[12px] pt-[16px]">
        <div className="flex flex-wrap items-center justify-between gap-[12px]">
          <p className={NOTE}>
            {!hydrated ? " " : at ? `Last downloaded ${dates.dateTime(at, { style: "medium" })}.` : "You haven't downloaded a copy in this browser yet."}
          </p>
          <Button type="button" hierarchy="primary" size="md" className={TAP} loading={!!dl.busy && dl.from === "download"} disabled={!!dl.busy} onClick={() => dl.start("download")}>
            Download
          </Button>
        </div>
        <DownloadStatus dl={dl} where="download" />
      </div>
      <KeepRow />
    </SettingsCard>
  );
}

/** Whether this browser may clear IDEEZA's data when it runs low on space, and asking it not to. */
function KeepRow() {
  const s = useStorageStatus();
  const [asked, setAsked] = React.useState<null | boolean>(null);
  const use = s.usage !== null && s.quota ? ` IDEEZA uses ${sizeOf(s.usage)} of the ${sizeOf(s.quota)} this browser allows it.` : "";
  const help = !s.ready
    ? " "
    : s.persisted === true
      ? `This browser has agreed not to clear IDEEZA's data on its own. Clearing this site's data yourself still removes it.${use}`
      : s.persisted === false
        ? asked === false
          ? `This browser said no. It decides by itself, mostly from how much you use a site, so keep a download.${use}`
          : `When it runs low on space, this browser may clear IDEEZA's data without asking. Ask it to keep it, and keep a download.${use}`
        : `This browser can't say whether it keeps site data, so keep a download.${use}`;
  return (
    <SettingsRow
      id="storage"
      className="border-t border-solid border-border mt-[16px]"
      label="Keep this browser from clearing it"
      help={help}
      control={
        s.ready && s.persisted === false ? (
          <Button type="button" hierarchy="secondary" size="sm" className={TAP} onClick={async () => setAsked(await s.ask())}>
            Ask the browser
          </Button>
        ) : undefined
      }
    />
  );
}

const READ_ERRORS: Record<BackupError, string> = {
  "not-zip": "That file isn't a zip. Choose the .zip that Download your information made.",
  foreign: "That zip isn't an IDEEZA backup: it has no ideeza-backup folder. Choose the .zip that Download your information made.",
  newer: "That backup was made by a newer IDEEZA than this one. Reload this page to get the newest IDEEZA, then choose it again.",
  damaged: "That backup is damaged or incomplete, so nothing was changed. Download it again where it was made, or choose another copy.",
  unsupported: "That zip is packed in a way IDEEZA can't open (encrypted, or over 4 GB). Choose the zip Download made, as it is.",
};

function RestoreCard({ dl }: { dl: Download }) {
  const input = React.useRef<HTMLInputElement>(null);
  const [reading, setReading] = React.useState<string | null>(null);
  const [read, setRead] = React.useState<Extract<ReadBackup, { ok: true }> | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [restoring, setRestoring] = React.useState(false);
  const [failed, setFailed] = React.useState<string | null>(null);
  const dates = useDates();

  const choose = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setRead(null);
    setReading(file.name);
    const r = await readBackupZip(file);
    setReading(null);
    if (input.current) input.current.value = "";
    if (r.ok) {
      setFailed(null);
      setRead(r);
    } else setError(READ_ERRORS[r.error]);
  };

  const restore = async () => {
    if (!read || restoring) return;
    setRestoring(true);
    setFailed(null);
    const r = await restoreBrowserData(read.backup, read.files);
    if (r.ok) return;
    setRestoring(false);
    setFailed(
      r.failed === "files"
        ? "This browser refused the photos and files (it may be full), so the restore stopped. Your projects and settings weren't changed, but photos and files here may be missing. Free some space, then restore again."
        : "This browser ran out of room part way through, so IDEEZA's data here is incomplete. Free some space, then restore again.",
    );
  };

  const plan = read?.plan;
  return (
    <SettingsCard
      id="restore"
      title="Restore from a backup"
      description="Choose a zip that Download your information made, here or in another browser. You'll see what it holds before anything changes."
    >
      <div className="flex flex-col gap-[8px] pt-[8px]">
        <input
          ref={input}
          type="file"
          accept=".zip,application/zip"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => choose(e.target.files?.[0])}
        />
        <Button type="button" hierarchy="secondary" size="md" className={`w-fit ${TAP}`} loading={reading !== null} onClick={() => input.current?.click()}>
          Choose a backup
        </Button>
        <div aria-live="polite" className="empty:hidden">
          {reading && <p className={NOTE}>Reading {reading}…</p>}
          {error && (
            <p role="alert" className="m-0 text-md leading-md text-text-error">
              {error}
            </p>
          )}
        </div>
      </div>

      <ModalFrame
        open={!!read}
        onClose={() => {
          if (!restoring) setRead(null);
        }}
        closeUnavailable={restoring}
        size="md"
        sheet
        title="Restore this backup?"
        description={plan ? `Made ${dates.dateTime(plan.madeAt, { style: "medium" })}. It replaces everything IDEEZA keeps in this browser now.` : undefined}
        footer={
          <div className="flex w-full flex-wrap items-center justify-end gap-[8px]">
            <Button type="button" hierarchy="secondary" size="lg" className={TAP} disabled={restoring} onClick={() => setRead(null)}>
              Cancel
            </Button>
            <Button type="button" hierarchy="danger" size="lg" className={TAP} loading={restoring} onClick={restore}>
              Replace with this backup
            </Button>
          </div>
        }
      >
        {plan && (
          <div className="flex flex-col gap-[12px]">
            {plan.empty && <Banner tone="attention">This backup holds nothing. Restoring it leaves IDEEZA empty in this browser.</Banner>}
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-solid border-border">
                  <th scope="col" className="py-[8px] pr-[12px] text-sm font-medium leading-sm text-text-tertiary">
                    Kind
                  </th>
                  <th scope="col" className="py-[8px] pr-[12px] text-sm font-medium leading-sm text-text-tertiary">
                    In the backup
                  </th>
                  <th scope="col" className="py-[8px] text-sm font-medium leading-sm text-text-tertiary">
                    Here now
                  </th>
                </tr>
              </thead>
              <tbody>
                {CATEGORIES.map((c) => (
                  <tr key={c.id} className="border-b border-solid border-border last:border-b-0 align-top">
                    <th scope="row" className="py-[8px] pr-[12px] text-md font-medium leading-md text-text-primary">
                      {c.label.replace(/ Information$/, "")}
                    </th>
                    <td className="py-[8px] pr-[12px] text-md leading-md text-text-primary">{plan.holds[c.id]}</td>
                    <td className="py-[8px] text-md leading-md text-text-secondary">{plan.replaces[c.id]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className={NOTE}>
              {plan.files ? `It also holds ${plan.files} ${plan.files === 1 ? "photo, file or video" : "photos, files and videos"}. ` : ""}
              {OTHER_TABS}
            </p>
            <div className="flex flex-col gap-[8px]">
              <Button type="button" hierarchy="ghost" size="sm" className={`-ml-[12px] w-fit ${TAP}`} disabled={restoring || !!dl.busy} loading={!!dl.busy && dl.from === "restore"} onClick={() => dl.start("restore")}>
                Download what&apos;s here first
              </Button>
              <DownloadStatus dl={dl} where="restore" />
            </div>
            {failed && (
              <p role="alert" className="m-0 text-md leading-md text-text-error">
                {failed}
              </p>
            )}
          </div>
        )}
      </ModalFrame>
    </SettingsCard>
  );
}

function EraseCard({ dl }: { dl: Download }) {
  const [confirm, setConfirm] = React.useState(false);
  const [erasing, setErasing] = React.useState(false);
  const { at } = useLastBackup();
  const dates = useDates();
  return (
    <SettingsCard
      id="erase"
      title="Erase IDEEZA from this browser"
      description="For a shared or old computer: removes your projects, chats, messages, blogs, settings, photos and videos from this browser and starts IDEEZA fresh. It can't be undone, so download a copy first."
    >
      <div className="flex flex-col gap-[8px] pt-[8px]">
        <div className="flex flex-wrap gap-[8px]">
          <Button type="button" hierarchy="secondary" size="md" className={TAP} loading={!!dl.busy && dl.from === "erase"} disabled={!!dl.busy} onClick={() => dl.start("erase")}>
            Download a copy first
          </Button>
          <Button type="button" hierarchy="danger" size="md" className={TAP} disabled={!!dl.busy} onClick={() => setConfirm(true)}>
            Erase
          </Button>
        </div>
        <DownloadStatus dl={dl} where="erase" />
      </div>
      <ConfirmDialog
        open={confirm}
        title="Erase IDEEZA from this browser?"
        confirmLabel={erasing ? "Erasing…" : "Erase everything"}
        confirmUnavailable={erasing}
        onCancel={() => {
          if (!erasing) setConfirm(false);
        }}
        onConfirm={async () => {
          if (erasing) return;
          setErasing(true);
          await eraseBrowserData();
        }}
      >
        <p className="m-0">
          {at ? `You last downloaded a copy ${dates.dateTime(at, { style: "medium" })}; anything since then is lost.` : "You haven't downloaded a copy, so nothing here can be brought back."}{" "}
          Concept images and problem reports kept on IDEEZA&apos;s server aren&apos;t affected. {OTHER_TABS}
        </p>
      </ConfirmDialog>
    </SettingsCard>
  );
}
