# Balance › Overview (IDZ) — Phase 1 design

**Source.** Figma User Panel V2 (`HDtWAU2PSbjQKlEWgHI3ev`), page "✅ Balance ( ICO, Stake, Overview )" `16838:306214`, section Balance → Overview `41571:126259` (frames `41571:126260`, `126724`, `127189`, `127654`, `128125`, `128357`, `128609`), read 2026-10-19. Study, requirement list (57 rows) and decisions: https://claude.ai/artifact/2oChruEgBzQQigpyYuejRh. The owner accepted every recommendation (D1–D13) on 2026-10-19 and asked for Phase 1.

## Scope (Phase 1)
- `/balance` — Balance › Overview: the IDZ balance card and the IDZ transaction activity. Buy IDZ (Phase 2) and Stake (Phase 3) are not built; their controls say "Soon".
- The sidebar Wallet popover becomes the Figma's navbar Balance menu (D1); the wallet button shows the balance when connected (D2).
- Small app-wide fixes the study decided: the credits card in the account popover is labelled "Credits" (D4); the Polygon test network reads "Amoy Testnet (Polygon)" (D12, Mumbai retired in 2024; the stored id stays `mumbai`).

## Rules it keeps
- Demo wallet only, labelled Testnet demo; nothing touches a chain (owner decision 1). No made-up numbers: every row comes from the demo wallet.
- No blockers: connecting is offered where it is needed (the card, the empty state, the popover chip), never before.
- Every visual value is a DS token or component; layout follows the Figma frame inside the Plan & pricing sheet (`PricingFrame`, the V2 white sheet with the breadcrumb on its first line).

## Data (`src/lib/wallet/idz.ts`, pure)
- One price: `IDZ_USD_PRICE = "0.025065"` (D5, the Figma presale price, `lib/wallet/idz-price.ts`). The card's "= $…", the popover's "=$…" and paying for credits in IDZ (`IDZ_PER_USD`) all read it. So a credit pack stays affordable, each demo account starts with 2,000 IDZ (about $50; owner 2026-10-19), and amounts are written with thousands grouped ("2,000 IDZ").
- The IDZ contract address per network is a deterministic demo address (`idzContractOf`), as the wallet's own addresses are.
- The ledger (`idzLedgerOf`): the identity's starting balance as one "Reward" row (no date: the seed has no moment), then every wallet activity line of that identity whose charge carries IDZ, newest first, as "Out". Transfer types (D11): Reward · Project Create (an instant mint's fee) · Credits (AI credits or a plan paid in IDZ). Buy, Stake, Withdraw and Claim join with Phases 2–3. New activity records carry their `purpose`; older ones are typed from their title.
- The ledger reconciles: the starting balance minus every Out row equals `balancesOf(id).idz`.
- Holdings (N1): Available = the balance; Staked, Ready to claim and Pending stay 0 until Phases 2–3 write them.

## Screen
- Breadcrumb "Balance › Overview".
- Card (Figma `41571:126270`): chain select = the wallet's network (switching it switches the demo wallet's network); IDZ coin + amount + "= $…"; holdings line; token address chip + copy; three icon buttons with tooltips on hover and focus — Buy Ideeza Coin (Soon), Stake (Soon), Import IDZ token into Wallet (dialog: name, symbol, decimals, network, contract with copy; "Add to MetaMask" disabled until a real wallet exists).
- Not connected: "Current Balance" + Connect wallet (by02), the empty state "No data found. Please Connect Your Wallet." with a Connect wallet button (B7).
- Transaction Activity (`41571:126311`): filters Chain Type and Transfer Type; columns Transaction ID (short hash + copy) · Date & Time ("13 Aug 2024, 2:08 PM") · Amount (+/− IDZ) · Wallet Address · Chain · Transfer Type with In/Out arrow; 10 a page; stacked rows below a 720 px page container.
- Under the card: what IDZ is and how it differs from credits, with a link to buy credits (N3), and where sale money lives (N4).

## Verification
`tsc`, lint, `npm run test:projects`, `next build`; browser: connected/not connected, filters, paging, copy, Import dialog, chain switch, popover rows and chip, wallet-button balance, 400 px, dark, keyboard.
