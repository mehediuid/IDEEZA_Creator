"use client";

// The Media tab's Snapshots group: the pictures Product Preview's Snapshot
// kept of the assembled product (lib/manual/snapshots.ts, plan F35). The
// owner sees them and can remove one; nothing shows until there is one.

import * as React from "react";
import { Button } from "@/components/ideeza";
import { readSnapshots, removeSnapshot, type Snapshot } from "@/lib/manual/snapshots";

const when = (at: number) => new Date(at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

export function SnapshotsGroup({ projectId, canRemove }: { projectId: string; canRemove: boolean }) {
  const [list, setList] = React.useState<Snapshot[]>([]);
  React.useEffect(() => {
    const read = () => {
      try {
        setList(readSnapshots(projectId, window.localStorage));
      } catch {
        setList([]);
      }
    };
    read();
    window.addEventListener("storage", read);
    return () => window.removeEventListener("storage", read);
  }, [projectId]);
  if (!list.length) return null;
  return (
    <>
      <h3 className="mt-7 text-md font-semibold text-text-secondary">Assembly snapshots</h3>
      <ul role="list" className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-6">
        {list.map((s) => (
          <li key={s.id} className="flex flex-col gap-2">
            <figure className="m-0 overflow-hidden rounded-lg border border-solid border-border-subtle bg-bg-subtle">
              {/* eslint-disable-next-line @next/next/no-img-element -- a local data URL */}
              <img src={s.dataUrl} alt={`${s.productName}, assembled`} className="block aspect-[4/3] w-full object-cover" />
              <figcaption className="px-3 py-2 text-xs leading-xs text-text-secondary">
                {s.productName} · {when(s.at)}
              </figcaption>
            </figure>
            {canRemove && (
              <div>
                <Button
                  hierarchy="ghost"
                  size="sm"
                  onClick={() => {
                    try {
                      setList(removeSnapshot(projectId, s.id, window.localStorage));
                    } catch {
                      // Storage refused: the snapshot stays listed, as it still is.
                    }
                  }}
                >
                  Remove
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
