"use client";

// ProductPage — /projects/[id]/products/[productId] (spec §3.4, §5.7; Phase 2
// §2.3, P2-EDITOR-9, 16…19, P2-TABS-2, 3). One product of one project, at one
// saved version, in the project page's frame (`ProjectFrame`):
// - main: the breadcrumb; the header (owner, 2026-10-11: made like the project
//   page's) — the concept image as a thumbnail from a 480 px header, the h1,
//   the version select and one meta line ("AI build · {date} · All 5 pieces
//   ready", or the unbuilt line), the frozen description; beside them ★ Open
//   in editor (the page's one violet, C16) and the ⋯ menu (product-menu.tsx:
//   Rename product, Activity, Open chat); then the lock line and the version
//   notice; then the tab strip and its panel (product-tabs.tsx);
// - the rail: the Marketplace block (T27, the buyer's side only since Build
//   and Earn P0), Specs and Build check (product-facts.tsx), then the Editor
//   block (product-rail.tsx), right of the tabs from a 1024 px page container.
//
// Every read is `useProjectPageData`'s — the project page's own derivation —
// so the two pages can't disagree (COR-74), and every `can()` passes
// `view.canCtx`. The build's snapshot is read-only (the build-lock rule); the
// only way to change a product is its editor, and a project sold in full has
// none (§3.8.5). `?v=`, `?tab=` and the preview's `?view=` are URL state.
//
// In the "market" context (`/marketplace/[id]/products/[productId]`,
// P2-MARKETPLACE-8, -21) the viewer is the active demo buyer: the breadcrumb
// starts at Explore marketplace, links keep the `/marketplace` base, the
// Testnet demo banner leads, a project never listed reads "This project isn't
// on the marketplace", and the firmware and downloads wait for a holding
// (`DeliverablesAccess`, from `can(viewer, "deliverables.download", …)` with
// the product-scoped `canCtxOf(view, viewer, { productId })`: an edition NFT
// of this product holds its files too, R5-20).
//
// In the "post" context (`/innovations/[slug]/products/[productId]` for this
// browser's own shared project, plan §6) the page reads as a visitor: the
// breadcrumb starts at Innovations, the post's product switcher and the way
// to its comments sit above the header, PCB, Firmware code and Wiring are
// locked to a copy (D2), and the rail's Marketplace and Editor blocks give way
// to the post's own.

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CpuIcon } from "@hugeicons/core-free-icons";
import { LeaveButton } from "@/components/create/leave-button";
import { partChangesOf, partChangesText } from "@/lib/create/build-artifacts";
import { confidenceFor } from "@/lib/create/confidence";
import { productsOf, useCreateHistory } from "@/lib/create/history";
import { isLeftOut } from "@/lib/create/pieces";
import { AddPiecesDialog } from "@/components/create/add-pieces-dialog";
import { openInEditorOf } from "@/lib/manual/editor-scope";
import { can } from "@/lib/manual/permissions";
import { productPiecesOf, productVersionView, withQuery, type ProductVersionView } from "@/lib/manual/product-page";
import { displayProductName } from "@/lib/manual/products-tab-view";
import { canCtxOf, conceptOf } from "@/lib/manual/project-read";
import { productDocTitle } from "@/lib/manual/project-route";
import { useManualProjects } from "@/lib/manual/projects";
import { LiveRegion, usePageArrival } from "../details/arrival";
import { Breadcrumb, type Crumb } from "../details/breadcrumb";
import { isPreview, previewQuery, useFocusAfterPreview } from "../details/buyer-preview";
import { ProjectFrame } from "../details/frame";
import { ProjectNotFound } from "../details/page-states";
import { DemoBuyerBanner } from "@/components/marketplace/demo-buyer-banner";
import { NotOnMarketplace } from "@/components/marketplace/market-project-page";
import { SLOTS as PROJECT_SLOTS } from "../details/project-page";
import { useProjectPageData, type ProjectPageContext } from "../details/use-project-page-data";
import { LockedPiecePanel, PostProductLinks, PostRailBlocks } from "@/components/innovations/post-product-bits";
import { PostMissing } from "@/components/innovations/post-states";
import { useCommentCount, type CommentSeed } from "@/lib/innovations/comments-store";
import { minePostOf } from "@/lib/innovations/mine-post";
import { postHref } from "@/lib/innovations/slug";
import { DeliverablesAccess } from "./product-deliverables";
import { ClampedText, ConceptImage } from "./product-identity";
import { ProductMenu } from "./product-menu";
import { ProductRail } from "./product-rail";
import type { ProductSlotProps } from "./product-slots";
import { LockLine, ProductLoading, ProductMissing, UNBUILT } from "./product-states";
import { ProductTabs } from "./product-tabs";
import { VersionNoticeBlock, VersionSelect } from "./product-version";
import { When } from "./when";
import { ActivityNow } from "../details/activity/now-block";
import { productAddedAt } from "@/lib/manual/journey-dates";

