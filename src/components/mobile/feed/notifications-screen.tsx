"use client";

// Notification (mobile Figma, Design - Light Mode › Notification), row-first
// (2026 mobile UX pass): Back, "Notification" and ⋮ (Mark all as read ·
// Notification settings · Clear all notifications); the All and Unread tabs
// (M14, Unread with its count; the tab is kept in the address, `?tab=unread`);
// the list under New, Today, Yesterday and the date. Each notice is one row,
// tappable as a whole: the kind's picture (a dot while unread), one meta line
// (its tag and a compact time), the title, the body in two lines; under them
// its button, small — two where the Figma draws two (a new sign-in: It's me ·
// Log Out) — and its own ⋮ (Turn off notifications like this · Mute this
// project · Delete this notification). Popups are the kit's bottom sheets, so
// the Figma's dropdowns rise from the bottom (owner rule), and the two deletes
// ask first.
//
// The notices are the web bell's (use-notices.ts): builds, sales and bids,
// messages, comments, coin and plan, videos, blog reviews — and the phone's
// account and security notices. The row and its button open the exact phone
// screen: the thread, the build's chat, Plans, the project's Earn tab, the
// comment on your post. Opening one marks it read where the bell keeps it;
// turning a kind off and muting a project are the web's Notification settings;
// Delete and Clear all take notices off this phone's list only (the web bell
// keeps every record).

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Coins01Icon,
  Comment01Icon,
  CpuIcon,
  Delete02Icon,
  LicenseIcon,
  Message01Icon,
  MoreVerticalIcon,
  News01Icon,
  Notification01Icon,
  NotificationOff01Icon,
  Settings02Icon,
  Shield01Icon,
  Store01Icon,
  TickDouble02Icon,
  UserAdd01Icon,
  UserGroupIcon,
  VolumeOffIcon,
} from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { Button } from "@/components/ideeza/button";
import { markRead, muteProject, unmuteProject } from "@/components/notifications/use-notices";
import { updateSecurity, withoutDevice } from "@/lib/account/security";
import {
  actionLabelOf,
  deviceIdOf,
  phoneGroups,
  phoneHrefOf,
  secondActionOf,
  withAllCleared,
  withClearedId,
  type PhoneTab,
} from "@/lib/notifications/phone";
import { KIND_LABELS } from "@/lib/notifications/types";
import type { Notice, NoticeKind } from "@/lib/notifications/types";
import { formatDate, formatStamp, formatTime } from "@/lib/settings/dates";
import { readSettings, updateSettings } from "@/lib/settings/prefs";
import { cn } from "@/lib/utils";
import { ConfirmSheet } from "../kit/confirm-sheet";
import { ActionSheet, type ActionSheetItem } from "../kit/sheet";
import { EmptyState } from "../kit/state";
import { ListBones } from "../kit/states";
import { MobileTabs, tabPanelProps, useTabParam } from "../kit/tabs";
import { useToast } from "../kit/toast";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { T } from "../type";
import { useMinuteNow } from "./use-feed";
import { usePhoneNotices } from "./use-phone-notices";

/** Every notice leads with its kind's picture, so the rows line up and scan by kind. */
const KIND_ICON: Record<NoticeKind, IconValue> = {
  marketplace: Store01Icon,
  product: CpuIcon,
  coin: Coins01Icon,
  comments: Comment01Icon,
  message: Message01Icon,
  following: UserAdd01Icon,
  teams: UserGroupIcon,
  blog: News01Icon,
  policy: LicenseIcon,
  other: Shield01Icon,
};

/** A 36 px button's tap area grown to 44 (the kit's touch rule). */
const HIT44 = "after:absolute after:inset-x-0 after:-inset-y-[4px] after:content-['']";

const TABS = ["all", "unread"] as const;

const kindLabel = (k: NoticeKind) => (KIND_LABELS as Record<string, string>)[k] ?? "These notifications";

/** Turns a kind off in the app and on the phone (email stays as it was); returns how to undo it. */
function turnOff(kind: NoticeKind): (() => void) | null {
  const channels = readSettings().notifications.channels;
  const was = channels[kind];
  if (!updateSettings("notifications", { channels: { ...channels, [kind]: { ...was, web: false, mobile: false } } })) return null;
  return () => {
    const now = readSettings().notifications.channels;
    updateSettings("notifications", { channels: { ...now, [kind]: was } });
  };
}

