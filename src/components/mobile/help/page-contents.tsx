"use client";

// A page's headings, the phone's way: one row ("On this page" on a blog, the
// web's "Page Content" on a tutorial, SET-15) that opens them in a pick-one
// sheet; the sheet marks the heading being read, and a pick scrolls to that
// heading and hands it the focus, so reading (and a screen reader) carries on
// from there. The heading being read is the web's rule (lib/blog/article-view
// currentHeading), measured in the phone screen's own scrolling box.

import * as React from "react";
import { LeftToRightListBulletIcon } from "@hugeicons/core-free-icons";
import { currentHeading } from "@/lib/blog/article-view";
import { motionReduced } from "@/lib/settings/appearance";
import { ListCard, ListRow } from "../kit/list";
import { PickSheet } from "../kit/pick-list";
import { SCROLL_ATTR } from "../screen";

/** The reading line, as a share of the screen's scrolling box from its top (the web's). */
const LINE = 0.3;

export type PageHeading = { anchor: string; text: string };

function headingBeingRead(within: HTMLElement | null, headings: readonly PageHeading[]): string | null {
  const box = within?.closest<HTMLElement>(`[${SCROLL_ATTR}]`);
  const els = headings.map((h) => document.getElementById(h.anchor)).filter((e): e is HTMLElement => !!e);
  if (!box || !els.length) return headings[0]?.anchor ?? null;
  const rect = box.getBoundingClientRect();
  const endInView = box.scrollTop + box.clientHeight >= box.scrollHeight - 2;
  const at = currentHeading(
    els.map((e) => e.getBoundingClientRect().top - rect.top),
    rect.height * LINE,
    rect.height,
    endInView,
  );
  return at >= 0 ? els[at].id : null;
}

export function PageContents({
  headings,
  within,
  label,
}: {
  headings: readonly PageHeading[];
  /** An element inside the screen's scrolling box (the article). */
  within: React.RefObject<HTMLElement | null>;
  label: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [current, setCurrent] = React.useState<string | null>(null);
  const go = (anchor: string) => {
    // After the sheet has closed and handed the focus back (kit/sheet), so the heading keeps it.
    requestAnimationFrame(() => {
      const el = document.getElementById(anchor);
      if (!el) return;
      el.scrollIntoView({ block: "start", behavior: motionReduced() ? "auto" : "smooth" });
      el.focus({ preventScroll: true });
    });
  };
  return (
    <>
      <ListCard>
        <ListRow
          icon={LeftToRightListBulletIcon}
          title={label}
          onClick={() => {
            setCurrent(headingBeingRead(within.current, headings));
            setOpen(true);
          }}
        />
      </ListCard>
      <PickSheet
        open={open}
        onClose={() => setOpen(false)}
        title={label}
        value={current}
        options={headings.map((h) => ({ value: h.anchor, label: h.text }))}
        onPick={go}
      />
    </>
  );
}
