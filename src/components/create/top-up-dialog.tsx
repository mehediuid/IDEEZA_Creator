"use client";

// Top up credits — the one dialog that adds credits. Every place that runs
// short opens it in place: the account popover's Balance, the paused-build
// banner and page, a concept card that can't build, the build gate and the
// Credits card on /history. It never navigates, so the chat or the build
// stays where it was, and a paused build starts by itself once the credits
// cover it (the build simulator watches the balance).
//
// One screen: the balance and what a credit buys, three packs, the balance
// after, one button. Opened from a shortfall, the smallest pack that covers it
// is chosen and the dialog says how many are missing. Then the same frame says
// what was added and, for a paused build, that it starts now.
//
// Payments aren't on yet, so the dialog says the credits are free in this demo
// and never says pay, paid or charged. Each dialog is one order id, so a
// double click or a replayed press adds once (topUpState).

import * as React from "react";
import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge, Button, ModalFrame, Radio } from "@/components/ideeza";
import { BUILD_COST, CONCEPT_COST, buildCost, useCredits } from "@/lib/create/credits";
import { productsOf, useCreateHistory } from "@/lib/create/history";
import { cn } from "@/lib/utils";

/** The packs offered, smallest first. */
export const TOP_UP_PACKS = [20, 50, 100] as const;

/** The smallest pack that covers `short` credits; the largest when none does. */
export function packFor(short: number): number {
  return TOP_UP_PACKS.find((p) => p >= short) ?? TOP_UP_PACKS[TOP_UP_PACKS.length - 1];
}

type OpenArgs = {
  /** What the action waiting on credits costs — a build's price. */
  need?: number;
};

type Ctx = {
  open: (args?: OpenArgs) => void;
  /** A dialog that opened it covers itself while this is open. */
  isOpen: boolean;
};

const TopUpContext = React.createContext<Ctx | null>(null);

export function TopUpProvider({ children }: { children: React.ReactNode }) {
  const [args, setArgs] = React.useState<OpenArgs | null>(null);
  const open = React.useCallback((a: OpenArgs = {}) => setArgs(a), []);
  const value = React.useMemo(() => ({ open, isOpen: args !== null }), [open, args]);
  return (
    <TopUpContext.Provider value={value}>
      {children}
      {args && <TopUpDialog need={args.need} onClose={() => setArgs(null)} />}
    </TopUpContext.Provider>
  );
}

export function useTopUp(): Ctx {
  const ctx = React.useContext(TopUpContext);
  if (!ctx) throw new Error("useTopUp must be used inside <TopUpProvider>");
  return ctx;
}

