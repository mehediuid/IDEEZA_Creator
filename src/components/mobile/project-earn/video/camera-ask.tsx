"use client";

// 11s · Use your camera?: the app asks first, in its own sheet, before the
// phone's own camera prompt — only while the phone hasn't been asked yet (a
// camera already allowed opens straight away; one turned off goes to the
// camera screen's "camera off" state, 11t).

import { Button } from "@/components/ideeza/button";
import { Sheet } from "../../kit/sheet";
import { cn } from "@/lib/utils";
import { T } from "../../type";

/** What the phone says about the camera, without asking: "unknown" where it won't say. */
export async function cameraPermission(): Promise<PermissionState | "unknown"> {
  try {
    const status = await navigator.permissions?.query({ name: "camera" as PermissionName });
    return status?.state ?? "unknown";
  } catch {
    return "unknown";
  }
}

export function CameraAskSheet({ open, onAllow, onClose }: { open: boolean; onAllow: () => void; onClose: () => void }) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Use your camera?"
      actions={
        <>
          <Button size="xl" className="w-full" onClick={onAllow}>
            Allow camera
          </Button>
        </>
      }
    >
      <p className={cn(T.body, "text-text-primary")}>
        IDEEZA needs the camera to record your product. Your clip stays on this phone until you choose to use it.
      </p>
    </Sheet>
  );
}
