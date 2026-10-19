"use client";

// /settings/get-paid (User Panel V2 "General | Get Paid" 41537:182104;
// Settings spec §5.5, D3): the title with View Withdrawal History, card
// Earning Information › Balance (one balance from every project's sales,
// your share after the fee and the splits, less what you've withdrawn) ›, and
// card Tax Information › Tax Residence ›, Tax Identification ›, each saying
// what is saved once something is.

import * as React from "react";
import { balanceOf, formatUsd } from "@/lib/account/payout";
import { usePayout } from "@/lib/account/use-payout";
import { SettingsCard } from "../settings-card";
import { SettingsFrame } from "../settings-frame";
import { countryName, GET_PAID_BALANCE, GET_PAID_IDENTIFICATION, GET_PAID_RESIDENCE, HistoryLink, useEarnings, ValueLinkRow } from "./parts";

export function GetPaidHub() {
  const store = usePayout();
  const { ready, earnings } = useEarnings();
  const balance = store && ready ? balanceOf(earnings, store.withdrawals) : null;
  const residence = store?.taxResidence;
  const identification = store?.taxIdentification;

  return (
    <SettingsFrame page="get-paid" actions={<HistoryLink />}>
      <SettingsCard id="earning" title="Earning Information">
        <ValueLinkRow
          id="balance"
          href={GET_PAID_BALANCE}
          label="Balance"
          help="View your balance and add how you want to receive your IDEEZA balance"
          value={balance ? formatUsd(balance.available) : undefined}
        />
      </SettingsCard>

      <SettingsCard id="tax" title="Tax Information">
        <ValueLinkRow
          id="tax-residence"
          href={GET_PAID_RESIDENCE}
          label="Tax Residence"
          help={residence ? `${countryName(residence.country)} · ${residence.city}` : "Update your tax details"}
        />
        <ValueLinkRow
          id="tax-identification"
          href={GET_PAID_IDENTIFICATION}
          label="Tax Identification"
          help={
            identification
              ? `${identification.usPerson ? "US person" : "Not a US person"} · ${identification.legalName}`
              : "Check whether IDEEZA needs to withhold taxes from your earnings"
          }
        />
      </SettingsCard>
    </SettingsFrame>
  );
}
