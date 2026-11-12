"use client";

// 11f · Review your storyboard: the web's StoryboardEditor in the mobile
// Figma's layout — the three scenes (0–3s · 3–6s · 6–10s) as cards, the first
// open, each with Visual description, Background audio, Music cue and Speech /
// dialogue in DS Textareas, every field editable (at most 400 characters).

import * as React from "react";
import { ArrowDown01Icon, ArrowUp01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Textarea } from "@/components/ideeza/text-input";
import { SCENE_FIELD_MAX, SCENE_SPANS, type Scene, type Storyboard } from "@/lib/video/storyboard";
import { cn } from "@/lib/utils";
import { T } from "../../type";

export function StoryboardEditor({ storyboard, onChange }: { storyboard: Storyboard; onChange: (next: Storyboard) => void }) {
  const id = React.useId();
  const [open, setOpen] = React.useState<boolean[]>([true, false, false]);
  const set = (i: number, key: keyof Scene, text: string) => {
    const scenes = storyboard.scenes.map((s, j) => (j === i ? { ...s, [key]: text.slice(0, SCENE_FIELD_MAX) } : s)) as Storyboard["scenes"];
    onChange({ ...storyboard, scenes });
  };
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h2 className={T.section}>Review your storyboard</h2>
        <p className={T.meta}>
          {storyboard.by === "ai"
            ? "AI drafted 3 scenes · Edit freely before generating"
            : "Drafted from your product and prompts — the AI didn't answer · Edit freely before generating"}
        </p>
      </div>
      <ul className="flex flex-col gap-6">
        {storyboard.scenes.map((scene, i) => {
          const panel = `${id}-scene-${i}`;
          const isOpen = open[i];
          return (
            <li key={i} className="overflow-hidden rounded-xl border-[length:var(--border-width-1)] border-solid border-border bg-bg-surface">
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panel}
                onClick={() => setOpen((o) => o.map((v, j) => (j === i ? !v : v)))}
                className="flex min-h-[48px] w-full items-center justify-between gap-4 px-6 py-5 text-left outline-none focus-visible:bg-bg-subtle"
              >
                <span className={T.rowTitle}>
                  Scene {i + 1} · {SCENE_SPANS[i]}
                </span>
                <Icon icon={isOpen ? ArrowUp01Icon : ArrowDown01Icon} size={20} className="text-[color:var(--color-icon-default)]" />
              </button>
              {isOpen && (
                <div id={panel} className="flex flex-col gap-8 px-6 pb-6">
                  <SceneField label="Visual description" rows={3} value={scene.visual} onValue={(t) => set(i, "visual", t)} />
                  <SceneField label="Background audio" rows={2} value={scene.background} onValue={(t) => set(i, "background", t)} />
                  <SceneField label="Music cue" rows={2} value={scene.music} onValue={(t) => set(i, "music", t)} placeholder="No music in this scene…" />
                  <SceneField label="Speech / dialogue" rows={2} value={scene.speech} onValue={(t) => set(i, "speech", t)} placeholder="No speech in this scene…" />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SceneField({ label, rows, value, onValue, placeholder }: { label: string; rows: number; value: string; onValue: (t: string) => void; placeholder?: string }) {
  const id = React.useId();
  return (
    <div className="flex flex-col gap-3">
      <label htmlFor={id} className={cn(T.label, "text-text-primary")}>
        {label}
      </label>
      <Textarea id={id} rows={rows} value={value} onValueChange={onValue} placeholder={placeholder} maxLength={SCENE_FIELD_MAX} className="resize-none" />
    </div>
  );
}
