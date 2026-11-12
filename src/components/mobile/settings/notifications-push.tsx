"use client";

// Settings › Notifications › Push notifications (ST-20, ST-20b, ST-20c). On the
// phone, push is the browser's own notification permission (the web's "Pop-ups
// outside this tab", components/notifications/browser-popups.ts):
// · Allowed: on. Only the phone can take it back, so the switch says where.
// · Not asked yet: off; turning it on shows the kit's pre-prompt (PM-04) and
//   Continue asks the browser.
// · Blocked: "Off · Blocked in your phone's settings" and "Open phone
//   settings", a sheet with the way to allow it; it closes by itself once the
//   phone allows it.
// · No support (iOS Safari in a tab): off, with the reason.

import * as React from "react";
import { requestPopups } from "@/components/notifications/browser-popups";
import { Button } from "@/components/ideeza/button";
import type { PopupMode } from "@/lib/notifications/filter";
import type { PopupPermission } from "@/lib/notifications/popups";
import { Sheet } from "../kit/sheet";
import { cn } from "@/lib/utils";
import { TEXT_LINK } from "../kit/bottom-bar";
import { T } from "../type";
import { useToast } from "../kit/toast";
import { SettingsRow } from "./kit";

/** What the phone does with push while it is allowed but pop-ups aren't right away (the web's words). */
const HELD: Record<PopupMode, string> = {
  now: "",
  daily: " Once a day, only the summary pops up.",
  paused: " Nothing pops up while pop-ups are paused.",
};

export function PushRow({
  permission,
  mode,
  disabled,
  onAsk,
  onBlocked,
}: {
  permission: PopupPermission | null;
  mode: PopupMode;
  disabled: boolean;
  onAsk: () => void;
  onBlocked: () => void;
}) {
  const label = "Push notifications";
  if (permission === "granted") {
    return (
      <SettingsRow
        id="browser-popups"
        label={label}
        toggle={{ checked: true, onChange: () => {} }}
        disabled
        reason={`On. To turn them off, use your phone’s settings.${HELD[mode]}`}
      />
    );
  }
  if (permission === "denied") {
    return (
      <SettingsRow
        id="browser-popups"
        label={label}
        helper="Blocked in your phone’s settings"
        value="Off"
        onClick={onBlocked}
        disabled={disabled}
      />
    );
  }
  if (permission === "unsupported") {
    return (
      <SettingsRow
        id="browser-popups"
        label={label}
        value="Off"
        disabled
        reason="This browser can’t show them. Builds and Blog reviews still pop up in the app."
      />
    );
  }
  return <SettingsRow id="browser-popups" label={label} toggle={{ checked: false, onChange: onAsk }} disabled={disabled || permission === null} />;
}

/** ST-20b: the A03 link under the card while push is blocked. */
export function PhoneSettingsLink({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <div className="-mt-2 flex">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cn(TEXT_LINK, "my-0 disabled:cursor-not-allowed disabled:text-text-disabled disabled:no-underline")}
      >
        Open phone settings
      </button>
    </div>
  );
}

/** ST-20c, kit PM-04: asked before the browser's own prompt, which only comes once. */
export function PushPrompt({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [asking, setAsking] = React.useState(false);
  const ask = async () => {
    setAsking(true);
    const answer = await requestPopups();
    setAsking(false);
    onClose();
    if (answer === "granted") toast({ title: "Push notifications on" });
  };
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Know when your build is ready"
      actions={
        <>
          <Button size="xl" className="w-full" loading={asking} onClick={ask}>
            Continue
          </Button>
          <Button hierarchy="secondary" size="xl" className="w-full" disabled={asking} onClick={onClose}>
            Not now
          </Button>
        </>
      }
    >
      <p className={T.body}>We’ll also tell you about messages and sales. Change it in Settings › Notifications.</p>
    </Sheet>
  );
}

/** ST-20b's "Open phone settings": a web app can't open them, so the sheet says where the switch is.
 *  The permission is read again when the phone comes back to the app; once it isn't blocked, the
 *  sheet closes. */
export function PushBlockedSheet({ open, onClose, permission }: { open: boolean; onClose: () => void; permission: PopupPermission | null }) {
  const toast = useToast();
  React.useEffect(() => {
    if (!open || permission === "denied" || permission === null) return;
    onClose();
    if (permission === "granted") toast({ title: "Push notifications on" });
  }, [open, permission, onClose, toast]);
  return (
    <Sheet open={open} onClose={onClose} title="Allow notifications" description="Blocked in this browser. To allow them:">
      <ol className={cn(T.body, "flex list-decimal flex-col gap-4 pl-8 text-text-primary")}>
        <li>Open the site settings beside the address bar (in an installed app, your phone’s Settings › Apps › IDEEZA).</li>
        <li>Choose Notifications, then Allow.</li>
        <li>Come back to IDEEZA: Push notifications reads On.</li>
      </ol>
    </Sheet>
  );
}
