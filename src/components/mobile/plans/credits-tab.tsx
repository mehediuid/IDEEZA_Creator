"use client";

// Plan & pricing › Credits (mobile Figma "v2 · AI Credits / Purchase"), as
// a phone purchase screen: the current balance first (→ Current credit),
// your plan's credit discount (or "Unlock up to 35% off" → Upgrade to
// unlock), the web's three packs at that discount and a custom amount at
// the flat rate as one pick-one list, and Purchase in the Bottom action bar
// (→ the checkout; a custom amount offers the cheaper pack first when one
// gives more for no more: Better deal available). Compare credit discounts
// and Credit alerts and limits are rows under the list.

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlarmClockIcon, ArrowRight01Icon, DiscountTag01Icon, PercentSquareIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { TextInput } from "@/components/ideeza/text-input";
import { CREDIT_PACKS, CUSTOM_MIN, CUSTOM_RATE, MAX_DISCOUNT, VALIDITY_MONTHS, betterDeal, customAmountError, customPrice, packPrice, usd } from "@/lib/create/credit-pricing";
import { useCredits } from "@/lib/create/credits";
import { useCreatePlan, useCreditDiscount } from "@/lib/create/plan";
import { cn } from "@/lib/utils";
import { useSettings } from "@/lib/settings/use-settings";
import { BottomBar } from "../kit/bottom-bar";
import { ListCard, ListRow } from "../kit/list";
import { T } from "../type";
import { BetterDealSheet, DiscountsSheet, UpgradeUnlockSheet } from "./credit-sheets";
import { PlanFoot, RadioCard, n, pct } from "./parts";

const CUSTOM = "custom";

