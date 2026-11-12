"use client";

// Settings › Notifications › Muted projects (ST-22 the list, ST-22b unmuted
// with a toast and Undo, ST-22c empty). The list is the web's
// `notifications.mutedProjects` (a notice's ⋯ › Mute this project adds one);
// names and covers come from the projects in this browser. A muted project's
// notices still list, but don't pop up or add to the count (filter.ts isHeard).

import * as React from "react";
import { Folder01Icon, NotificationOff01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button } from "@/components/ideeza/button";
import { unmuteProject } from "@/components/notifications/use-notices";
import { useCreateHistory } from "@/lib/create/history";
import { buildsOf, coverOf } from "@/lib/manual/project-read";
import { useManualProjects } from "@/lib/manual/projects";
import { readSettings, updateSettings } from "@/lib/settings/prefs";
import { useSettings } from "@/lib/settings/use-settings";
import { useOnline } from "../kit/states";
import { cn } from "@/lib/utils";
import { EmptyState } from "../kit/state";
import { T } from "../type";
import { useToast } from "../kit/toast";
import { SaveFailed, SettingsGroup, SettingsNote, SettingsScreen, useSaver } from "./kit";

const noSubscribe = () => () => {};
const useRunning = () => React.useSyncExternalStore(noSubscribe, () => true, () => false);

type Muted = { id: string; name: string | null; cover: string | null };

/** Undo: the project goes back to its place in the list. */
function muteAgainAt(id: string, index: number): boolean {
  const muted = readSettings().notifications.mutedProjects;
  if (muted.includes(id)) return true;
  const next = [...muted];
  next.splice(Math.min(index, next.length), 0, id);
  return updateSettings("notifications", { mutedProjects: next });
}

function Tile({ src }: { src: string | null }) {
  const [broken, setBroken] = React.useState(false);
  if (src && !broken) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" onError={() => setBroken(true)} className="size-[48px] shrink-0 rounded-lg bg-bg-subtle object-cover" />;
  }
  return (
    <span aria-hidden className="flex size-[48px] shrink-0 items-center justify-center rounded-lg bg-bg-subtle text-[color:var(--color-icon-default)]">
      <Icon icon={Folder01Icon} size={24} />
    </span>
  );
}

export function MutedProjectsSettings() {
  const ids = useSettings().notifications.mutedProjects;
  const { projects, hydrated } = useManualProjects();
  const { builds } = useCreateHistory();
  const online = useOnline();
  const running = useRunning();
  const toast = useToast();
  const saver = useSaver();

  const list = React.useMemo<Muted[]>(
    () =>
      ids.map((id) => {
        const p = projects.find((x) => x.id === id);
        return { id, name: p?.name.trim() || null, cover: p ? coverOf(p, buildsOf(p, builds)) : null };
      }),
    [ids, projects, builds],
  );

  const unmute = (m: Muted, index: number) => {
    if (!saver.run("muted", () => unmuteProject(m.id))) return;
    toast({
      title: `${m.name ?? "Project"} unmuted`,
      action: {
        label: "Undo",
        onClick: () => {
          if (!muteAgainAt(m.id, index)) toast({ title: "Couldn’t undo. Nothing changed.", lead: "error" });
        },
      },
    });
  };

  return (
    <SettingsScreen title="Muted projects" loading={!running || !hydrated}>
      {list.length === 0 ? (
        <EmptyState icon={NotificationOff01Icon} title="No muted projects" body="Mute one from a notice’s ⋯ menu." />
      ) : (
        <>
          <SettingsGroup>
            {list.map((m, i) => (
              <div key={m.id} className="flex items-center gap-6 px-8 py-6">
                <Tile src={m.cover} />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className={cn(T.body, "text-text-primary", m.name && "truncate")}>
                    {m.name ?? "A project no longer in this browser"}
                  </span>
                  {!m.name && <span className={T.meta}>Its notices stay quiet until you unmute it.</span>}
                </span>
                <Button hierarchy="secondary" size="sm" disabled={!online} aria-label={`Unmute ${m.name ?? "this project"}`} onClick={() => unmute(m, i)}>
                  Unmute
                </Button>
              </div>
            ))}
          </SettingsGroup>
          <SaveFailed saver={saver} group="muted" />
          <SettingsNote>Their notices are still listed, but don’t pop up or add to the count.</SettingsNote>
        </>
      )}
    </SettingsScreen>
  );
}
