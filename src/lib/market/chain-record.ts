// "View on blockchain" in every NFT tab of Explore marketplace (owner,
// 2026-11-24: "the Main NFT, Physical NFT and Virtual NFT tabs each need a
// View on blockchain"): what the chain holds of the NFT the tab sells, as
// rows. The prototype makes every token, signature and transaction in this
// browser on a testnet demo (§3.1: nothing links to an explorer, because a
// link would claim a page that doesn't exist), so the rows are the record
// itself and the dialog says there is no explorer page yet.
// - Main NFT: Blockchain, Collection, Token (its number, and "minted when
//   it's bought" while a lazy mint has no sale), Held by, Last transaction.
// - A copy (one use of Physical or Virtual NFT): Blockchain, Collection,
//   Copies minted (each copy is minted when it is bought), Your copies, Last
//   transaction.
//
// Pure. Relative imports only (node:test loads the compiled module).

import type { Network } from "../brief/types";
import { shortAddress } from "../wallet/demo-wallet";
import { networkLabelOf } from "../wallet/request-view";

/** One transaction of the NFT: a sale, which mints a lazy token or a copy. */
export type ChainTx = { at: number; txHash: string; serial: number | null; mine: boolean };

export type ChainRecord =
  | {
      kind: "main";
      network: Network;
      collection: string;
      tokenId: number | null;
      lazy: boolean;
      /** Who holds it now: the creator, or its buyers. */
      holder: string;
      txs: readonly ChainTx[];
    }
  | {
      kind: "copy";
      network: Network;
      collection: string;
      /** Copies minted so far — every copy sold — and of how many. */
      minted: number;
      of: number | null;
      txs: readonly ChainTx[];
    };

export type ChainRow = { label: string; value: string };

export function chainRowsOf(r: ChainRecord, date: (at: number) => string): ChainRow[] {
  const last = [...r.txs].sort((a, b) => b.at - a.at)[0] ?? null;
  const rows: ChainRow[] = [
    { label: "Blockchain", value: networkLabelOf(r.network) },
    { label: "Collection", value: r.collection.trim() || "—" },
  ];
  if (r.kind === "main") {
    const minted = !r.lazy || r.txs.length > 0;
    const token =
      r.tokenId !== null
        ? `#${r.tokenId}${minted ? "" : " · minted when it's bought"}`
        : minted
          ? r.lazy
            ? "Minted at its sale"
            : "Minted"
          : "Minted when it's bought";
    rows.push({ label: "Token", value: token }, { label: "Held by", value: r.holder });
  } else {
    const mine = r.txs.filter((t) => t.mine && t.serial !== null).map((t) => `#${t.serial}`);
    rows.push(
      { label: "Copies minted", value: r.of !== null ? `${r.minted} of ${r.of}` : String(r.minted) },
      { label: "Your copies", value: mine.length > 0 ? mine.join(", ") : "None" },
    );
  }
  rows.push({ label: "Last transaction", value: last ? `${shortAddress(last.txHash)} · ${date(last.at)}` : "None yet" });
  return rows;
}
