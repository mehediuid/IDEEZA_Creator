"use client";

// /settings/data — AI & your data (Settings v2, owner decisions V9 and V12).
// Every sentence here is checked against the code:
//   - Where your data goes: this browser; IDEEZA's server (concept images with
//     their prompts, problem reports, kept with no end date and no delete yet);
//     Pollinations (text prompts); the image service this deployment uses (the
//     AI Horde's volunteers while the pool is on, or Pollinations); Meshy when
//     set up; the browser's own speech service for voice typing; and the font
//     and editor-file hosts pages load from. Then the training line (V9) and
//     the cookies line.
//   - AI: the volunteer GPU pool and AI help in the editors (`settings.ai`).
//   - Search history (V12), blog reuse, and your copy: download, restore,
//     erase (data-copy.tsx).

import * as React from "react";
import { useRouter } from "next/navigation";
import { Banner, Toggle } from "@/components/ideeza";
import { useLastBackup } from "@/lib/data/backup";
import { dropOldWatchLog } from "@/lib/data/activity-log";
import { updateSettings, type SettingsV1 } from "@/lib/settings/prefs";
import { useDates } from "@/lib/settings/use-dates";
import { useSettings } from "@/lib/settings/use-settings";
import { BlogReuseCard } from "./data-blog-reuse";
import { DataCopy } from "./data-copy";
import { SearchHistoryCard } from "./data-search-history";
import { SAVE_FAILED, SettingsCard, SettingsRow } from "./settings-card";
import { SettingsFrame } from "./settings-frame";

/** A 44 px touch target round the 24 px switch on phones (its hit area, not its look). */
export const TOGGLE_TAP = "max-md:after:absolute max-md:after:-inset-[10px] max-md:after:content-['']";

type Images = "aihorde" | "pollinations";
type ThreeD = "meshy" | "demo";

export function DataPage({ images, threeD, done }: { images: Images; threeD: ThreeD; done: "erased" | "restored" | null }) {
  React.useEffect(() => {
    dropOldWatchLog();
  }, []);
  return (
    <SettingsFrame page="data">
      <DoneBanner done={done} />
      <WhereCard images={images} threeD={threeD} />
      <AiCard images={images} />
      <SearchHistoryCard />
      <BlogReuseCard />
      <DataCopy />
    </SettingsFrame>
  );
}

/** What an erase or a restore did, said once after its reload; the address then drops `?done`. */
function DoneBanner({ done }: { done: "erased" | "restored" | null }) {
  const router = useRouter();
  const [shown] = React.useState(done);
  const { at } = useLastBackup();
  const dates = useDates();
  React.useEffect(() => {
    if (done) router.replace("/settings/data", { scroll: false });
  }, [done, router]);
  if (!shown) return null;
  return (
    <Banner tone="good">
      {shown === "erased"
        ? "IDEEZA was erased from this browser. You're starting fresh."
        : `Restored from your backup${at ? ` of ${dates.dateTime(at, { style: "medium" })}` : ""}. Everything IDEEZA keeps here now comes from it.`}
    </Banner>
  );
}

type Place = { id: string; name: string; what: React.ReactNode };

