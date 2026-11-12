"use client";

// Settings › AI & your data (mobile Figma "Settings · 2026 update" 10688:2):
// ST-60 the page — Where your data goes (This phone, IDEEZA's server, the
// text, image, 3D and voice services, the training and trackers lines), AI
// (the volunteer GPU pool, AI help in the editors), Your data (Search
// history, Blog reuse), Your copy (Download your information, Keep this phone
// from clearing it, Restore from a backup, Erase IDEEZA from this phone);
// ST-63c the row's "Last downloaded …" after a download. Every fact is the
// web's (components/settings/data-page.tsx): the image and 3D services are
// this deployment's (the route reads its keys), and the services row opens
// the web's list of each one. Toggles save as they change (ST-92 when
// refused). The sub-pages are data-*.tsx; useDataRowValue is the Settings
// root's row value.

import * as React from "react";
import { useBlog } from "@/lib/blog/store";
import { dropOldWatchLog, useMinuteNow } from "@/lib/data/activity-log";
import { sizeOf, useLastBackup, useStorageStatus } from "@/lib/data/backup";
import { reuseGrants } from "@/lib/data/blog-reuse";
import { updateSettings, type SettingsV1 } from "@/lib/settings/prefs";
import { useDates } from "@/lib/settings/use-dates";
import { useSettings } from "@/lib/settings/use-settings";
import { Button } from "@/components/ideeza/button";
import { Sheet } from "../kit/sheet";
import { cn } from "@/lib/utils";
import { LIST_DIVIDERS } from "../kit/list";
import { T } from "../type";
import { useOnline } from "../kit/states";
import { SaveFailed, SettingsGroup, SettingsRow, SettingsScreen, useSaver } from "./kit";
import { EraseSheet } from "./data-erase";
import { savedWhen, useRunning } from "./data-parts";

export type ImageService = "aihorde" | "pollinations";
export type ThreeDService = "meshy" | "demo";

/** The Settings root's "AI & your data" value: a warning until a copy has been downloaded here. */
export function useDataRowValue(): { badge?: { tone: "warning"; text: string }; value?: string } {
  const { hydrated, at } = useLastBackup();
  const dates = useDates();
  if (!hydrated) return {};
  if (at === null) return { badge: { tone: "warning", text: "No backup yet" } };
  return { value: `Backed up ${dates.date(at, { style: "day" })}` };
}

const ARRIVED =
  "scroll-mt-24 rounded-sm data-[arrived]:outline data-[arrived]:outline-2 data-[arrived]:outline-offset-4 data-[arrived]:outline-border-focus";

type Open = null | "services" | "erase";

export function DataSettings({ images, threeD }: { images: ImageService; threeD: ThreeDService }) {
  const s = useSettings();
  const running = useRunning();
  const online = useOnline();
  const saver = useSaver();
  const blog = useBlog();
  const backup = useLastBackup();
  const dates = useDates();
  const now = useMinuteNow();
  const [open, setOpen] = React.useState<Open>(null);
  const close = React.useCallback(() => setOpen(null), []);
  const off = !online;
  const horde = images === "aihorde";
  const blogs = React.useMemo(() => reuseGrants(blog.data).length, [blog.data]);

  React.useEffect(() => {
    dropOldWatchLog();
  }, []);

  const saveAi = (patch: Partial<SettingsV1["ai"]>) => saver.run("ai", () => updateSettings("ai", patch));

  return (
    <SettingsScreen title="AI & your data" loading={!running}>
      <SettingsGroup label="Where your data goes">
        <SettingsRow
          id="where"
          label="This phone"
          helper="Everything you make and choose: projects, chats, builds, messages, blogs, settings, photos and videos. It stays until you erase it here or clear this site’s data."
        />
        <SettingsRow
          label="IDEEZA’s server"
          helper="Each concept image with its prompt, and each problem report you send, kept with no end date and no way to delete them yet. Anyone with an image’s address (a long random code) can open it."
        />
        <SettingsRow label={servicesTitle(threeD)} helper="The prompts you send, to make each result" onClick={() => setOpen("services")} />
      </SettingsGroup>
      <SettingsGroup>
        <div className={cn(T.body, "flex flex-col gap-2 px-8 py-6 text-text-primary")}>
          <p id="training" className={ARRIVED}>
            IDEEZA doesn’t train AI on your designs.
          </p>
          <p id="cookies" className={ARRIVED}>
            IDEEZA sets no cookies and has no analytics or advertising trackers.
          </p>
        </div>
      </SettingsGroup>

      <SettingsGroup label="AI">
        <SettingsRow
          id="ai"
          label="Use the volunteer GPU pool for images"
          helper={
            s.ai.volunteerPool
              ? "Concept images and the 3D editor’s AI Generate are drawn by AI Horde volunteers."
              : "Off: nothing goes to the volunteer pool, and this app has no other image service, so concepts can’t be drawn until you switch it back on."
          }
          toggle={{ checked: horde && s.ai.volunteerPool, onChange: () => saveAi({ volunteerPool: !s.ai.volunteerPool }) }}
          disabled={off || !horde}
          reason={horde ? undefined : "This app draws images with Pollinations, not the volunteer pool."}
        />
        <SettingsRow
          id="editor-assist"
          label="AI help in the editors"
          helper="The AI assistant in the PCB, Code, 3D and Preview editors, and AI Generate in the 3D editor. Off hides them."
          toggle={{ checked: s.ai.editorAssist, onChange: () => saveAi({ editorAssist: !s.ai.editorAssist }) }}
          disabled={off}
        />
      </SettingsGroup>
      <SaveFailed saver={saver} group="ai" />

      <SettingsGroup label="Your data">
        <SettingsRow id="activity" label="Search history" value={s.privacy.keepSearchHistory ? "On" : "Off"} href="/m/settings/data/search-history" />
        <SettingsRow
          id="blog-reuse"
          label="Blog reuse"
          value={blog.hydrated ? (blogs === 0 ? "None" : blogs === 1 ? "1 blog" : `${blogs} blogs`) : undefined}
          href="/m/settings/data/blog-reuse"
        />
      </SettingsGroup>

      <SettingsGroup label="Your copy">
        <SettingsRow
          id="download"
          label="Download your information"
          helper={backup.at !== null && now ? `Last downloaded ${savedWhen(backup.at, now, dates)}` : undefined}
          badge={backup.hydrated && backup.at === null ? { tone: "warning", text: "No backup yet" } : undefined}
          href="/m/settings/data/download?from=data"
        />
        <KeepRow disabled={off} />
        <SettingsRow id="restore" label="Restore from a backup" href="/m/settings/data/restore" />
        <SettingsRow id="erase" label="Erase IDEEZA from this phone" danger onClick={() => setOpen("erase")} disabled={off} />
      </SettingsGroup>

      <ServicesSheet open={open === "services"} onClose={close} images={images} threeD={threeD} pool={s.ai.volunteerPool} />
      <EraseSheet open={open === "erase"} onClose={close} />
    </SettingsScreen>
  );
}

