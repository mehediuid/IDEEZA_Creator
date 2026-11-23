"use client";

// The mint flow on the phone: the web's Brief as Earn's steps
// (components/brief/brief-app.tsx), its state, its rules and its ONE commit,
// laid out as the mobile Figma draws it (13 Details · 13b/13e Review and sign
// · 13c the wallet sheet · 13d / 08d Done):
//  choose:  Keep private, Give to the community, or Sell (only when the link
//           carries no choice; Publish, Sell and Start mint carry it);
//  details: the terms — the license and the confirms, or for a Sell the ONE
//           shared listing form (listing-fields.tsx);
//  review:  what is minted, the videos the gate reads, the cost, the wallet's
//           line, Each sale, the ladder's missing steps, then Sign;
//  success: minted — a Sell is listed on Explore marketplace.
// The draft is saved as you go (`ideeza:brief:draft:<id>`, the web's own), so
// the web and the phone carry on each other's mint. Review is its own address
// (`&step=review`), so the top bar's Back and the footer's Back both return to
// Details (mobile UX pass 2026-11-15: the foot carries the one primary; Back
// is the top bar's). The commit is the web's, step for step: ONE wallet request (the
// phone's sheet), and inside it the MintRecord, then — for a Sell — the
// listing, then the draft's `mintedAt` and the project's writes; a refused
// write puts back what came before it. A reject or a failure writes nothing
// and says why at the top of the review (13l).
// CL-030 (the web's mint): Sign stays shut only while a video it needs hasn't
// started ("Start every video first: …"). Once every one has, a video still
// rendering or waiting for review doesn't stop it: the mint happens now and the
// listing — and the Feed post a Sell shares — wait (lib/market/held.ts) until
// every video is ready, then go live by themselves; the wallet's done line and
// Done ("Minted · listing waits for videos") say so.

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { refusedCopy } from "@/components/projects/listing/listing-dialog";
import { useMinuteClock } from "@/components/projects/details/use-project-page-data";
import { useVideoJobs } from "@/components/video-jobs/video-jobs-provider";
import { useMintShortfall } from "@/components/wallet/mint-cost";
import { useMint } from "@/components/wallet/use-mint";
import { useWalletRequest } from "@/components/wallet/wallet-provider";
import { Button } from "@/components/ideeza/button";
import {
  DEFAULT_MINT_STATE,
  briefStateOf,
  detailsMissing,
  gatePurposeOf,
  mintDraftJson,
  readMintDraft,
  reviewMissing,
  statusAfterCommit,
  storedStepOf,
  type MintState,
  type MintStepId,
} from "@/lib/brief/mint-flow";
import { briefDraftKey } from "@/lib/brief/types";
import { bumpMinted } from "@/lib/brief/wallet";
import { useCreateHistory } from "@/lib/create/history";
import { phoneEarnHref, phoneMintIntentOf } from "@/lib/manual/phone-earn";
import { ownershipOf } from "@/lib/manual/ownership";
import { buildsOf, listingMetadataOf, productsOfProject, type ProjectProduct } from "@/lib/manual/project-read";
import { useManualProjects } from "@/lib/manual/projects";
import { currentProductsOf, readinessOf, videosBlockerOf, videosStartBlockerOf, type ReadinessFacts } from "@/lib/manual/readiness";
import { hold, heldId } from "@/lib/market/held";
import { createListing, listingViewOf } from "@/lib/market/listing";
import { HELD_DONE_LINE, cleanBenefits, listRequestOf, listedMintingType } from "@/lib/market/listing-flow";
import { listingInputFromBrief, type ListingInput } from "@/lib/market/listing-form";
import { readMarketNow, useMarket } from "@/lib/market/market-store";
import { mainSalesOf, randomId } from "@/lib/market/sales";
import type { ListingMetadata } from "@/lib/market/types";
import { readProjectVideos, useProjectVideos } from "@/lib/video/store";
import { readWallet } from "@/lib/wallet/demo-wallet";
import { mintViewOf, normalizeMintRecord } from "@/lib/wallet/mint";
import { requestCopy } from "@/lib/wallet/request";
import type { MintType, Proof, RequestResult } from "@/lib/wallet/types";
import { BottomBar } from "../../kit/bottom-bar";
import { OfflineBanner } from "../../kit/states";
import { useGoBack } from "../../nav-trail";
import { Screen } from "../../screen";
import { TopBar } from "../../top-bar";
import { MintChoose, MintDetails, MintDone, MintIntro, MintReview, MintShare, type MintGate } from "./mint-steps";
import { T } from "../../type";

