"use client";

// 11 · Generate video's form (11p Auto generate video on, 11q nothing to make
// yet, 11r AR picked): the web's VideoForm in the mobile Figma's layout —
// How should it be made? (AR, Recommended · AI) as A08 radio cards; for AI the
// Video prompt (Need prompt help?, Auto generate video) and Audio prompt
// (Auto generate audio, on by default) in DS Textareas with an A10 Toggle row
// under each — a prompt left to AI is read-only and says so; then the
// quality, Low 480p · High 720p (High with the Disruptor plan only). For AR,
// the "Record the real product" note. The values, blockers and words are the
// web's (`VideoFormValue`, `videoFormBlocker`).

import * as React from "react";
import Link from "next/link";
import { Badge } from "@/components/ideeza/badge";
import { Banner } from "@/components/ideeza/banner";
import { Radio } from "@/components/ideeza/checkbox";
import { Textarea } from "@/components/ideeza/text-input";
import { Toggle } from "@/components/ideeza/toggle";
import type { VideoFormValue, VideoMethod, VideoTarget } from "@/components/video-jobs/generate-video-dialog";
import { useCreatePlan } from "@/lib/create/plan";
import { VIDEO_QUALITY, qualityOpen, type VideoQuality } from "@/lib/video/types";
import { HIGH_LOCKED_NOTE } from "@/lib/video/video-copy";
import { cn } from "@/lib/utils";
import { T } from "../../type";

/** A03 Link MD Brand on the kit's 44 px tap area. */
export const TAP_LINK =
  cn(T.rowTitle, "-my-6 inline-flex min-h-[44px] items-center outline-none hover:underline focus-visible:underline text-text-brand");

/** A selection card (Figma: radius/xl, 12 padding and gap, border/default on bg/surface; picked:
 *  border/brand on bg/brand-subtle). */
function ChoiceCard({
  name,
  checked,
  disabled,
  onPick,
  title,
  badge,
  text,
}: {
  name: string;
  checked: boolean;
  disabled?: boolean;
  onPick: () => void;
  title: string;
  badge?: string;
  text: string;
}) {
  return (
    <label
      className={cn(
        "relative flex items-center gap-6 rounded-xl border-[length:var(--border-width-1)] border-solid p-6 transition-colors duration-fast motion-reduce:transition-none",
        checked ? "border-border-brand bg-bg-brand-subtle" : "border-border bg-bg-surface",
        disabled ? "cursor-not-allowed" : "cursor-pointer",
      )}
    >
      <input type="radio" name={name} className="peer sr-only" checked={checked} disabled={disabled} onChange={onPick} />
      <Radio checked={checked} disabled={disabled} decorative className="peer-focus-visible:shadow-focus-brand" />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-center gap-4">
          <span className={cn(T.rowTitle, disabled ? "text-text-secondary" : "text-text-primary")}>{title}</span>
          {badge && <Badge tone="brand">{badge}</Badge>}
        </span>
        <span className={T.meta}>{text}</span>
      </span>
    </label>
  );
}

export function MethodField({ value, onChange }: { value: VideoMethod; onChange: (m: VideoMethod) => void }) {
  const id = React.useId();
  return (
    <div role="radiogroup" aria-labelledby={`${id}-label`} className="flex flex-col gap-4">
      <p id={`${id}-label`} className={T.label}>
        How should it be made?
      </p>
      <ChoiceCard name={`${id}-method`} checked={value === "ar"} onPick={() => onChange("ar")} title="AR" badge="Recommended" text="Record a video of the real product with your phone." />
      <ChoiceCard name={`${id}-method`} checked={value === "ai"} onPick={() => onChange("ai")} title="AI" text="AI makes the video from your prompts." />
    </div>
  );
}

