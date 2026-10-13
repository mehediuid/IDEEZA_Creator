"use client";

// "Add a product" on a project's page (owner, 2026-10-13: the old way sent the
// maker to Home with an "Adding to …" chip, and the chat then asked which
// project again — hard to follow). One dialog over the page, never a page
// change until the maker starts:
//
// 1. Two ways in — Build with AI, Build manually — each a card that opens its
//    step at once (no separate Continue).
// 2a. Build with AI: the idea, Enhance (the Home's /api/refine), the cost, and
//     Start. Start opens the ordinary chat for it, which History lists like
//     any other; the chat knows its project, so it never asks for one
//     (setup-turn.tsx answers that itself).
// 2b. Build manually: the product's name, and Create product. The product is
//     added to this project at once (the edit gate's pause confirm first on a
//     listed project) and its PCB editor opens.
//
// ModalFrame, the design system's dialog, as a bottom sheet below `md` (DS M09).

import * as React from "react";
import { useRouter } from "next/navigation";
import { AiMagicIcon, MagicWand01Icon, PencilEdit01Icon, Refresh01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, ModalFrame, TextInput } from "@/components/ideeza";
import { useProjectEditGate } from "@/components/projects/use-edit-gate";
import { CONCEPT_COST, useCredits } from "@/lib/create/credits";
import { useCreateHistory } from "@/lib/create/history";
import { editorHref } from "@/lib/manual/editor-scope";
import { PROJECT_NAME_MAX, useManualProjects, type ManualProject } from "@/lib/manual/projects";
import { cn } from "@/lib/utils";

type Step = "choose" | "ai" | "manual";

const OPTION =
  "flex min-h-[44px] w-full items-start gap-5 rounded-xl border border-solid border-border px-5 py-5 text-left outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none";

const PROMPT_MAX = 2000;

export function AddProductDialog({ project, onClose }: { project: ManualProject; onClose: () => void }) {
  const [step, setStep] = React.useState<Step>("choose");
  // The listing's pause confirm opens over this dialog and owns the keyboard while it's up.
  const gate = useProjectEditGate(project.id);
  const confirming = React.isValidElement<{ open?: boolean }>(gate.dialog) && gate.dialog.props.open === true;
  // The first way in takes focus when the dialog opens, and again when Back returns to the choice.
  const firstRef = React.useRef<HTMLButtonElement>(null);
  const title = step === "ai" ? "Build with AI" : step === "manual" ? "Build manually" : `Add a product to ${project.name}`;
  const description =
    step === "choose" ? "Pick how you want to make it." : `It's added to ${project.name}.`;
  return (
    <>
      <ModalFrame
        open
        onClose={onClose}
        title={title}
        description={description}
        size="sm"
        sheet
        covered={confirming}
        initialFocus={firstRef}
      >
        {step === "choose" && <Choose firstRef={firstRef} onPick={setStep} />}
        {step === "ai" && <BuildWithAi project={project} onBack={() => setStep("choose")} />}
        {step === "manual" && <BuildManually project={project} gate={gate} onBack={() => setStep("choose")} />}
      </ModalFrame>
      {gate.dialog}
    </>
  );
}

function Choose({ firstRef, onPick }: { firstRef: React.RefObject<HTMLButtonElement | null>; onPick: (step: Step) => void }) {
  React.useEffect(() => {
    firstRef.current?.focus();
  }, [firstRef]);
  return (
    <div className="flex flex-col gap-4 pt-2">
      <button ref={firstRef} type="button" onClick={() => onPick("ai")} className={OPTION}>
        <span aria-hidden className="inline-flex size-[36px] shrink-0 items-center justify-center rounded-lg bg-bg-brand-subtle text-text-brand">
          <Icon icon={AiMagicIcon} size={18} />
        </span>
        <span className="flex min-w-0 flex-col gap-1">
          <span className="text-md font-semibold text-text-primary">Build with AI</span>
          <span className="text-md leading-relaxed text-text-secondary">Describe it, and AI draws concepts and builds the files.</span>
        </span>
      </button>
      <button type="button" onClick={() => onPick("manual")} className={OPTION}>
        <span aria-hidden className="inline-flex size-[36px] shrink-0 items-center justify-center rounded-lg bg-bg-subtle text-text-secondary">
          <Icon icon={PencilEdit01Icon} size={18} />
        </span>
        <span className="flex min-w-0 flex-col gap-1">
          <span className="text-md font-semibold text-text-primary">Build manually</span>
          <span className="text-md leading-relaxed text-text-secondary">Start an empty product and design it yourself in the editors.</span>
        </span>
      </button>
    </div>
  );
}

/** The step's own footer: Back on the left, the one primary on the right. */
function StepFooter({ onBack, children }: { onBack: () => void; children: React.ReactNode }) {
  return (
    <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-solid border-border pt-8">
      <Button type="button" hierarchy="ghost" size="lg" onClick={onBack}>
        Back
      </Button>
      <div className="ml-auto flex items-center gap-4">{children}</div>
    </div>
  );
}

