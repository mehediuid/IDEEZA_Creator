"use client";

// ProductPage — /projects/[id]/products/[productId] (spec §3.4, §5.7). One
// product of one project, at one saved version: the breadcrumb, the header
// with its Build check, the version select and the one notice above the
// content (COR-31, COR-41, COR-108), the identity row — the image, the
// frozen description, the part changes (owner only) and the booked facts —
// and the deliverable tabs (COR-32…34).
//
// Everything on it is the booked snapshot the build was made from (the
// build-lock rule), so nothing here edits a thing: the page has no action
// buttons (COR-36). Open in editor, the Brief door and Network live on the
// project page. `?v=`, `?tab=` and `?view=buyer` are URL state (COR-7).

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ConfidenceBadge, ConfidenceIssuesPanel } from "@/components/create/confidence-badge";
import { partChangesOf, partChangesText } from "@/lib/create/build-artifacts";
import { confidenceFor } from "@/lib/create/confidence";
import { productsOf, useCreateHistory } from "@/lib/create/history";
import { can, type Viewer } from "@/lib/manual/permissions";
import { productPiecesOf, productVersionView, withQuery } from "@/lib/manual/product-page";
import { displayProductName } from "@/lib/manual/products-tab-view";
import {
  buildsOf,
  conceptOf,
  lineagesOf,
  productRowsOf,
  productsOfProject,
  versionsOf,
} from "@/lib/manual/project-read";
import { productDocTitle, resolveProject } from "@/lib/manual/project-route";
import { useManualProjects } from "@/lib/manual/projects";
import { LiveRegion, usePageArrival } from "../details/arrival";
import { Breadcrumb } from "../details/breadcrumb";
import { PAGE_CONTAINER, PAGE_CONTENT } from "../details/frame";
import { ProjectNotFound } from "../details/page-states";
import { ProductDeliverables } from "./product-deliverables";
import { ProductIdentity } from "./product-identity";
import { PreviewBanner, ProductLoading, ProductMissing, UnbuiltNote } from "./product-states";
import { VersionNoticeBlock, VersionSelect } from "./product-version";
import { When } from "./when";

export function ProductPage({ id, productId }: { id: string; productId: string }) {
  // useSearchParams needs a boundary so the route can still be pre-rendered.
  // The body renders only once the stores hydrate in the browser, so the
  // fallback is the loading shape itself.
  return (
    <React.Suspense fallback={<ProductLoading />}>
      <ProductPageBody id={id} productId={productId} />
    </React.Suspense>
  );
}