export function CreditsTab() {
  const router = useRouter();
  const { hydrated, balance } = useCredits();
  const { plan } = useCreatePlan();
  const discount = useCreditDiscount();
  const alerts = useSettings().credits;
  const [compare, setCompare] = React.useState(false);
  const [unlock, setUnlock] = React.useState(false);
  const [pick, setPick] = React.useState<string>(() => CREDIT_PACKS.find((p) => p.popular)?.id ?? CREDIT_PACKS[0].id);
  const [text, setText] = React.useState("");
  const [touched, setTouched] = React.useState(false);
  const [offer, setOffer] = React.useState(false);
  const inputId = React.useId();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const custom = pick === CUSTOM;
  const credits = Number(text);
  const error = text === "" ? null : customAmountError(credits);
  const valid = text !== "" && !error;
  const customCost = customPrice(valid ? credits : 0, discount);
  const deal = valid ? betterDeal(credits, discount) : null;
  const pack = CREDIT_PACKS.find((p) => p.id === pick) ?? null;
  const packCost = pack ? packPrice(pack, discount) : null;
  const goCustom = () => valid && router.push(`/m/plans/checkout?credits=${credits}`);

  const purchase = () => {
    if (pack) return router.push(`/m/plans/checkout?pack=${pack.id}`);
    setTouched(true);
    if (!valid) return inputRef.current?.focus();
    if (deal) setOffer(true);
    else goCustom();
  };

  return (
    <div className="flex flex-col gap-10">
      <button
        type="button"
        onClick={() => router.push("/m/plans/credits")}
        aria-label={hydrated ? `Current balance: ${n(balance)} credits. Open Current credit` : "Current balance"}
        className="flex flex-col items-center gap-2 rounded-xl pb-2 pt-4 text-center outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus active:bg-bg-subtle"
      >
        <span className={T.body}>Current balance</span>
        <span className="flex items-center gap-2">
          <span className={T.amountHero}>{hydrated ? `${n(balance)} credits` : "…"}</span>
          <span aria-hidden className="text-[color:var(--color-icon-default)]">
            <Icon icon={ArrowRight01Icon} size={24} />
          </span>
        </span>
        <span className={T.meta}>Power your creativity with {VALIDITY_MONTHS}-month validity.</span>
      </button>

      <ListCard label="Your credit discount">
        {discount > 0 ? (
          <ListRow icon={DiscountTag01Icon} title={`Your ${plan.name} discount`} meta={`You’re saving ${pct(discount)} with your ${plan.name} plan`} trailing={<Badge tone="success">{pct(discount)} OFF</Badge>} />
        ) : (
          <ListRow icon={DiscountTag01Icon} title={`No credit discount on ${plan.name}`} meta={`Unlock up to ${pct(MAX_DISCOUNT)} off`} onClick={() => setUnlock(true)} />
        )}
      </ListCard>

      <section aria-labelledby="buy-credits" className="flex flex-col gap-4">
        <h2 id="buy-credits" className={T.section}>
          Purchase AI credits
        </h2>
        <ul role="radiogroup" aria-labelledby="buy-credits" className="flex flex-col gap-4">
          {CREDIT_PACKS.map((p, i) => {
            const cost = packPrice(p, discount);
            return (
              <RadioCard
                key={p.id}
                checked={pick === p.id}
                onSelect={() => setPick(p.id)}
                label={`${p.name} pack, ${n(p.base + p.bonus)} credits for ${usd(cost.final)}`}
              >
                <span className="flex items-start justify-between gap-4">
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span className={T.section}>{p.name}</span>
                      {p.popular && <Badge tone="brand-solid">Most popular</Badge>}
                    </span>
                    <span className={cn(T.meta, "tabular-nums")}>
                      {n(p.base)} base credits
                      {p.bonus > 0 && <span className="text-text-success"> +{n(p.bonus)} bonus</span>}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className={cn(T.section, "tabular-nums")}>{usd(cost.final)}</span>
                    {cost.saved > 0 && <s className={cn(T.meta, "tabular-nums text-text-tertiary")}>{usd(cost.base)}</s>}
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-3">
                  <span className={cn(T.rowTitle, "tabular-nums")}>Total credit {n(p.base + p.bonus)}</span>
                  {i === 0 && <TestnetDemoBadge />}
                </span>
              </RadioCard>
            );
          })}
          <RadioCard
            checked={custom}
            onSelect={() => {
              setPick(CUSTOM);
              window.setTimeout(() => inputRef.current?.focus(), 0);
            }}
            label="Custom amount"
            below={
              custom ? (
                <>
                  <label htmlFor={inputId} className="sr-only">
                    Custom amount in credits
                  </label>
                  <TextInput
                    ref={inputRef}
                    id={inputId}
                    size="xl"
                    inputMode="numeric"
                    value={text}
                    onValueChange={(v) => {
                      setText(v.replace(/[^\d]/g, ""));
                      setTouched(false);
                    }}
                    onBlur={() => setTouched(true)}
                    placeholder={`Enter amount… (min ${CUSTOM_MIN})`}
                    invalid={!!error && touched}
                    aria-describedby={`${inputId}-help`}
                  />
                  <p id={`${inputId}-help`} className={cn(T.caption, error && touched ? "text-text-error" : "text-text-tertiary")}>
                    {error && touched ? error : !valid ? `Enter at least ${CUSTOM_MIN} credits to buy a custom amount.` : `${usd(customCost.final)}${discount > 0 ? ` · your discount −${usd(customCost.saved)}` : ""}`}
                  </p>
                </>
              ) : undefined
            }
          >
            <span className="flex items-start justify-between gap-4">
              <span className="flex min-w-0 flex-col gap-1">
                <span className={T.section}>Custom amount</span>
                <span className={T.meta}>Rate: {usd(CUSTOM_RATE)} / credit</span>
              </span>
              {custom && valid && <span className={cn(T.section, "shrink-0 tabular-nums")}>{usd(customCost.final)}</span>}
            </span>
          </RadioCard>
        </ul>
      </section>

      <ListCard label="More about credits">
        <ListRow
          icon={PercentSquareIcon}
          title="Compare credit discounts"
          meta={discount > 0 ? `You’re saving ${pct(discount)} with your ${plan.name} plan` : `Save up to ${pct(MAX_DISCOUNT)} with an IDEEZA plan`}
          onClick={() => setCompare(true)}
        />
      </ListCard>

      <div id="credit-alerts" className="scroll-mt-8">
        <ListCard label="Credit alerts and limits">
          <ListRow
            href="/m/settings/credit-alerts"
            icon={AlarmClockIcon}
            title="Credit alerts and limits"
            meta={`Running low at ${n(alerts.lowAt)} · ${alerts.monthlyCap === null ? "no monthly limit" : `${n(alerts.monthlyCap)} a month`} · auto top-up ${alerts.autoTopUp.on ? "on" : "off"}`}
          />
        </ListCard>
      </div>

      <PlanFoot>
        <BottomBar>
          <Button size="xl" className="w-full" disabled={custom && text !== "" && !valid && touched} onClick={purchase}>
            {pack && packCost ? `Purchase now · ${usd(packCost.final)}` : valid ? `Purchase credits · ${usd(customCost.final)}` : "Purchase credits"}
          </Button>
        </BottomBar>
      </PlanFoot>

      <DiscountsSheet open={compare} onClose={() => setCompare(false)} />
      <UpgradeUnlockSheet open={unlock} onClose={() => setUnlock(false)} />
      {deal && <BetterDealSheet open={offer} onClose={() => setOffer(false)} deal={deal} credits={credits} customPrice={customCost.final} discount={discount} onCustom={goCustom} />}
    </div>
  );
}