function BuildWithAi({ project, onBack }: { project: ManualProject; onBack: () => void }) {
  const router = useRouter();
  const { createChat } = useCreateHistory();
  const { hydrated: creditsHydrated, balance } = useCredits();
  const [prompt, setPrompt] = React.useState("");
  const [tried, setTried] = React.useState(false);
  const [refining, setRefining] = React.useState(false);
  const [starting, setStarting] = React.useState(false);
  const areaRef = React.useRef<HTMLTextAreaElement>(null);
  const fieldId = React.useId();
  const errorId = React.useId();
  const costId = React.useId();

  React.useEffect(() => {
    areaRef.current?.focus();
  }, []);

  const canRender = !creditsHydrated || balance >= CONCEPT_COST;
  const empty = prompt.trim() === "";
  const error = tried && empty ? "Describe the product first." : null;

  // The Home's own Enhance: the rough idea rewritten into a concrete brief, dropped back in the box.
  const refine = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || refining) return;
    setRefining(true);
    try {
      const res = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed }),
      });
      const data = (await res.json()) as { refined?: string };
      if (data.refined?.trim()) setPrompt(data.refined.trim().slice(0, PROMPT_MAX));
    } catch {
      // The idea stays as it was.
    } finally {
      setRefining(false);
      areaRef.current?.focus();
    }
  };

  const start = () => {
    if (starting) return;
    if (empty) {
      setTried(true);
      areaRef.current?.focus();
      return;
    }
    if (!canRender) return;
    // Busy until the chat page takes over: this dialog unmounts with the navigation.
    setStarting(true);
    try {
      const chat = createChat(prompt.trim(), { addTo: project.id });
      router.push(`/chat/${chat.id}`);
    } catch {
      setStarting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 pt-2">
      <label htmlFor={fieldId} className="text-md font-medium text-text-primary">
        What should it be?
      </label>
      <textarea
        ref={areaRef}
        id={fieldId}
        value={prompt}
        maxLength={PROMPT_MAX}
        rows={4}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            start();
          }
        }}
        placeholder="e.g. A solar battery pack that charges this desk charger at night"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${errorId} ${costId}` : costId}
        className={cn(
          "w-full resize-y rounded-lg border border-solid bg-bg-surface px-6 py-5 text-md leading-md text-text-primary outline-none placeholder:text-text-tertiary focus-visible:ring-2 focus-visible:ring-border-focus",
          error ? "border-border-error" : "border-border",
        )}
      />
      {error && (
        <p id={errorId} className="text-sm text-text-error">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Button
          type="button"
          hierarchy="ghost"
          size="md"
          onClick={refine}
          disabled={empty || refining}
          iconLeading={<Icon icon={refining ? Refresh01Icon : MagicWand01Icon} size={16} />}
          className="max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]"
        >
          {refining ? "Enhancing…" : "Enhance"}
        </Button>
        <p id={costId} className="text-sm text-text-secondary">
          {canRender
            ? `1 concept · ${CONCEPT_COST} credit${CONCEPT_COST === 1 ? "" : "s"}${creditsHydrated ? ` · you have ${balance}` : ""}`
            : `You need ${CONCEPT_COST} credit to start. You have ${balance}.`}
        </p>
      </div>
      {!canRender && (
        <a href="/history#credits" className="self-start text-md font-medium text-text-brand underline underline-offset-2">
          Top up credits
        </a>
      )}
      <StepFooter onBack={onBack}>
        <Button type="button" hierarchy="primary" size="lg" onClick={start} aria-disabled={!canRender || undefined} disabled={starting}>
          {starting ? "Starting…" : "Start"}
        </Button>
      </StepFooter>
    </div>
  );
}

function BuildManually({
  project,
  gate,
  onBack,
}: {
  project: ManualProject;
  gate: ReturnType<typeof useProjectEditGate>;
  onBack: () => void;
}) {
  const router = useRouter();
  const { addProduct, selectProject } = useManualProjects();
  const [name, setName] = React.useState("");
  const [tried, setTried] = React.useState(false);
  const [refused, setRefused] = React.useState<string | null>(null);
  const [leaving, setLeaving] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const fieldId = React.useId();
  const errorId = React.useId();

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const clean = name.trim();
  const fieldError = clean === "" ? "Give the product a name." : Array.from(clean).length > PROJECT_NAME_MAX ? `Keep it to ${PROJECT_NAME_MAX} characters.` : null;
  const shownError = tried ? fieldError : null;
  const blocked = gate.reasonOf("addProduct") ?? refused;

  const create = () => {
    if (leaving) return;
    if (fieldError) {
      setTried(true);
      inputRef.current?.focus();
      return;
    }
    // A listed project asks to pause its listing first; a running auction or a sale in full refuses.
    const out = gate.guard("addProduct", () => {
      const rowId = addProduct(project.id, clean);
      if (!rowId) return;
      setLeaving(true);
      selectProject(project.id);
      router.push(editorHref(project, rowId, "pcb"));
    });
    setRefused(out.kind === "refused" ? out.reason : null);
  };

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        create();
      }}
      className="flex flex-col gap-4 pt-2"
    >
      <label htmlFor={fieldId} className="text-md font-medium text-text-primary">
        Product name
      </label>
      <TextInput
        ref={inputRef}
        id={fieldId}
        size="lg"
        value={name}
        onValueChange={setName}
        placeholder="e.g. Solar battery pack"
        invalid={Boolean(shownError)}
        aria-invalid={Boolean(shownError) || undefined}
        aria-describedby={shownError ? errorId : undefined}
      />
      {shownError && (
        <p id={errorId} className="text-sm text-text-error">
          {shownError}
        </p>
      )}
      <p className="text-sm text-text-secondary">You can describe it later on its own page.</p>
      {blocked && <p className="text-md text-text-primary">{blocked}</p>}
      <StepFooter onBack={onBack}>
        <Button type="submit" hierarchy="primary" size="lg" disabled={leaving}>
          {leaving ? "Opening…" : "Create product"}
        </Button>
      </StepFooter>
    </form>
  );
}
