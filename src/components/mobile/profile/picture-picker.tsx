"use client";

// PR-33 · the photo / cover sheet: Take photo · Choose from library · Remove,
// behind the kit's camera and photos pre-prompts (KIT-PM-01 / PM-02, once per
// phone). The picture is resized on the phone before it is handed back, as
// the web does (lib/people/photo-store.ts). Edit profile opens it for both
// pictures; your profile's Add / Change cover opens it for the cover.

import * as React from "react";
import { Camera01Icon, Delete02Icon, Image01Icon } from "@hugeicons/core-free-icons";
import { resizeCover, resizePhoto } from "@/lib/people/photo-store";
import { usePrePrompt } from "../kit/permission-sheet";
import { ActionSheet } from "../kit/sheet";

export type PictureKind = "photo" | "cover";

export const PICTURE_FILE_ERROR = "Choose a JPG or PNG image under 10 MB.";

export function usePicturePicker({
  has,
  onPick,
  onRemove,
  onBadFile,
}: {
  /** Whether there is a picture of your own to remove. */
  has: Partial<Record<PictureKind, boolean>>;
  onPick: (what: PictureKind, blob: Blob) => void;
  onRemove: (what: PictureKind) => void;
  /** The file wasn't an image this phone can read, or is too large. */
  onBadFile: (what: PictureKind) => void;
}): { open: (what: PictureKind) => void; sheets: React.ReactNode } {
  const [menu, setMenu] = React.useState<PictureKind | null>(null);
  // The sheet keeps its words while it slides away.
  const [last, setLast] = React.useState<PictureKind>("photo");
  const cameraRef = React.useRef<HTMLInputElement>(null);
  const photosRef = React.useRef<HTMLInputElement>(null);
  const picking = React.useRef<PictureKind>("photo");
  const camera = usePrePrompt("camera", { body: "To take your profile photo and cover." });
  const photos = usePrePrompt("photos");

  const open = React.useCallback((what: PictureKind) => {
    setLast(what);
    setMenu(what);
  }, []);
  const pick = (from: "camera" | "photos", what: PictureKind) => {
    (from === "camera" ? camera : photos).ask(() => {
      picking.current = what;
      (from === "camera" ? cameraRef : photosRef).current?.click();
    });
  };
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const what = picking.current;
    const blob = what === "photo" ? await resizePhoto(file) : await resizeCover(file);
    if (blob) onPick(what, blob);
    else onBadFile(what);
  };

  const sheets = (
    <>
      <ActionSheet
        open={menu !== null}
        onClose={() => setMenu(null)}
        title={last === "cover" ? "Cover photo" : "Profile photo"}
        items={[
          { label: "Take photo", icon: Camera01Icon, onSelect: () => pick("camera", last) },
          { label: "Choose from library", icon: Image01Icon, onSelect: () => pick("photos", last) },
          ...(has[last]
            ? [{ label: last === "cover" ? "Remove cover" : "Remove photo", icon: Delete02Icon, destructive: true, onSelect: () => onRemove(last) }]
            : []),
        ]}
      />
      {camera.sheet}
      {photos.sheet}
      <input ref={cameraRef} type="file" accept="image/*" capture="user" className="sr-only" tabIndex={-1} aria-hidden onChange={onFile} />
      <input ref={photosRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden onChange={onFile} />
    </>
  );
  return { open, sheets };
}
