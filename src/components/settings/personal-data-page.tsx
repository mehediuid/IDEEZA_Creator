"use client";

// /settings/personal-data (User Panel V2 Policy & Privacy › Personal Data
// 22048:35199): the "Download Your Information" row opens the Figma wizard
// (download-wizard.tsx), which makes a .zip of what this browser keeps and
// downloads it. Under it, what the file would hold today, one line per kind
// of information, so nobody has to download it to find out.

import * as React from "react";
import { Banner } from "@/components/ideeza";
import { CATEGORIES, summarize, type CategoryId } from "@/lib/data/export";
import { storageSnapshot } from "@/lib/data/export-browser";
import { subscribeStores } from "@/lib/key-store";
import { DownloadWizard, type DownloadDone } from "./download-wizard";
import { SettingsCard, SettingsRow } from "./settings-card";
import { SettingsFrame } from "./settings-frame";

/** What this browser holds per category, read after mount and again whenever a store changes. */
function useStorageSummary(): Record<CategoryId, string> | null {
  const [summary, setSummary] = React.useState<Record<CategoryId, string> | null>(null);
  React.useEffect(() => {
    const read = () => setSummary(summarize(storageSnapshot()));
    read();
    return subscribeStores(read);
  }, []);
  return summary;
}

function sizeOf(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PersonalDataPage() {
  const [open, setOpen] = React.useState(false);
  const [done, setDone] = React.useState<DownloadDone | null>(null);
  const summary = useStorageSummary();

  return (
    <SettingsFrame page="personal-data">
      <div className="flex flex-col rounded-xl border border-solid border-border bg-bg-surface px-[16px] py-[4px]">
        <SettingsRow
          id="download"
          label="Download Your Information"
          help="Download the list of the things you do and the things you create."
          onClick={() => {
            setDone(null);
            setOpen(true);
          }}
        />
      </div>

      {done && (
        <Banner tone="good" title="Your request is successful">
          {done.name} is downloading ({sizeOf(done.bytes)}, {done.files} {done.files === 1 ? "file" : "files"}). It holds your private details, so
          keep it somewhere safe.
        </Banner>
      )}

      <SettingsCard
        id="what"
        title="What your file holds"
        description="Read from this browser. Nothing is kept anywhere else, so this is all of it."
      >
        <ul role="list" className="m-0 grid grid-cols-1 gap-x-[24px] pl-0 [@container(min-width:720px)]:grid-cols-2">
          {CATEGORIES.map((c) => (
            <li key={c.id} className="flex flex-col gap-[2px] border-b border-solid border-border py-[12px] last:border-b-0">
              <span className="text-md font-medium leading-md text-text-primary">{c.label}</span>
              <span className="text-md leading-md text-text-secondary">{summary ? summary[c.id] : "Reading…"}</span>
              <span className="text-sm leading-sm text-text-tertiary">{c.hint}</span>
            </li>
          ))}
        </ul>
      </SettingsCard>

      <DownloadWizard
        open={open}
        summary={summary}
        onClose={() => setOpen(false)}
        onDone={(d) => {
          setOpen(false);
          setDone(d);
        }}
      />
    </SettingsFrame>
  );
}
