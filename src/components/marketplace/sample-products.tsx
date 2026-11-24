"use client";

// A sample's Products and Media tabs on Explore marketplace (owner,
// 2026-11-24: "the Products part the same on every page"). A listing of this
// browser's shows its products under the project page's tab strip — Products,
// Media — as cards in a grid (products-tab.tsx, media-tab.tsx); a sample's
// page showed "What's inside" rows instead. It now draws the same:
// - Products: the same heading, count line ("2 products · 27 parts") and
//   grid, each product the same card (ProductCardFrame) — its picture, its
//   name opening its marketplace page, its stage pill from the sample's
//   journey, and its first specs as the card's facts (the full list is the
//   product page's Specs block). A sample sells no product's own copies, so a
//   card has no sale line, as a listing's product without copies has none.
// - Media: the same heading and image grid with its lightbox, every picture
//   of the post and its products. The videos play in the media stage above.

import * as React from "react";
import { CardFacts, ProductCardFrame, ProductsSection } from "@/components/projects/details/products-tab";
import { MediaLightbox, MediaTileCard, type MediaTile } from "@/components/projects/details/media-tab";
import { useMinuteClock } from "@/components/projects/details/use-project-page-data";
import { partsLabel, productsLabel } from "@/components/innovations/post-bits";
import { lightboxTile } from "@/components/innovations/post-media";
import { sampleJourneyOf } from "@/lib/innovations/sample-activity";
import type { InnovationPost } from "@/lib/innovations/types";
import { currentOf, labelOf, shortOf } from "@/lib/manual/journey";
import { sampleProductHref } from "@/lib/market/sample-market";

/** As many facts as a listing's card shows (Size, Board, Power, Radio). */
const CARD_FACTS = 4;

export function SampleProductsTab({ post, feedId }: { post: InnovationPost; feedId: string }) {
  const now = useMinuteClock();
  // As on the post page: the journey's own clock until hydrated, so the server and the browser agree.
  const journey = React.useMemo(() => sampleJourneyOf(post, now > 0 ? now : undefined), [post, now]);
  const line = [productsLabel(post.products.length), post.partsCount > 0 ? partsLabel(post.partsCount) : null].filter(Boolean).join(" · ");
  return (
    <ProductsSection line={<span>{line}</span>}>
      {post.products.map((p) => {
        const current = currentOf(journey, post.id, { kind: "product", productId: p.id }, post.createdAt);
        return (
          <ProductCardFrame
            key={p.id}
            name={p.name}
            href={sampleProductHref(feedId, p.id)}
            image={p.image}
            imageAlt={`${p.name}, its picture`}
            stage={current ? { short: shortOf(current), ariaLabel: `Now: ${labelOf(current)}` } : null}
          >
            <CardFacts facts={p.specs.slice(0, CARD_FACTS)} />
          </ProductCardFrame>
        );
      })}
    </ProductsSection>
  );
}

/** Every picture once: each product's under its name (as a listing's tiles are), then the post's
 *  other pictures under the project's name. */
function tilesOf(post: InnovationPost): MediaTile[] {
  const seen = new Set<string>();
  const out: MediaTile[] = [];
  const add = (src: string | null, name: string) => {
    if (!src || seen.has(src)) return;
    seen.add(src);
    out.push(lightboxTile(src, name));
  };
  for (const p of post.products) add(p.image, p.name);
  for (const m of post.media) if (m.kind === "image") add(m.src, post.title);
  return out;
}

export function SampleMediaTab({ post }: { post: InnovationPost }) {
  const tiles = React.useMemo(() => tilesOf(post), [post]);
  const [lightbox, setLightbox] = React.useState<{ index: number; trigger: HTMLElement } | null>(null);
  const open = (index: number, trigger: HTMLElement) => {
    trigger.focus();
    setLightbox({ index, trigger });
  };
  const close = () => {
    const trigger = lightbox?.trigger;
    setLightbox(null);
    trigger?.focus();
  };
  return (
    <section aria-labelledby="media-heading" className="mt-16">
      <h2 id="media-heading" className="text-2xl font-semibold leading-2xl text-text-primary">
        Media
      </h2>
      {tiles.length > 0 && (
        <>
          <h3 className="mt-7 text-md font-semibold text-text-secondary">Images</h3>
          <ul role="list" className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-6">
            {tiles.map((tile, i) => (
              <MediaTileCard key={tile.key} tile={tile} isCover={false} coverControl={null} hideCoverChip onOpen={(el) => open(i, el)} />
            ))}
          </ul>
        </>
      )}
      {lightbox && (
        <MediaLightbox
          tiles={tiles}
          index={lightbox.index}
          onIndexChange={(index) => setLightbox((v) => (v ? { ...v, index } : v))}
          onClose={close}
        />
      )}
    </section>
  );
}
