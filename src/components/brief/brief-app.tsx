"use client";

// The mint flow — the Brief as Earn's four steps, at /projects/<id>/earn/mint
// (Build and Earn P1-2):
//
//  choose:  Keep private, Give to the community, or Sell
//  details: the terms — a license, or for a Sell the ONE shared listing form
//  review:  what is minted, the readiness gate, the cost, and the signature
//  success: minted — a Sell is listed on Explore marketplace
//
// The project's description, products and videos are its engineering
// record's, edited on the project page; the flow reads them and never writes
// them. Its own state is the commerce half of the stored draft
// (`@/lib/brief/mint-flow`), and every write keeps the rest of the draft as
// it was stored. A Brief that minted opens on its read-only success step.
//
// The commit is ONE wallet request (spec §3.9): the mint record, then — for a
// Sell — the listing, then the draft's `mintedAt` and the v1 writes.

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { refusedCopy } from "@/components/projects/listing/listing-dialog";
import { Banner } from "@/components/ideeza";
import { Page } from "@/components/ideeza/page";
import { Breadcrumb } from "@/components/projects/details/breadcrumb";
import { useMinuteClock } from "@/components/projects/details/use-project-page-data";
import { useVideoJobs } from "@/components/video-jobs/video-jobs-provider";
import { useMint } from "@/components/wallet/use-mint";
import { useMintShortfall } from "@/components/wallet/mint-cost";
import { useWalletRequest } from "@/components/wallet/wallet-provider";
import { MintChromeContext, MintStepLine, type MintChrome } from "./brief-card";
import { StepChoose } from "./step-choose";
import { StepDetails } from "./step-details";
import { StepReview } from "./step-review";
import { StepSuccess } from "./step-success";
import { bumpMinted } from "@/lib/brief/wallet";
import {
  DEFAULT_MINT_STATE,
  briefStateOf,
  detailsMissing,
  gatePurposeOf,
  mintDraftJson,
  mintStepBefore,
  readMintDraft,
  reviewMissing,
  statusAfterCommit,
  storedStepOf,
  type MintState,
  type MintStepId,
} from "@/lib/brief/mint-flow";
import { briefDraftKey } from "@/lib/brief/types";
import { useCreateHistory } from "@/lib/create/history";
import { earnHref, publishIntentOf } from "@/lib/manual/earn-route";
import { ownershipOf } from "@/lib/manual/ownership";
import type { Readiness } from "@/lib/manual/p2-types";
import { buildsOf, listingMetadataOf, productRowsOf, productsOfProject, type ProjectProduct } from "@/lib/manual/project-read";
import { useManualProjects, type ManualProject } from "@/lib/manual/projects";
import { currentProductsOf, readinessOf, type ReadinessFacts } from "@/lib/manual/readiness";
import { createListing, listingViewOf } from "@/lib/market/listing";
import { cleanBenefits, listRequestOf, listedMintingType } from "@/lib/market/listing-flow";
import { listingInputFromBrief, type ListingInput } from "@/lib/market/listing-form";
import { readMarketNow, useMarket } from "@/lib/market/market-store";
import { mainSalesOf, randomId } from "@/lib/market/sales";
import type { ListingMetadata } from "@/lib/market/types";
import { readProjectVideos, useProjectVideos } from "@/lib/video/store";
import { readWallet } from "@/lib/wallet/demo-wallet";
import { mintViewOf, normalizeMintRecord } from "@/lib/wallet/mint";
import { requestCopy } from "@/lib/wallet/request";
import type { MintType, Proof, RequestResult } from "@/lib/wallet/types";

// The pre-scoping global draft, and the old build hand-off's one-shot slot:
// read by nothing any more, removed on the first open.
const LEGACY_KEYS = ["ideeza:brief:draft", "ideeza:brief:handoff-kept"];
const draftKey = briefDraftKey;

/** "{k} products" — the engineering record's own count. */
function projectDetailOf(p: ManualProject): string {
  const k = productRowsOf(p).length;
  return `${k} ${k === 1 ? "product" : "products"}`;
}

function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Writes the draft now, keeping the stored fields the flow doesn't own, so the commit's
 *  writes land in their order (the persist effect only follows a render). False when the
 *  browser refused it. */