const NO_METADATA: ListingMetadata = { name: "", description: "", products: [], cover: null, at: 0 };
const GONE = "This project no longer exists.";
const STORAGE_FAILED = "This browser couldn't save it — storage is full or blocked.";
const RECORD_INCOMPLETE = "The wallet's answer didn't make a complete mint record, so nothing was saved.";
const ALREADY_LISTED = "This project is already on the marketplace.";
const NOT_MINTED_REJECTED = "Not minted — you rejected it in your wallet. Nothing was charged.";
const DRAFT_NOT_SAVED =
  "Minted and saved on the project, but this browser couldn't save the brief itself — storage is full or blocked. After a reload the brief opens on an earlier step.";

/** The reason follows a dash, so its sentence starts in lower case ("Not minted — your wallet …"). */
function notMintedLine(reason: string): string {
  const lower = /^[A-Z][a-z]/.test(reason) ? reason.charAt(0).toLowerCase() + reason.slice(1) : reason;
  return `Not minted — ${lower} Nothing was charged.`;
}

function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Writes the draft now, keeping the stored fields the flow doesn't own. False when the browser refused it. */
function writeDraft(scope: string, state: MintState, step: MintStepId): boolean {
  try {
    const key = briefDraftKey(scope);
    window.localStorage.setItem(key, mintDraftJson(window.localStorage.getItem(key), state, step));
    return true;
  } catch {
    return false;
  }
}