/** A control that opens Top up credits — a button, styled by the caller. */
export function TopUpButton({
  need,
  className,
  children,
  ...rest
}: { need?: number } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "type">) {
  const { open } = useTopUp();
  return (
    <button type="button" aria-haspopup="dialog" onClick={() => open({ need })} className={className} {...rest}>
      {children}
    </button>
  );
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function newOrderId(): string {
  return `topup_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function TopUpDialog({ need, onClose }: { need?: number; onClose: () => void }) {
  const { hydrated, balance, topUp } = useCredits();
  const { attentionBuilds } = useCreateHistory();
  const short = need !== undefined && hydrated ? Math.max(0, need - balance) : 0;
  const [pick, setPick] = React.useState(() => packFor(short));
  const [orderId] = React.useState(newOrderId);
  const [done, setDone] = React.useState<{ added: number; after: number; paused: string | null } | null>(null);
  const pickRef = React.useRef<HTMLButtonElement | null>(null);
  const doneRef = React.useRef<HTMLButtonElement>(null);
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const groupLabel = React.useId();

  // The paused build this top up is for, read before the credits land: once
  // they cover it the simulator starts it and it leaves the attention list.
  const paused = attentionBuilds.find((a) => a.reason === "credits")?.job ?? null;

  const add = () => {
    if (!hydrated || !topUp(pick, orderId)) return;
    const after = balance + pick;
    let line: string | null = null;
    if (paused) {
      const name = paused.projectChoiceName?.trim() || paused.title;
      const cost = buildCost(productsOf(paused).length);
      line = after >= cost ? `${name} starts now.` : `${name} needs ${cost} credits, ${cost - after} more.`;
    }
    setDone({ added: pick, after, paused: line });
  };

  // The choice is gone once the credits land; Done takes the focus it had.
  React.useEffect(() => {
    if (done) doneRef.current?.focus();
  }, [done]);

  const move = (from: number, dir: 1 | -1) => {
    const next = (from + dir + TOP_UP_PACKS.length) % TOP_UP_PACKS.length;
    setPick(TOP_UP_PACKS[next]);
    refs.current[next]?.focus();
  };

  // One frame for both moments, so focus stays inside it when the body turns
  // from the choice into what was added.
  return (
    <ModalFrame
      open
      onClose={onClose}
      title={done ? "Credits added" : "Top up credits"}
      description={
        done
          ? undefined
          : `Credits pay for AI work. A concept render uses ${CONCEPT_COST}, a product build uses ${BUILD_COST} per product.`
      }
      size="sm"
      initialFocus={pickRef}
      footer={
        done ? (
          <Button ref={doneRef} hierarchy="primary" size="lg" className="ml-auto" onClick={onClose}>
            Done
          </Button>
        ) : (
          <>
            <Button hierarchy="secondary" size="lg" className="ml-auto" onClick={onClose}>
              Cancel
            </Button>
            <Button hierarchy="primary" size="lg" onClick={add} disabled={!hydrated}>
              Add {plural(pick, "credit")}
            </Button>
          </>
        )
      }
    >
      {done ? (
        <div role="status" className="flex items-start gap-[12px]">
          <span aria-hidden className="mt-[2px] shrink-0 text-text-success">
            <Icon icon={CheckmarkCircle02Icon} size={20} />
          </span>
          <div className="flex flex-col gap-[4px]">
            <p className="text-md font-semibold leading-md text-text-primary">
              {plural(done.added, "credit")} added. You now have {plural(done.after, "credit")}.
            </p>
            {done.paused && <p className="text-md leading-md text-text-secondary">{done.paused}</p>}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-[16px]">
          <p className="text-md leading-md text-text-secondary">
            {!hydrated
              ? "Reading your balance…"
              : short > 0
                ? `This needs ${plural(need ?? 0, "credit")}. You have ${balance}, so ${short} more.`
                : `You have ${plural(balance, "credit")}.`}
          </p>

          <div className="flex flex-col gap-[8px]">
            <span id={groupLabel} className="text-md font-semibold leading-md text-text-primary">
              Credits to add
            </span>
            <div role="radiogroup" aria-labelledby={groupLabel} className="flex flex-col gap-[8px]">
              {TOP_UP_PACKS.map((p, i) => {
                const on = p === pick;
                return (
                  <button
                    key={p}
                    ref={(el) => {
                      refs.current[i] = el;
                      if (on) pickRef.current = el;
                    }}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    tabIndex={on ? 0 : -1}
                    onClick={() => setPick(p)}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
                        e.preventDefault();
                        move(i, 1);
                      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
                        e.preventDefault();
                        move(i, -1);
                      }
                    }}
                    className={cn(
                      "flex min-h-[var(--touch-min)] items-center gap-[12px] rounded-lg border border-solid px-[14px] py-[12px] text-left outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus",
                      on ? "border-border-brand bg-bg-brand-subtle" : "border-border bg-bg-surface hover:bg-bg-subtle",
                    )}
                  >
                    <Radio checked={on} decorative size="sm" />
                    <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
                      <span className="text-md font-semibold leading-md tabular-nums text-text-primary">
                        {plural(p, "credit")}
                      </span>
                      <span className="text-sm leading-sm text-text-secondary">
                        {plural(Math.floor(p / BUILD_COST), "product build")} or{" "}
                        {plural(Math.floor(p / CONCEPT_COST), "concept render")}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {hydrated && (
            <p className="text-md leading-md tabular-nums text-text-primary">
              You&apos;ll have {plural(balance + pick, "credit")}.
            </p>
          )}

          <p className="flex flex-wrap items-center gap-x-[8px] gap-y-[4px] text-sm leading-sm text-text-secondary">
            <Badge tone="warning">Demo</Badge>
            Payments aren&apos;t on yet, so these credits are free. No money moves.
          </p>
        </div>
      )}
    </ModalFrame>
  );
}