const servicesTitle = (threeD: ThreeDService) => (threeD === "meshy" ? "Text, image, 3D and voice services" : "Text, image and voice services");

/** The web's "Keep this browser from clearing it": not drawn on the phone, kept (a phone's browser clears unused sites first). */
function KeepRow({ disabled }: { disabled: boolean }) {
  const s = useStorageStatus();
  const [asked, setAsked] = React.useState<null | boolean>(null);
  const use = s.usage !== null && s.quota ? ` IDEEZA uses ${sizeOf(s.usage)} of the ${sizeOf(s.quota)} this phone allows it.` : "";
  const helper = !s.ready
    ? undefined
    : s.persisted === true
      ? `This phone has agreed not to clear IDEEZA’s data on its own. Clearing this site’s data yourself still removes it.${use}`
      : s.persisted === false
        ? asked === false
          ? `This phone said no. Its browser decides by itself, mostly from how much you use a site, so keep a download.${use}`
          : `When it runs low on space, this phone may clear IDEEZA’s data without asking. Ask it to keep it, and keep a download.${use}`
        : `This phone can’t say whether it keeps site data, so keep a download.${use}`;
  return (
    <SettingsRow
      id="storage"
      label="Keep this phone from clearing it"
      helper={helper}
      trailing={
        s.ready && s.persisted === false ? (
          <Button hierarchy="secondary" size="sm" className="shrink-0" disabled={disabled} onClick={async () => setAsked(await s.ask())}>
            Ask
          </Button>
        ) : undefined
      }
    />
  );
}

type Place = { id: string; name: string; what: string };

/** What leaves this phone, and where to: the web's list, for this deployment. */
function ServicesSheet({
  open,
  onClose,
  images,
  threeD,
  pool,
}: {
  open: boolean;
  onClose: () => void;
  images: ImageService;
  threeD: ThreeDService;
  pool: boolean;
}) {
  const places: Place[] = [
    {
      id: "pollinations",
      name: "Pollinations",
      what: "Your prompts and what its free text model needs to answer them: concept summaries, companion products, the editors’ assistants, business plans, Auto-Map, headlines and video storyboards. No account is used.",
    },
    images === "aihorde"
      ? {
          id: "horde",
          name: "AI Horde",
          what: pool
            ? "The image prompt for each concept and for the 3D editor’s AI Generate. Volunteers run its computers, so they see the prompt. Only while the volunteer GPU pool is on."
            : "Nothing while the volunteer GPU pool is off.",
        }
      : {
          id: "images",
          name: "Pollinations images",
          what: "The image prompt for each concept and for the 3D editor’s AI Generate, on this app’s own account.",
        },
    ...(threeD === "meshy"
      ? [
          {
            id: "meshy",
            name: "Meshy",
            what: "The address of a concept image, which it opens to make a 3D model. The model stays on Meshy’s servers and this phone loads it from there.",
          },
        ]
      : []),
    {
      id: "voice",
      name: "Your browser’s speech service",
      what: "What you say while voice typing is on. Chrome sends it to Google’s speech service to turn it into text; other browsers use their own.",
    },
    {
      id: "hosts",
      name: "Font and editor-file hosts",
      what: "Pages load fonts from Google Fonts, and the Code and 3D editors load editor files and lighting from public file hosts. They see your IP address, not your work.",
    },
  ];
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={servicesTitle(threeD)}
      description="Your prompts pass through IDEEZA’s server to these services, which don’t see your IP address. Each has its own rules for what it keeps."
    >
      <ul role="list" className={cn("flex flex-col", LIST_DIVIDERS)}>
        {places.map((p) => (
          <li key={p.id} className="flex flex-col gap-1 py-6">
            <span className={T.rowTitle}>{p.name}</span>
            <span className={T.meta}>{p.what}</span>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