function ProductPageBody({ id, productId }: { id: string; productId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const query = useSearchParams();
  const search = query.toString();
  const { hydrated, projects } = useManualProjects();
  const { hydrated: buildsHydrated, builds, chats } = useCreateHistory();

  // The one permission source (PPL-1): the preview is the owner looking with
  // a visitor's permissions (PPL-2).
  const buyer = query.get("view") === "buyer";
  const viewer: Viewer = buyer ? { kind: "owner-preview" } : { kind: "local-owner" };
  const ownerFacts = can(viewer, "facts.seeOwnerOnly");
  // The firmware source and every download come after purchase (PPL-7).
  const firmware = can(viewer, "deliverables.download");

  // By id, then by slug — the project page's own rule (COR-1).
  const project = resolveProject(projects, id);

  const derived = React.useMemo(() => {
    if (!project) return null;
    const refs = buildsOf(project, builds);
    return {
      products: productsOfProject(project, refs),
      versions: versionsOf(refs, lineagesOf(refs, chats), productRowsOf(project)),
    };
  }, [project, builds, chats]);

  const product = derived?.products.find((p) => p.id === productId) ?? null;
  // The buyer sees the product as the project has it now: older versions are
  // the owner's history, like the rail's Versions block (PPL-7).
  const asked = buyer ? null : query.get("v");
  const view = React.useMemo(
    () => (product && derived ? productVersionView(product, derived.versions, asked) : null),
    [product, derived, asked],
  );
  const job = view?.build.job ?? null;
  const shownId = view?.productId ?? null;
  const bp = React.useMemo(
    () => (job && shownId ? productsOf(job).find((x) => x.id === shownId) ?? null : null),
    [job, shownId],
  );

  // §4.4.9 — this product's own tier, from the build it belongs to.
  const confidence = React.useMemo(
    () => (job && bp ? confidenceFor(job, productsOf(job)).byProduct.find((c) => c.productId === bp.id) ?? null : null),
    [job, bp],
  );
  const issuesKey = `${view?.build.buildId ?? ""}:${bp?.id ?? ""}`;
  const [issues, setIssues] = React.useState({ key: "", open: false });
  const issuesOpen = issues.key === issuesKey && issues.open;

  // What the maker changed on the spec sheet before the build (owner only).
  // The description beside it is the concept's, frozen before any edit (H-7).
  const partChanges = React.useMemo(() => {
    if (!job || !bp || !ownerFacts) return null;
    const concept = conceptOf(chats.find((c) => c.id === job.chatId), job, bp);
    const changes = concept ? partChangesOf(bp, concept) : null;
    return changes ? partChangesText(changes) : null;
  }, [job, bp, chats, ownerFacts]);

  const name = product ? displayProductName(product.name) : "";
  // COR-7 — focus to the h1 and a polite "{product}" on arrival, once per
  // product (a version or tab change keeps focus where the maker put it);
  // COR-3 — the document title.
  const { titleRef, live } = usePageArrival(
    project && product ? `${project.id}/${product.id}` : "",
    name,
    project && product ? productDocTitle(name, project.name) : "",
  );

  if (!hydrated || !buildsHydrated) return <ProductLoading />;
  if (!project) return <ProjectNotFound id={id} />;
  const projectHref = `/projects/${project.id}${buyer ? "?view=buyer" : ""}`;
  if (!product) return <ProductMissing projectName={project.name} href={projectHref} />;

  const home = view?.home ?? 1;
  const hrefFor = (n: number) => `${pathname}${withQuery(search, { v: n === home ? null : String(n) })}`;
  const pieces = bp ? productPiecesOf(bp.items) : null;
  const description = bp?.description?.trim() || product.description.trim();

  return (
    <div className={PAGE_CONTAINER}>
      <div className={`${PAGE_CONTENT} flex flex-col gap-10`}>
        {buyer && (
          <PreviewBanner
            onExit={() => {
              // The banner and its button leave with the preview; focus lands on the h1.
              router.push(`${pathname}${withQuery(search, { view: null })}`);
              titleRef.current?.focus({ preventScroll: true });
            }}
          />
        )}

        <Breadcrumb
          trail={[
            { label: "My projects", href: "/projects" },
            { label: project.name, href: projectHref },
            { label: name },
          ]}
        />

        <header className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-x-10 gap-y-4">
            <h1
              ref={titleRef}
              tabIndex={-1}
              className="min-w-0 break-words text-3xl font-bold tracking-tight text-text-primary outline-none"
            >
              {name}
            </h1>
            {confidence && (
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-sm text-text-secondary">Build check</span>
                <ConfidenceBadge
                  confidence={confidence}
                  open={issuesOpen}
                  onOpenChange={(open) => setIssues({ key: issuesKey, open })}
                />
              </div>
            )}
          </div>
          {/* The disclosure's text — what Draft means and the credit note —
              gets the header's full width, not the badge's corner (L1). */}
          {issuesOpen && confidence?.tier === "draft" && <ConfidenceIssuesPanel confidence={confidence} />}

          {view && (
            <div className="flex flex-col gap-4 [@container(min-width:560px)]:flex-row [@container(min-width:560px)]:flex-wrap [@container(min-width:560px)]:items-center">
              {!buyer && view.options.length > 1 && (
                <VersionSelect view={view} onPick={(n) => router.push(hrefFor(n), { scroll: false })} />
              )}
              {job && pieces && (
                <p className="text-sm text-text-secondary">
                  Built <When at={job.endedAt ?? job.createdAt} /> · Concept {job.conceptNumber} ·{" "}
                  {pieces.ready} of {pieces.total} pieces ready
                </p>
              )}
            </div>
          )}
          {view?.notice && (
            <VersionNoticeBlock notice={view.notice} name={name} home={home} hrefFor={hrefFor} />
          )}
        </header>

        {!view ? (
          <UnbuiltNote state={product.state} />
        ) : job && bp ? (
          <>
            <ProductIdentity
              product={bp}
              name={name}
              description={description}
              version={view.shown}
              partChanges={partChanges}
            />
            <ProductDeliverables
              key={`${job.id}:${bp.id}`}
              job={job}
              product={bp}
              firmware={firmware}
              chatHref={ownerFacts && chats.some((c) => c.id === job.chatId) ? `/chat/${job.chatId}` : null}
              tab={query.get("tab")}
              onTab={(kind) => router.replace(`${pathname}${withQuery(search, { tab: kind })}`, { scroll: false })}
            />
          </>
        ) : null}
        <LiveRegion text={live} />
      </div>
    </div>
  );
}
