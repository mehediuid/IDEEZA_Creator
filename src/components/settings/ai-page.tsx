"use client";

// /settings/ai (the landing's "AI Properties" tile; spec §5.9). "Where your
// AI requests go" says what this deployment really does: the route reads its
// keys (image-gen.ts activeProvider, three/providers.ts activeProvider), the
// text routes all call Pollinations' keyless text model. Two switches: the
// volunteer GPU pool for images (off: image requests carry `pool: "off"` and
// are never sent to the AI Horde; without another image service they are
// refused, and the card says why), and AI help in the editors (off hides the
// Code editor's AI chat and the 3D editor's AI Generate).

import * as React from "react";
import { Toggle } from "@/components/ideeza";
import { updateSettings, type SettingsV1 } from "@/lib/settings/prefs";
import { useSettings } from "@/lib/settings/use-settings";
import { SAVE_FAILED, SettingsCard, SettingsRow } from "./settings-card";
import { SettingsFrame } from "./settings-frame";

/** A 44 px touch target round the 24 px switch on phones (its hit area, not its look). */
const TOGGLE_TAP = "max-md:after:absolute max-md:after:-inset-[10px] max-md:after:content-['']";

export function AiPage({ images, threeD }: { images: "aihorde" | "pollinations"; threeD: "meshy" | "demo" }) {
  const { ai } = useSettings();
  const [failed, setFailed] = React.useState(false);
  const save = (patch: Partial<SettingsV1["ai"]>) => setFailed(!updateSettings("ai", patch));
  const horde = images === "aihorde";

  return (
    <SettingsFrame page="ai">
      {failed && (
        <p role="alert" className="m-0 text-md leading-md text-text-error">
          {SAVE_FAILED}
        </p>
      )}

      <SettingsCard
        id="where"
        title="Where your AI requests go"
        description="What you type for the AI leaves this browser for these services. Finished images and models are kept by IDEEZA."
      >
        <SettingsRow
          id="where-text"
          label="Text"
          help="Pollinations' free text model (text.pollinations.ai), with no account. It gets your prompt and what it needs to answer: concept summaries, companion products, the editors' assistants, business plans, Auto-Map and headlines."
        />
        <SettingsRow
          id="where-images"
          label="Images"
          help={
            horde
              ? "AI Horde (stablehorde.net), a pool of GPUs that volunteers run, with its shared anonymous key. It gets the image prompt for concepts and for the 3D editor's AI Generate."
              : "Pollinations (image.pollinations.ai), on this app's own account. It gets the image prompt for concepts and for the 3D editor's AI Generate."
          }
        />
        <SettingsRow
          id="where-3d"
          label="3D models"
          help={
            threeD === "meshy"
              ? "Meshy, which turns a concept image into a 3D model. It gets the concept image."
              : "None set up here: AI Generate shows a sample model, so only its concept image is made (see Images)."
          }
        />
      </SettingsCard>

      <SettingsCard id="choices" title="Your choices">
        <SettingsRow
          id="volunteer-pool"
          label="Use the volunteer GPU pool for images"
          help={
            !horde
              ? undefined
              : ai.volunteerPool
                ? "Concept images and the 3D editor's AI Generate are drawn by AI Horde volunteers."
                : "Images are off: nothing goes to the volunteer pool, and this app has no other image service. Concepts can't be drawn until you switch it back on."
          }
          disabled={!horde}
          reason="This app draws images with Pollinations, not the volunteer pool."
          control={
            horde ? (
              <Toggle
                className={TOGGLE_TAP}
                checked={ai.volunteerPool}
                aria-label="Use the volunteer GPU pool for images"
                onChange={() => save({ volunteerPool: !ai.volunteerPool })}
              />
            ) : undefined
          }
        />
        <SettingsRow
          id="editor-assist"
          label="AI help in the editors"
          help="The AI chat in the Code editor and AI Generate in the 3D editor. Off hides both."
          control={
            <Toggle
              className={TOGGLE_TAP}
              checked={ai.editorAssist}
              aria-label="AI help in the editors"
              onChange={() => save({ editorAssist: !ai.editorAssist })}
            />
          }
        />
      </SettingsCard>
    </SettingsFrame>
  );
}
