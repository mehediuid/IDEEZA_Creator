"use client";

// useMint() (Phase 2 spec §3.6.2, §3.9; P2-MINT-7, P2-MINT-11).
//
// - `plan(args)` wraps `mintPlanOf` (T02) with what only the browser knows:
//   the project's record and name, its mint status now, the next token id in
//   the chosen collection, and the maker's current account. It returns the
//   ONE request the mint needs (null: nothing to sign or pay) and
//   `nextRecord(proof)`. It writes nothing: the Brief (T26) and the listing
//   form (T22) compose their own `request(req, { commit })` from it, writing
//   the record, then their own records, then the collection counter
//   (`bumpMinted`), in that order; the dialog writes the debit last.
// - `changePayoutWallet(projectId)` is the whole P2-MINT-11 flow: a free
//   signature "Re-sign with Demo account 2", then the repointed record.
//
// The payout wallet of a new mint is the account that actually signed
// (`proof`), not the one the plan saw: another tab may have switched it in
// between, and the record must name the key that signed.

import * as React from "react";
import { readBriefDraft } from "@/lib/brief/project-brief";
import type { Intent, Network } from "@/lib/brief/types";
import { readCollections } from "@/lib/brief/wallet";
import { useManualProjects, type ManualProject } from "@/lib/manual/projects";
import { readMarketNow } from "@/lib/market/market-store";
import { demoAddress, makerId, readWallet, shortAddress } from "@/lib/wallet/demo-wallet";
import { DEMO_ACCOUNTS } from "@/lib/wallet/identities";
import { mintPlanOf, mintViewOf, nextTokenId, repointRecord, type MintPlan } from "@/lib/wallet/mint";
import { networkLabelOf } from "@/lib/wallet/request-view";
import type { AccountIndex, MintStatus, MintType, Proof, RequestResult, WalletRequest } from "@/lib/wallet/types";
import { useWalletRequest } from "./wallet-provider";

export type MintPlanArgs = {
  projectId: string;
  intent: Intent;
  type: MintType;
  network: Network;
  collection: string;
  /** The status the caller already derived; read fresh (record, Brief draft, sales) when omitted. */
  current?: MintStatus;
};

/** `mintPlanOf`'s plan, plus what it was made from, so a caller can show the token and branch on the status. */
export type ProjectMintPlan = MintPlan & { current: MintStatus; tokenId: number };

export type UseMint = {
  plan: (args: MintPlanArgs) => ProjectMintPlan | null;
  changePayoutWallet: (projectId: string) => Promise<RequestResult>;
};

const PAYOUT_LOCKED = "The token is on chain now, so its payout wallet is locked.";
const STORAGE_FAILED = "This browser couldn't save it — storage is full or blocked.";
const MINT_GONE = "This project's mint is gone.";
/** The wallet's answer didn't name a signer and a signature to re-point the record with. */
const RECORD_INCOMPLETE = "The wallet's answer didn't make a complete mint record, so nothing was saved.";

function statusOf(p: ManualProject): MintStatus {
  return mintViewOf(p, readBriefDraft(p.id), readMarketNow().sales).status;
}

function accountOf(proof: Proof): AccountIndex | null {
  return proof.identity.startsWith("maker-") ? (Number(proof.identity.slice("maker-".length)) as AccountIndex) : null;
}

export function useMint(): UseMint {
  const { projects, setMint } = useManualProjects();
  const { request } = useWalletRequest();
  // The latest list, for a commit that runs seconds after the press.
  const latest = React.useRef(projects);
  React.useEffect(() => {
    latest.current = projects;
  }, [projects]);
  const find = React.useCallback((id: string) => latest.current.find((p) => p.id === id) ?? null, []);

  const plan = React.useCallback(
    (args: MintPlanArgs): ProjectMintPlan | null => {
      const p = find(args.projectId);
      if (!p) return null;
      const current = args.current ?? statusOf(p);
      const record = p.mint ?? null;
      const tokenId = record && (current === "lazyMinted" || current === "onChain")
        ? record.tokenId
        : nextTokenId(readCollections(args.network), args.collection);
      const account = readWallet().account;
      const base = mintPlanOf(current, args.type, {
        projectName: p.name,
        intent: args.intent,
        network: args.network,
        collection: args.collection,
        tokenId,
        record,
        account,
        address: demoAddress(makerId(account)),
        at: Date.now(),
      });
      const purpose = base.request?.purpose;
      return {
        ...base,
        current,
        tokenId,
        nextRecord: (proof) => {
          const next = base.nextRecord(proof);
          if (!next || (purpose !== "lazyMint" && purpose !== "instantMint")) return next;
          const signer = accountOf(proof);
          return signer ? { ...next, wallet: { account: signer, address: proof.address } } : next;
        },
      };
    },
    [find],
  );

  const changePayoutWallet = React.useCallback(
    async (projectId: string): Promise<RequestResult> => {
      const p = find(projectId);
      const record = p?.mint;
      if (!p || !record) return { ok: false, reason: "recheck", message: "This project has no lazy mint to re-sign." };
      if (statusOf(p) !== "lazyMinted") return { ok: false, reason: "recheck", message: PAYOUT_LOCKED };
      const w = readWallet();
      if (!w.identities[makerId(w.account)]?.connected) {
        return { ok: false, reason: "walletDisconnected", message: "Connect your wallet first." };
      }
      if (w.account === record.wallet.account) {
        return { ok: false, reason: "recheck", message: "Switch account in your wallet first." };
      }
      const target = DEMO_ACCOUNTS.find((a) => a.index === w.account) ?? DEMO_ACCOUNTS[0];
      const req: WalletRequest = {
        kind: "signature",
        purpose: "changePayout",
        identity: "maker",
        account: target.index,
        network: record.network,
        title: `Re-sign with ${target.label}`,
        summary: [
          { label: "Project", value: p.name },
          { label: "Collection", value: `${record.collection} · token #${record.tokenId}` },
          { label: "Network", value: networkLabelOf(record.network) },
          { label: "New payout wallet", value: `${target.label} · ${shortAddress(target.address)}` },
        ],
        note: `The lazy mint is signed again by the new wallet. Nothing is charged.`,
        doneLine: `Payouts now go to ${target.label} · ${shortAddress(target.address)}.`,
      };
      return request(req, {
        // A first sale meanwhile puts the token on chain, and the payout wallet with it.
        recheck: () => {
          const now = find(projectId);
          if (!now?.mint) return MINT_GONE;
          return statusOf(now) === "lazyMinted" ? null : PAYOUT_LOCKED;
        },
        commit: (proof) => {
          const now = find(projectId);
          const signer = accountOf(proof);
          if (!now?.mint) return { ok: false, message: MINT_GONE };
          if (!signer || !proof.signature) return { ok: false, message: RECORD_INCOMPLETE };
          const next = repointRecord(now.mint, { account: signer, address: proof.address }, proof.at, proof.signature);
          return setMint(projectId, next) ? { ok: true } : { ok: false, message: STORAGE_FAILED };
        },
      });
    },
    [find, request, setMint],
  );

  return React.useMemo(() => ({ plan, changePayoutWallet }), [plan, changePayoutWallet]);
}
