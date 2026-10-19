"use client";

// Credits — a section of Settings › Plan & billing (#credits): the balance,
// the credits you have as lots (each with when it came and when it expires,
// lib/create/credit-lots), and where they went, by project, this month or in
// all (lib/account/credit-spend). Credit history opens every lot, spent and
// expired ones too ("Credit History", Figma 41549:172078).

import * as React from "react";
import { Button, ModalFrame, Segmented } from "@/components/ideeza";
import { SettingsCard, SettingsRow } from "@/components/settings/settings-card";
import { spendByProject, totalOf } from "@/lib/account/credit-spend";
import { monthBounds } from "@/lib/create/credit-limits";
import { lotsOf, type Lot } from "@/lib/create/credit-lots";
import { PLAN_SECTIONS, usd } from "@/lib/create/credit-pricing";
import { BUILD_COST, CONCEPT_COST, useCredits, type CreditEntry } from "@/lib/create/credits";
import { useCreateHistory } from "@/lib/create/history";
import { useManualProjects } from "@/lib/manual/projects";
import { useDates } from "@/lib/settings/use-dates";
import { cn } from "@/lib/utils";
import { RowValue } from "./your-plan";

const n = (v: number) => v.toLocaleString("en-US");
const credits = (v: number) => `${n(v)} ${v === 1 ? "credit" : "credits"}`;
const times = (v: number, one: string, many: string) => `${n(v)} ${v === 1 ? one : many}`;

/** "Pro pack", "Custom credit", "Starting balance", "Plan credits", "Top up". */
function lotName(e: CreditEntry | undefined): string {
  if (!e) return "Credits";
  if (e.reason === "purchase") return e.pack ? `${e.pack} pack` : "Custom credit";
  if (e.reason === "seed") return "Starting balance";
  if (e.reason === "grant") return "Plan credits";
  return "Top up";
}

const SUBHEAD = "m-0 mt-[16px] text-md font-semibold leading-md text-text-primary";

type Range = "month" | "all";

export function CreditsCard() {
  const { hydrated, balance, ledger } = useCredits();
  const { chats, builds } = useCreateHistory();
  const { projects } = useManualProjects();
  const { date } = useDates();
  const [history, setHistory] = React.useState(false);
  const [range, setRange] = React.useState<Range>("month");
  const [now] = React.useState(() => Date.now());

  const byId = React.useMemo(() => new Map(ledger.map((e) => [e.id, e])), [ledger]);
  const live = React.useMemo(
    () => lotsOf(ledger).filter((l) => l.remaining > 0 && (l.expiresAt === null || l.expiresAt > now)),
    [ledger, now],
  );
  const spend = React.useMemo(() => {
    const { start, end } = monthBounds(now);
    return spendByProject({ ledger, builds, chats, projects, ...(range === "month" ? { since: start, until: end } : {}) });
  }, [ledger, builds, chats, projects, range, now]);
  const spent = totalOf(spend);

  return (
    <SettingsCard
      id={PLAN_SECTIONS.credits}
      title="Credits"
      description={`AI work spends them: ${credits(CONCEPT_COST)} for a concept drawing, ${credits(BUILD_COST)} for each product in a build. The credits that expire first are spent first.`}
      action={
        <Button hierarchy="secondary" size="sm" aria-haspopup="dialog" className="[@media(pointer:coarse)]:h-[var(--touch-min)]" onClick={() => setHistory(true)}>
          Credit history
        </Button>
      }
    >
      <SettingsRow
        label="Balance"
        help={hydrated ? <a href={`#${PLAN_SECTIONS.buy}`} className={LINK}>Buy credits</a> : "Reading your credits…"}
        control={<span className="text-lg font-semibold leading-lg tabular-nums text-text-primary">{hydrated ? credits(balance) : "—"}</span>}
      />

      <h3 className={SUBHEAD}>Credits you have</h3>
      {hydrated && live.length === 0 ? (
        <p className="m-0 py-[12px] text-md leading-md text-text-secondary">None left. Buy credits below to keep building.</p>
      ) : (
        live.map((l) => <LotRow key={l.id} lot={l} entry={byId.get(l.id)} date={date} />)
      )}

      <div className="mt-[16px] flex flex-wrap items-center justify-between gap-[8px]">
        <h3 className={cn(SUBHEAD, "mt-0")}>
          Where they went{hydrated && spent > 0 ? ` · ${credits(spent)}` : ""}
        </h3>
        <Segmented
          label="Spent in"
          size="sm"
          value={range}
          onChange={setRange}
          options={[
            { value: "month", label: "This month" },
            { value: "all", label: "All time" },
          ]}
        />
      </div>
      {hydrated && spend.length === 0 ? (
        <p className="m-0 py-[12px] text-md leading-md text-text-secondary">
          {range === "month" ? "Nothing spent this month." : "Nothing spent yet."} A concept drawing or a build shows up here under its project.
        </p>
      ) : (
        spend.map((r) => (
          <SettingsRow
            key={r.key}
            label={r.name}
            href={r.href ?? undefined}
            help={[
              credits(r.credits),
              ...(r.builds ? [times(r.builds, "build", "builds")] : []),
              ...(r.drawings ? [times(r.drawings, "drawing", "drawings")] : []),
              ...(r.href && !r.saved ? ["not a project yet"] : []),
            ].join(" · ")}
          />
        ))
      )}

      {history && <CreditHistoryDialog onClose={() => setHistory(false)} />}
    </SettingsCard>
  );
}

