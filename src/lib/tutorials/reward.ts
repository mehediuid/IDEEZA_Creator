// Paying a tutorial reward (plan § Reward logic, owner D2 and D6): once a
// video has been watched, its IDZ goes to the maker's chosen demo account as a
// wallet activity line with a credit, so the balance — always derived from
// activity — rises by exactly the reward. The line's id names the video, so a
// video can never pay twice, even if the tutorial record were lost.
//
// Pure, relative imports only.

import { demoHex, makerId, pushActivity } from "../wallet/demo-wallet";
import type { DemoWallet, MakerId, WalletActivity } from "../wallet/types";
import { isWatched, type TutorialProgress } from "./progress";
import type { TutorialVideo } from "./types";

export function rewardActivityId(videoId: string): string {
  return `tutorial-reward:${videoId}`;
}

export function creditedEntry(w: DemoWallet, videoId: string): WalletActivity | null {
  const id = rewardActivityId(videoId);
  return w.activity.find((a) => a.id === id) ?? null;
}

/** The account a reward is paid to: the maker's chosen one, when it is connected. */
export function payeeOf(w: DemoWallet): MakerId | null {
  const id = makerId(w.account);
  return w.identities[id]?.connected ? id : null;
}

export function rewardEntryOf(video: TutorialVideo, identity: MakerId, w: DemoWallet, at: number): WalletActivity {
  const network = w.identities[identity].network;
  return {
    id: rewardActivityId(video.id),
    at,
    identity,
    network,
    kind: "transaction",
    title: `Tutorial reward · ${video.title}`,
    txHash: `0x${demoHex(`ideeza:testnet-demo:tutorial-reward:${video.id}:${at}`, 64)}`,
    credit: { network, lines: [{ coin: "IDZ", amount: video.reward }] },
  };
}

export type ClaimOutcome =
  | { ok: true; wallet: DemoWallet; entry: WalletActivity }
  /** Paid before: the record only needs to say so. */
  | { ok: false; reason: "already"; entry: WalletActivity }
  | { ok: false; reason: "notWatched" | "noWallet" };

/** The wallet with the reward paid in, or why it can't be. Nothing is written here. */
export function claimReward(w: DemoWallet, p: TutorialProgress, video: TutorialVideo, at: number): ClaimOutcome {
  const paid = creditedEntry(w, video.id);
  if (paid) return { ok: false, reason: "already", entry: paid };
  if (!video.src || !isWatched(p, video.id)) return { ok: false, reason: "notWatched" };
  const payee = payeeOf(w);
  if (!payee) return { ok: false, reason: "noWallet" };
  const entry = rewardEntryOf(video, payee, w, at);
  return { ok: true, wallet: pushActivity(w, entry), entry };
}
