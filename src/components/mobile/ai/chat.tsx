"use client";

// AI Product Generate — one chat, from the idea to the saved project (Full AI
// flow 05–18, the single- and double-product rows, A1–A8): the step line,
// the maker's idea, the reading card, the question, the concepts, the
// network, the Build line, then the build itself and its summary; the
// composer at the foot (held once a build holds the concepts). The top bar
// has the Build log one tap away (the Figma's chat frames) and ⋯ with
// History, a new idea and Delete. All of it runs on the web's stores through
// `useConceptFlow`. Out of credits, the composer gets the state row with Buy
// credits and the next plan up (CL-032); the maker's first ready build gets the
// first-build card (Free, once); the idea's inspiration image shows as a chip
// in the maker's bubble (CL-027).

import * as React from "react";
import { useRouter } from "next/navigation";
import { Add01Icon, AnalyticsUpIcon, Bug01Icon, Clock01Icon, Coins01Icon, Delete02Icon } from "@hugeicons/core-free-icons";
import { REPORT_PROBLEM, reportProblemHref } from "../help/report-link";
import { Skeleton } from "@/components/ideeza/skeleton";
import { useSecondClock } from "@/components/create/use-clock";
import { CONCEPT_COST } from "@/lib/create/credits";
import { jobCost } from "@/lib/create/history";
import { Screen } from "../screen";
import { MORE_ICON, TopBar } from "../top-bar";
import { useNotifyPrePrompt } from "../kit/permission-sheet";
import { ActionSheet } from "../kit/sheet";
import { NotFoundState } from "../kit/state";
import { cn } from "@/lib/utils";
import { T } from "../type";
import { OfflineBanner } from "../kit/states";
import { useToast } from "../kit/toast";
import { BuildCard, BuildConfirmSheet, FinishedCard, FinishedFoot, isFinished } from "./build";
import { BuildLogSheet } from "./build-log-sheet";
import { BuyCreditsSheet } from "./buy-credits-sheet";
import { BuildBar, BuildOptionsSheet, ConceptImageViewer, ConceptSheet, ConceptStage, ConceptsMini, RefineSheet } from "./concepts";
import { DeleteChatSheet } from "./delete-chat-sheet";
import { NetworkCard } from "./network";
import { CreditsFoot, OFFLINE_REASON, PromptBubble, Stepper } from "./parts";
import { PromptBox } from "./prompt-box";
import { SaveSheet } from "./save-sheet";
import { FirstBuildCard, OutOfCreditsRow } from "../plans/upsell";
import { ProductQuestion, ProjectSheet, ReadingCard, RequiredStep } from "./setup";
import { SpecSheet } from "./spec-sheet";
import { useConceptFlow, type Gate, type SetupTurn } from "./use-concept-flow";

