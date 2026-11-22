"use client";

// Share to Innovations (owner, 2026-11-22): anyone may share a project or a product that is live on
// the Marketplace, anyone's, bought or not. A share is a re-share, as on Facebook: your words on top
// and, under them, the original item with its creator's name and picture. It is never a copy and never
// the creator's own post (the project ⋯ › Share to Innovations on your own project stays that).
//
// The web's dialog for the act the phone does in its "Share to your Feed" sheet (mobile/feed/
// clip-share.tsx), with the same words and the same store: you (your picture and name) with the post
// audience under your name (Public or Only me, a pick-one menu), your words, the item as the share will
// show it (its picture, title, "by" its creator, "from" its project for a product: no prices, no product
// list), then Share now. A share shows on Innovations under "Shared by you"; the toast's View goes
// there. A write the browser refuses keeps your words and says so.

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowDown01Icon, CpuIcon, Globe02Icon, LockIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Avatar, Button, Menu, ModalFrame, Textarea, type MenuItem } from "@/components/ideeza";
import { usePostToast } from "@/components/innovations/toast";
import { AUDIENCES, CAPTION_MAX, captionProblem, type ShareAudience } from "@/lib/innovations/feed-prefs";
import { ME } from "@/lib/innovations/people";
import type { ShareItem } from "@/lib/innovations/share-items";
import { useMyPhoto } from "@/lib/people/photo-store";
import { useMe } from "@/lib/people/profile-store";
import { cn } from "@/lib/utils";
import { useShareItems, useShares } from "./use-share-items";

const AUDIENCE_ICON = { public: Globe02Icon, "only-me": LockIcon } as const;

export function ShareItemDialog({ itemId, open, onClose }: { itemId: string; open: boolean; onClose: () => void }) {
  const me = useMe();
  const photo = useMyPhoto();
  const router = useRouter();
  const toast = usePostToast();
  const { itemOf } = useShareItems();
  const { share } = useShares();
  const item = itemOf(itemId);
  const [caption, setCaption] = React.useState("");
  const [audience, setAudience] = React.useState<ShareAudience>("public");
  const [failed, setFailed] = React.useState(false);
  const fieldRef = React.useRef<HTMLTextAreaElement>(null);
  const fieldId = React.useId();
  const noteId = React.useId();
  const problem = captionProblem(caption);
  const kind = item?.kind ?? "project";

  const close = () => {
    setCaption("");
    setAudience("public");
    setFailed(false);
    onClose();
  };

  const submit = () => {
    if (problem || !item) return;
    if (!share(itemId, caption, audience)) {
      setFailed(true);
      return;
    }
    toast(audience === "public" ? "Shared to Innovations" : "Shared to Innovations. Only you can see it.", {
      label: "View",
      onClick: () => router.push("/innovations"),
    });
    close();
  };

  const current = AUDIENCES.find((a) => a.id === audience) ?? AUDIENCES[0];
  const audienceItems: MenuItem[] = AUDIENCES.map((a) => ({
    id: a.id,
    label: a.label,
    icon: <Icon icon={AUDIENCE_ICON[a.id]} size={20} />,
    selected: a.id === audience,
    onSelect: () => setAudience(a.id),
  }));
  const near = caption.length > CAPTION_MAX - 100;

  return (
    <ModalFrame
      open={open}
      onClose={close}
      size="sm"
      sheet
      title="Share to Innovations"
      initialFocus={fieldRef}
      footer={
        <Button type="button" hierarchy="primary" size="lg" className="ml-auto" disabled={!!problem || !item} onClick={submit}>
          Share now
        </Button>
      }
    >
      <div className="flex flex-col gap-8">
        <div className="flex items-center gap-6">
          <Avatar size="md" initials={me.initials} color={ME.color} src={photo.url ?? undefined} />
          <div className="flex min-w-0 flex-col gap-1">
            <span className="truncate text-md font-semibold text-text-primary">{me.name}</span>
            <Menu
              label="Post audience"
              items={audienceItems}
              trigger={(props) => (
                <button
                  {...props}
                  type="button"
                  aria-label={`Post audience: ${current.label}`}
                  className="inline-flex items-center gap-2 self-start rounded-md text-sm font-semibold text-text-brand outline-none hover:text-text-brand-hover focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  <Icon icon={AUDIENCE_ICON[current.id]} size={14} />
                  {current.label}
                  <Icon icon={ArrowDown01Icon} size={14} />
                </button>
              )}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={fieldId} className="sr-only">
            {`Say something about this ${kind}`}
          </label>
          <Textarea
            ref={fieldRef}
            id={fieldId}
            rows={3}
            value={caption}
            invalid={!!problem}
            aria-describedby={failed || problem || near ? noteId : undefined}
            placeholder={`Say something about this ${kind}…`}
            onValueChange={(v) => {
              setCaption(v);
              setFailed(false);
            }}
          />
          {failed ? (
            <span id={noteId} role="alert" className="text-sm text-text-error">
              Couldn&apos;t save it. Your words are kept; try again.
            </span>
          ) : (
            (near || problem) && (
              <span id={noteId} className={cn("text-sm", problem ? "text-text-error" : "self-end tabular-nums text-text-tertiary")}>
                {problem ?? `${caption.length}/${CAPTION_MAX}`}
              </span>
            )
          )}
        </div>

        {/* What the share shows under your words: the original, with its creator. */}
        {item && <SharedItemPreview item={item} />}
      </div>
    </ModalFrame>
  );
}

/** The item as the share will show it: its picture, title, creator and (a product) project. */
function SharedItemPreview({ item }: { item: ShareItem }) {
  return (
    <div className="flex items-center gap-6 rounded-xl border border-solid border-border bg-bg-surface p-6">
      <span className="relative flex size-[64px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-bg-subtle text-text-tertiary">
        {item.cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- the item's own picture
          <img src={item.cover} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <Icon icon={CpuIcon} size={20} />
        )}
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="line-clamp-2 break-words text-md font-semibold text-text-primary">{item.title}</span>
        <span className="truncate text-sm text-text-secondary">{`by ${item.creator.name}`}</span>
        {item.projectTitle && <span className="truncate text-sm text-text-secondary">{`from ${item.projectTitle}`}</span>}
      </span>
    </div>
  );
}