/** A prompt: its label row, the DS Textarea, and the Auto generate row under it. */
function PromptField({
  label,
  action,
  value,
  onValue,
  placeholder,
  auto,
  autoLabel,
  autoPlaceholder,
  onAuto,
  invalid,
  describedBy,
}: {
  label: string;
  action?: React.ReactNode;
  value: string;
  onValue: (v: string) => void;
  placeholder: string;
  auto: boolean;
  autoLabel: string;
  autoPlaceholder: string;
  onAuto: (on: boolean) => void;
  invalid: boolean;
  describedBy?: string;
}) {
  const id = React.useId();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-6">
        <label htmlFor={id} className={T.label}>
          {label}
        </label>
        {action}
      </div>
      <Textarea
        id={id}
        rows={3}
        value={auto ? "" : value}
        onValueChange={onValue}
        disabled={auto}
        placeholder={auto ? autoPlaceholder : placeholder}
        invalid={invalid}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className="resize-none"
      />
      <div className="flex items-center gap-4">
        <span aria-hidden className={cn(T.body, "flex-1 text-text-primary")}>
          {autoLabel}
        </span>
        <Toggle
          checked={auto}
          onChange={() => onAuto(!auto)}
          aria-label={autoLabel}
          className="relative after:absolute after:-inset-y-5 after:inset-x-0 after:content-['']"
        />
      </div>
    </div>
  );
}

export function QualityField({ value, onChange }: { value: VideoQuality; onChange: (q: VideoQuality) => void }) {
  const id = React.useId();
  const { sub } = useCreatePlan();
  const locked = !qualityOpen("high", sub.tier);
  return (
    <div role="radiogroup" aria-labelledby={`${id}-label`} className="flex flex-col gap-4">
      <p id={`${id}-label`} className={T.label}>
        Select video quality · {VIDEO_QUALITY.low.seconds} seconds
      </p>
      {(["low", "high"] as const).map((q) => (
        <ChoiceCard
          key={q}
          name={`${id}-quality`}
          checked={value === q}
          disabled={q === "high" && locked}
          onPick={() => onChange(q)}
          title={VIDEO_QUALITY[q].label}
          badge={q === "high" ? "Disruptor" : undefined}
          text={`${VIDEO_QUALITY[q].seconds} sec · ${VIDEO_QUALITY[q].resolution}`}
        />
      ))}
      {locked && (
        <p className={T.meta}>
          {HIGH_LOCKED_NOTE}{" "}
          <Link href="/m/plans" className={cn(T.caption, "-my-6 inline-flex min-h-[44px] items-center text-text-brand outline-none hover:underline focus-visible:underline")}>
            See plans
          </Link>
        </p>
      )}
    </div>
  );
}

/** The form's body under the method: AI's prompts and quality, or AR's note. */
export function VideoFormFields({
  target,
  value,
  onChange,
  onHelp,
  describedBy,
}: {
  target: VideoTarget;
  value: VideoFormValue;
  onChange: (next: VideoFormValue) => void;
  onHelp: () => void;
  /** The blocker line's id, once the maker has met it. */
  describedBy?: string;
}) {
  return (
    <>
      <MethodField value={value.method} onChange={(method) => onChange({ ...value, method })} />
      {value.method === "ar" ? (
        <Banner tone="info" title="Record the real product">
          Your phone camera records a 10-second clip as you walk around it. The app trims it and adds it as a take.
        </Banner>
      ) : (
        <>
          <PromptField
            label="Video prompt"
            action={
              <button type="button" onClick={onHelp} className={TAP_LINK} aria-haspopup="dialog">
                Need prompt help?
              </button>
            }
            value={value.prompt}
            onValue={(prompt) => onChange({ ...value, prompt })}
            placeholder="Describe the video — the product, the setting, how the camera moves"
            auto={value.autoVideo}
            autoLabel="Auto generate video"
            autoPlaceholder={`AI writes the video from ${target.productName}.`}
            onAuto={(autoVideo) => onChange({ ...value, autoVideo })}
            invalid={!!describedBy && !value.autoVideo && !value.prompt.trim()}
            describedBy={describedBy}
          />
          <PromptField
            label="Audio prompt"
            value={value.audioPrompt}
            onValue={(audioPrompt) => onChange({ ...value, audioPrompt })}
            placeholder="Describe the sound — ambient noise, music mood, speech tone…"
            auto={value.autoAudio}
            autoLabel="Auto generate audio"
            autoPlaceholder="AI picks the ambience, music and speech for each scene."
            onAuto={(autoAudio) => onChange({ ...value, autoAudio })}
            invalid={!!describedBy && !value.autoAudio && !value.audioPrompt.trim()}
            describedBy={describedBy}
          />
          <QualityField value={value.quality} onChange={(quality) => onChange({ ...value, quality })} />
        </>
      )}
    </>
  );
}