function writeDraft(scope: string, state: MintState, step: MintStepId): boolean {
  try {
    const key = draftKey(scope);
    window.localStorage.setItem(key, mintDraftJson(window.localStorage.getItem(key), state, step));
    return true;
  } catch {
    return false;
  }
}

const NO_METADATA: ListingMetadata = { name: "", description: "", products: [], cover: null, at: 0 };
const GONE = "This project no longer exists.";
const STORAGE_FAILED = "This browser couldn't save it — storage is full or blocked.";
/** The wallet's answer didn't make a whole MintRecord (normalizeMintRecord refused it). */
const RECORD_INCOMPLETE = "The wallet's answer didn't make a complete mint record, so nothing was saved.";
const ALREADY_LISTED = "This project is already on the marketplace.";
const NOT_MINTED_REJECTED = "Not minted — you rejected it in your wallet. Nothing was charged.";
/** The mint and its listing are written; only the brief's own record of it isn't. */
const DRAFT_NOT_SAVED =
  "Minted and saved on the project, but this browser couldn't save the brief itself — storage is full or blocked. After a reload the brief opens on an earlier step.";

/** "Not minted — {reason} Nothing was charged." (P2-MINT-6). */
function notMintedLine(reason: string): string {
  return `Not minted — ${reason} Nothing was charged.`;
}

export type BriefGate = {
  /** Every current product's video state, and — when `gated` — whether the commit may go ahead. */
  readiness: Readiness;
  /** This commit runs the gate (Sell, Give, or a private mint posted to Innovations). */
  gated: boolean;
};

