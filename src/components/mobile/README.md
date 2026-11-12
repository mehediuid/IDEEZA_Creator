# src/components/mobile — the mobile prototype router

The `/m` prototype's own screens and parts, from the mobile Figma (`fKXxJ25dXvxWWa0kCKeSF4`). Logic comes from `src/lib` like the web's; nothing here is shared with the web shell. What works: [docs/guides/features/mobile-app.md](../../../docs/guides/features/mobile-app.md). Back to [docs/map/PRODUCT.md](../../../docs/map/PRODUCT.md).

| File | What it is |
|---|---|
| `device.tsx` | Phone, desktop or inside the desktop's phone frame (`useDeviceMode`, `useFramed`), and whether a tab bar is at the foot |
| `mobile-root.tsx` | The `/m` root: the desktop's phone frame (an iframe, its address kept in step) or the app itself, with the toast host |
| `screen.tsx` | One screen: status bar, top bar, the scrolling content, a pinned footer, the home indicator |
| `status-bar.tsx`, `home-indicator.tsx` | The phone chrome, drawn only in the frame; the safe-area insets on a phone |
| `type.ts` | The one type scale: 16 roles (`T.hero` … `T.overline`); every text uses one, never a raw size |
| `top-bar.tsx`, `nav-trail.ts` | Mobile / Top bar: Back, the title, 44 px actions; Back goes to the previous in-app screen or replaces with the parent (`useGoBack`), never pushes |
| `tab-bar.tsx` | Navbar Container: Home · Earn Coin · AI · Message · Profile, the unread and attention dots, each tab's last place |
| `kit/sheet.tsx` | M09 Sheet and M12 ActionSheet: one scrim, Escape, drag to close, focus inside |
| `kit/confirm-sheet.tsx` | Confirms: neutral, destructive, typed |
| `kit/report-sheet.tsx` | The Report sheet and its states |
| `kit/toast.tsx` | M02 toasts (`useToast`, `BUILD_TOASTS` with progress) and the foot marker they stand above |
| `kit/states.tsx`, `kit/state.tsx` | Bones (after 300 ms), the offline banner, `useOnline`, the Back online toast; `EmptyState` · `ErrorState` · `NotFoundState` |
| `kit/tabs.tsx`, `kit/eyebrow.tsx`, `kit/list.tsx`, `kit/media.tsx` | `MobileTabs` (M14 line), `Eyebrow`, `ListCard` / `ListRow` / `Chevron`, the media ground and chip that stay dark |
| `kit/pick-list.tsx`, `kit/permission-sheet.tsx` | `PickSheet` / `PickList` (every pick-one list); the camera, photos, microphone and notifications pre-prompts |
| `kit/bottom-bar.tsx`, `kit/code-cells.tsx`, `kit/sheet-select.tsx` | The Bottom action bar and its text link, six code cells, A06 Select as a pick-one sheet |
| `account/mobile-gate.tsx` | Where the phone may go (way-in, setup, tabs, guest Home), Splash |
| `account/ways-in.tsx`, `account/guest-gate.tsx` | Continue with Apple · Google · Facebook · email, the Demo provider sheet, the guest gate |
| `account/code-step.tsx`, `account/parts.tsx`, `account/terms-sheet.tsx` | The six-digit code step and Demo email; heading, checklist, alert, Splash; the Terms viewer |
| `ai/` | The AI tab: start, the concept chat (`use-concept-flow.ts`), build, pieces, history, the build pill (logic: `lib/mobile-ai/flow.ts`) |
| `feed/` | Home: the Feed's clips, comments, ⋯ menu, share, Saved, Marketplace activity, Global Search, Notifications |
| `project/`, `project-earn/`, `product/` | My projects and the project page; its Earn side (mint, sell, listing, business plan, money, buying, product video, AR); the product page and its build viewers |
| `messages/` | The Message tab: inbox, requests, threads, team threads, composer (logic: `lib/messages/phone.ts`, `use-outbox.ts`) |
| `profile/` | The Profile hub, creator profiles, Edit profile, profile search |
| `settings/` | Settings and every page under it, Sign-in & security, 2-step, sign out, delete and restore (logic: `lib/account/security.ts`) |
| `plans/`, `help/` | Plan & pricing, credits, checkout, billing, payment method, Get paid, KYC; Help, contact support, Report a problem, Tutorials |
| `earn-coin/` | The Earn Coin tab: balance, presale, staking, refer & earn, the wallet-signing sheets every money step uses |

Rules: every popup is a bottom sheet in this one style; text from `type.ts` only (`T.*`); tokens only, mapped from the Figma variables; text over video is always white (`status="media"`). Build rules and the kit: [docs/guides/mobile-prototype.md](../../../docs/guides/mobile-prototype.md).