function WhereCard({ images, threeD }: { images: Images; threeD: ThreeD }) {
  const pool = useSettings().ai.volunteerPool;
  const places: Place[] = [
    {
      id: "browser",
      name: "This browser",
      what: "Everything you make and choose: projects, chats, builds, messages, blogs, settings, photos and videos. It stays until you erase it here or clear this site's data.",
    },
    {
      id: "server",
      name: "IDEEZA's server",
      what: "Each concept image, with the prompt it was drawn from, and each problem report you send (your words, up to 3 pictures and, if you tick it, page and device details). Both are kept with no end date, and there's no way to delete them yet. Anyone with an image's address can open it; the address is a long random code. Your prompts pass through the server to the AI services below, which don't see your IP address.",
    },
    {
      id: "pollinations",
      name: "Pollinations",
      what: "Your prompts and what its free text model needs to answer them: concept summaries, companion products, the editors' assistants, business plans, Auto-Map, headlines and video storyboards. No account is used.",
    },
    images === "aihorde"
      ? {
          id: "horde",
          name: "AI Horde",
          what: pool
            ? "The image prompt for each concept and for the 3D editor's AI Generate. Volunteers run its computers, so they see the prompt. Only while the volunteer GPU pool is on."
            : "Nothing while the volunteer GPU pool is off.",
        }
      : {
          id: "images",
          name: "Pollinations images",
          what: "The image prompt for each concept and for the 3D editor's AI Generate, on this app's own account.",
        },
    ...(threeD === "meshy"
      ? [
          {
            id: "meshy",
            name: "Meshy",
            what: "The address of a concept image, which it opens to make a 3D model. The model stays on Meshy's servers and this browser loads it from there.",
          },
        ]
      : []),
    {
      id: "voice",
      name: "Your browser's speech service",
      what: "What you say while voice typing is on. Chrome sends it to Google's speech service to turn it into text; other browsers use their own.",
    },
    {
      id: "hosts",
      name: "Font and editor-file hosts",
      what: "Pages load fonts from Google Fonts, and the Code and 3D editors load editor files and lighting from public file hosts. They see your IP address, not your work.",
    },
  ];
  return (
    <SettingsCard id="where" title="Where your data goes" description="What IDEEZA keeps, and what leaves this browser and where to.">
      <ul role="list" className="m-0 flex flex-col pl-0">
        {places.map((p) => (
          <li key={p.id} className="flex flex-col gap-[2px] border-b border-solid border-border py-[12px]">
            <span className="text-md font-medium leading-md text-text-primary">{p.name}</span>
            <span className="max-w-[62ch] text-md leading-md text-text-secondary">{p.what}</span>
          </li>
        ))}
      </ul>
      <SettingsRow
        id="training"
        label="IDEEZA doesn't train AI on your designs."
        help="The services above have their own rules for what they keep."
      />
      <SettingsRow id="cookies" label="Cookies and analytics" help="IDEEZA sets no cookies and has no analytics or advertising trackers." />
    </SettingsCard>
  );
}

function AiCard({ images }: { images: Images }) {
  const { ai } = useSettings();
  const [failed, setFailed] = React.useState(false);
  const save = (patch: Partial<SettingsV1["ai"]>) => setFailed(!updateSettings("ai", patch));
  const horde = images === "aihorde";
  return (
    <SettingsCard id="ai-choices" title="AI">
      <SettingsRow
        id="ai"
        label="Use the volunteer GPU pool for images"
        help={
          !horde
            ? undefined
            : ai.volunteerPool
              ? "Concept images and the 3D editor's AI Generate are drawn by AI Horde volunteers."
              : "Off: nothing goes to the volunteer pool, and this app has no other image service, so concepts can't be drawn until you switch it back on."
        }
        disabled={!horde}
        reason="This app draws images with Pollinations, not the volunteer pool."
        control={
          horde ? (
            <Toggle
              className={TOGGLE_TAP}
              checked={ai.volunteerPool}
              aria-label="Use the volunteer GPU pool for images"
              onChange={() => save({ volunteerPool: !ai.volunteerPool })}
            />
          ) : undefined
        }
      />
      <SettingsRow
        id="editor-assist"
        label="AI help in the editors"
        help="The AI assistant in the PCB, Code, 3D and Preview editors, and AI Generate in the 3D editor. Off hides them."
        control={
          <Toggle className={TOGGLE_TAP} checked={ai.editorAssist} aria-label="AI help in the editors" onChange={() => save({ editorAssist: !ai.editorAssist })} />
        }
      />
      {failed && (
        <p role="alert" className="m-0 pt-[8px] text-md leading-md text-text-error">
          {SAVE_FAILED}
        </p>
      )}
    </SettingsCard>
  );
}