export function MintFlow({ projectId }: { projectId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const projectHref = `/m/projects/${encodeURIComponent(projectId)}`;
  const leave = useGoBack(projectHref);
  const backToSell = useGoBack(phoneEarnHref(projectId, "sell"));
  const backFromReview = useGoBack(withoutStep(pathname, search));
  const pushedReview = React.useRef(false);
  const { jobs, now: videoNow } = useVideoJobs();
  const { projects, markStepCompleted, setStatus, setShowcase, setMint, setOwnerConfirmed, updateProject } = useManualProjects();
  const { builds } = useCreateHistory();
  const { data: market, writeListings } = useMarket();
  const mint = useMint();
  const { request } = useWalletRequest();
  const now = useMinuteClock();

  const project = React.useMemo(() => projects.find((p) => p.id === projectId) ?? null, [projects, projectId]);
  const [initial] = React.useState(() => readMintDraft(readRaw(briefDraftKey(projectId))));
  // Publish, Sell and Start mint carry the choice: the flow opens on Details with it made. A
  // minted Brief opens on Details only to go out further (a private project given away).
  const [asked] = React.useState(() => {
    const intent = phoneMintIntentOf(search.get("intent"));
    if (!intent) return null;
    if (initial?.step === "success" && (intent === initial.state.intent || intent === "save")) return null;
    return intent;
  });
  const [state, setState] = React.useState<MintState>(() => ({
    ...(initial?.state ?? DEFAULT_MINT_STATE),
    ...(asked ? { intent: asked } : null),
    projectId,
  }));
  // The stored step: choose, details or success. Review is the address's `step=review` over Details.
  const [base, setBase] = React.useState<MintStepId>(() => {
    if (asked) return "details";
    const s = initial?.step ?? "choose";
    return s === "review" ? "details" : s;
  });
  const reviewing = base === "details" && search.get("step") === "review";
  const step: MintStepId = reviewing ? "review" : base;

  const mintingRef = React.useRef(false);
  const [minting, setMinting] = React.useState(false);
  const [mintError, setMintError] = React.useState<string | null>(null);
  const [draftNotSaved, setDraftNotSaved] = React.useState(false);
  // Continue to review was pressed with something missing: every field's message shows (13h).
  const [tried, setTried] = React.useState(false);
  // Each step opens at its top.
  const topRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    topRef.current?.parentElement?.scrollTo({ top: 0 });
  }, [step]);

  const scope = project?.id ?? null;
  const carryOn = asked !== null && initial?.step === "success";
  React.useEffect(() => {
    if (scope && !(carryOn && step !== "success")) writeDraft(scope, state, step);
  }, [state, step, scope, carryOn]);

  const patch = (next: Partial<MintState>) => setState((s) => ({ ...s, ...next }));

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
  const gate = React.useMemo<MintGate>(
    () => ({ readiness: readinessOf(factsOf(state, { videos, jobs, now: videoNow }), purpose ?? "sell"), gated: purpose !== null }),
    [factsOf, state, videos, jobs, videoNow, purpose],
  );
  const jobsRef = React.useRef(jobs);
  const videosRef = React.useRef(videos);
  const latestProjects = React.useRef(projects);
  React.useEffect(() => {
    jobsRef.current = jobs;
    videosRef.current = videos;
    latestProjects.current = projects;
  }, [jobs, videos, projects]);

  const mintStatus = project ? mintViewOf(project, { state: briefStateOf(state), step: storedStepOf(step) }, market.sales).status : "notMinted";
  const creatorPct = project
    ? ownershipOf({ createdAt: project.createdAt, contributors: project.contributors ?? [], sales: mainSalesOf(project.id, market.sales), listedPercent: 0 }).maker
    : 100;
  const type: MintType = state.intent === "save" ? "lazy" : state.mintType;
  const shortfall = useMintShortfall(type, state.network);
  const gated = gate.gated ? gate.readiness : null;
  const detailsReason = detailsMissing(state, { now, creatorPct, readiness: gated });
  const reviewReason = state.intent
    ? reviewMissing({ intent: state.intent, details: detailsReason, shortfall: shortfall?.missing ?? null, readiness: gated, holdVideos: true })
    : null;

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
          ? { ...listingInputFromBrief(briefStateOf(s)), mintingType: listedMintingType(plan.current, type), benefits: cleanBenefits(s.benefits) }
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
      // A video still being made: the listing waits, and the wallet says so (CL-030).
      if (req && terms && purpose && videosBlockerOf(gate.readiness)) req.doneLine = HELD_DONE_LINE;
      const newMint = plan.request?.purpose === "lazyMint" || plan.request?.purpose === "instantMint";
      let mintedAt: number | null = null;

      const writeAll = (at: number, proof: Proof | null): { ok: true } | { ok: false; message: string } => {
        const cur = latestProjects.current.find((x) => x.id === p.id);
        if (!cur) return { ok: false, message: GONE };
        let listings = null;
        if (terms) {
          const made = createListing(readMarketNow().listings, cur.id, terms, listingMetadataOf(cur, products, at), "brief", at, { listing: () => randomId("lst_") });
          if (!made.ok) return { ok: false, message: made.reason };
          listings = made.listings;
        }
        const prior = cur.mint ?? null;
        const record = proof && plan.request ? plan.nextRecord(proof) : null;
        if (record && !normalizeMintRecord(record)) return { ok: false, message: RECORD_INCOMPLETE };
        if (record && !setMint(cur.id, record)) return { ok: false, message: STORAGE_FAILED };
        // A video still being made (CL-030): the mint happens now and the listing waits off Explore
        // marketplace until every video is ready, then goes live by itself.
        const videosWait = purpose ? videosBlockerOf(readinessOf(factsOf(s, { videos: readProjectVideos(cur.id), jobs: jobsRef.current, now: at }), purpose)) : null;
        if (listings && videosWait) {
          const made = listings[listings.length - 1];
          if (!hold({ id: heldId(), projectId: cur.id, kind: "main", at, listing: made }).ok) {
            if (record) {
              if (prior) setMint(cur.id, prior);
              else updateProject(cur.id, { mint: undefined });
            }
            return { ok: false, message: refusedCopy("storage") };
          }
          listings = null;
        }
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
        setDraftNotSaved(!writeDraft(scope, { ...s, mintedAt: carryOn ? (s.mintedAt ?? at) : at }, "success"));
        markStepCompleted(cur.id, "brief");
        setStatus(cur.id, "completed");
        if (typeof cur.ownerConfirmedAt !== "number") setOwnerConfirmed(cur.id, at);
        const shareGate = readinessOf(factsOf(s, { videos: videosRef.current, jobs: jobsRef.current, now: at }), "showcase");
        const shareReady = shareGate.rules.every((r) => r.ok);
        const shareStarted = videosStartBlockerOf(shareGate) === null;
        // Share to Feed ticked shares after any intent, as the web's Share to Innovations (SOC-6): with
        // nothing for sale (a gift, a private mint) the post is on your Timeline, and joins the Feed once
        // something of it is for sale. Every video started, some still rendering or unreviewed
        // (CL-030): the post waits for them; a private mint with a video never started stays unshared,
        // and Done offers Share.
        if (s.shareToNewsfeed && cur.showcasedAt == null) {
          if (shareReady) setShowcase(cur.id, true, at, { story: s.story.trim() });
          else if (shareStarted) hold({ id: heldId(), projectId: cur.id, kind: "share", at, story: s.story.trim() });
        }
        mintedAt = at;
        return { ok: true };
      };

      let result: RequestResult | null = null;
      if (!req) {
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
            if (purpose) {
              const fresh = readinessOf(factsOf(s, { videos: readProjectVideos(p.id), jobs: jobsRef.current, now: Date.now() }), purpose);
              // A video rendering or unreviewed no longer stops it (CL-030): what it holds waits for
              // it. A video never started still does.
              const start = videosStartBlockerOf(fresh);
              if (start) return start;
              const other = fresh.rules.find((r) => !r.ok && r.id !== "videos" && r.id !== "projectVideo");
              if (other) return other.reason;
            }
            return null;
          },
          commit: (proof) => writeAll(proof.at, proof),
        });
        if (!result.ok) {
          setMintError(
            result.reason === "rejected" ? NOT_MINTED_REJECTED : notMintedLine(result.message || requestCopy("failed", req, readWallet(), result.reason).body[0]),
          );
        }
      }
      if (mintedAt !== null) {
        const at = mintedAt;
        setState((cur) => ({ ...cur, mintedAt: at }));
        setBase("success");
        // Done takes the place of the flow: when Review was pushed over Details here, step back
        // onto that entry (so one Back from Done leaves the mint); else drop the step in place.
        if (pushedReview.current) router.back();
        else router.replace(withoutStep(pathname, search));
      }
    } finally {
      mintingRef.current = false;
      setMinting(false);
    }
  };

  if (!project || !scope) return null;
  const intent = state.intent ?? "sell";

  const toReview = () => {
    pushedReview.current = true;
    router.push(withStep(pathname, search, "review"));
  };
  // Back never pushes (nav-trail): the previous screen, else the step's parent in place.
  const back = step === "review" ? backFromReview : step === "details" ? (asked ? leave : () => setBase("choose")) : step === "choose" ? backToSell : leave;

  const title = step === "success" && intent === "give" ? "Give to the community" : "Mint";

  return (
    <Screen
      top={<TopBar back={step === "success" ? projectHref : true} onBack={step === "success" ? undefined : () => back()} title={title} />}
      footer={
        <MintFooter
          step={step}
          state={state}
          type={type}
          minting={minting}
          detailsReason={detailsReason}
          reviewReason={reviewReason}
          tried={tried}
          onTry={() => setTried(true)}
          onChoose={() => setBase("details")}
          onReview={toReview}
          onSign={() => void commit()}
          onDone={() => router.replace(projectHref)}
        />
      }
    >
      <OfflineBanner />
      <div ref={topRef} className="flex flex-col gap-8 px-8 pb-12 pt-2">
        {step !== "success" && <MintIntro step={step} intent={state.intent} skipChoose={asked !== null} />}
        {step === "choose" && <MintChoose intent={state.intent} onPick={(i) => patch({ intent: i })} />}
        {step === "details" && (
          <MintDetails
            state={state}
            onChange={patch}
            now={now}
            creatorPct={creatorPct}
            mintStatus={mintStatus}
            mintAddress={project.mint?.wallet.address}
            shortfall={type === "instant" ? (shortfall?.missing ?? null) : null}
            tried={tried}
            videosReady={gate.readiness.rules.find((r) => r.id === "videos")?.ok === true}
          />
        )}
        {step === "review" && (
          <MintReview state={state} project={project} products={products} gate={gate} type={type} now={now} creatorPct={creatorPct} mintError={minting ? null : mintError} />
        )}
        {step === "success" && <MintDone state={state} project={project} products={products} warning={draftNotSaved ? DRAFT_NOT_SAVED : null} />}
      </div>
    </Screen>
  );
}

