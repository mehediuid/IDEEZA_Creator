"use client";

// 11i–11k · Need prompt help?: the web's PromptHelpModal as an M09 sheet —
// "Write your idea" (opened on the product's name and description), Generate
// a prompt (/api/refine in "video" mode; a model that is down answers with the
// one scene sentence, `videoScenePrompt`, so it always returns a prompt), then
// the Refined prompt, editable, with Copy and Regenerate and the "You can edit
// this before rendering" note; Use this prompt writes it into the Video prompt
// and turns Auto generate video off.

import * as React from "react";
import { SparklesIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { Spinner } from "@/components/ideeza/spinner";
import { Textarea } from "@/components/ideeza/text-input";
import { videoScenePrompt } from "@/lib/brief/video-prompt";
import { Sheet } from "../../kit/sheet";
import { cn } from "@/lib/utils";
import { T } from "../../type";

export function PromptHelpSheet({
  open,
  productName,
  productDescription,
  onUse,
  onClose,
}: {
  open: boolean;
  productName: string;
  productDescription: string;
  onUse: (prompt: string) => void;
  onClose: () => void;
}) {
  // Each visit starts from the product's own words.
  const [visit, setVisit] = React.useState(0);
  const close = () => {
    onClose();
    setVisit((v) => v + 1);
  };
  return <PromptHelp key={visit} {...{ open, productName, productDescription, onUse }} onClose={close} />;
}

function PromptHelp({
  open,
  productName,
  productDescription,
  onUse,
  onClose,
}: {
  open: boolean;
  productName: string;
  productDescription: string;
  onUse: (prompt: string) => void;
  onClose: () => void;
}) {
  const ideaId = React.useId();
  const refinedId = React.useId();
  const [idea, setIdea] = React.useState(() => [productName.trim(), productDescription.trim()].filter(Boolean).join(" — "));
  const [refined, setRefined] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const refinedRef = React.useRef<HTMLTextAreaElement>(null);
  // Only the newest run writes the box: a Regenerate pressed while the first is out wins.
  const runRef = React.useRef(0);

  React.useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(t);
  }, [copied]);

  const trimmedIdea = idea.trim();
  const hasResult = refined.trim().length > 0;

  const generate = async () => {
    if (!trimmedIdea || pending) return;
    const run = ++runRef.current;
    setPending(true);
    setCopied(false);
    let result = "";
    try {
      const res = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmedIdea, mode: "video" }),
      });
      if (res.ok) {
        const data = (await res.json()) as { refined?: unknown };
        result = typeof data.refined === "string" ? data.refined.trim() : "";
      }
    } catch {
      result = "";
    }
    if (run !== runRef.current) return;
    setRefined(result || videoScenePrompt(trimmedIdea));
    setPending(false);
  };

  const copy = () => {
    const text = refined.trim();
    if (!text) return;
    const clip = navigator.clipboard;
    if (!clip?.writeText) {
      // No clipboard here (an insecure page): select it so the phone's own Copy works.
      refinedRef.current?.select();
      return;
    }
    clip.writeText(text).then(
      () => setCopied(true),
      () => setCopied(false),
    );
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Turn your idea into a video prompt"
      description="Describe the product in your own words. We rewrite it into a scene the model can render."
      actions={
        <>
          <Button
            size="xl"
            className="w-full"
            disabled={!hasResult || pending}
            onClick={() => {
              const text = refined.trim();
              if (!text) return;
              onUse(text);
              onClose();
            }}
          >
            Use this prompt
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <label htmlFor={ideaId} className={cn(T.label, "text-text-primary")}>
          Write your idea
        </label>
        <Textarea id={ideaId} rows={3} value={idea} onValueChange={setIdea} placeholder="make a gesture and voice controlled electric fan for me" className="resize-none" />
        <p className={T.meta}>One or two lines is enough.</p>
      </div>

      {!hasResult &&
        (pending ? (
          <p role="status" className={cn(T.bodyStrong, "flex min-h-[44px] items-center gap-4")}>
            <Spinner size={20} />
            Generating…
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <Button
              hierarchy="secondary"
              size="xl"
              className="self-start"
              iconLeading={<Icon icon={SparklesIcon} size={20} />}
              disabled={!trimmedIdea}
              onClick={() => void generate()}
            >
              Generate a prompt
            </Button>
            {!trimmedIdea && <p className={T.meta}>Write your idea first.</p>}
          </div>
        ))}

      {hasResult && (
        <>
          <div className="flex flex-col gap-3">
            <label htmlFor={refinedId} className={cn(T.label, "text-text-primary")}>
              Refined prompt
            </label>
            <Textarea ref={refinedRef} id={refinedId} rows={4} value={refined} onValueChange={setRefined} className="resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <Button hierarchy="secondary" size="xl" onClick={copy} aria-label={copied ? "Copied" : "Copy the refined prompt"}>
              <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
            </Button>
            <Button
              hierarchy="secondary"
              size="xl"
              iconLeading={pending ? <Spinner size={20} /> : <Icon icon={SparklesIcon} size={20} />}
              disabled={pending || !trimmedIdea}
              onClick={() => void generate()}
            >
              Regenerate
            </Button>
          </div>
          <Banner tone="info" title="You can edit this before rendering">
            Copy it into the video prompt field, or tweak the wording first.
          </Banner>
        </>
      )}
    </Sheet>
  );
}
