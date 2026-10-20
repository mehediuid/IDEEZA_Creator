# Balance › Buy IDZ Token (demo presale) — Phase 2 design

**Source.** Figma User Panel V2 (`HDtWAU2PSbjQKlEWgHI3ev`), section "Balance → Buy IDEEZA Coin" `41571:113536` (frames `113537` balance + purchase table, `114057` not connected, `114598` presale card, `115150` / `115735` Connect a Wallet, `116320` Need a wallet?, `116857` / `117443` / `118030` / `118664` buy form empty / filled / currency menu / whitelist, `119254` Purchase Successful), read 2026-10-19. Requirement rows B8, B9, C1–C9, X1–X7, N5 and decisions D3, D5–D9, D13 of the study (https://claude.ai/artifact/2oChruEgBzQQigpyYuejRh), all approved by the owner on 2026-10-19. Phase 1: `2026-10-19-balance-overview-design.md`.

## Scope
- `/balance/buy` — Balance › Buy IDZ Token: the balance card with "Import IDZ Token" and "Buy IDZ Token", and the purchase history.
- The presale dialog: the presale card, Connect a Wallet, Need a wallet?, the buy form, Purchase Successful. `?buy=1` opens it (the Overview's Buy icon and the Wallet menu's "Buy $IDZ" row).
- Claim: a purchase's IDZ is held until it unlocks, then claimed into the available balance. Buy and Claim rows join the Overview ledger.

## Rules it keeps
- Demo wallet only, labelled Testnet demo; nothing touches a chain. No made-up figures: Total USD raised is the sum of the demo purchases in this browser, labelled demo.
- No blockers: Buy IDZ Token opens without a wallet; the wallet is asked for at Buy With Crypto, then the form follows in the same dialog.
- Every visual value is a DS token or component. The Figma magenta headings have no DS token: they use the brand violet (X6). Every dialog has ✕ and Escape (X5).

## The presale config (`lib/wallet/presale.ts`, pure)
Demo values the owner can change in one place:
- Network: Base Sepolia (Testnet), the stand-in for the Figma's "Ethereum"; ETH, USDT and USDC are paid there (C6). A wallet on Amoy is asked to switch by the wallet's own dialog (X7).
- Round 1 at the one IDZ price `IDZ_USD_PRICE` $0.025065 (D5), ending 31 Dec 2026, 11:59:59 PM Bangladesh time (17:59:59 UTC), written with the time zone. The countdown runs to that moment and never resets; after it the card says the round ended and Buy is off. The next price, $0.03, is written beside the countdown (D8).
- Dollars per coin come from the app's one demo rate table, `DEMO_USD_RATES` (`lib/account/payout.ts`, also used by Settings › Get paid): test ETH 1 ETH = $3,750, written wherever an ETH amount is quoted; USDT and USDC one for one.
- Whitelist (C7): Demo account 2 pays 10% less, $0.022558 (rounded down to the micro-dollar). The old price is struck through.
- Release (C8): bought IDZ unlocks 2 minutes after its purchase confirms, then the buyer claims it.
- Gas reserve: the demo network fee twice over — this purchase and its claim (C5b) — paid in test ETH whatever the coin.

## Quote and checks
- One price, two ways (C5a): IDZ typed → pay = IDZ × price ÷ coin rate, rounded up to 0.000001; pay typed → IDZ = pay × coin rate ÷ price, rounded down. All in bigint micros.
- Max = balance − gas reserve for ETH; the token balance for USDT/USDC.
- Buy $IDZ is aria-disabled until the amount is valid; pressing it then shows the reason under the field: empty, not a number, 0, more than the balance, not enough left for gas, the round ended.

## Records (`lib/wallet/presale-records.ts`, pure)
- A purchase is the wallet activity line of a confirmed `buyIdz` request: its charge (the coin paid + the purchase's gas) is debited by `balancesOf` as before; its `presale` field holds the IDZ bought, what was paid, the dollar worth, the price, the round, the whitelist flag and `unlocksAt`.
- A claim is the line of a confirmed `claimIdz` request: its charge is the claim's gas; `claims` names the purchase. The first claim of a purchase credits its IDZ in `balancesOf` (a second one never does).
- Status: Locked until `unlocksAt` → Ready to claim → Claimed.
- Holdings (N1): Available = `balancesOf().idz` (claimed IDZ included); Pending = unclaimed and still locked; Ready to claim = unclaimed and unlocked.
- Ledger: a Buy row (IDZ coming in, held by the presale — it does not count toward Available) and, once claimed, a Claim row (the IDZ arriving). Reconciles: seed + every In row not held − every Out row = `balancesOf().idz`.

## Screens
- Card (Figma `41571:113547`): network select, "Current Balance", the amount + "= $…", holdings, token address + copy, Import IDZ Token (Phase 1's dialog) and Buy IDZ Token. Not connected (`114057`): "Current Balance" + Connect wallet, Buy IDZ Token still on.
- Purchase table (`113571`): Transaction ID · Chain · Date & Time · You Received · You Paid · Wallet Address · Status (Claim in … → Claim → Claimed); filters Chain, Status, Month, Year (C1); 10 a page; stacked rows below a 720 px container. Not connected: the empty state with Connect wallet.
- Presale card (`114598`): Buy $IDZ Token, In Presale Now! · round, Days/Hours/Minutes/Seconds to the round's end (`role="timer"`, not read out every second), UNTIL PRICE INCREASE and the next price, TOTAL USD RAISED (demo sum), 1 $IDZ = $0.025065, Buy With Crypto, Don't have a wallet?, Download White Paper (Soon: no PDF exists), the risk line (IDZ can lose value; not investment advice).
- Connect a Wallet (`115150`/`115735`, one text, "$IDZ" not "$BEST"): Demo wallet first and on; IDEEZA Wallet, MetaMask, WalletConnect, Coinbase Wallet listed "Soon"; I don't have a wallet; Back.
- Need a wallet? (`116320`): "IDEEZA Wallet app", the three steps, the QR's place says Coming soon, Use the Demo wallet, Back.
- Buy form (`116857`–`118664`): You get (IDZ) ⇅ You pay (ETH / USDT / USDC with chain and balance), the gas line, Discount for whitelist, Buy $IDZ, AVAILABLE BALANCE + Max, Download White Paper. Pay goes through the wallet's request dialog (purpose `buyIdz`), whose review shows N5: IDZ, price, worth, coin, gas, total and when it can be claimed.
- Purchase Successful (`119254`): what was bought and paid, the transaction hash, the claim countdown, the release line, View transaction log (to the table), contact us → Report a problem.

## Verification
`tsc`, lint, `npm run test:projects`, `next build`; browser: not connected → Buy → connect → buy → countdown → claim → Overview balances and ledger, filters and paging, the error states, ?buy=1 from Overview and the Wallet menu, 375 px, dark, keyboard.
