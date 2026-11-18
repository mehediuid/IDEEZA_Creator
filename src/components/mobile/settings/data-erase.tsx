"use client";

// ST-65 · Erase IDEEZA from this phone? (mobile Figma "Settings · 2026
// update" 10688:2): the Shared kit's typed confirm CF-03 — Type ERASE to
// confirm, Download your information first, Erase, Cancel. The erase is the
// web's (lib/data/browser-data.ts eraseBrowserData): every IDEEZA key and
// database on this phone, the accounts and who is signed in among them, so
// the phone starts again at Welcome and says so there.

import { useLastBackup } from "@/lib/data/backup";
import { eraseBrowserData } from "@/lib/data/browser-data";
import { useDates } from "@/lib/settings/use-dates";
import { TEXT_LINK } from "../kit/bottom-bar";
import { ConfirmSheet } from "../kit/confirm-sheet";
import { DownloadStatus, useDownload } from "./data-download";
import { landOnPhone } from "./data-parts";

const OTHER_TABS = "Close IDEEZA in any other tab first, or it may save its old work again.";

export function EraseSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dl = useDownload();
  const { at } = useLastBackup();
  const dates = useDates();
  return (
    <ConfirmSheet
      open={open}
      onClose={onClose}
      title="Erase IDEEZA from this phone?"
      destructive
      typed="ERASE"
      typedLabel="Type ERASE to confirm"
      verb="Erase"
      body={
        <div className="flex flex-col gap-4">
          <p>
            Everything IDEEZA keeps on this phone is removed, the accounts on it too, and you’re signed out.{" "}
            {at
              ? `You last downloaded a copy ${dates.dateTime(at, { style: "medium" })}; anything since then is lost.`
              : "You haven’t downloaded a copy, so nothing here can be brought back."}{" "}
            Concept images and problem reports on IDEEZA’s server stay. {OTHER_TABS}
          </p>
          <button type="button" className={`${TEXT_LINK} w-fit disabled:text-text-disabled`} disabled={!!dl.busy} onClick={() => void dl.start()}>
            Download your information first
          </button>
          <DownloadStatus dl={dl} />
        </div>
      }
      onConfirm={async () => {
        await dl.settled();
        await eraseBrowserData();
        landOnPhone("/m/welcome", "IDEEZA was erased from this phone. You’re starting fresh.");
        // The page is leaving: keep the sheet busy until it has.
        await new Promise(() => {});
      }}
    />
  );
}
