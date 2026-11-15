"use client";

// The owner's product page under its hero and header (owner 2026-11-15: a
// native object page, not three tabs): one scroll of sections, each a list
// card of rows (Product Details 10, 10b, 10n, 10e, 10q, 10t, 29a):
// · Build — "All 6 pieces ready" as the heading's value and its ⓘ (the seed
//   caption, "View only on a phone.", and the computer note that replaced Open
//   in editor, D3); the pieces in their states, each opening its screen, with
//   + Add on a Not built row and Add the rest; then Build check (See why while
//   a Draft), Version (only with more than one; a pick sheet) and Downloads (a
//   sheet of the files, or why there are none);
// · Media — one row: the video's state, how many images, opening the Media
//   screen (`…/media`) with the player, the takes and Generate / Regenerate;
// · Activity — the newest entry, History (n) and NFT activity (activity.tsx);
// · Specs — the grouped list with its footer lines (overview.tsx).
// A product no build stands behind (made by hand) has Media and Activity.
// A contributor preview reads the same page with nothing to change.

import * as React from "react";
import { Add01Icon, Download04Icon, GitBranchIcon, Video01Icon } from "@hugeicons/core-free-icons";
import { isLeftOut } from "@/lib/create/pieces";
import type { BuildItemKind } from "@/lib/create/history";
import { formatDate } from "@/lib/manual/project-summary";
import { piecesLine, versionRowsOf } from "@/lib/manual/phone-product";
import { ListCard, ListRow } from "../kit/list";
import { PickSheet } from "../kit/pick-list";
import { ActivitySection } from "./activity";
import { AddPiecesSheet, DownloadsSheet, filesOf, PieceRows, useSeedCaption } from "./build-tab";
import { useProductImages, useVideoStatus } from "./hero";
import { videoLine } from "./media-tab";
import { BuildCheckRow, SpecsSection } from "./overview";
import { InfoButton, replaceQuery, SectionHead } from "./parts";
import { useProduct } from "./use-product";

export function OwnerSections({ scrollRef }: { scrollRef: React.RefObject<HTMLDivElement | null> }) {
  const buildRef = React.useRef<HTMLDivElement>(null);
  const mediaRef = React.useRef<HTMLDivElement>(null);

  // An older link's `?tab=build` / `?tab=media` (a piece screen's Back, the web's tab names) lands on
  // that section; the address drops it, so a reload starts at the top.
  React.useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get("tab");
    if (!tab) return;
    const target = tab === "build" ? buildRef.current : tab === "media" ? mediaRef.current : null;
    const scroller = scrollRef.current;
    if (target && scroller) scroller.scrollTop = Math.max(0, target.offsetTop - 8);
    replaceQuery({ tab: null });
  }, [scrollRef]);

  const { bp } = useProduct();
  return (
    <div className="flex flex-col gap-12 px-8 pb-12 pt-2">
      {bp && (
        <div ref={buildRef}>
          <BuildSection />
        </div>
      )}
      <div ref={mediaRef}>
        <MediaRow />
      </div>
      <ActivitySection />
      <SpecsSection />
    </div>
  );
}

function BuildSection() {
  const { bp, pieces, canEdit, confidence, version, downloads, mode } = useProduct();
  const caption = useSeedCaption();
  const [adding, setAdding] = React.useState<BuildItemKind[] | null>(null);
  const [files, setFiles] = React.useState(false);
  const [picking, setPicking] = React.useState(false);
  if (!bp || !pieces) return null;
  const leftOut = bp.items.filter(isLeftOut).map((i) => i.kind);
  const fileList = filesOf(bp);
  const owner = mode === "owner";
  const versions = owner && version && version.options.length > 1 ? version : null;
  const home = version?.home ?? 1;

  return (
    <section aria-labelledby="pd-build" className="flex flex-col gap-4">
      <SectionHead
        id="pd-build"
        title="Build"
        info={
          <InfoButton label="About the build on a phone" title="Build">
            {caption && <p>{caption}</p>}
            <p>View only on a phone.{canEdit ? " Edit the board, code and 3D on a computer." : ""}</p>
          </InfoButton>
        }
        value={piecesLine(pieces)}
      />
      <ListCard label="Pieces">
        <PieceRows bp={bp} onAdd={(k) => setAdding([k])} />
        {canEdit && leftOut.length > 0 && <ListRow icon={Add01Icon} title="Add the rest" meta={`${leftOut.length} not built`} onClick={() => setAdding(leftOut)} />}
      </ListCard>
      <ListCard label="Build details">
        {confidence && <BuildCheckRow confidence={confidence} />}
        {versions && (
          <ListRow icon={GitBranchIcon} title="Version" value={`${versions.shown} of ${versions.options.length}`} onClick={() => setPicking(true)} />
        )}
        {!downloads ? (
          <ListRow icon={Download04Icon} title="Downloads" meta="Firmware and downloads come with a purchase." />
        ) : fileList.length ? (
          <ListRow icon={Download04Icon} title="Downloads" value={`${fileList.length} ${fileList.length === 1 ? "file" : "files"}`} onClick={() => setFiles(true)} />
        ) : (
          <ListRow icon={Download04Icon} title="Downloads" meta="Nothing to download yet — the files come once their pieces are ready." />
        )}
      </ListCard>
      {adding && <AddPiecesSheet bp={bp} preselect={adding} onClose={() => setAdding(null)} />}
      <DownloadsSheet open={files} onClose={() => setFiles(false)} bp={bp} />
      {versions && (
        <PickSheet
          open={picking}
          onClose={() => setPicking(false)}
          title="Version"
          value={String(versions.shown)}
          options={versionRowsOf(versions.options, formatDate).map((o) => ({ value: String(o.n), label: o.label, helper: o.sub || undefined }))}
          onPick={(n) => {
            setPicking(false);
            // A version is picked in place, like a tab: no request, so it works offline.
            replaceQuery({ v: Number(n) === home ? null : n });
          }}
        />
      )}
    </section>
  );
}

/** One row for the product's media: the video's state, how many images; the Media screen. */
function MediaRow() {
  const { path } = useProduct();
  const status = useVideoStatus();
  const images = useProductImages().length;
  return (
    <ListCard label="Media">
      <ListRow
        href={path("media")}
        icon={Video01Icon}
        title="Media"
        meta={videoLine(status)}
        value={images ? `${images} ${images === 1 ? "image" : "images"}` : undefined}
      />
    </ListCard>
  );
}
