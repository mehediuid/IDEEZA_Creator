"use client";

// One product of an Innovations post (plan §6, decision D2; mockup
// Product.dc.html): what it is and what it is made of. Media, the 3D model,
// the parts list and the specs are open to everyone; the PCB, the firmware
// and the wiring come with a copy, so their tabs say what a copy includes and
// where to get one, and never show the files.
//
// - A post of this browser's own project shows the build itself: the 3D model
//   and the parts list are the project page's own piece panels, with the
//   downloads closed (`DeliverablesAccess` false). A sample post has no build
//   files, so its 3D tab shows its render and says so, and its parts are the
//   post's list.
// - Comments are per post, not per product: the header and the rail link back
//   to the post's thread.

import * as React from "react";
import Link from "next/link";
import { ArrowRight01Icon, Comment01Icon, CpuIcon, SquareLock02Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { buttonVariants } from "@/components/ideeza";
import { MediaLightbox } from "@/components/projects/details/media-tab";
import { LiveRegion, usePageArrival } from "@/components/projects/details/arrival";
import { TabStrip, type TabDef } from "@/components/projects/details/tab-strip";
import { DeliverablesAccess, ProductPiecePanel } from "@/components/projects/product/product-deliverables";
import { VideoPlayer } from "@/components/video-jobs/video-player";
import { productsOf, useCreateHistory, type BuildJob, type BuildProduct } from "@/lib/create/history";
import { useCommentCount, type CommentSeed } from "@/lib/innovations/comments-store";
import { postHref, postProductHref } from "@/lib/innovations/slug";
import { ME_ID, PIECE_LABEL, type InnovationPost, type PostPiece, type PostProduct } from "@/lib/innovations/types";
import type { VideoTake } from "@/lib/video/types";
import { cn } from "@/lib/utils";
import { CARD, ImageGone, partsLabel, PostBreadcrumb, PostImg, TAP } from "./post-bits";
import { lightboxTile } from "./post-media";
import { POST_COLUMNS, POST_CONTENT, POST_PAGE, PostMissing, PostProductSkeleton } from "./post-states";
import { usePost, type MinePostFacts } from "./use-post";

type TabId = "media" | "3d" | "parts" | "pcb" | "code" | "wiring";
type LockedId = "pcb" | "code" | "wiring";

const LOCKED: Record<LockedId, { title: string; includes: string[] }> = {
  pcb: {
    title: "PCB files come with a copy",
    includes: ["The schematic, converted into a board layout", "The board's bill of materials", "The fab profile it was laid out for"],
  },
  code: {
    title: "Firmware comes with a copy",
    includes: ["The source code, fully commented", "The library list, pinned to versions", "The map from the code to the board's pins"],
  },
  wiring: {
    title: "Wiring comes with a copy",
    includes: ["The netlist and a pin-to-pin table", "Wire colours, harness lengths and connector pinouts", "A continuity test checklist"],
  },
};

const isLocked = (t: TabId): t is LockedId => t === "pcb" || t === "code" || t === "wiring";

export function PostProductPage({ slug, productId }: { slug: string; productId: string }) {
  const data = usePost(slug);
  if (data.state === "loading") return <PostProductSkeleton />;
  if (data.state === "missing") return <PostMissing />;
  const product = data.post.products.find((p) => p.id === productId);
  if (!product) {
    return (
      <PostMissing
        title="We couldn't find this product"
        body="The link may be wrong, or the product is no longer in this post."
        back={{ label: "Back to the post", href: postHref(data.post.slug) }}
      />
    );
  }
  return <ProductBody key={`${data.post.id}:${product.id}`} post={data.post} product={product} seed={data.seed} mine={data.mine} />;
}

/** The product's video in use, for a post of this browser's own project. */
function takeOfProduct(mine: MinePostFacts | null, productId: string): VideoTake | null {
  const pv = mine?.view.videos.record?.products[productId];
  return pv?.inUseId ? (pv.takes.find((t) => t.id === pv.inUseId) ?? null) : null;
}

/** The build behind a "mine" product, when this browser still has it. */
function useBuildOf(product: PostProduct): { job: BuildJob; bp: BuildProduct } | null {
  const { builds } = useCreateHistory();
  return React.useMemo(() => {
    if (!product.build) return null;
    const job = builds.find((b) => b.id === product.build?.buildId);
    const bp = job ? productsOf(job).find((p) => p.id === product.build?.productId) : null;
    return job && bp ? { job, bp } : null;
  }, [builds, product.build]);
}

function ProductBody({ post, product, seed, mine }: { post: InnovationPost; product: PostProduct; seed: CommentSeed; mine: MinePostFacts | null }) {
  const index = post.products.indexOf(product);
  const comments = useCommentCount(post.id, seed);
  const build = useBuildOf(product);
  const take = takeOfProduct(mine, product.id);
  const { titleRef, live } = usePageArrival(`${post.id}:${product.id}`, product.name, `${product.name} · ${post.title} · Innovations · IDEEZA`);

  const open: TabDef<TabId>[] = [];
  if (take || product.image) open.push({ id: "media", label: "Media" });
  for (const k of ["3d", "parts"] as const) if (product.pieces.includes(k)) open.push({ id: k, label: PIECE_LABEL[k] });
  const locked: TabDef<TabId>[] = (["pcb", "code", "wiring"] as const)
    .filter((k) => product.pieces.includes(k as PostPiece))
    .map((k) => ({ id: k, label: PIECE_LABEL[k] }));
  const first = open[0]?.id ?? locked[0]?.id ?? null;
  const [tab, setTab] = React.useState<TabId | null>(first);

  const threadHref = `${postHref(post.slug)}#comments`;
  const commentsLabel =
    comments === null ? "Comments on the post" : comments === 0 ? "Comment on the post" : `${comments} ${comments === 1 ? "comment" : "comments"} on the post`;
  const meta = [`Product ${index + 1} of ${post.products.length}`, product.parts.length > 0 ? partsLabel(product.parts.length) : null].filter(Boolean).join(" · ");

  return (
    <div className={POST_PAGE}>
      <div className={POST_CONTENT}>
        <PostBreadcrumb trail={[{ label: post.title, href: postHref(post.slug) }, { label: product.name }]} />

        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-6">
          {post.products.length > 1 && <ProductSwitcher post={post} current={product.id} />}
          <Link
            href={threadHref}
            className={cn(
              "ml-auto inline-flex items-center gap-3 rounded-sm text-md font-semibold leading-md text-text-brand outline-none hover:text-text-brand-hover focus-visible:ring-2 focus-visible:ring-border-focus",
              TAP,
            )}
          >
            <Icon icon={Comment01Icon} size={16} />
            {commentsLabel}
          </Link>
        </div>

        <header className="flex items-start gap-8 max-md:gap-6">
          <span className="relative flex size-[88px] shrink-0 items-center justify-center overflow-hidden rounded-xl border border-solid border-border bg-bg-surface-raised text-text-tertiary max-md:size-[64px]">
            {product.image ? (
              <PostImg src={product.image} className="absolute inset-0 h-full w-full object-cover" fallback={<ImageGone />} />
            ) : (
              <Icon icon={CpuIcon} size={24} />
            )}
          </span>
          <div className="flex min-w-0 flex-col gap-3">
            <h1 ref={titleRef} tabIndex={-1} className="text-4xl font-extrabold leading-4xl tracking-tight text-text-primary outline-none max-md:text-2xl max-md:leading-2xl">
              {product.name}
            </h1>
            <p className="text-md leading-md text-text-secondary">{meta}</p>
            {product.summary && <p className="max-w-[62ch] text-md leading-relaxed text-text-primary">{product.summary}</p>}
          </div>
        </header>

        <div className={POST_COLUMNS}>
          <div className="flex min-w-0 flex-col gap-8">
            {tab ? (
              <>
                <TabStrip label="What this product includes" groups={[open, locked]} active={tab} onSelect={setTab} />
                <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="min-w-0 [container-type:inline-size]">
                  {tab === "media" && <MediaPanel post={post} product={product} mine={mine} take={take} />}
                  {tab === "3d" && <ModelPanel post={post} product={product} build={build} />}
                  {tab === "parts" && <PartsPanel post={post} product={product} build={build} />}
                  {isLocked(tab) && <LockedPanel post={post} kind={tab} />}
                </div>
              </>
            ) : (
              <p className="text-md leading-md text-text-secondary">This product has nothing to show yet.</p>
            )}
          </div>

          <aside aria-label="Product facts" className="flex min-w-0 flex-col gap-8">
            {product.specs.length > 0 && (
              <section aria-label="Specs" className={cn(CARD, "flex flex-col gap-6")}>
                <h2 className="text-lg font-bold leading-lg text-text-primary">Specs</h2>
                <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-8 gap-y-4 text-md leading-md">
                  {product.specs.map((s) => (
                    <React.Fragment key={s.label}>
                      <dt className="text-text-secondary">{s.label}</dt>
                      <dd className="text-right font-semibold text-text-primary">{s.value}</dd>
                    </React.Fragment>
                  ))}
                </dl>
              </section>
            )}
            <section aria-label="Open to everyone" className={cn(CARD, "flex flex-col gap-6")}>
              <h2 className="text-lg font-bold leading-lg text-text-primary">Open to everyone</h2>
              <ul role="list" className="flex flex-col gap-4 text-md leading-md">
                <li className="flex items-start gap-4 text-text-primary">
                  <span aria-hidden className="mt-1 text-text-success">
                    <Icon icon={Tick02Icon} size={16} strokeWidth={2} />
                  </span>
                  Media, 3D model, parts list and specs
                </li>
                <li className="flex items-start gap-4 text-text-secondary">
                  <span aria-hidden className="mt-1">
                    <Icon icon={SquareLock02Icon} size={16} />
                  </span>
                  PCB, firmware and wiring come with a copy
                </li>
              </ul>
            </section>
            <Link
              href={threadHref}
              className={cn(CARD, "group flex items-center gap-6 outline-none transition-colors duration-normal ease-out hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none")}
            >
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-md font-semibold leading-md text-text-primary">Questions about {product.name}?</span>
                <span className="text-sm leading-sm text-text-secondary">
                  Ask on the post.
                  {comments ? ` ${comments} ${comments === 1 ? "comment" : "comments"} so far.` : ""}
                </span>
              </span>
              <span aria-hidden className="shrink-0 text-text-tertiary transition-transform duration-fast group-hover:translate-x-1 motion-reduce:transition-none">
                <Icon icon={ArrowRight01Icon} size={18} />
              </span>
            </Link>
          </aside>
        </div>
      </div>
      <LiveRegion text={live} />
    </div>
  );
}

/** The post's other products, each its own page. */
function ProductSwitcher({ post, current }: { post: InnovationPost; current: string }) {
  return (
    <nav aria-label="Products in this post" className="max-w-full overflow-x-auto">
      <ul role="list" className="inline-flex overflow-hidden rounded-lg border border-solid border-border">
        {post.products.map((p, i) => {
          const on = p.id === current;
          return (
            <li key={p.id} className={cn(i > 0 && "border-l border-solid border-border")}>
              <Link
                href={postProductHref(post.slug, p.id)}
                aria-current={on ? "page" : undefined}
                replace
                scroll={false}
                className={cn(
                  "inline-flex min-h-[36px] items-center whitespace-nowrap px-7 text-md font-semibold leading-md outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus motion-reduce:transition-none",
                  TAP,
                  on ? "bg-bg-brand-subtle text-text-brand" : "bg-bg-surface text-text-secondary hover:bg-bg-subtle hover:text-text-primary",
                )}
              >
                {p.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// ─────────────────────────── panels ───────────────────────────

function MediaPanel({ post, product, mine, take }: { post: InnovationPost; product: PostProduct; mine: MinePostFacts | null; take: VideoTake | null }) {
  const [zoom, setZoom] = React.useState(false);
  return (
    <div className="grid grid-cols-1 gap-8 [@container(min-width:640px)]:grid-cols-2">
      {take && mine && <VideoPlayer take={take} productName={product.name} projectId={mine.project.id} />}
      {product.image && (
        <button
          type="button"
          onClick={() => setZoom(true)}
          aria-label={`${product.name}, its image. Open it larger`}
          className="relative block aspect-[4/3] w-full cursor-zoom-in overflow-hidden rounded-xl border border-solid border-border bg-bg-surface-raised p-0 outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-page"
        >
          <PostImg src={product.image} className="absolute inset-0 h-full w-full object-cover" fallback={<ImageGone label="Image didn't load" />} />
        </button>
      )}
      {zoom && product.image && (
        <MediaLightbox tiles={[lightboxTile(product.image, `${post.title}, ${product.name}`)]} index={0} onIndexChange={() => {}} onClose={() => setZoom(false)} />
      )}
    </div>
  );
}

/** The product's render with a note, where there is no 3D file to show. */
function RenderInstead({ product, note }: { product: PostProduct; note: string }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="relative flex aspect-[16/10] w-full items-center justify-center overflow-hidden rounded-xl border border-solid border-border bg-bg-surface-raised text-text-tertiary">
        {product.image ? (
          <PostImg
            src={product.image}
            alt={`${product.name}, its render`}
            className="absolute inset-0 h-full w-full object-contain"
            fallback={<ImageGone label="Image didn't load" />}
          />
        ) : (
          <Icon icon={CpuIcon} size={32} />
        )}
      </div>
      <p className="max-w-[62ch] text-md leading-md text-text-secondary">{note}</p>
    </div>
  );
}

function ModelPanel({ post, product, build }: { post: InnovationPost; product: PostProduct; build: { job: BuildJob; bp: BuildProduct } | null }) {
  if (build) {
    return (
      <DeliverablesAccess.Provider value={false}>
        <ProductPiecePanel job={build.job} product={build.bp} kind="3d" chatHref={null} />
      </DeliverablesAccess.Provider>
    );
  }
  const note =
    post.source === "sample"
      ? "This sample post has no 3D file; this is its render."
      : "This product's build isn't in this browser, so there is no 3D model to show; this is its concept image.";
  return <RenderInstead product={product} note={note} />;
}

function PartsPanel({ post, product, build }: { post: InnovationPost; product: PostProduct; build: { job: BuildJob; bp: BuildProduct } | null }) {
  if (build) {
    return (
      <DeliverablesAccess.Provider value={false}>
        <ProductPiecePanel job={build.job} product={build.bp} kind="parts" chatHref={null} />
      </DeliverablesAccess.Provider>
    );
  }
  if (product.parts.length === 0) {
    return <p className="text-md leading-md text-text-secondary">{post.source === "sample" ? "This sample post lists no parts." : "This product's parts list isn't in this browser."}</p>;
  }
  return (
    <div className="flex flex-col gap-6">
      <div role="region" aria-label="Parts list, scrollable" tabIndex={0} className="overflow-x-auto rounded-xl border border-solid border-border bg-bg-surface outline-none focus-visible:ring-2 focus-visible:ring-border-focus">
        <table className="w-full min-w-[480px] border-collapse text-left text-md leading-md">
          <thead className="bg-bg-subtle text-sm font-semibold leading-sm text-text-secondary">
            <tr>
              <th scope="col" className="w-[48px] px-8 py-5 font-semibold">
                #
              </th>
              <th scope="col" className="px-4 py-5 font-semibold">
                Part
              </th>
              <th scope="col" className="w-[64px] px-4 py-5 text-right font-semibold">
                Qty
              </th>
              <th scope="col" className="px-8 py-5 font-semibold">
                Used for
              </th>
            </tr>
          </thead>
          <tbody>
            {product.parts.map((p, i) => (
              <tr key={`${p.name}:${i}`} className="border-t border-solid border-border">
                <td className="px-8 py-5 tabular-nums text-text-secondary">{i + 1}</td>
                <td className="px-4 py-5 font-semibold text-text-primary">{p.name}</td>
                <td className="px-4 py-5 text-right tabular-nums text-text-primary">{p.qty}</td>
                <td className="px-8 py-5 text-text-secondary">{p.use}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="max-w-[62ch] text-md leading-md text-text-secondary">The parts list is open to everyone, so anyone can see what goes into it.</p>
    </div>
  );
}

function LockedPanel({ post, kind }: { post: InnovationPost; kind: LockedId }) {
  const id = React.useId();
  const copy = LOCKED[kind];
  const who = post.creator.id === ME_ID ? "You share" : `${post.creator.name.split(" ")[0] || post.creator.name} shares`;
  const listing = post.listing;
  return (
    <section aria-labelledby={id} className="flex flex-col items-start gap-6 rounded-xl border border-dashed border-border-strong bg-bg-surface p-16 max-md:p-8">
      <span aria-hidden className="inline-flex size-[44px] items-center justify-center rounded-xl bg-bg-brand-subtle text-text-brand">
        <Icon icon={SquareLock02Icon} size={22} />
      </span>
      <h2 id={id} className="text-xl font-bold leading-xl text-text-primary">
        {copy.title}
      </h2>
      <p className="max-w-[62ch] text-md leading-relaxed text-text-secondary">
        {who} the PCB, firmware and wiring with people who get a copy. The 3D model, parts list and specs stay open to everyone.
      </p>
      <div className="flex flex-col gap-2">
        <p className="text-md font-semibold leading-md text-text-primary">A copy includes</p>
        <ul className="flex list-disc flex-col gap-2 pl-8 text-md leading-relaxed text-text-secondary marker:text-text-tertiary">
          {copy.includes.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
      {listing ? (
        <>
          <Link href={listing.href} className={cn(buttonVariants({ hierarchy: "secondary", size: "lg" }), "hover:text-[color:var(--color-button-secondary-text)]", TAP)}>
            Get a copy on Marketplace
            <Icon icon={ArrowRight01Icon} size={16} />
          </Link>
          <dl className="grid grid-cols-[minmax(0,auto)_auto] gap-x-8 gap-y-2 text-sm leading-sm">
            {listing.rows.map((r) => (
              <React.Fragment key={`${r.label}:${r.price}`}>
                <dt className="text-text-secondary">{r.label}</dt>
                <dd className="font-semibold tabular-nums text-text-primary">{r.price}</dd>
              </React.Fragment>
            ))}
          </dl>
        </>
      ) : (
        <p className="text-md font-semibold leading-md text-text-secondary">Not for sale right now.</p>
      )}
    </section>
  );
}