export function NotificationsScreen() {
  const router = useRouter();
  const toast = useToast();
  const now = useMinuteNow();
  const { hydrated, feed, list, unread, updateCleared, email } = usePhoneNotices();
  const [tab, setTab] = useTabParam<PhoneTab>("tab", TABS, "all");
  const [menu, setMenu] = React.useState(false);
  const [rowMenu, setRowMenu] = React.useState<Notice | null>(null);
  const [confirm, setConfirm] = React.useState<{ kind: "one"; notice: Notice } | { kind: "all" } | null>(null);
  const locale = feed.settings.language.dateLocale;

  const failed = () => toast({ title: "This phone couldn’t save that. Nothing changed.", lead: "error" });
  const groups = now ? phoneGroups(list, feed.isRead, tab, now, (ms) => formatDate(ms, locale, { style: "long" })) : [];

  const openNotice = (n: Notice) => {
    markRead([n]);
    // "It's me" keeps the device signed in: reading the notice is all it does.
    if (deviceIdOf(n)) return toast({ title: "Thanks. That device stays signed in." });
    router.push(phoneHrefOf(n));
  };

  const second = (n: Notice) => {
    const id = deviceIdOf(n);
    if (!id || !email) return;
    if (!updateSecurity(email, (s) => withoutDevice(s, id)).ok) return failed();
    markRead([n]);
    toast({ title: "That device is signed out" });
  };

  const headerItems: ActionSheetItem[] = [
    {
      label: "Mark all as read",
      icon: TickDouble02Icon,
      onSelect: () => {
        if (!unread.length) return toast({ title: "Nothing unread" });
        if (!markRead(unread)) failed();
        else toast({ title: "All marked as read" });
      },
    },
    { label: "Notification settings", icon: Settings02Icon, onSelect: () => router.push("/m/settings/notifications") },
    { label: "Clear all notifications", icon: Delete02Icon, destructive: true, onSelect: () => setConfirm({ kind: "all" }) },
  ];

  const rowItems = (n: Notice): ActionSheetItem[] => [
    ...(n.kind !== "other"
      ? [
          {
            label: "Turn off notifications like this",
            icon: NotificationOff01Icon,
            onSelect: () => {
              const undo = turnOff(n.kind);
              if (!undo) return failed();
              toast({ title: `${kindLabel(n.kind)}: turned off`, action: { label: "Undo", onClick: undo } });
            },
          },
        ]
      : []),
    ...(n.projectId
      ? [
          {
            label: "Mute this project",
            icon: VolumeOffIcon,
            onSelect: () => {
              const id = n.projectId as string;
              if (!muteProject(id)) return failed();
              toast({ title: `Notices about “${feed.projectName(id) ?? "this project"}” are muted.`, action: { label: "Undo", onClick: () => unmuteProject(id) } });
            },
          },
        ]
      : []),
    { label: "Delete this notification", icon: Delete02Icon, destructive: true, onSelect: () => setConfirm({ kind: "one", notice: n }) },
  ];

  return (
    <Screen top={<TopBar back title="Notification" actions={[{ icon: MoreVerticalIcon, label: "Notification actions", onClick: () => setMenu(true) }]} />}>
      <MobileTabs
        label="Notifications"
        idBase="notices"
        value={tab}
        onChange={setTab}
        className="mx-8"
        tabs={[
          { value: "all", label: "All" },
          { value: "unread", label: "Unread", count: hydrated ? unread.length : 0, countLabel: `${unread.length} unread` },
        ]}
      />

      <div {...tabPanelProps("notices", tab)} className="outline-none">
        {!hydrated || !now ? (
          <div className="px-8 pt-6">
            <ListBones rows={6} />
          </div>
        ) : groups.length === 0 ? (
          <div className="px-8 pt-10">
            <EmptyState
              icon={Notification01Icon}
              title={tab === "unread" && list.length ? "You’re all caught up" : "No notifications yet"}
              body={
                tab === "unread" && list.length
                  ? "Nothing unread. Everything you’ve opened is under All."
                  : "Builds that need you, sales, messages and your Blog’s review results show up here."
              }
            />
          </div>
        ) : (
          <div className="flex flex-col pb-8">
            {groups.map((g) => (
              <section key={g.key} aria-label={g.label} className="flex flex-col">
                <h2 className={cn(T.rowTitle, "px-8 pb-1 pt-8")}>{g.label}</h2>
                <ul className="flex flex-col">
                  {g.notices.map((n) => (
                    <NoticeRow
                      key={n.id}
                      n={n}
                      read={feed.isRead(n)}
                      when={g.key === "new" ? formatStamp(n.at, locale, now) : (formatTime(n.at, locale) ?? formatStamp(n.at, locale, now))}
                      onOpen={() => openNotice(n)}
                      onSecond={() => second(n)}
                      onMenu={() => setRowMenu(n)}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      <ActionSheet open={menu} onClose={() => setMenu(false)} title="Notification" items={headerItems} />
      <ActionSheet open={!!rowMenu} onClose={() => setRowMenu(null)} title={rowMenu?.tag} items={rowMenu ? rowItems(rowMenu) : []} />
      <ConfirmSheet
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm?.kind === "all" ? "Clear all notifications?" : "Delete this notification?"}
        body={
          confirm?.kind === "all"
            ? "They leave this phone’s list. New ones still arrive, and nothing they were about changes."
            : "It leaves this phone’s list. Nothing it was about changes."
        }
        verb={confirm?.kind === "all" ? "Clear all" : "Delete"}
        destructive
        onConfirm={() => {
          if (!confirm) return;
          const ok = updateCleared((c) => (confirm.kind === "all" ? withAllCleared(c, Date.now()) : withClearedId(c, confirm.notice.id)));
          if (!ok) failed();
          else toast({ title: confirm.kind === "all" ? "Notifications cleared" : "Notification deleted" });
        }}
      />
    </Screen>
  );
}

function NoticeRow({
  n,
  read,
  when,
  onOpen,
  onSecond,
  onMenu,
}: {
  n: Notice;
  read: boolean;
  when: string;
  onOpen: () => void;
  onSecond: () => void;
  onMenu: () => void;
}) {
  const error = n.id.startsWith("build:") && n.id.endsWith(":retry");
  const two = secondActionOf(n);
  return (
    // The whole row opens the notice (its main button's tap area covers the row); the small
    // buttons and ⋮ sit above that area. Pressed: the row tints.
    <li className="relative flex items-start gap-6 px-8 py-6 transition-colors duration-fast active:bg-bg-subtle">
      <span aria-hidden className="relative mt-1 inline-flex size-[40px] shrink-0 items-center justify-center rounded-full bg-bg-surface text-[color:var(--color-icon-default)]">
        <Icon icon={KIND_ICON[n.kind] ?? Notification01Icon} size={20} />
        {!read && <span className="absolute right-0 top-0 size-[10px] rounded-full bg-[var(--color-icon-brand)] ring-2 ring-[var(--color-bg-page)]" />}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <button
          type="button"
          onClick={onOpen}
          className="flex flex-col gap-1 rounded-sm text-left outline-none after:absolute after:inset-0 after:content-[''] focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          {!read && <span className="sr-only">Unread: </span>}
          <span className={cn(T.meta, "text-text-tertiary")}>
            {n.tag} · {when}
          </span>
          <span className={cn(read ? T.body : T.rowTitle, error ? "text-text-error" : "text-text-primary")}>{n.title}</span>
          {n.body && <span className={cn(T.body, "line-clamp-2")}>{n.body}</span>}
        </button>
        <div className="relative z-[1] flex flex-wrap gap-4">
          <Button size="md" hierarchy="secondary" className={cn("relative", HIT44)} onClick={onOpen}>
            {actionLabelOf(n)}
          </Button>
          {two && (
            <Button size="md" hierarchy="secondary" className={cn("relative", HIT44)} onClick={onSecond}>
              {two.label}
            </Button>
          )}
        </div>
      </div>
      <button
        type="button"
        aria-label={`More for: ${n.title}`}
        onClick={onMenu}
        className="relative z-[1] -mr-4 inline-flex size-[44px] shrink-0 items-center justify-center rounded-md text-[color:var(--color-icon-default)] outline-none active:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        <Icon icon={MoreVerticalIcon} size={20} />
      </button>
    </li>
  );
}
