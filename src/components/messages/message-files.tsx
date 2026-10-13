"use client";

// A message's photos and PDFs (spec §6): a photo is a thumbnail that opens
// full size in a new tab; a PDF is a row with its name and size that opens it.
// Both read the stored file from IndexedDB; a file this browser no longer
// holds says so instead of linking nowhere.

import { Pdf01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { useMessageFileUrl } from "@/lib/messages/files";
import type { FileRef } from "@/lib/messages/types";
import { cn } from "@/lib/utils";

export function sizeOf(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Missing({ file }: { file: FileRef }) {
  return (
    <p className="rounded-lg border border-dashed border-border px-4 py-3 text-md leading-md text-text-tertiary">
      {file.name} isn&apos;t in this browser any more.
    </p>
  );
}

function Photo({ file }: { file: FileRef }) {
  const { url, missing } = useMessageFileUrl(file.key);
  if (missing) return <Missing file={file} />;
  return (
    <a
      href={url ?? undefined}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Open ${file.name} full size`}
      className={cn(
        "block size-[160px] overflow-hidden rounded-lg border border-solid border-border bg-bg-subtle outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
        !url && "pointer-events-none",
      )}
    >
      {url && (
        // A blob URL from IndexedDB: next/image can't optimise it.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="size-full object-cover" />
      )}
    </a>
  );
}

function Pdf({ file }: { file: FileRef }) {
  const { url, missing } = useMessageFileUrl(file.key);
  if (missing) return <Missing file={file} />;
  return (
    <a
      href={url ?? undefined}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Open ${file.name}, ${sizeOf(file.size)}`}
      className="flex min-h-[48px] w-[min(280px,100%)] items-center gap-4 rounded-lg border border-solid border-border bg-bg-surface px-4 py-2 text-left outline-none transition-colors duration-fast hover:border-border-strong focus-visible:ring-2 focus-visible:ring-border-focus"
    >
      <Icon icon={Pdf01Icon} size={20} className="shrink-0 text-text-secondary" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-md font-medium leading-md text-text-primary">{file.name}</span>
        <span className="block text-md leading-md text-text-secondary">PDF · {sizeOf(file.size)}</span>
      </span>
    </a>
  );
}

export function MessageFiles({ files, mine }: { files: FileRef[]; mine: boolean }) {
  if (!files.length) return null;
  return (
    <ul role="list" className={cn("flex flex-wrap gap-2", mine ? "justify-end" : "justify-start")}>
      {files.map((f) => (
        <li key={f.key}>{f.type === "application/pdf" ? <Pdf file={f} /> : <Photo file={f} />}</li>
      ))}
    </ul>
  );
}