export function AiChat({ chatId }: { chatId: string }) {
  const flow = useConceptFlow(chatId);
  const router = useRouter();
  const toast = useToast();
  const { chat } = flow;
  const setup = chat?.turns.find((t): t is SetupTurn => t.role === "setup");
  const firstAsk = chat?.turns.find((t) => t.role === "user");
  const drawing = flow.rail.rows.some((r) => r.phase === "drawing") || setup?.status === "loading";
  const now = useSecondClock(drawing);

  // ── the question ──
  const [picks, setPicks] = React.useState<Set<string> | null>(null);
  const [productsConfirmed, setProductsConfirmed] = React.useState(false);
  const [projectDismissed, setProjectDismissed] = React.useState(false);
  const asking = setup?.status === "asking";
  // A chat started from a project's Add a product adds to that project, never to a new one
  // (owner, 2026-10-13); it exists to add one product, so nothing else starts ticked.
  const addTo = flow.setupProjects.find((p) => p.preselect) ?? null;
  const picked = picks ?? new Set(addTo ? [] : (setup?.companions.map((c) => c.id) ?? []));
  // With one product the project was chosen on its page, so the question answers itself once
  // the idea is read (the web's rule) — online. Credits are never checked here: the render
  // charges or fails, as on the web (CRE-2).
  const answersItself = asking && !!addTo && (setup?.companions.length ?? 0) === 0 && flow.online;
  const needsProductQ = asking && (setup?.companions.length ?? 0) > 0 && !productsConfirmed;
  const projectOpen = asking && !needsProductQ && !projectDismissed && !answersItself;

  // ── the sheets ──
  const [sheetFor, setSheetFor] = React.useState<string | null>(null);
  const [refineTurn, setRefineTurn] = React.useState<string | null>(null);
  const [specFor, setSpecFor] = React.useState<string | null>(null);
  const [gate, setGate] = React.useState<Gate | null>(null);
  const [saveOpen, setSaveOpen] = React.useState(false);
  const [logOpen, setLogOpen] = React.useState(false);
  const [menu, setMenu] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [buildProduct, setBuildProduct] = React.useState("primary");
  const [conceptProduct, setConceptProduct] = React.useState("primary");
  const [optionsOpen, setOptionsOpen] = React.useState(false);
  const [imageFor, setImageFor] = React.useState<string | null>(null);
  const [buying, setBuying] = React.useState(false);

  const job = flow.activeBuild;
  const notify = useNotifyPrePrompt();

  const selfAnswered = React.useRef(false);
  const { answerSetup } = flow;
  React.useEffect(() => {
    if (!answersItself || !addTo || selfAnswered.current) return;
    selfAnswered.current = true;
    answerSetup({ projectId: addTo.id, projectName: "", picked: [] });
  }, [answersItself, addTo, answerSetup]);

  const startBuild = async () => {
    const result = await flow.prepareBuild();
    if (!result) return;
    if ("blocked" in result) {
      toast({ title: "A product doesn't fit the size you set — fix it in its spec", lead: "error" });
      setSpecFor(result.blocked);
      return;
    }
    setGate(result.gate);
  };

  if (!flow.hydrated) {
    return (
      <Screen top={<TopBar back="/m/ai" title="AI Product Generate" />}>
        <div role="status" aria-label="Loading" className="flex flex-col gap-6 p-8">
          <Skeleton className="ml-auto h-[64px] w-[240px] rounded-xl" />
          <Skeleton className="h-[120px] w-full rounded-xl" />
          <Skeleton size="lg" className="w-full rounded-xl" />
        </div>
      </Screen>
    );
  }
  if (!chat) {
    return (
      <Screen top={<TopBar back="/m/ai" title="AI Product Generate" />} className="p-8">
        <NotFoundState thing="chat" body="It may have been deleted, or it was started in another browser." action={{ label: "Start a new idea", href: "/m/ai" }} />
      </Screen>
    );
  }

  const placeholder =
    flow.target.kind === "refine"
      ? `Describe a change to ${flow.target.name}…`
      : flow.target.kind === "blocked" && flow.target.why === "drawing"
        ? "Add a product while concepts draw…"
        : flow.target.kind === "none"
          ? "Pick a product to change, or describe a new one…"
          : "Describe your device";
  const conceptsDrawn = chat.turns.filter((t) => t.role === "assistant" && t.status !== "failed").length;
  const footRight = job
    ? `Build · ${jobCost(job)} credits`
    : setup?.status === "answered"
      ? `${conceptsDrawn} ${conceptsDrawn === 1 ? "concept" : "concepts"} · ${conceptsDrawn * CONCEPT_COST} ${conceptsDrawn === 1 ? "credit" : "credits"}`
      : asking
        ? `${1 + picked.size} ${picked.size === 0 ? "concept" : "concepts"} · ${(1 + picked.size) * CONCEPT_COST} ${picked.size === 0 ? "credit" : "credits"}`
        : "1 credit per concept";

  const isAnswered = setup?.status === "answered";
  // Image first (the owner's approved sample): once the concepts are on the
  // page the composer gives way — changes go through each product's Change
  // sheet — and the Build line is pinned at the foot; once the build is
  // finished, Save is.
  const conceptStage = isAnswered && flow.rail.rows.length > 0;
  // A piece that failed doesn't hold the result back: the rest is shown and
  // can be saved, the failed piece with its Retry (Save what's ready).
  const finished = !!job && isFinished(job);
  const buildBar = conceptStage && (!job || !flow.held);

  const footer = finished && job ? (
    <div className="pt-4">
      <FinishedFoot job={job} flow={flow} onSave={() => setSaveOpen(true)} />
      <CreditsFoot right={footRight} />
    </div>
  ) : buildBar ? (
    <div className="flex flex-col gap-3 pt-4">
      {job && flow.state.changedSinceBuild && (
        <p className={cn(T.meta, "px-8")}>Changed since this build — build again to carry the change into the deliverables.</p>
      )}
      <div className="px-8">
        <BuildBar flow={flow} onBuild={startBuild} onOptions={() => setOptionsOpen(true)} />
      </div>
      <CreditsFoot right={footRight} />
    </div>
  ) : conceptStage || flow.held || asking ? (
    // While the project question is open its card carries the next step, so the composer
    // (disabled until it's answered) gives the thumb zone up; the credits line stays. Out of
    // credits, the web keeps its CL-032 line under the composer while the question is open:
    // here the same row, with Buy credits (CRE-2).
    <div className="pt-2">
      {asking && flow.creditsHydrated && !flow.canRender && <OutOfCreditsRow className="mx-8 mb-4 mt-2" onBuy={() => setBuying(true)} />}
      <CreditsFoot right={footRight} />
    </div>
  ) : (
    <div className="pt-4">
      {flow.creditsHydrated && !flow.canRender && <OutOfCreditsRow className="mx-8 mb-4" onBuy={() => setBuying(true)} />}
      <PromptBox
        value={draft}
        onChange={setDraft}
        placeholder={placeholder}
        sendKind="send"
        enhanceMode={flow.target.kind === "refine" ? "change" : "brief"}
        disabled={flow.setupPending}
        canSend={flow.canRender}
        onSubmit={(text) => {
          if (flow.submit(text)) return;
          toast({
            title:
              flow.target.kind === "blocked"
                ? `${flow.target.hint}. To add a product, name it — "add a charger".`
                : "Pick a product above first — or name a new one to add it",
          });
          return false;
        }}
      />
      <CreditsFoot right={footRight} />
    </div>
  );

  return (
    <>
      <Screen
        top={
          <>
            <TopBar back="/m/ai" title="AI Product Generate" 
              actions={[
                { icon: AnalyticsUpIcon, label: "Build log", onClick: () => setLogOpen(true) },
                { icon: MORE_ICON, label: "More", onClick: () => setMenu(true) },
              ]}
            />
            <Stepper stage={flow.stage} />
          </>
        }
        footer={footer}
      >
        <div className="flex flex-col gap-6 px-8 pb-8 pt-2">
          <OfflineBanner />
          {firstAsk?.role === "user" && <PromptBubble text={firstAsk.text} image={firstAsk.image} imageName={firstAsk.imageName} />}
          {setup && <ReadingCard setup={setup} now={now} projectName={flow.projectName} />}
          {needsProductQ && setup && (
            <ProductQuestion
              setup={setup}
              picked={picked}
              onToggle={(id) => {
                const next = new Set(picked);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                setPicks(next);
              }}
              addTo={addTo}
              held={flow.online ? null : OFFLINE_REASON}
              onContinue={() => {
                if (addTo) return flow.answerSetup({ projectId: addTo.id, projectName: "", picked: setup.companions.filter((c) => picked.has(c.id)).map((c) => c.id) });
                setProductsConfirmed(true);
                setProjectDismissed(false);
              }}
            />
          )}
          {asking && !needsProductQ && projectDismissed && <RequiredStep onOpen={() => setProjectDismissed(false)} />}

          {finished && job && <FinishedCard job={job} flow={flow} product={buildProduct} onProduct={setBuildProduct} onSpec={setSpecFor} />}
          {finished && job && <FirstBuildCard jobId={job.id} />}
          {job && !finished && <BuildCard job={job} product={buildProduct} onProduct={setBuildProduct} />}

          {conceptStage && !job && (
            <ConceptStage flow={flow} now={now} selected={conceptProduct} onSelect={setConceptProduct} onChange={setSheetFor} onImage={setImageFor} />
          )}
          {conceptStage && job && <ConceptsMini flow={flow} onOpen={setSheetFor} />}
          {isAnswered && <NetworkCard flow={flow} />}
        </div>
      </Screen>

      {setup && asking && (
        <ProjectSheet
          open={projectOpen}
          onClose={() => setProjectDismissed(true)}
          products={1 + picked.size}
          productNames={[setup.productName?.trim() || "Your product", ...setup.companions.filter((c) => picked.has(c.id)).map((c) => c.name)]}
          onChangeProducts={() => setProductsConfirmed(false)}
          held={flow.online ? null : OFFLINE_REASON}
          projects={flow.setupProjects}
          onBuyCredits={flow.creditsHydrated && !flow.canRender ? () => setBuying(true) : null}
          onStart={(a) => flow.answerSetup({ ...a, picked: [...picked].filter((id) => setup.companions.some((c) => c.id === id)) })}
        />
      )}
      <ConceptSheet
        flow={flow}
        productId={sheetFor}
        onClose={() => setSheetFor(null)}
        onRefine={(turnId) => {
          setSheetFor(null);
          setRefineTurn(turnId);
        }}
        onEditSpec={(id) => {
          setSheetFor(null);
          setSpecFor(id);
        }}
      />
      <RefineSheet flow={flow} turnId={refineTurn} onClose={() => setRefineTurn(null)} />
      <BuildOptionsSheet flow={flow} open={optionsOpen} onClose={() => setOptionsOpen(false)} />
      <ConceptImageViewer flow={flow} productId={imageFor} onClose={() => setImageFor(null)} />
      <SpecSheet flow={flow} productId={specFor} onClose={() => setSpecFor(null)} />
      <BuildConfirmSheet
        flow={flow}
        gate={gate}
        onClose={() => setGate(null)}
        onBooked={(blocked) => {
          setGate(null);
          if (blocked) setSpecFor(blocked);
          else {
            toast({ title: "Build started — it runs in the background", lead: "success" });
            // PM-04: once, after the first build starts — so "we'll notify you" can be true.
            notify.offer();
          }
        }}
      />
      {job && flow.saveInfo && <SaveSheet open={saveOpen} job={job} info={flow.saveInfo} onClose={() => setSaveOpen(false)} />}
      {notify.sheet}
      {/* At the question: the concepts it is about to draw, so the pack picked covers them all. */}
      <BuyCreditsSheet open={buying} onClose={() => setBuying(false)} need={(asking ? 1 + picked.size : 1) * CONCEPT_COST} />
      <BuildLogSheet open={logOpen} onClose={() => setLogOpen(false)} flow={flow} />
      <ActionSheet
        open={menu}
        onClose={() => setMenu(false)}
        items={[
          { label: "History", icon: Clock01Icon, onSelect: () => router.push("/m/ai/history") },
          { label: "New idea", icon: Add01Icon, onSelect: () => router.push("/m/ai") },
          { label: "Buy credits", icon: Coins01Icon, onSelect: () => setBuying(true) },
          { label: REPORT_PROBLEM, icon: Bug01Icon, onSelect: () => router.push(reportProblemHref()) },
          { label: "Delete this chat", icon: Delete02Icon, onSelect: () => setDeleting(true), destructive: true },
        ]}
      />
      <DeleteChatSheet chat={deleting ? chat : null} onClose={() => setDeleting(false)} onDeleted={() => router.replace("/m/ai")} />
    </>
  );
}

