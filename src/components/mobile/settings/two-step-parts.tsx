"use client";

// Prototype only: the authenticator app 2-step sign-in reads its codes from.
// On a phone, "Open app" opens the person's own app (Google Authenticator,
// 1Password…) with the key filled in; the prototype has none, so a Demo sheet
// shows what the app would — the same RFC 6238 code, which changes every 30
// seconds — with Use this code, as the Demo email does for the email codes.
// A real authenticator given the setup key shows the very same code.

import * as React from "react";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { totpAt, totpSecondsLeft } from "@/lib/account/security";
import { Sheet } from "../kit/sheet";
import { cn } from "@/lib/utils";
import { T } from "../type";

/** The code `secret` shows now, and the seconds until it changes. */
export function useLiveCode(secret: string | null, on: boolean): { code: string; left: number } {
  const [state, setState] = React.useState({ code: "", left: 0 });
  React.useEffect(() => {
    if (!on || !secret) return;
    let alive = true;
    const tick = () => {
      const now = Date.now();
      void totpAt(secret, now).then((code) => alive && setState({ code, left: totpSecondsLeft(now) }));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [secret, on]);
  return state;
}

export function DemoAuthenticator({
  open,
  onClose,
  secret,
  email,
  onUse,
}: {
  open: boolean;
  onClose: () => void;
  secret: string | null;
  email: string;
  onUse: (code: string) => void;
}) {
  const { code, left } = useLiveCode(secret, open);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Demo authenticator"
      description="What your authenticator app would show. A real phone opens the app itself."
      actions={
        <Button size="xl" className="w-full" disabled={!code} onClick={() => onUse(code)}>
          Use this code
        </Button>
      }
    >
      <Badge tone="warning" className="self-start">
        Demo
      </Badge>
      <div className="flex flex-col gap-2 rounded-xl border-[length:var(--border-width-1)] border-solid border-border-subtle bg-bg-surface-raised p-8">
        <p className={cn(T.meta, "text-text-tertiary")}>IDEEZA · {email}</p>
        <p className={cn(T.display, "tracking-widest tabular-nums")}>
          {code ? `${code.slice(0, 3)} ${code.slice(3)}` : "··· ···"}
        </p>
        <p className={cn(T.meta, "tabular-nums")}>{code ? `Changes in ${left} s` : "Making the code…"}</p>
      </div>
    </Sheet>
  );
}