const LINK =
  "rounded-sm font-medium text-text-link outline-none hover:text-text-link-hover hover:underline focus-visible:ring-2 focus-visible:ring-border-focus";

function LotRow({ lot, entry, date }: { lot: Lot; entry: CreditEntry | undefined; date: (ts: number) => string }) {
  return (
    <SettingsRow
      label={lotName(entry)}
      help={`Added ${date(lot.ts)} · ${lot.expiresAt === null ? "never expires" : `expires ${date(lot.expiresAt)}`}`}
      control={<RowValue>{n(lot.remaining)} left</RowValue>}
    />
  );
}

function CreditHistoryDialog({ onClose }: { onClose: () => void }) {
  const { ledger } = useCredits();
  const { date } = useDates();
  const byId = new Map(ledger.map((e) => [e.id, e]));
  const lots = lotsOf(ledger).slice().reverse();
  const [now] = React.useState(() => Date.now());
  return (
    <ModalFrame open onClose={onClose} title="Credit history" description="Every lot of credits: what came in, what's left and when it expires." size="lg">
      {lots.length === 0 ? (
        <p className="text-md leading-md text-text-secondary">No credits yet.</p>
      ) : (
        <div className="relative overflow-x-auto rounded-xl border border-solid border-border">
          <table className="w-full min-w-[680px] border-collapse text-left text-md leading-md">
            <thead className="bg-bg-subtle text-text-primary">
              <tr>
                {["Type", "Added", "Base credits", "Bonus", "Remaining", "Expires", "Price"].map((h) => (
                  <th key={h} scope="col" className="px-[16px] py-[12px] font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lots.map((l) => {
                const e = byId.get(l.id);
                const expired = l.expiresAt !== null && l.expiresAt <= now;
                return (
                  <tr key={l.id} className="border-t border-solid border-border">
                    <th scope="row" className="px-[16px] py-[12px] font-regular text-text-primary">
                      {lotName(e)}
                    </th>
                    <td className="px-[16px] py-[12px] tabular-nums text-text-primary">{date(l.ts)}</td>
                    <td className="px-[16px] py-[12px] tabular-nums text-text-primary">{n(l.amount - l.bonus)}</td>
                    <td className="px-[16px] py-[12px] tabular-nums text-text-primary">{l.bonus > 0 ? `+${l.bonus}` : "-"}</td>
                    <td className="px-[16px] py-[12px] tabular-nums text-text-primary">{n(l.remaining)}</td>
                    <td className={cn("px-[16px] py-[12px] tabular-nums", expired ? "text-text-tertiary" : "text-text-primary")}>
                      {l.expiresAt === null ? "Never" : `${expired ? "Expired " : ""}${date(l.expiresAt)}`}
                    </td>
                    <td className="px-[16px] py-[12px] tabular-nums text-text-primary">{e?.price !== undefined ? usd(e.price) : "Free"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </ModalFrame>
  );
}
