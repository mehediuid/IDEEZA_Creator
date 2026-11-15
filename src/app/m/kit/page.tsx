"use client";

// Prototype only: the coded Shared kit (Figma "Shared kit · 2026 update",
// 10600:2), one row per pattern, so every sheet, menu, toast and state can be
// opened and checked against its KIT frame. The report sends here are the
// kit's demo (nothing is stored); each phase wires the same parts to its own
// data.

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircleIcon,
  CopyLinkIcon,
  Folder01Icon,
  Settings02Icon,
  Share08Icon,
  UserBlock01Icon,
  WifiOff01Icon,
} from "@hugeicons/core-free-icons";
import { Avatar } from "@/components/ideeza/avatar";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { SearchInput } from "@/components/ideeza/search-input";
import { ConfirmSheet } from "@/components/mobile/kit/confirm-sheet";
import { Eyebrow } from "@/components/mobile/kit/eyebrow";
import { ImageViewer } from "@/components/mobile/kit/image-viewer";
import { LIST_CARD, ListCard, ListRow } from "@/components/mobile/kit/list";
import { MEDIA_CHIP, MEDIA_GROUND } from "@/components/mobile/kit/media";
import { usePrePrompt, PermissionSheet, type PermissionKind } from "@/components/mobile/kit/permission-sheet";
import { PickSheet } from "@/components/mobile/kit/pick-list";
import { ReportSheet, type ReportReason } from "@/components/mobile/kit/report-sheet";
import { ActionSheet, Sheet } from "@/components/mobile/kit/sheet";
import { EmptyState, ErrorState, NotFoundState } from "@/components/mobile/kit/state";
import { ListBones } from "@/components/mobile/kit/states";
import { MobileTabs, tabPanelProps, useTabParam } from "@/components/mobile/kit/tabs";
import { BUILD_TOASTS, useToast } from "@/components/mobile/kit/toast";
import { Screen } from "@/components/mobile/screen";
import { TopBar } from "@/components/mobile/top-bar";
import { T } from "@/components/mobile/type";
import { useAuth } from "@/lib/account/auth";
import { updateSecurity, withDemoDevice } from "@/lib/account/security";
import { cn } from "@/lib/utils";

const PROFILE_REASONS: ReportReason[] = [
  { id: "impersonation", label: "Pretending to be someone else" },
  { id: "copied", label: "Copied someone’s work" },
  { id: "scam", label: "Scam or asks to pay outside IDEEZA" },
  { id: "spam", label: "Spam" },
  { id: "abuse", label: "Harassment or hate" },
  { id: "other", label: "Something else" },
];

const POST_REASONS: ReportReason[] = [
  { id: "copied", label: "Copied someone’s work" },
  { id: "spam", label: "Spam" },
  { id: "abuse", label: "Harassment or hate" },
  { id: "misleading", label: "Misleading" },
  { id: "other", label: "Something else" },
];

const PROJECT = "Smart Plant Watering Kit";
const PERSON = "Philip";

type Open =
  | null
  | "post-menu"
  | "profile-menu"
  | "report-post"
  | "report-profile"
  | "report-fails"
  | "block"
  | "discard"
  | "delete"
  | "cant-yet"
  | "pick"
  | "layers"
  | `pm-${PermissionKind}`;

/** The viewer's sample pictures (the app's own art). */
const PHOTOS = [
  { src: "/m/welcome-plant.png", name: "welcome-plant.png" },
  { src: "/m/ai-orb.svg", name: "ai-orb.svg" },
];

const SORTS = [
  { value: "new", label: "Newest first" },
  { value: "old", label: "Oldest first" },
  { value: "name", label: "Name", helper: "A to Z" },
] as const;
type Sort = (typeof SORTS)[number]["value"];

const TABS = [
  { value: "inbox", label: "Inbox", count: 2, countLabel: "2 unread" },
  { value: "requests", label: "Requests" },
] as const;
const TAB_VALUES = TABS.map((t) => t.value);

const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