export function BriefApp({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { jobs, now: videoNow } = useVideoJobs();
  const { projects, markStepCompleted, setStatus, setShowcase, setMint, setOwnerConfirmed, updateProject } =
    useManualProjects();
  const { builds, getBuild } = useCreateHistory();
  const { data: market, writeListings } = useMarket();
  const mint = useMint();
  const { request } = useWalletRequest();
  const now = useMinuteClock();

  const project = React.useMemo(() => projects.find((p) => p.id === projectId) ?? null, [projects, projectId]);
  const scope = project?.id ?? null;
  // The project's draft, migrated to the flow's state, or a fresh Choose. Read
  // once, on mount: the page keys the flow by project and renders it only in
  // the browser, so the state in hand always belongs to this project.
  const [initial] = React.useState(() => readMintDraft(readRaw(draftKey(projectId))));
  // Publish, Sell and Start mint carry the choice (`?intent=`, owner 2026-10-12): the flow opens
  // on Details with it made and never asks it again. A minted Brief opens on Details only to go
  // out further (a private project given away); its own intent again is its read-only Done.
  const search = useSearchParams();
  const [asked] = React.useState(() => {
    const intent = publishIntentOf(search.get("intent"));
    if (!intent) return null;
    if (initial?.step === "success" && (intent === initial.state.intent || intent === "save")) return null;
    return intent;
  });
  const [state, setState] = React.useState<MintState>(() => ({
    ...(initial?.state ?? DEFAULT_MINT_STATE),
    ...(asked ? { intent: asked } : null),
    projectId,
  }));
  const [step, setStep] = React.useState<MintStepId>(() => (asked ? "details" : (initial?.step ?? "choose")));
  // The commit's wallet request is open. The ref stops a second press inside
  // the same tick; the flag is what the CTA and Back read.
  const mintingRef = React.useRef(false);
  const [minting, setMinting] = React.useState(false);
  // Why the last commit didn't mint (a reject, or a failure's reason).
  const [mintError, setMintError] = React.useState<string | null>(null);
  // The commit minted, but its draft write was refused (writeDraft).
  const [draftNotSaved, setDraftNotSaved] = React.useState(false);

  React.useEffect(() => {
    try {
      for (const k of LEGACY_KEYS) window.localStorage.removeItem(k);
    } catch {}
  }, []);

  // Saved as you go — and never after the project is gone. A minted project carried on (a Private
  // one given away) keeps its stored draft until the commit: its intent there is what it *is*
  // (the commercial axis reads it), so Details must not make it "given" before the signature.
  const carryOn = asked !== null && initial?.step === "success";
  React.useEffect(() => {
    if (scope && !(carryOn && step !== "success")) writeDraft(scope, state, step);
  }, [state, step, scope, carryOn]);

  const patch = (next: Partial<MintState>) => setState((s) => ({ ...s, ...next }));

  // ── The project's products, their videos and the readiness gate ──
  const products = React.useMemo<ProjectProduct[]>(
    () => (project ? currentProductsOf(productsOfProject(project, buildsOf(project, builds))) : []),
    [project, builds],
  );
  const { record: videos } = useProjectVideos(scope);
  const purpose = gatePurposeOf(state.intent, state.shareToNewsfeed);
  const factsOf = React.useCallback(
    (s: MintState, live: Pick<ReadinessFacts, "videos" | "jobs" | "now">): ReadinessFacts => ({
      products,
      ...live,
      status: statusAfterCommit(s.intent),
      ownershipConfirmed: s.confirmOwnership,
      license: s.license,
    }),
    [products],
  );
  const gate = React.useMemo<BriefGate>(
    () => ({
      // The product rows are the same for every purpose; an ungated private mint reads them as Sell's.
      readiness: readinessOf(factsOf(state, { videos, jobs, now: videoNow }), purpose ?? "sell"),
      gated: purpose !== null,
    }),
    [factsOf, state, videos, jobs, videoNow, purpose],
  );
  // The latest jobs and videos, for a commit's recheck that runs seconds after the press.
  const jobsRef = React.useRef(jobs);
  const videosRef = React.useRef(videos);
  React.useEffect(() => {
    jobsRef.current = jobs;
    videosRef.current = videos;
  }, [jobs, videos]);
  const latestProjects = React.useRef(projects);
  React.useEffect(() => {
    latestProjects.current = projects;
  }, [projects]);

  // What the forms show about the mint and the maker's share (P2-MINT-4, P2-LISTING-5).
  const mintStatus = project
    ? mintViewOf(project, { state: briefStateOf(state), step: storedStepOf(step) }, market.sales).status
    : "notMinted";
  const creatorPct = project
    ? ownershipOf({
        createdAt: project.createdAt,
        contributors: project.contributors ?? [],
        sales: mainSalesOf(project.id, market.sales),
        listedPercent: 0,
      }).maker
    : 100;

  // A private mint is always a lazy signature (MINT §5 Q1).
  const type: MintType = state.intent === "save" ? "lazy" : state.mintType;
  const shortfall = useMintShortfall(type, state.network);
  const gated = gate.gated ? gate.readiness : null;
  const detailsReason = detailsMissing(state, { now, creatorPct, readiness: gated });
  const reviewReason = state.intent
    ? reviewMissing({ intent: state.intent, details: detailsReason, shortfall: shortfall?.missing ?? null, readiness: gated })
    : null;

  // The commit (P2-MINT-6, P2-LISTING-22; spec §3.9): ONE wallet request, and
  // its writes inside the dialog at `confirmed`, in order — the MintRecord,
  // then (Sell) the listing, then the draft's `mintedAt` and the v1 writes.
  // A refused listing write puts the record back, so nothing is minted. A
  // reject or a failure writes nothing and says why under the CTA.
  const commit = async () => {
    const p = project;
    const intent = state.intent;
    if (!p || !intent || !scope || mintingRef.current) return;
    mintingRef.current = true;
    setMinting(true);
    setMintError(null);
    try {
      const s = state;
      const { network, collection } = s;
      const plan = mint.plan({ projectId: p.id, intent, type, network, collection });
      if (!plan) {
        setMintError(notMintedLine(GONE));
        return;
      }
      const terms: ListingInput | null =
        intent === "sell"
          ? {
              ...listingInputFromBrief(briefStateOf(s)),
              mintingType: listedMintingType(plan.current, type),
              benefits: cleanBenefits(s.benefits),
            }
          : null;
      const req = terms
        ? listRequestOf({
            projectName: p.name,
            network,
            collection,
            tokenId: plan.tokenId,
            input: terms,
            endsAt: terms.type === "auction" ? new Date(terms.endsAt).getTime() : null,
            mintRequest: plan.request,
          })
        : plan.request;
      const newMint = plan.request?.purpose === "lazyMint" || plan.request?.purpose === "instantMint";
      let mintedAt: number | null = null;

      const writeAll = (at: number, proof: Proof | null): { ok: true } | { ok: false; message: string } => {
        const cur = latestProjects.current.find((x) => x.id === p.id);
        if (!cur) return { ok: false, message: GONE };
        // The listing is made first, in memory, so a row it refuses leaves nothing written.
        let listings = null;
        if (terms) {
          const made = createListing(
            readMarketNow().listings,
            cur.id,
            terms,
            listingMetadataOf(cur, products, at),
            "brief",
            at,
            { listing: () => randomId("lst_") },
          );
          if (!made.ok) return { ok: false, message: made.reason };
          listings = made.listings;
        }
        const prior = cur.mint ?? null;
        const record = proof && plan.request ? plan.nextRecord(proof) : null;
        // 1. The MintRecord.
        if (record && !normalizeMintRecord(record)) return { ok: false, message: RECORD_INCOMPLETE };
        if (record && !setMint(cur.id, record)) return { ok: false, message: STORAGE_FAILED };
        // 2. The listing (Sell). Refused: the record goes back to what it was.
        if (listings) {
          const wrote = writeListings(listings);
          if (!wrote.ok) {
            if (record) {
              if (prior) setMint(cur.id, prior);
              else updateProject(cur.id, { mint: undefined });
            }
            return { ok: false, message: refusedCopy(wrote.reason) };
          }
        }
        if (newMint) bumpMinted(network, collection);
        // 3. The draft's mintedAt — one moment, which a showcase it starts shares (COR-105) —
        //    then the v1 writes.
        // A project carried on keeps the moment it was first minted.
        setDraftNotSaved(!writeDraft(scope, { ...s, mintedAt: carryOn ? (s.mintedAt ?? at) : at }, "success"));
        markStepCompleted(cur.id, "brief");
        setStatus(cur.id, "completed");
        if (typeof cur.ownerConfirmedAt !== "number") setOwnerConfirmed(cur.id, at);
        // Share to Innovations ticked: the mint shares the project (COR-105) — once every
        // product's video is ready; a private mint never waits for them, so without them it
        // stays unshared and the success step offers Share. A project already shared keeps
        // the time it was first shown.
        const shareReady = readinessOf(
          factsOf(s, { videos: videosRef.current, jobs: jobsRef.current, now: at }),
          "showcase",
        ).rules.every((r) => r.ok);
        if (s.shareToNewsfeed && shareReady && cur.showcasedAt == null) {
          setShowcase(cur.id, true, at, { story: s.story.trim() });
        }
        mintedAt = at;
        return { ok: true };
      };

      let result: RequestResult | null = null;
      let switchedToLazy = false;
      if (!req) {
        // Already minted, and nothing to list: the writes need no signature.
        const wrote = writeAll(Date.now(), null);
        if (!wrote.ok) setMintError(notMintedLine(wrote.message));
      } else {
        result = await request(req, {
          recheck: () => {
            if (terms) {
              const m = readMarketNow();
              const v = listingViewOf(p.id, { listings: m.listings, sales: m.sales, bids: m.bids, now: Date.now(), current: NO_METADATA });
              if (v.kind === "live" || v.kind === "paused") return ALREADY_LISTED;
            }
            // A video still rendering never counts (C5): the gate again, on what's stored now.
            if (purpose) {
              const fresh = readinessOf(
                factsOf(s, { videos: readProjectVideos(p.id), jobs: jobsRef.current, now: Date.now() }),
                purpose,
              );
              if (!fresh.ok) return fresh.blocker;
            }
            return null;
          },
          commit: (proof) => writeAll(proof.at, proof),
          // "Use lazy mint instead" when an instant mint can't be paid: lazy chosen, still on the review.
          onUseLazy:
            type === "instant"
              ? () => {
                  switchedToLazy = true;
                  patch({ mintType: "lazy" });
                }
              : undefined,
        });
        if (!result.ok && !switchedToLazy) {
          setMintError(
            result.reason === "rejected"
              ? NOT_MINTED_REJECTED
              : notMintedLine(result.message || requestCopy("failed", req, readWallet(), result.reason).body[0]),
          );
        }
      }
      if (mintedAt !== null) {
        const at = mintedAt;
        setState((cur) => ({ ...cur, mintedAt: at }));
        setStep("success");
      }
    } finally {
      mintingRef.current = false;
      setMinting(false);
    }
  };

  const goBack = () => {
    // Details is the first step when the choice came with the link: Back goes where it came from.
    if (asked && step === "details") {
      if (window.history.length > 1) router.back();
      else router.push(`/projects/${encodeURIComponent(projectId)}`);
      return;
    }
    const target = mintStepBefore(step);
    if (target) setStep(target);
  };

  // Back from Choose is where the flow is opened from: Earn › Sell.
  const leave = () => router.push(earnHref(projectId, "sell"));

  if (!project) return null;

  const read = {
    id: project.id,
    name: project.name,
    description: project.description ?? "",
    detail: projectDetailOf(project),
  };
  const headline = products[0] ?? null;
  const conceptImage =
    headline?.built?.product.conceptImageUrl || (project.buildId ? getBuild(project.buildId)?.conceptImageUrl : undefined);

  // Each step is a page on the app's frame (brief-card.tsx): this is what sits around it.
  const chrome: MintChrome = {
    breadcrumb: (
      <Breadcrumb
        trail={[
          { label: "My projects", href: "/projects" },
          { label: project.name, href: `/projects/${encodeURIComponent(project.id)}` },
          { label: "Earn", href: earnHref(project.id) },
          { label: "Mint" },
        ]}
      />
    ),
    above:
      step !== "success" ? (
        <MintStepLine current={step} skipChoose={asked !== null} />
      ) : draftNotSaved ? (
        <Banner tone="attention">{DRAFT_NOT_SAVED}</Banner>
      ) : null,
    below:
      step !== "success" ? (
        // Under the card, at reading contrast.
        <p role="status" className="m-0 inline-flex items-center gap-[6px] text-sm text-text-tertiary">
          <span aria-hidden className="h-[6px] w-[6px] rounded-full bg-bg-success" />
          Saved as you go
        </p>
      ) : null,
  };

  return (
    <Page>
      <MintChromeContext.Provider value={chrome} key={`step-${step}`}>
        {step === "choose" && (
          <StepChoose
            project={read}
            intent={state.intent}
            onPick={(intent) => patch({ intent })}
            onBack={leave}
            onContinue={() => setStep("details")}
          />
        )}
        {step === "details" && (
          <StepDetails
            state={state}
            onChange={patch}
            onBack={goBack}
            onContinue={() => setStep("review")}
            missing={detailsReason}
            now={now}
            creatorPct={creatorPct}
            mintStatus={mintStatus}
            mintAddress={project.mint?.wallet.address}
            videosReady={gate.readiness.rules.find((r) => r.id === "videos")?.ok === true}
          />
        )}
        {step === "review" && (
          <StepReview
            state={state}
            project={read}
            imageUrl={conceptImage || undefined}
            gate={gate}
            type={type}
            missing={reviewReason}
            detailsMissing={detailsReason}
            now={now}
            creatorPct={creatorPct}
            minting={minting}
            mintError={mintError}
            onBack={goBack}
            onSign={() => void commit()}
          />
        )}
        {step === "success" && (
          <StepSuccess
            state={state}
            onBrowse={(href) => router.push(href)}
            projectName={project.name}
            projectId={scope}
            products={products}
          />
        )}
      </MintChromeContext.Provider>

      <style>{`
        @keyframes ix-brief-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        /* The browser's default placeholder grey measured 2.5:1 on white. */
        .ix-brief-field::placeholder { color: var(--color-input-placeholder); opacity: 1; }
        .ix-brief-field:focus {
          border-color: var(--color-border-brand);
          box-shadow: 0 0 0 3px var(--color-bg-brand-subtle);
        }
        .ix-brief-back:hover { color: var(--color-text-primary); }
      `}</style>
    </Page>
  );
}
