"use client";

// The product page's version select and the one notice above the content
// (COR-41, COR-108). Both read `productVersionView()`, which reads
// `versionsOf()` — the same list the rail's Versions block prints (COR-106),
// so the two can't disagree. Choosing a version pushes `?v=`, so Back
// returns to the version before (COR-7).

import * as React from "react";
import Link from "next/link";
import { Banner, SelectMenu, buttonVariants, type SelectOption } from "@/components/ideeza";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/manual/project-summary";
import type { ProductVersionView, VersionNotice } from "@/lib/manual/product-page";

/** "Version 2 of 2 ▾" — newest first, each "{date} · current", "not in this
 *  version" or "build not in this browser". Shown only when the lineage has
 *  more than one version; full width below a 560 px page, 44 px tall. */
export function VersionSelect({ view, onPick }: { view: ProductVersionView; onPick: (n: number) => void }) {
  const count = view.options.length;
  const options: SelectOption[] = [...view.options].reverse().map((o) => {
    const sub = [
      o.at !== null ? formatDate(o.at) : null,
      o.current ? "current" : null,
      o.gone ? "build not in this browser" : o.has ? null : "not in this version",
    ]
      .filter(Boolean)
      .join(" · ");
    return { value: String(o.n), label: `Version ${o.n} of ${count}`, ...(sub ? { sub } : null) };
  });
  return (
    <SelectMenu
      value={String(view.shown)}
      onChange={(v) => onPick(Number(v))}
      options={options}
      placeholder={`Version ${view.shown} of ${count}`}
      ariaLabel="Version"
      className="w-full [&>button]:min-h-[var(--touch-min)] [@container(min-width:560px)]:w-56"
    />
  );
}

// A link dressed as the quiet button. The reset colours every a:hover as a
// link, so the hover keeps the button's own text colour.
const LINK_BUTTON = cn(
  buttonVariants({ hierarchy: "secondary", size: "md" }),
  "shrink-0 hover:text-[color:var(--color-button-secondary-text)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]",
);

/** The notice for the version on screen. `hrefFor(n)` is this page at that
 *  version, every other query key kept; `home` is where the page opens with
 *  no `?v`. */
export function VersionNoticeBlock({
  notice,
  name,
  home,
  hrefFor,
}: {
  notice: VersionNotice;
  name: string;
  home: number;
  hrefFor: (n: number) => string;
}) {
  let body: React.ReactNode;
  let title: string | undefined;
  let link: { n: number; label: string } | null = null;
  switch (notice.kind) {
    case "older":
      body = `You're viewing version ${notice.n}${notice.at !== null ? ` (${formatDate(notice.at)})` : ""}. The project now uses version ${notice.latest}.`;
      link = { n: home, label: "Back to latest" };
      break;
    case "dropped":
      body = `Version ${notice.latest} doesn't include ${name} — this is version ${notice.n}, the last one that did.`;
      break;
    case "absent":
      title = `Not in version ${notice.n}`;
      body = `${name} isn't part of version ${notice.n} of this project.`;
      link = { n: notice.nearest, label: `Open version ${notice.nearest}` };
      break;
    case "gone":
      title = `Version ${notice.n} isn't in this browser`;
      body = "Its build isn't stored here any more, so nothing of it can be shown.";
      link = { n: notice.nearest, label: `Open version ${notice.nearest}` };
      break;
  }
  return (
    <div className="flex flex-col gap-4 [@container(min-width:560px)]:flex-row [@container(min-width:560px)]:items-center">
      <Banner tone="info" title={title} className="min-w-0 flex-1">
        {body}
      </Banner>
      {link && (
        <Link href={hrefFor(link.n)} scroll={false} className={LINK_BUTTON}>
          {link.label}
        </Link>
      )}
    </div>
  );
}
