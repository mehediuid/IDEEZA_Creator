"use client";

// Campaign History (Figma "Refer & Earn" 229289, Date range 229327): every
// campaign's referrals, one row each (who, the campaign, what they bought,
// the points, Claimed / Not Claimed) opening its sheet with every field;
// searched by the referred creator's name and filtered By Campaign and by
// Last week, Last month or a year (one row of chips). The top bar carries the
// title once (UX pass 2026-11-15: no second "History" heading).

import * as React from "react";
import { SearchInput } from "@/components/ideeza/search-input";
import { Skeleton } from "@/components/ideeza/skeleton";
import { Note01Icon } from "@hugeicons/core-free-icons";
import { CAMPAIGNS, filterReferrals, linksOf, referralRowsOf, referralYearsOf, type DateRange } from "@/lib/wallet/referral";
import { useReferralData } from "@/lib/wallet/use-earn-stores";
import { EmptyState } from "../kit/state";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { FilterChips, TestnetLine, useEarnState } from "./parts";
import { ReferralList } from "./refer-tab";

export function CampaignHistory() {
  const { wallet, now, id } = useEarnState();
  const data = useReferralData();
  const [search, setSearch] = React.useState("");
  const [range, setRange] = React.useState("all");
  const [campaign, setCampaign] = React.useState("all");
  const joined = data && id ? linksOf(data, id) : [];
  const rows = data && id ? referralRowsOf(data, wallet, id) : [];
  const picked: DateRange = range === "all" || range === "week" || range === "month" ? range : Number(range);
  const shown = filterReferrals(rows, { campaign, search, range: picked }, now);
  const clear = () => {
    setSearch("");
    setRange("all");
    setCampaign("all");
  };

  return (
    <Screen top={<TopBar back title="Campaign History" />} className="px-8 pb-8 pt-4">
      <div className="flex flex-col gap-6">
        <SearchInput size="xl" value={search} onValueChange={setSearch} onClear={() => setSearch("")} placeholder="Search by user name" aria-label="Search by user name" />
        <FilterChips
          label="Filter referrals"
          onClear={() => {
            setRange("all");
            setCampaign("all");
          }}
          chips={[
            {
              label: "By Campaign",
              value: campaign,
              onChange: setCampaign,
              options: [
                { value: "all", label: "Every campaign" },
                ...CAMPAIGNS.filter((c) => joined.some((l) => l.campaign === c.id)).map((c) => ({ value: c.id, label: c.name })),
              ],
            },
            {
              label: "Date Range",
              value: range,
              onChange: setRange,
              options: [
                { value: "all", label: "All time" },
                { value: "week", label: "Last Week" },
                { value: "month", label: "Last Month" },
                ...referralYearsOf(rows, now).map((y) => ({ value: String(y), label: String(y) })),
              ],
            },
          ]}
        />
        {!data ? (
          <Skeleton shape="block" className="h-[200px] w-full" />
        ) : joined.length === 0 ? (
          <EmptyState icon={Note01Icon} title="No campaign yet" body="Generate your link on Refer & Earn." action={{ label: "Go to Refer & Earn", href: "/m/earn/refer" }} />
        ) : shown.length === 0 ? (
          rows.length ? (
            <EmptyState title="No referral matches" body="Try another name, campaign or date range." action={{ label: "Clear filters", onClick: clear }} />
          ) : (
            <EmptyState icon={Note01Icon} title="No data found" body="Referrals through your links show here." />
          )
        ) : (
          <ReferralList rows={shown} />
        )}
        <TestnetLine />
      </div>
    </Screen>
  );
}