/** A product no build stands behind has no version: an empty view keeps ProductSlotProps total
 *  (no options, no build, `productId` null — the same shape as a version whose build is gone). */
const NO_VERSION: ProductVersionView = {
  options: [],
  latest: 0,
  home: 0,
  shown: 0,
  build: { buildId: "", job: null },
  productId: null,
  notice: null,
};

export function ProductPage({
  id,
  productId,
  context = "project",
}: {
  id: string;
  productId: string;
  /** "market" on Explore marketplace's buyer view (P2-MARKETPLACE-8): its breadcrumb and links. */
  context?: ProjectPageContext;
}) {
  // useSearchParams needs a boundary so the route can still be pre-rendered.
  // The body renders only once the stores hydrate in the browser, so the
  // fallback is the loading shape itself.
  return (
    <React.Suspense fallback={<ProductLoading />}>
      <ProductPageBody id={id} productId={productId} context={context} />
    </React.Suspense>
  );
}

const NO_SEED: CommentSeed = () => [];

function ProductPageBody({ id, productId, context }: { id: string; productId: string; context: ProjectPageContext }) {
  const router = useRouter();
  const pathname = usePathname();
  const query = useSearchParams();
  const search = query.toString();
  const data = useProjectPageData(id, context);
  const { chats } = useCreateHistory();
  const { selectEditorScope } = useManualProjects();
  const [leaving, setLeaving] = React.useState(false);
  // "Add the rest" — every piece the build left out, in one dialog.
  const [addingAll, setAddingAll] = React.useState(false);

  const ready = data.state === "ready" ? data : null;
  const project = ready?.project ?? null;
  const view = ready?.view ?? null;
  const viewer = ready?.viewer ?? null;
  const product = view?.products.find((p) => p.id === productId) ?? null;
  // The owner's history — older versions and part changes — is for the owner (PPL-7).
  const ownerFacts = viewer ? can(viewer, "facts.seeOwnerOnly") : false;
  const asked = ownerFacts ? query.get("v") : null;
  const version = React.useMemo(
    () => (product && view ? productVersionView(product, view.versions, asked) : null),
    [product, view, asked],
  );
  const job = version?.build.job ?? null;
  const shownId = version?.productId ?? null;
  const bp = React.useMemo(
    () => (job && shownId ? (productsOf(job).find((x) => x.id === shownId) ?? null) : null),
    [job, shownId],
  );

  // §4.4.9 — this product's own tier, from the build it belongs to.
  const confidence = React.useMemo(
    () => (job && bp ? (confidenceFor(job, productsOf(job)).byProduct.find((c) => c.productId === bp.id) ?? null) : null),
    [job, bp],
  );

  // What the maker changed on the spec sheet before the build (owner only).
  // The description beside it is the concept's, frozen before any edit (H-7).
  const partChanges = React.useMemo(() => {
    if (!job || !bp || !ownerFacts) return null;
    const concept = conceptOf(chats.find((c) => c.id === job.chatId), job, bp);
    const changes = concept ? partChangesOf(bp, concept) : null;
    return changes ? partChangesText(changes) : null;
  }, [job, bp, chats, ownerFacts]);

  // The Innovations post this page belongs to ("post" context): its title, slug, listing and comments.
  const postCtx = context === "post";
  const post = React.useMemo(() => (postCtx && project && view ? minePostOf(project, view) : null), [postCtx, project, view]);
  const comments = useCommentCount(post ? post.id : null, NO_SEED);

  const name = product ? displayProductName(product.name) : "";
  // COR-7 — focus to the h1 and a polite "{product}" on arrival, once per
  // product (a version or tab change keeps focus where the maker put it);
  // COR-3 — the document title.
  const { titleRef, live, announce } = usePageArrival(
    project && product ? `${project.id}/${product.id}` : "",
    name,
    project && product ? (postCtx ? `${name} · ${project.name} · Innovations · IDEEZA` : productDocTitle(name, project.name)) : "",
  );
  // PPL-5: this page has no Preview as buyer button, so Exit preview hands
  // focus to the h1 once the owner view is back.
  useFocusAfterPreview(viewer !== null && !isPreview(viewer), () => titleRef.current);

  if (data.state === "loading") return <ProductLoading />;
  const market = context === "market";
  if (data.state === "missing" || !ready || !project || !view || !viewer) {
    return postCtx ? <PostMissing /> : market ? <NotOnMarketplace id={id} /> : <ProjectNotFound id={id} />;
  }

  const projectHref = post
    ? postHref(post.slug)
    : market
      ? `/marketplace/${project.id}`
      : `/projects/${project.id}${previewQuery(viewer)}`;
  if (!product) return <ProductMissing projectName={project.name} href={projectHref} />;

  const slot: ProductSlotProps = { project, view, product, version: version ?? NO_VERSION, viewer, now: ready.now, announce };
  const trail: Crumb[] = post
    ? [
        { label: "Innovations", href: "/innovations" },
        { label: post.title, href: projectHref },
        { label: name },
      ]
    : market
    ? [
        { label: "Explore marketplace", href: "/marketplace" },
        { label: project.name, href: projectHref },
        { label: name },
      ]
    : [
        { label: "My projects", href: "/projects" },
        { label: project.name, href: projectHref },
        { label: name },
      ];

  const home = version?.home ?? 1;
  const hrefFor = (n: number) => `${pathname}${withQuery(search, { v: n === home ? null : String(n) })}`;
  const pieces = bp ? productPiecesOf(bp.items) : null;
  const description = bp?.description?.trim() || product.description.trim();
  // P2-EDITOR-9 (as changed): the page's violet in every state, absent when the viewer may not
  // open the editor — every preview, and a project sold in full.
  const editor = can(viewer, "product.openEditor", view.canCtx) ? openInEditorOf(project, product.id) : null;
  const lockLine = ownerFacts ? (view.lock?.line ?? null) : null;
  // The chat this version was built in, while this browser has it: the build is changed there.
  const chat = ownerFacts && job ? (chats.find((c) => c.id === job.chatId) ?? null) : null;
  const image = bp?.conceptImageUrl || null;
  const meta: React.ReactNode =
    job && pieces ? (
      <>
        AI build · <When at={job.endedAt ?? job.createdAt} /> ·{" "}
        {pieces.ready === pieces.total ? `All ${pieces.total} pieces ready` : `${pieces.ready} of ${pieces.total} pieces ready`}
        {/* The pieces its build left out, added from here in one go — or
            one at a time from each Not built tab (owner, 2026-10-22). */}
        {editor && bp && pieces.leftOut > 0 && (
          <>
            {" · "}
            <button
              type="button"
              onClick={() => setAddingAll(true)}
              className="inline-flex min-h-[24px] items-center rounded-sm px-[2px] align-baseline font-semibold text-text-brand outline-none hover:underline focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              Add the rest
            </button>
          </>
        )}
      </>
    ) : product.state !== "built" ? (
      UNBUILT[product.state]
    ) : null;

  return (
    <>
      <ProjectFrame
        // The project page's own banners, each null unless it applies (buyer, contributor);
        // Explore marketplace's Testnet demo banner on the buyer view.
        banner={
          postCtx ? null : market ? (
            <DemoBuyerBanner className="mb-10" />
          ) : (
            PROJECT_SLOTS.banners?.map((B, i) => (
              <B key={i} project={project} view={view} viewer={viewer} brief={ready.brief} now={ready.now} announce={announce} />
            ))
          )
        }
        breadcrumb={<Breadcrumb trail={trail} />}
        main={
          <div className="flex flex-col gap-10">
            {post && <PostProductLinks post={post} productId={product.id} comments={comments} />}
            <header className="flex flex-col gap-6 [container-type:inline-size]">
              <div className="flex flex-col gap-6 [@container(min-width:720px)]:flex-row [@container(min-width:720px)]:items-start [@container(min-width:720px)]:justify-between [@container(min-width:720px)]:gap-10">
                <div className="flex min-w-0 flex-1 items-start gap-6">
                  {image && (
                    <ConceptImage
                      key={image}
                      src={image}
                      alt={`${name} concept image, v${version?.shown ?? home}`}
                      className="hidden size-[88px] shrink-0 [@container(min-width:480px)]:block"
                    />
                  )}
                  <div className="flex min-w-0 flex-1 flex-col gap-3">
                    <h1
                      ref={titleRef}
                      tabIndex={-1}
                      className="min-w-0 break-words text-3xl font-semibold leading-3xl tracking-slight text-text-primary outline-none"
                    >
                      {name}
                    </h1>
                    {(meta || (ownerFacts && version && version.options.length > 1)) && (
                      <div className="flex flex-col gap-3 [@container(min-width:560px)]:flex-row [@container(min-width:560px)]:flex-wrap [@container(min-width:560px)]:items-center [@container(min-width:560px)]:gap-x-6">
                        {ownerFacts && version && version.options.length > 1 && (
                          <VersionSelect view={version} onPick={(n) => router.push(hrefFor(n), { scroll: false })} />
                        )}
                        {meta && <p className="text-sm text-text-secondary">{meta}</p>}
                      </div>
                    )}
                    {description && <ClampedText text={description} />}
                    {!ownerFacts && (
                      <ActivityNow
                        projectId={project.id}
                        target={{ kind: "product", productId: product.id }}
                        defaultAt={productAddedAt(project, view.refs, product)}
                        heading={`${name} activity`}
                      />
                    )}
                  </div>
                </div>

                {(editor || ownerFacts) && (
                  <div data-header-actions className="flex shrink-0 items-center gap-3">
                    {editor && (
                      <LeaveButton
                        tone="primary"
                        busy={leaving}
                        blocked={leaving}
                        onClick={() => {
                          setLeaving(true);
                          selectEditorScope(project.id, product.id);
                          router.push(editor.href);
                        }}
                        icon={CpuIcon}
                        className="h-[44px] min-w-0 flex-1 justify-center [@container(min-width:480px)]:flex-none [@container(min-width:720px)]:h-[40px]"
                      >
                        {editor.label}
                      </LeaveButton>
                    )}
                    {ownerFacts && !market && (
                      <ProductMenu slot={slot} chat={chat ? { title: chat.title.trim() || "Untitled chat", href: `/chat/${chat.id}` } : null} />
                    )}
                  </div>
                )}
              </div>
              {lockLine && <LockLine line={lockLine} />}
              {/* Version history is the owner's: a buyer sees the version on offer, nothing about the others. */}
              {ownerFacts && version?.notice && (
                <VersionNoticeBlock notice={version.notice} name={name} home={home} hrefFor={hrefFor} />
              )}
            </header>

            <DeliverablesAccess.Provider
              value={can(viewer, "deliverables.download", canCtxOf(view, viewer, { productId: product.id }))}
            >
              <ProductTabs
                key={`${product.id}:${version?.shown ?? 0}`}
                slot={slot}
                job={job}
                bp={bp}
                chatHref={ownerFacts && job && chats.some((c) => c.id === job.chatId) ? `/chat/${job.chatId}` : null}
                asked={query.get("tab")}
                onTab={(tab) => router.replace(`${pathname}${withQuery(search, { tab })}`, { scroll: false })}
                post={post ? { locked: (tab) => <LockedPiecePanel post={post} kind={tab} /> } : undefined}
              />
            </DeliverablesAccess.Provider>
          </div>
        }
        rail={
          <ProductRail
            slot={slot}
            built={bp}
            confidence={confidence}
            partChanges={partChanges}
            post={post ? <PostRailBlocks post={post} productName={name} comments={comments} /> : undefined}
          />
        }
      />
      <LiveRegion text={live} />
      {addingAll && job && bp && (
        <AddPiecesDialog
          buildId={job.id}
          product={bp}
          preselect={bp.items.filter(isLeftOut).map((i) => i.kind)}
          onClose={() => setAddingAll(false)}
        />
      )}
    </>
  );
}