function withStep(pathname: string, search: URLSearchParams, step: "review"): string {
  const q = new URLSearchParams(search.toString());
  q.set("step", step);
  return `${pathname}?${q.toString()}`;
}

function withoutStep(pathname: string, search: URLSearchParams): string {
  const q = new URLSearchParams(search.toString());
  q.delete("step");
  const qs = q.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/** The pinned foot: Back and the step's one primary; under them the first thing missing, and "Saved as you go". */
function MintFooter({
  step,
  state,
  type,
  minting,
  detailsReason,
  reviewReason,
  tried,
  onTry,
  onChoose,
  onReview,
  onSign,
  onDone,
}: {
  step: MintStepId;
  state: MintState;
  type: MintType;
  minting: boolean;
  detailsReason: string | null;
  reviewReason: string | null;
  tried: boolean;
  onTry: () => void;
  onChoose: () => void;
  onReview: () => void;
  onSign: () => void;
  onDone: () => void;
}) {
  const reasonId = React.useId();
  if (step === "success") {
    return (
      <BottomBar className="flex-row gap-6 pt-8">
        <MintShare />
        <Button size="xl" className="min-w-0 flex-1" onClick={onDone}>
          Done
        </Button>
      </BottomBar>
    );
  }
  const reason = step === "choose" ? (state.intent ? null : "Pick how it goes out.") : step === "details" ? detailsReason : reviewReason;
  const primary =
    step === "choose" ? (
      <Button size="xl" className="w-full" disabled={!state.intent} onClick={onChoose}>
        Continue
      </Button>
    ) : step === "details" ? (
      <Button
        size="xl"
        className="w-full"
        disabled={tried && !!detailsReason}
        aria-describedby={detailsReason ? reasonId : undefined}
        onClick={() => {
          if (detailsReason) {
            onTry();
            requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
            return;
          }
          onReview();
        }}
      >
        Continue to review
      </Button>
    ) : (
      <Button size="xl" className="w-full" disabled={!!reviewReason || minting} loading={minting} aria-describedby={reviewReason ? reasonId : undefined} onClick={onSign}>
        {minting ? "Waiting for your wallet…" : ctaOf(state, type)}
      </Button>
    );
  // One primary, full width; Back is the top bar's (the same step back).
  return (
    <BottomBar>
      <div className="flex">{primary}</div>
      <p id={reasonId} className={T.meta}>
        {reason ? `${reason} · ` : ""}Saved as you go
      </p>
    </BottomBar>
  );
}

/** The web's CTA words (`commitCtaLabel`), with Feed for Innovations on the phone. */
function ctaOf(state: MintState, type: MintType): string {
  const intent = state.intent ?? "sell";
  if (intent === "save") return "Sign and save";
  const base = `${type === "instant" ? "Pay" : "Sign"} and ${intent === "sell" ? "list" : "give"}`;
  return intent === "give" && state.shareToNewsfeed ? `${base} · post to Feed` : base;
}