export default function SharedKitPage() {
  const router = useRouter();
  const toast = useToast();
  const { account } = useAuth();
  const [open, setOpen] = React.useState<Open>(null);
  const close = () => setOpen(null);
  const [sort, setSort] = React.useState<Sort>("new");
  const [tab, setTab] = useTabParam("tab", TAB_VALUES, "inbox");
  const [query, setQuery] = React.useState("");
  const mic = usePrePrompt("microphone");
  // TopBar onBack: with words in the search field below, Back asks first (KIT-CF-01).
  const [leaving, setLeaving] = React.useState<(() => void) | null>(null);
  const [menuOverSheet, setMenuOverSheet] = React.useState(false);
  const [photo, setPhoto] = React.useState<number | null>(null);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({ title: "Link copied" });
    } catch {
      toast({ title: "Couldn’t copy the link.", lead: "error" });
    }
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: PROJECT, url: window.location.href });
      } catch {
        // The share sheet was closed: nothing to say.
      }
    } else {
      void copyLink();
    }
  };

  const block = () => {
    toast({
      title: `You blocked ${PERSON}`,
      action: { label: "Undo", onClick: () => toast({ title: `You unblocked ${PERSON}` }) },
    });
  };

  return (
    <Screen
      top={<TopBar back title="Shared kit" onBack={(goBack) => (query ? setLeaving(() => goBack) : goBack())} />}
      className="px-8 pb-16"
    >
      <div className="flex flex-col gap-12">
        <Group title="Menus (M12)">
          <Row label="Post ⋯" note="KIT-RB-02" onClick={() => setOpen("post-menu")} />
          <Row label="Profile ⋯ with Block" note="KIT-RB-01" onClick={() => setOpen("profile-menu")} />
        </Group>

        <Group title="Confirms (M09)">
          <Row label="Discard changes?" note="KIT-CF-01 · neutral" onClick={() => setOpen("discard")} />
          <Row label="Delete a project" note="KIT-CF-03 · typed" onClick={() => setOpen("delete")} />
          <Row label="Can’t delete yet" note="KIT-CF-04" onClick={() => setOpen("cant-yet")} />
          <Row label={`Block ${PERSON}?`} note="KIT-RB-20 → 21" onClick={() => setOpen("block")} />
        </Group>

        <Group title="Report">
          <Row label="Report profile" note="KIT-RB-10 → 16" onClick={() => setOpen("report-profile")} />
          <Row label="Report post" note="KIT-RB-17" onClick={() => setOpen("report-post")} />
          <Row label="Report that can’t send" note="KIT-RB-14" onClick={() => setOpen("report-fails")} />
        </Group>

        {account && (
          <Group title="Account">
            <Row
              label="Another phone signed in"
              note="Prototype only · AU-45 · adds a Demo device to Your devices"
              onClick={() => {
                const ok = updateSecurity(account.email, (s) => withDemoDevice(s, Date.now())).ok;
                if (ok) router.push("/m/settings/security#devices");
                else toast({ title: "Couldn’t save. Nothing changed.", lead: "error" });
              }}
            />
          </Group>
        )}

        <Group title="Account states with no cause in the demo">
          <Row label="Account suspended" note="AU-05i" onClick={() => router.push("/m/sign-in?demo=suspended")} />
          <Row label="Session expired" note="AU-05j" onClick={() => router.push("/m/sign-in?demo=expired")} />
          <Row label="Couldn’t sign in with Google" note="AU-04c" onClick={() => router.push("/m/welcome?error=google")} />
        </Group>

        <Group title="Pre-prompts (KIT-PM)">
          <Row label="Camera" note="KIT-PM-01" onClick={() => setOpen("pm-camera")} />
          <Row label="Photos" note="KIT-PM-02" onClick={() => setOpen("pm-photos")} />
          <Row
            label="Microphone, once"
            note="KIT-PM-03 · usePrePrompt: asks the first time only"
            onClick={() => mic.ask(() => toast({ title: "Listening" }))}
          />
          <Row label="Notifications" note="KIT-PM-04 · after the first build starts" onClick={() => setOpen("pm-notifications")} />
        </Group>

        <Group title="Pick one (_Select item)">
          <Row label="Sort by" note={`PickSheet · ${SORTS.find((s) => s.value === sort)?.label}`} onClick={() => setOpen("pick")} />
        </Group>

        <Group title="Layers">
          <Row label="A sheet with a toast and a menu" note="One scrim · the toast above the sheet’s actions" onClick={() => setOpen("layers")} />
        </Group>

        <Group title="Image viewer">
          <Row label="Photos" note="MS-22 · n of N, ← Save photo →" onClick={() => setPhoto(0)} />
        </Group>

        <Group title="Toasts (M02)">
          <Row label="Success" note="KIT-TO-01" onClick={() => toast({ title: "Link copied" })} />
          <Row
            label="With Undo"
            note="KIT-TO-02"
            onClick={() => toast({ title: "Comment deleted", action: { label: "Undo", onClick: () => {} } })}
          />
          <Row label="Build running" note="KIT-TO-03 · progress" onClick={() => toast(BUILD_TOASTS.running(PROJECT, 35, () => {}))} />
          <Row label="Build ready" note="KIT-TO-03b" onClick={() => toast(BUILD_TOASTS.ready(() => {}))} />
          <Row label="Build stopped" note="KIT-TO-03c" onClick={() => toast(BUILD_TOASTS.stopped(() => {}))} />
          <Row
            label="Error with Retry"
            note="KIT-TO-04"
            onClick={() =>
              toast({ title: "Couldn’t save.", lead: "error", action: { label: "Retry", onClick: () => {} } })
            }
          />
        </Group>

        <Group title="States">
          <Note>Loading · KIT-SK-01</Note>
          <ListBones rows={2} />
          <Note>Empty · KIT-EM-02</Note>
          <EmptyState
            title="Nothing matches these filters"
            body="Try fewer filters, or clear them to see everything."
            action={{ label: "Clear filters", onClick: () => toast({ title: "Filters cleared" }) }}
          />
          <Note>Error · KIT-ER-02</Note>
          <ErrorState
            title="Couldn’t load Messages"
            body="Check your connection, or try again in a moment."
            action={{ label: "Try again", onClick: () => toast({ title: "Loaded" }) }}
          />
          <Note>Not found · KIT-ER-04 (a whole page)</Note>
          <NotFoundState thing="project" />
          <Note>Offline · KIT-OF-01</Note>
          <Banner tone="attention">You’re offline. Showing what was loaded before.</Banner>
          <Note>Offline, nothing cached · KIT-OF-02</Note>
          <EmptyState
            icon={WifiOff01Icon}
            title="You’re offline"
            body="Check your connection and try again."
            action={{ label: "Try again", onClick: () => toast({ title: "Still offline" }) }}
          />
        </Group>

        <Group title="Type, tabs and lists">
          <Note>MobileTabs · M14 line</Note>
          <MobileTabs label="Kit tabs" idBase="kit" value={tab} onChange={setTab} tabs={TABS} />
          <p {...tabPanelProps("kit", tab)} className={T.body}>
            {tab === "inbox" ? "The Inbox panel." : "The Requests panel."}
          </p>
          <Note>Eyebrow · Label/SM caps</Note>
          <div className="flex items-center gap-8">
            <Eyebrow>Concept</Eyebrow>
            <Eyebrow tone="tertiary">Staked</Eyebrow>
          </div>
          <Note>ListCard · ListRow</Note>
          <ListCard label="Example rows">
            <ListRow icon={Folder01Icon} title="My projects" meta="3 projects" href="/m/projects" />
            <ListRow icon={Settings02Icon} title="Language" value="English" onClick={() => setOpen("pick")} />
            <ListRow title="Get paid" disabled reason="Verify your identity first" onClick={() => {}} />
          </ListCard>
          <Note>Search · A07 at 44</Note>
          <SearchInput size="xl" value={query} onValueChange={setQuery} placeholder="Find a setting" aria-label="Find a setting" />
          <Note>Avatar LG · XL, phone sizes</Note>
          <div className="flex items-center gap-8">
            <Avatar phone size="lg" initials="MK" />
            <Avatar phone size="xl" initials="RA" />
          </div>
          <Note>Media ground and chip (dark in both themes)</Note>
          <div className={cn(LIST_CARD, MEDIA_GROUND, "relative h-[96px] items-end justify-end p-6")}>
            <span className={MEDIA_CHIP}>0:42</span>
          </div>
        </Group>
      </div>

      <ActionSheet
        open={open === "post-menu"}
        onClose={close}
        title={PROJECT}
        items={[
          { label: "Copy link", icon: CopyLinkIcon, onSelect: copyLink },
          { label: "Share via…", icon: Share08Icon, onSelect: shareLink },
          { label: "Report post", icon: AlertCircleIcon, onSelect: () => setOpen("report-post") },
        ]}
      />
      <ActionSheet
        open={open === "profile-menu"}
        onClose={close}
        title="Philip Michel"
        items={[
          { label: "Copy profile link", icon: CopyLinkIcon, onSelect: copyLink },
          { label: "Report profile", icon: AlertCircleIcon, onSelect: () => setOpen("report-profile") },
          { label: `Block ${PERSON}`, icon: UserBlock01Icon, destructive: true, onSelect: () => setOpen("block") },
        ]}
      />

      <ConfirmSheet
        open={open === "discard"}
        onClose={close}
        title="Discard changes?"
        body="Your edits to this project’s description are lost."
        verb="Discard"
        cancelLabel="Keep editing"
        onConfirm={() => toast({ title: "Changes discarded" })}
      />
      <ConfirmSheet
        open={open === "delete"}
        onClose={close}
        title={`Delete “${PROJECT}”?`}
        body="Its files, links and prices are deleted. This can’t be undone."
        verb="Delete project"
        destructive
        typed={PROJECT}
        typedLabel="Type the project name to confirm"
        onConfirm={() => toast({ title: "Project deleted" })}
      />
      <ConfirmSheet
        open={open === "block"}
        onClose={close}
        title={`Block ${PERSON}?`}
        body={`${PERSON} won’t be able to message you, and their comments on your shared projects are held. They won’t be told. You can unblock them in Settings › Privacy & safety.`}
        verb="Block"
        destructive
        onConfirm={block}
      />
      <Sheet
        open={open === "cant-yet"}
        onClose={close}
        title="You can’t delete this yet"
        actions={
          <>
            <Button size="xl" className="w-full" onClick={() => router.push("/m/earn")}>
              Go to Earn › Sell
            </Button>
          </>
        }
      >
        <Banner tone="attention" title="It’s listed for sale">
          Remove the listing first, then delete.
        </Banner>
      </Sheet>

      <Sheet
        open={open === "layers"}
        onClose={close}
        title="A sheet under a toast"
        description="The toast stands 8 px above these actions and can be tapped; a menu opened from here shares this sheet’s scrim."
        actions={
          <>
            <Button
              size="xl"
              className="w-full"
              onClick={() => toast({ title: "Link copied", action: { label: "Undo", onClick: () => toast({ title: "Undone" }) } })}
            >
              Show a toast
            </Button>
            <Button hierarchy="secondary" size="xl" className="w-full" onClick={() => setMenuOverSheet(true)}>
              Open a menu
            </Button>
          </>
        }
      />
      <ActionSheet
        open={menuOverSheet}
        onClose={() => setMenuOverSheet(false)}
        title="A menu over a sheet"
        items={[{ label: "Copy link", icon: CopyLinkIcon, onSelect: () => void copyLink() }]}
      />
      <ImageViewer
        open={photo !== null}
        onClose={() => setPhoto(null)}
        index={photo ?? 0}
        count={PHOTOS.length}
        onIndex={setPhoto}
        src={PHOTOS[photo ?? 0].src}
        alt={PHOTOS[photo ?? 0].name}
        caption={PHOTOS[photo ?? 0].name}
        save={{ href: PHOTOS[photo ?? 0].src, name: PHOTOS[photo ?? 0].name }}
      />
      <ConfirmSheet
        open={leaving !== null}
        onClose={() => setLeaving(null)}
        title="Discard changes?"
        body="What you typed in the search field won’t be kept."
        verb="Discard"
        cancelLabel="Keep editing"
        onConfirm={() => leaving?.()}
      />

      <PickSheet open={open === "pick"} onClose={close} title="Sort by" value={sort} options={SORTS} onPick={setSort} />
      {(["camera", "photos", "notifications"] as const).map((k) => (
        <PermissionSheet
          key={k}
          kind={k}
          open={open === `pm-${k}`}
          onContinue={() => {
            close();
            toast({ title: "Continue" });
          }}
          onNotNow={close}
        />
      ))}
      {mic.sheet}

      <ReportSheet
        open={open === "report-profile"}
        onClose={close}
        title="Report Philip’s profile"
        description={`${PERSON} won’t know who reported.`}
        reasons={PROFILE_REASONS}
        blockName={PERSON}
        onSend={() => wait(800)}
      />
      <ReportSheet
        open={open === "report-post"}
        onClose={close}
        title="Report post"
        description="The maker won’t know who reported."
        reasons={POST_REASONS}
        onSend={() => wait(800)}
      />
      <ReportSheet
        open={open === "report-fails"}
        onClose={close}
        title="Report Philip’s profile"
        description={`${PERSON} won’t know who reported.`}
        reasons={PROFILE_REASONS}
        blockName={PERSON}
        onSend={async () => {
          await wait(800);
          throw new Error("demo: the send fails");
        }}
      />
    </Screen>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  const items = React.Children.toArray(children);
  const rows = items.every((c) => React.isValidElement(c) && c.type === Row);
  return (
    <section className="flex flex-col gap-4">
      <h2 className={T.section}>{title}</h2>
      {rows ? <ListCard>{children}</ListCard> : <div className="flex flex-col gap-4">{children}</div>}
    </section>
  );
}

function Row({ label, note, onClick }: { label: string; note: string; onClick: () => void }) {
  return <ListRow title={label} meta={note} onClick={onClick} />;
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className={cn(T.meta, "text-text-tertiary")}>{children}</p>;
}
