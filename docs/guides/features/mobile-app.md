# Mobile app prototype

The coded mobile prototype at `/m`, built from the mobile Figma (`fKXxJ25dXvxWWa0kCKeSF4`): the 2026 update pages where they exist, else the owner's "Design - Light Mode (Current)" page. It shares the web's stores and API routes; its screens are its own (`src/components/mobile/`). Back to [README.md](README.md).

## Shell (M0)

- **One page, two ways to see it.** On a phone `/m` fills the screen (edge to edge, safe-area insets, Add to Home Screen as "IDEEZA"). On a desktop it draws a 375 × 812 phone and runs the same page inside it in an iframe, so the desktop shows exactly what a phone shows; the address bar follows the screen inside, so a reload or a copied link opens the same screen.
- **Phone chrome in the frame only:** the Figma status bar (live clock, cellular, wifi, battery) and home indicator; on a phone the OS draws them.
- **Tab bar** (Figma Navbar Container `3070:11343`): Home · Earn Coin · AI (the orb) · Message · Profile, the current tab marked by the border/focus line above it; it stays mounted while you move between tabs. As on the web's sidebar, Message shows a dot while the Inbox has unread conversations and the orb a red dot while a build needs you. Each tab opens where you left it; tapping the tab you're on goes to its root, and on the root scrolls to the top. A guest's tab gate says where signing in lands.
- **Top bar** (Mobile / Top bar): Back, a centred title, up to 44 px actions on the right. Back goes to the previous screen when this browser tab's history has one in the app, else to the screen's parent in place of it, so a deep link's Back never leaves IDEEZA and two screens can't send each other round in a loop.
- **One type scale** (16 roles, `components/mobile/type.ts`) and the DS default radius inside /m (buttons 12, cards 12, Settings cards 8), sheets included.

## Account (M1)

From "Account · 2026 update" (AU-01…33); the accounts are the web's (`lib/account/auth.ts`), and the phone's own rules and memory are `lib/account/phone.ts`.

- **Splash** while the app works out where to open, then **Welcome** (first launch and after sign-out): the logo with Sign up and Log In. Log In offers Google and Facebook beside the email (the web's two providers; no Apple anywhere on the phone, owner 2026-11-09). Offline and a provider's error show as alerts.
- **Guest**: Explore first opens Home as a guest; Earn Coin, AI, Message and Profile ask them in with the guest gate sheet, and signing in comes back to that tab.
- **Google, Facebook**: a Demo sheet stands in for each provider's own (name and email; Facebook can share none → Add your email). Signing you in, then: a new account first gets **Finish your account** (`/m/source`: Create account's date of birth and Terms box, and the name if the provider shared none; AUTH-2), its profile takes the name and country, and it goes on as after Create account (the one question, then the page it set out for or the Welcome map); an email that already has an account without that provider goes to Link accounts (its password, or the way it signed in before).
- **Sign in**: field errors on leaving a field or on submit, one alert for wrong details, five wrong tries lock that email for 5 minutes (countdown), unverified → Send code, offline keeps the input. Suspended and session-expired have no cause in the demo; the Shared kit opens them.
- **Onboarding** (first launch, signed out): four screens with Next, Continue on the last, and Skip.
- **Create account** (owner 2026-11-12: the web's sign-up): first and last name, email, password with the web's five-rule live checklist, re-type, date of birth (day · month · year from bottom sheets), and "I agree to the IDEEZA Privacy policy and Terms and conditions" in the field-label size. Create account checks it all as the web does (each field says why, the first gets the focus); an email already used offers Sign in instead.
- **Codes** (Verify email, Reset): six cells, sent on by the 6th digit, Checking the code…, wrong, expired (10 minutes), five wrong lock it for 10 minutes, Resend after 30 s, offline keeps the code. Open email app shows the Demo email with the code and Use this code.
- **After the code**, as on the web: "Where did you hear about IDEEZA?" (`/m/source`, only when the link didn't say; a tap answers, Skip for now), then straight on to the page they set out for (a `next` other than Home; AUTH-4, the web's rule), or after a plain sign-up the **Welcome map** → Look around first (Home, with the tour) or Start with my idea (AI tab, with the **first-product guide**: the web's guide, `lib/tour/guide.ts` `guideNow` read by `guideFactsOf` from the same stores, as a slim strip above the tab row and above the foot of the chat, project and Earn screens — "Your first product · 2 of 7 · Answer the AI's question"; tap → its sheet with every step, the editor marked On a computer, Take me there; ✕ closes it; AUTH-5). "Wrong email? Change it" brings back the names and date of birth (AUTH-6). Look around first starts the **tour** as coach marks (owner 2026-11-12, the web's Tour Guide way): each of the five tabs opens, the screen dims with a lit, ringed hole round that tab, and a small card above it (M10 bubble, its arrow on the tab) says what you do there; dots and Skip on top, Back and Next (Done) at its foot; tapping the lit tab is Next; Escape skips. No name, handle or profile steps (owner 2026-11-12): the name comes with Create account, the handle waits in Settings › Account, the rest in Edit profile. No Face ID anywhere (not a requirement).
- **Reset password**: email (prefilled from Sign in) → code in neutral words → new password (not the current one, checklist, Sign out of other devices) → signed in where they were, with "Password reset".

## AI tab (M2)

From "AI create · 2026 update" on the web's create stores and routes (`lib/create/*`, `/api/concept/*`, `/api/refine`); the chat logic is `components/mobile/ai/use-concept-flow.ts`, the phone's own rules `lib/mobile-ai/flow.ts`.

- **Start** (`/m/ai`): the hero, the five pieces a build makes, Start from an idea (the web's nine, three at a time, Shuffle), the Prompt Box (Enter sends, grows to five lines, Enhance, Quality Low · Medium · High kept like Home), the credits line with "How credits are spent"; out of credits the send is held with Buy credits; ⋯ History, Buy credits.
- **Voice**: Listening…, the words as they come, the mic-level waveform, ✕ to discard, ✓ to put them in the box; a blocked microphone says "Microphone is off" with Try again.
- **The question** (`/m/ai/chat/<id>`): the idea bubble (Show full prompt), the reading card, What should we build for several products, then Which project is this for? (one you have, or a new name) or What should the project be called?; Start drawing shows its credits and waits for a project; closing it unanswered leaves a Required step card.
- **Concepts**: a card per product — drawing (real elapsed time), ready (View & refine), failed (the reason, Try again for 1 credit) — with a tick for whether an extra product is in the build and suggested products; the product sheet (drawing, prompt, spec facts, Edit spec, what will be built with its Quality, Refine / Regenerate for 1 credit, dots between products); Refine lands as Concept N.M.
- **Edit spec**: Size, Power, Add a part, Wireless, Case, Brain, Inside, saved as you go, free; a built product is read only. **Network**: optional links between products with Change link and Remove network.
- **Build**: the Build line (cost, time, held with its reason), the Build sheet (pieces and credits per product, balance before and after, Buy credits when short), then the build card in the web's words — queued (Cancel), running, a failed piece retried free, stopped (Try again), paused (Buy credits), overrun (Stop and refund); a tab per product.
- **Finished**: All N pieces are ready, Save project / Add to <project> / Save version N, then Saved as a draft with View project (`/m/projects/<id>`). **Pieces** (`/m/ai/build/<id>`): Switch product, PCB · Code · 3D Module · Assembly · Wiring and Parts, each the web's artifact (3D: zoom, start view, Explode, tap a part to name it), progress and free Retry per piece.
- **Build log** (⋯): Idea · Concepts · Build · Save, live progress and what the chat has cost so far. **History** (`/m/ai/history`): Prompts · Builds, search, build filters, delete a chat.
- **Build pill** over every tab: queued (N ahead), starting, building with % and time left, ready to review, needs a retry, stopped, paused; tapping opens the chat (Home keeps the Feed's own queue pill for a queued build).

## My projects and Project details (M3)

From "Project Details · 2026 update" and the master page's My project, all on the web's project derivation, stores and rules (`lib/manual/`, `lib/network/`, `lib/video/`); the phone's own helpers are `lib/manual/phone-project.ts`.

- **My projects** (`/m/projects`): All · Draft · Minted · Listed · Sold with counts, search over project and product names and descriptions, one filter sheet (Shared only, sort), cards with the cover, title and status chip, "{n} products · Saved {date}" and the next-step hint; twelve at a time with Show more; the view kept in the address; "No projects yet" with Create a project, empty tabs, no matches with Clear search.
- **Project page** (`/m/projects/<id>`): the header (name and chip, stage line opening Versions, meta line, lock line, description clamped to 3 lines with Show more or Add a description, newer-version notices with Review version n); tabs Overview · Products · Media · Activity pinned under the top bar, which takes the name once the header scrolls away; the Bottom action bar (Publish + Earn, or Earn with its fact); bones while loading; "We couldn't find this project" for an unknown address.
- **Overview**: the current activity with + Add, the products (count and pieces, Build check, the first 3), the current version, About (Created, Parts, Team ›, Network ›, Stored) and Recent once the project has gone out. **Products**: Add a product (Build with AI opens the chat; Build manually adds a hand-made product — the editors open on a computer), compact rows, Search and Sort from 6 products.
- **Media**: the project video with two or more products (waiting, Make, Update, Try again, Review; the player, takes with Use this and delete; one product: its video is the project's, so no project video section, owner 2026-11-17), product videos playing in a sheet, the builds' images with the viewer's Use as cover. **Project video** (`/m/projects/<id>/video`): timeline, intro, product order and labels, outro, quality, sound, Generate (rendered in the browser) and the review (Use this video, Make another take, Change scenes, Decide later).
- **Activity**: the journey newest first, ⋮ Edit or Delete (asks first), proof tiles with a viewer, links that ask before opening, the price snapshot; the full-screen Add / Edit form (type sheet, Others name, description, https links, files kept in the browser, the web's errors).
- **⋯ menu**: Edit name and description (counts, duplicate-name note, Update with AI with Undo, Discard changes?), Share to Feed (a draft gets "Mint it first"; with nothing for sale "List it first" → Sell, since the Feed shows only marketplace items; once shared, View post only while something is for sale), Delete (what goes and stays, the typed name when work would be lost, the blocked variants with where to fix them); a live listing asks to come off the marketplace before an edit.
- **Publish**: Keep private · Give · Sell; Give and Sell first check every video (readiness), then open the mint. **Versions** and **Review version n** (Save version n); **Team** (Team conversation, Message, Splits); **Network** and the **Add network** wizard (Setup, Method, AI map with the rules fallback, Review, Done; Manual Canvas opens on a computer).
- **Someone else's project** (a Feed clip's `/m/projects/p1`): the web's sample post read-only, laid out as a product page (owner 2026-11-12): the clip's video on top (muted, looping; Pause/Play chip; still under Data saver), name and creator line, then when listed one buy box ("Whole project · Main NFT", the price large, Listing · Share · Chain, wallet line, last sale, the Testnet demo line with Change) with the share-sale note, the copies as rows (icon, name, price, sold bar, Buy), the description, and tabs Overview · Products · Media. The bar's Buy now buys the Main NFT. A sample product's page (`/m/projects/p1/products/remote`) has the same video top and its copies with Buy; Buy a copy works (one copy: straight to the wallet; more: brings them into view). `#m-app` is `overflow: clip`, so no scrollIntoView can slide the whole app.

## Project Earn, buying and product video (M3)

From "Project Details · 2026 update" rows 11–19, on the web's Earn layer, mint, market, wallet and video stores and words (`lib/manual/earn-*`, `lib/brief/`, `lib/market/`, `lib/commerce/`, `lib/video/`); the phone's own addresses are `lib/manual/phone-earn.ts`. Every signature is the phone's wallet sheet (`PhoneWalletScope` hands it to the web's money hooks).

- **Earn** (`/m/projects/<id>/earn`, `/sell`, `/plan`, `/money`): the name with the status pill (Not for sale yet · Minted · On the marketplace · Listing paused · Part sold · Sold out · Given away) and the lock line; tabs Overview · Sell · Business plan · Money; Preview as others see it once there is an audience; owner only.
- **Overview**: "Get {project} earning", ① Mint your project ② Put it on sale with each missing step's fix (connect the demo wallet, confirm ownership, make videos, choose a license, verify identity); once live, "You're selling" with price, copies sold, bought by, earned and Manage in Sell.
- **Mint** (`/earn/mint?intent=give|sell|save|private`): Details (Sell: chain, collection, Buy now / Auction, Lazy / Instant, token, price or minimum bid, selling percentage, royalties, holder benefits, the ownership box, license, Share to Feed; Give and Keep private their own fields, without Share to Feed: they list nothing), saved as you go; Review and sign; one wallet signature; Mint complete / Given to the community with the ownership proof (Share to Feed after a Sell); a rejected or failed signature says "Not minted — … Nothing was charged."
- **Sell**: the Main NFT row (Sell, Add to marketplace once minted, Manage: Edit, Remove, View on marketplace, auction time left, Bidding History, Close auction; paused → Relist) and Physical / Virtual copies (two-step Sell copies with what you get after the 2.5% fee, then Manage tracks: Personal use / Business use, Edit, Add copies, Remove listing); NFT activity on every row.
- **Business plan**: Generate, the Writing sheet with Stop writing, interrupted (Continue writing, Start over), couldn't write (Try again); the plan with versions, Print or save as PDF, Jump to section; ⋯ Edit a section (Improve with AI), Regenerate and Delete (both ask first).
- **Money**: Splits (Add / Edit contributor, over-100% error, Preview as {name}, Remove), Sales (Testnet demo, your earnings, sale details, Withdraw in Get paid → `/m/settings/idz-pay`), Rights (Patent / Copyright / Trademark, License).
- **Marketplace on the phone** (`/m/projects/<id>/market`, what your shared clip's pill opens): your listing as a demo creator shops it, laid out as the Feed sample's product page (owner 2026-11-12): the clip's video on top (the project video in use, else a product's; the cover meanwhile), name and creator line, then one buy box (what is sold, the price large, Listing · Share · Chain · Royalties · Minting · Collection, a line on royalties and lazy minting, then the wallet, activity and "Testnet demo · shopping as Mira · Change" lines) with the share-sale note, the copies as rows (mark, name, price or "From", sold bar, activity, a small Buy; two prices ask This version / With future updates in a sheet), the description, then tabs. Buy now goes through the wallet sheet to Purchase successful; a holder then reads a receipt card (You own n% · Token · Paid · Purchased, All details closed). Auctions use the same box (top or starting bid, time left, Bid history, Your bid, Buy now with X; outbid / won / lost banners). The owner's preview reads the same boxes with no buttons. **Feed samples** (`?tab=marketplace`): the Main NFT and copies bought from the demo creator's test wallet. **Previews** (`/m/projects/<id>/preview?view=buyer|contributor`).
- **A product's video** (`/m/projects/<id>/products/<pid>/video`): AR or AI, prompts with Auto generate, Low / High quality, the storyboard, the render in the browser (Close keeps it going, Cancel asks first), failed with Try again, the review (Use this video, Make another take, Edit storyboard, Decide later). **AR camera** (`…/ar`): asks first, a 10-second clip with REC timer, camera off with Upload a video, Your clip (Use this clip, Record again).
- **Render tray** over every phone screen's foot: rendering with Cancel, ready with Review, failed with Try again; the web's floating notice stays off /m.

## Product details (M4)

From "Product Details · 2026 update" on the web's product, pieces, spec, editions and video stores (`lib/manual/`, `lib/spec/`, `lib/market/`, `lib/video/`); the phone's own helpers are `lib/manual/phone-product.ts`.

- **Product page** (`/m/projects/<id>/products/<productId>`): "{project} · product", the name, "AI build · {date} · All n pieces ready" (Add the rest), the lock line once sold in full, the description with Show more, the version select and its notices, the dismissable "Edit the board, code and 3D on a computer" note; tabs Overview · Build · Media pinned under the top bar; a product with no build shows Activity and Media in one panel; loading bones, "We couldn't load this product" with Try again, "This product isn't in {project}".
- **Overview**: Activity (newest, + Add, History, NFT activity in Earn › Sell), Specs ("Worked out from the parts.", part changes), Build check with See why (the grouped checks, Open chat).
- **Build**: each piece in its state (Ready, Failed, Building with progress, Waiting, Not built with + Add) opening its screen; Downloads (firmware, parts list, netlist); **Add pieces** (quality, Optimize, total, Not enough credits → Buy credits through the demo wallet sheet).
- **Piece screens** (`…/build/<piece>`, view only): PCB and Wiring with pinch to zoom, the Pin to pin table, firmware with line numbers, the parts list with its Summary, the 3D Module and Assembly in the phone's 3D viewer (View in 3D, Fullscreen, Reset, Explode, Front · Side · Top, Systems, What ships, a tapped part's sheet with Isolate); failed pieces offer Rebuild and Open chat; "What this covers" and the piece's file at the foot.
- **Media**: No video yet (Generate AI video), rendering, failed, "Video ready · Take n to review" with Review, the player, Made from version n, What's in this video, Takes (Use this take, In use, delete asks first); images in the full-screen viewer.
- **Activity** (`…/activity`): history newest first with ⋮ Edit · Delete, the prices at the time (Physical / Virtual price sheets), proof and links; Add new activity is the project's form for this product.
- **⋯** (owner): Rename product (an auction keeps it off with the reason; a live listing asks to pause first), Open chat, Preview as others see it, Preview as a contributor, See it on the marketplace.
- **Buyer side** (`?view=market`, "Testnet demo · shopping as Mira" with Shop as someone else): Media · Overview · Build · Contributors, the Marketplace block (Physical / Virtual NFT, This version / With future updates, royalties), no Code and no files before a purchase, the sticky Copies from / Buy a copy bar; **Buy a copy** through the demo wallet sheet with the web's re-checks, Purchase successful, then "You own copy #n" with every download. **A Feed sample's product** is read as a visitor, Buy off with the sample's reason.

## Home · Feed, Search, Notifications (M5)

From "Feed · 2026 update" and the master page's Global Search and Notification. Clips are the web's Innovations posts (`lib/innovations/clips.ts`); the phone's own choices live in `lib/innovations/{feed-prefs,search}.ts` and `lib/notifications/phone.ts`.

- **Feed (Home)**: full-screen clips of what is shared on the marketplace — each post a Project clip, each further product with its own video a Product clip. The clip on screen plays muted and looping; tap pauses or plays. The title and description open the project or product details, the creator their profile, Follow is the web's follow. Feed | Following (`?tab=following`; nobody followed → Search People). Text over the clip is white. Only what is on the marketplace (owner 2026-11-12): a clip with nothing on sale stays off the Feed, its link says "This clip isn't here". No chip row: an icon before the title says project (layers) or product (chip); no Minted mark, since a listing goes live only after the mint; the project's Activity stays on its details page. The clip's text keeps to about a fifth of the screen (owner 2026-11-12: the offer cards covered half the video): creator, title (two lines at most), one line of description with "more", and one slim marketplace pill (bag disc, "Main NFT · 0.8 ETH", "+2", ›) that opens the item's marketplace, where every offer and the Testnet note are. The bottom scrim is 40 % tall.
- **Side nav**: 3D (the item's render; samples have no 3D file), AR/VR mode (checks WebXR, says why there is nothing to place), appreciate with its count, comments with their count, Share to your Feed, ⋯. **Offers** on the clip: Main · Physical · Virtual NFT cards, Testnet demo, Buy → the item's marketplace.
- **Comments** (DS M100 in the tall sheet): Top / Newest / Oldest, threads with "View n more replies", Reply · ♥ · ⋯ (yours: Edit, Copy link, Delete; others': Copy link, Report), the pinned composer with Link, Image, @mention and Replying to @Name; written to the web's comment store.
- **⋯ menu**: Interested / Not interested (reorders the Feed, Undo), Hide video (Undo), Save video, Copy link, Playback speed (0.5–2), Video quality (Auto or the clip's own height; Data saver waits for a tap), Report (the kit's sheet with the web's post reasons; Tell us more under Something else).
- **Share to your Feed**: Post audience (Public / Only me), a caption, Share now. **Saved** (`/m/saved`): two tabs, Saved · Appreciated (`?list=appreciated`); saved clips with Saved on and ⋯ (View original post, Copy link, Unsave with Undo), the appreciated ones with their creator and Remove from Appreciated. **Marketplace activity** (`/m/market-activity`): weekly average price and volume (demo dollars), sales per day over 7 · 30 · 90 days, the sales list.
- **Queue pill**: while a build of yours waits, "Please wait. Your build is next in line" (or n ahead) opens the AI tab. **One clip** (`/m/clip/<id>`, `?comment=` opens its comments; a missing clip says so).
- **Global Search** (`/m/search`): Recent searches (Clear all, ✕ each); typing suggests People, Projects and Blogs with the match highlighted; results under People · Post · Projects · Parts & Agile Module · Marketplace · Blog (View all or one kind), People with Follow; `?q=` / `&kind=` kept in the address; a blog opens in the phone's reader (`/m/blog/<slug>`).
- **Notification** (`/m/notifications`): the web bell's notices under All / Unread, grouped New · Today · Yesterday · by date; each with its button (opens its phone screen, marks it read) and ⋮ (Turn off notifications like this with Undo, Mute this project, Delete); the header ⋮ has Mark all as read, Notification settings, Clear all (asks first; clears this phone's list only).
- **Guests** browse Home after Explore first; appreciating, following, commenting, saving, sharing, reporting, buying, and opening details, search, notifications or activity ask them in (the guest gate).

## Message tab (M6)

From "People · 2026 update" (MS-01…51) and the Shared kit's message frames, on the web's Messages store, rules and actions (`lib/messages/`); the phone's own reading is `lib/messages/phone.ts`, its outbox `lib/messages/use-outbox.ts`.

- **Messages** (`/m/messages`): Inbox · Requests with counts, live search, All · Unread · Archived and the Project sheet; rows with the relation badge, subject, last line, time, unread count and muted mark; swipe left to Archive / Unarchive with Undo. Conversations start from a profile, post or listing (`mStartHref` → `/m/messages/new`).
- **Requests**: the quiet-mode and hidden-words lines as alerts; a request has Accept ("Moved to your Inbox."), Delete ("Request deleted.") and Block; replying keeps it in Requests. **States**: bones after 300 ms, empty Inbox and Requests, no results with Clear search, the offline banner over cached rows, Couldn't load with Try again.
- **A thread** (`/m/messages/<id>`): "Name · relation" (tap for the profile) or "Team · N people" (tap for Members); the context card folding to one line while you read back and ending as Project deleted / Post removed; the safety line, day breaks, runs of bubbles, the scam hint under a risky message; marked read on opening.
- **Composer**: + opens Photo (the photo pre-prompt once) · PDF · Project; thumbnails and chips with ✕ and the web's file rules inline; the field grows to five lines, Enter sends, the counter from 1,800 characters.
- **Hold a message**: theirs Copy · Report message; yours within 15 minutes Copy · Edit · Delete (asks first), then Copy only; Edit shows "Editing message"; swipe right to reply (the quote above the sent bubble).
- **Sending**: Sending… until stored; sent offline or refused, it stays on this phone as Not sent with Retry · Delete.
- **⋯ menu**: View profile · Mute · Archive (Undo) · Report conversation (Also block) · Block (asks first, toast with Undo); blocked by you → Unblock in place of the composer; blocked by them → "You can't reply to this conversation."
- **Team thread**: "Name · Role" with avatars, the Members sheet (Open Team), team ⋯; a deleted project replaces the composer with "This project was deleted."
- **Attachments**: photos open the viewer (n of N, ← →, Save photo), PDFs the phone's preview, shared projects as cards. **Starting** (`/m/messages/new`): the existing thread, or a draft the first Send creates, or one card saying why it can't start.

## Profile tab and creator profiles (M7)

From the master page's Main Profile and Main Profile-search and "People · 2026 update" (PR-02…45), on the web's profile (`lib/people/*`, `components/profile/*` hooks); the phone's own words and addresses are `lib/people/phone-profile.ts`.

- **Profile hub** (`/m/profile`): Settings and Search in the top bar; your card opens your profile; Wallet with your $IDZ (Testnet demo; "Not connected" while the demo wallet is off), Refer and Earn, Projects, Saved Items; Settings opens in place on General · Payments · $IDZ Pay · Security · Help and Support · Others; Log Out asks "Sign out of IDEEZA?", then Welcome says "Signed out". No Friends (D-1).
- **Profile search** (`/m/profile/search`): creators and videos as you type; recent searches on this phone (apart from Global Search's), See all past five, ⋮ → Delete; a no-results line.
- **A creator's profile** (`/m/creators/<handle>`, `me` is yours): cover and photo, name (Demo creator on samples), headline, where · local time · since when, the tie only you see, Open to, the four counts from shared work, About with Show more, More about (skills, specialties, languages, links, social), then Projects · Activity (the featured project card with Appreciate, Comments, Views and Save on the Feed's stores; More projects; activity rows open the project).
- **Someone else's**: Follow / Following (Unfollowed with Undo) and Message, side by side under the profile's facts where your own profile has Edit profile (never a sticky bar, owner 2026-11-24) (a conversation about a subject you share, else off with the web's reason); ⋯ Share profile · Report profile (Also block) · Block (confirm, toast with Undo); blocked shows Unblock and hides them; offline turns Follow and Message off with the reason.
- **Your own**: Share and ⋯ (View as public · Privacy & safety), Add / Change cover, Only you see this (public and private projects, You follow n → the Following sheet with Unfollow and Undo, the locked row), pin up to 3 projects from a card's ⋯, Edit profile; View as public shows what others see (locked: "This profile is locked"); "This creator isn't here" with Go to Feed; "Couldn't load this profile" with Try again.
- **Edit profile** (`/m/profile/edit`): cover and photo (camera or library, resized on the phone), About you (name, English-letters name, headline with Suggest from my work → AI draft with Use this / Discard, About, location, Open to), Skills (up to 16, top 3 specialties with years, languages), 5 links, social accounts; Save stays off until something changes; errors focus their field; leaving with changes asks Discard changes?; a refused save keeps every field; saved returns with "Profile saved".

## Settings and Sign-in & security (M7)

From "Settings · 2026 update" (ST-01…93) and "Account · 2026 update" (AU-07, AU-33b, AU-40…65), on the web's stores (`lib/settings/`, `lib/account/`); the phone's sign-in security is `lib/account/security.ts`.

- **Settings** (`/m/settings`): Find a setting (the web's search; "Page › Row" opens the page at the row), the account card, Preferences with each page's state as its value, Money (Plan & pricing, Get paid, Balance, Verify your identity), Help, Sign out, the version; bones while the stores are read.
- **Every page**: toggles save as they change, pick-one sheets on Done with "Saved"; a refused write snaps back with "Couldn't save. Nothing changed." and Try again; offline shows the banner and greys the controls.
- **Account**: the public profile card (Edit profile), Handle (Copy, Edit with the web's rules, "Handle saved"), Legal name (private), Wallet (Testnet demo; connect, Disconnect after a confirm).
- **Notifications**: push is the browser's permission (pre-prompt, blocked with steps), How often, quiet hours (Let sales through), keep notices, the seven kinds with Bids to hear about, Muted projects (Unmute with Undo).
- **Privacy & safety**: View as public, Lock profile, location, search engines, who can message / comment, Take a break; Blocked people (Block someone, Unblock with Undo), Hidden words (× with Undo), Your reports, each with its empty state.
- **Language & region** (voice, date format, time zone in searchable pickers, Automatic first) and **Appearance & accessibility** (Theme at once, text size, high contrast, reduce motion, units, data saver).
- **AI & your data**: where data goes, the AI switches, Search history, Blog reuse (Revoke), Download your information (zip with progress), Restore from a backup, Erase IDEEZA from this phone (type ERASE).
- **Sign-in & security**: Email (change with a code to the new address), Password (change, or Add a password after a code for a provider-only account; Sign out of other devices), Google · Facebook (connect through a Demo sheet; disconnect after a confirm; never the last way in), Your devices (this phone live, a device's sheet, Sign out of all other devices), Delete account.
- **2-step sign-in**: on with a setup key and an authenticator's 6-digit code (RFC 6238, so a real app works), then 10 backup codes; off with the password. A sign-in on an untrusted phone asks the code first (`/m/two-step`): wrong, five wrong lock it for 5 minutes, a backup code once, Don't ask again on this phone. Open authenticator app is a Demo authenticator (prototype only).
- **Sign out**: a neutral sheet (offline: Sign out anyway), then Welcome with "Signed out"; the phone forgets Explore first. The Profile hub's Log Out opens the same sheet.
- **Delete account**: why (optional), what you'll lose (real counts; blocked while a withdrawal or a bid is open), keep a copy (download), confirm with the password (or the provider), deleted in 30 days with live listings down now; signing in before then offers Restore (`/m/restore`, "Account restored"), after it the account is gone.
- **Shared kit**: "Another phone signed in" (prototype only) adds a Demo device to Your devices.

## Plans, payments, KYC and Help (M7)

From the master page's plans, checkout, AI credits, billing, success/failed, payment method, IDEEZA pay, KYC, FAQ & contact support, Report a issue and Tutorial sections, on the web's plans, credits, billing, payouts, identity, reports and tutorials (`lib/create/`, `lib/account/`, `lib/commerce/`, `lib/support/`, `lib/tutorials/`); the phone's own pieces are `lib/commerce/kyc-levels.ts`, `lib/account/money-phone.ts` and `lib/support/{faq,support-chat}.ts`.

- **Plan & pricing** (`/m/plans`): Plans · Credits · Billing; Monthly/Annual, the web's four plans with buttons by relation (Upgrade · Downgrade · Switch to Free · Current plan · Starts on), the welcome offer price, the compare table, Pricing FAQs.
- **Credits**: the balance chip opens Current credit; the three packs at the plan's discount, Compare credit discounts, Upgrade to unlock, a custom amount from 50 (Better deal available when a pack is cheaper).
- **Checkout** (`/m/plans/checkout`): the web's quote (unused time, annual discount, welcome offer, plan discount); Card and PayPal not available yet; Crypto pays USDT or IDZ on Base Sepolia through the wallet sheet; auto-renew; then Upgrade completed / Credits added (invoice or receipt) or Payment failed (Try again, Change payment method). The coupon field says no coupon codes are on offer (or "Welcome offer applied").
- **Billing**: the current plan, Downgrade plan (`/m/plans/downgrade`), Cancel subscription sheet, Keep plan, invoices (`/m/plans/invoice/<id>`, Download PDF). **Current credit** (`/m/plans/credits`) and **Credit history** (every lot: Active / Used up / Expired).
- **Payment method** (`/m/settings/payments`): Wallet Connect connects the Demo wallet as the default (real wallets Soon); ⋮ Pay with IDZ / USDT, Manage wallet, Remove (asks first); Card and PayPal not available yet.
- **Get Paid** (`/m/settings/idz-pay`): the balance, Withdraw money, withdrawal methods (Add a crypto wallet: setup → review → signed; Make default, Remove), **Withdraw** (full or other amount, signed, Withdrawal recorded), **History** (totals, search, filters, Transaction details with Share and Download receipt, Download statement → Withdrawal statement). Bank, Payoneer, PayPal and tax forms are off with their reason (the web has none).
- **KYC** (`/m/settings/kyc`): three levels with status; Level 1 (legal name, email, country, mobile → a six-digit code from a Demo text message → verified; Reset); Levels 2 and 3 (What you'll need → camera pre-prompt → Demo ID check → Under review → approved or rejected by the "Demo reviewer" in ⋯, prototype only).
- **Help** (`/m/help`): searchable FAQs, then Contact support (`/m/help/contact`: each message goes to the team as a report and the reply gives its reference), Report a problem (`/m/help/report`: the web's fields, up to 3 screenshots, page and device details opt-in, Report sent with its reference) and Tutorials.
- **Tutorials** (`/m/tutorials`): search, category cards with progress, Tutorial details with the ☰ topics sheet, articles, video cards ("Video coming soon" until the files arrive; Earn → % watched → Claim → Claimed), Previous / Next.

## Earn Coin tab (M8)

From the owner's master page (Wallet Balance, Stacking, Refer & Earn, Buy IDEEZA Coin) on the web's IDZ balance, ledger, presale and demo wallet (`lib/wallet/`); staking and referrals are demo logic in `lib/wallet/{staking,referral}.ts`, recorded in the same demo wallet, so every balance agrees.

- **Earn Coin** (`/m/earn`): Buy $IDZ Coin, Stake IDZ, Refer and Earn Coin, each opening its tab (Buy $IDZ · Stake · Refer & Earn); ⋯ holds Wallet balance and the Demo wallet (connect, demo account 1–3, network).
- **Balance card**: the network chip, the IDZ figure with "= $…" at the one IDZ price, Available · Staked · Ready to claim · Pending, the demo IDZ token address to copy; not connected: "No data found" with Connect Wallet.
- **Buy $IDZ**: each presale purchase as a card (Txn ID and wallet copy, You paid, date) filtered by Chain Type and Status; "Unlocks in" counts down, then Claim through the wallet sheet, then Claimed.
- **Buy IDEEZA Coin** (`/m/earn/presale`): the round countdown, Until price increase, Total USD raised (demo), the one price; Buy With Crypto → Connect Wallet (Demo wallet first, the four real wallets Soon, "I don't have a wallet" → Need a wallet?); You get ⇅ You pay, the coin sheet (ETH/USDT/USDC), whitelist discount, gas line, Max and the web's checks; Buy $IDZ through the wallet sheet, then Purchase successful counting down to the claim.
- **Wallet signing** (KIT-WS-01…05): connect and switch-network sheets, review with the request rows, network fee and risk line (a shortfall disables Confirm with the reason), waiting, confirming; "You cancelled in your wallet" / "That didn't go through" say "Nothing changed." with Try again or Close.
- **Stake**: each stake as a card with Withdraw (in the grace time and after the lock-up; locked between, with the reason), Staked and Reward, lock-up progress, TXN ID and Claim / Claim in … / Claimed, filtered by Month and Year; paused and blocked contracts show their own states (Get support). A staking day lasts a minute in the demo. "Demo: contract states" in ⋯ sets paused / blocked (prototype only).
- **Stake List** (`/m/earn/stake/contracts`) searches contracts by name or address; a **contract** (`/m/earn/contract/[id]`) lists its options (Est. APR, lock-up, reward token; closed ones off with the reason); the Stake sheet checks balance, wallet limit, gas and the contract's state, shows the reward over the lock-up and stakes through the wallet. **Stake detail** (`/m/earn/staked/[tx]`) lists each reward share (Claim in … / Ready / Claimed) with Claim All.
- **Refer & Earn**: Generate Link asks for the wallet first; the campaign card shows the link to copy, Referred Users · $IDZ Earned · Points, the lock-up countdown, then admin approval, Claim all points as IDZ (1 point = 1 IDZ) through the wallet, then Join the next campaign; activity filters by campaign and searches by name. "Simulate a referral" plays a demo creator using the link (prototype only). **Campaign History** (`/m/earn/history`) with a Date Range.
- **Wallet Balance** (`/m/earn/wallet`): Buy IDZ · Stake IDZ · Import IDZ, every IDZ movement (rewards, mints, credits, presale buy and claim, stake, withdraw) filtered by Chain Type and Transfer Type, 10 at a time with Show more; Import IDZ token shows the contract address, symbol and decimals to copy.

## Shared kit (M0)

`/m/kit` (prototype only) opens every pattern of the Figma "Shared kit · 2026 update" page:

- **Sheets** (M09): handle, title + description + ✕, scrolling content, stacked XL actions, home indicator; one scrim, even with a sheet opened over a sheet; Escape, the scrim and dragging the handle down close it; focus stays inside and the app behind is inert. A tall sheet stops 61 px under the top; with the keyboard up the sheet fits above it.
- **Menus** (M12 action sheet): a centred title, 40 px rows with a 16 px icon, the one red destructive row last, Cancel.
- **Confirms**: neutral (KIT-CF-01, "Keep editing"), destructive (Block, KIT-RB-20), typed delete (KIT-CF-03: the action stays off until the name matches; the mismatch shows on leaving the field), can't-yet (KIT-CF-04: sends you where to fix it). While one works it can't be closed; if it fails, an error says nothing changed and the action becomes Try again.
- **Report sheet** (KIT-RB-10…19b): a reason list per target, a 500-character note, Also block; Send report stays off until a reason is picked; Sending…, couldn't send (note kept, Try again), offline (closing keeps the report for that target, reopening brings it back, Send report turns on when back online), Report sent (and "You blocked … too"). Typing the note folds the reasons to the picked one.
- **Toasts** (M02): one at a time, 8 px above whatever is at the foot (tab bar, bottom bar, home indicator — or an open sheet's actions, over the sheet, still tappable), kept there as the screen changes; 4 s, 6 s with an action (a 44 px tap area); success, error and no-icon leads; the build toasts (Building … with its progress bar, Build ready, Build stopped). "Back online" shows when the connection returns.
- **Permission pre-prompts** (KIT-PM-01…04): camera, photos, microphone and notifications sheets, each once per phone.
- **States**: list-row bones after 300 ms (KIT-SK-01), empty, error and not-found cards (M48 / M49, ER-04 "This project isn't here" + Go to Feed), the offline banner (M01).
- **Also in the kit**: M14 tabs, the eyebrow, the list card and rows, the 44 px search, the media chip, code cells, the pick-one sheet (and A06 select over it), the Bottom action bar; links to the account states the demo can't cause.

## Review fixes (2026-11-12)

A 21-reviewer pass (UX, QA, typography, visual) found about 550 issues across `/m`; branch `fix/m-review` fixes them area by area. The per-area logs are kept outside the repo (`IDEEZA_Creator-wt/_review/fix-<area>.md`).

- **One type scale.** Every text style in `/m` comes from the 16 roles in `components/mobile/type.ts` (`T.*`); `tests/projects/mobile-type-scale.test.mjs` is strict and fails on any raw size.
- **Shared kit:** `TopBar onBack` (forms ask before Back drops work) and `titleAs`, `ImageViewer`, `MobileTabs` + `useTabParam` (tab taps never fetch and work offline), one scrim for stacked sheets, toasts never cover a sheet's rows, list cards and dividers on real border tokens.
- **Messages:** buyer start links honour `as=`, so "Ask the creator" reaches the creator.
- **Profile:** the hub's General and Others open real index screens (`/m/profile/settings/{general,others}`); Edit profile asks before any way out loses changes.
- **Settings:** the Money rows open Get paid, Wallet balance, Payment method, Credit alerts (`/m/settings/credit-alerts`) and Billing details (`/m/settings/billing`).
- **Plans:** coupon codes at checkout, Pay off while offline, Get paid at the one IDZ price with a by-project split.
- **Wallet signing sheet:** wallet card, every charge, Total to pay now, Balance after, Reject.
- **Account:** Reset signs out other devices, Add your email checks a code, Where did you hear about IDEEZA, the welcome offer and the phone tour.
- **Feed:** your shared projects and Share to your Feed show in the Feed, Search and Saved; every notification opens its own screen.

## Mobile UX pass (2026-11-15)

Owner: "the mobile app must work the way mobile UX works, not the web made responsive." A 12-designer team reworked every area against one lens (`_review/MOBILE-UX-BRIEF.md`): summaries before tables, explanations behind ⓘ, hub rows instead of 4+ tabs, rows instead of text links, one primary in the bottom bar, media first on object pages, one header. Every requirement stays; what moved where is in `_review/ux-moves.md`. The approved designs (way in, create flow, Feed clip, tour, buyer pages) were not restyled.

### Shell and kit

- A running build shows as a slim bar docked under the tab screen's header (`Screen`'s top dock slot); the render tray docks above the screen's foot. Neither ever covers content.
- `kit/dock.tsx`: `<DockSlot edge="top|foot" />` for screens that don't use `Screen` (the Feed); floaters portal into the newest slot.
- Every tappable row, menu row, ✕, top-bar button and tab shows a pressed state (`kit/press.ts`: the DS state layer, only on enabled buttons and links).
- Empty, error and not-found states are clean mobile states: no card edge, centred, one action.
- A hairline marks the header's edge once a screen or a sheet scrolls (`kit/scroll-edge.tsx`), skipped under a tab strip.
- A toast never sits on a field being typed in: it stands 8 px above it.

### Projects

- **Project page** (`/m/projects/<id>`), a native object page: the project video in use (with one product, that product's video; else the cover, which opens the build images with Use as cover) on top; the name once, then one line with the status chip (the Shared eye inside it) and the stage words; the description (3 lines, Show more) or Add a description; the lock line as a row to the sale; a newer version's notice with Review version n.
- **Products** is the page's main content: the line, the Build check, every product up to 5 (else 3 + All n products), a chat's product in progress, Add a product last. Then the description tip (slim, ✕ Not now), the hub rows Activity (Now: …) · Media (the project video's state) · Versions (version · saved) · Team · Network, About (Created, Parts, Stored) and Recent.
- **Screens at the old tab addresses:** `?tab=products` (Search + Sort from 6, Add a product in the bar), `?tab=media` (the project video's action in the bar; Takes and What's in this video as sheets; product videos as whole-row taps), `?tab=activity` (Add new activity in the bar); each has Back to the page, which comes back where it was scrolled.
- **Bottom bar:** Publish + Earn while the project can be published; once it's out, the live fact ("Listed", "Sold 40%") beside Earn as the primary.
- **Team, Versions, reviews:** Team conversation, Splits and each chat are rows; Message is a 44 px icon button; the project video review keeps one primary (Use this video) with Make another take · Change scenes · Decide later as rows.

### Earn: hub, Money, Business plan, video

- **Earn** (`/m/projects/<id>/earn`) is a hub, not tabs: the top bar "Earn" (it takes the project's name once the large title scrolls away; ⋯ = Preview as others see it, Sell copies of a product), the name with the status pill and the lock line, then the summary, the rows Sell · Business plan · Money (each with its live line) and the state's one action in the bottom bar.
- A row pushes its section in place (`/earn/sell`, `/earn/plan`, `/earn/money`, pushState: no fetch, Back returns to the hub); a link or reload opens that address directly with Back to the hub; `#copies`, `#splits`, `#customers`, `#rights` are scrolled to.
- Overview summary: once live, "You're selling / Given away / Sold", the state with ⓘ, Earned large, Price · Copies sold · Bought by; the finished checklist folds into one row. Before that, the checklist is the summary; the step's action waits in the bottom bar with "Unlocks when the steps above are done." and a press brings the next fix into view.
- Business plan: kit empty / error states, the run row (tap = Show progress), the Version row, Jump to section, ⋯ in the top bar; the foot holds Generate business plan / Try again / Stop writing / Continue writing + Start over / Print or save as PDF.
- Money: Your earnings first (coins large, dollars at demo rates, Withdraw in Get paid row), then Splits, Sales and Rights as grouped lists with ⓘ; adding is each list's last row.
- Product video: the review's and Your clip's primary sit in the bottom bar; "What's in this video" opens a sheet; Back is the form's Cancel.

### Earn: Sell, listing, mint

- **Sell** (`/earn/sell`):
  - "Whole project" with ⓘ What you can sell, then the Main NFT, Physical and Virtual rows, each with its live state (green while on sale). Then "One product at a time" (`#copies`), one group per product. Before the mint, the copies fold into one line.
  - A row opens what's next: the mint (not minted), the item's screen, or the Sell copies sheet (nothing made yet).
- **Main NFT screen** (tap the row once minted):
  - the summary (the price large, 3 facts, All details, "Selling the Main NFT sells the project."), and "Before you can list" as a state card;
  - rows: Activity, Bidding History, Mint details (a sheet), View on marketplace, then Edit listing and Remove listing;
  - one BottomBar primary: Sell, Close auction or Relist.
- **Copies screen**:
  - one card per use: On the marketplace, the price, the price with future updates, Copies sold, Royalties; ⋯ opens Edit, Add copies and Remove listing;
  - Activity;
  - one BottomBar primary: Add to marketplace or Sell … copies too.
- **Listing terms** (Add to marketplace, Edit listing, mint Details):
  - what the mint fixed is one read-only list ("Set when it was minted.");
  - the price sits with its Token;
  - More options holds Minting type, Royalties and Holder benefits, and opens itself on an error;
  - the submit is the BottomBar's one primary.
- **Mint**:
  - the web's four steps, never more;
  - a step bar, "Step n of m · step", and the title with ⓘ;
  - one full-width primary with "… · Saved as you go"; Back is the top bar's;
  - Review leads with a summary card;
  - Done shows the ownership proof as a receipt card, then rows.
- **NFT activity**: an Activity row on each NFT screen. The history's primary is Add activity, and none yet is the kit's empty state.

### Product

- **Product page (owner)** is one scroll, media first: the take in use (muted, looping, Pause/Play) or the concept image of the version on screen (full-screen viewer); one header (name, "{project} · AI build · {date}", lock line, description); then Build, Media, Activity and Specs as list cards. The name moves into the top bar once the title scrolls away; ⋯ is the M12 action sheet (Rename, Open chat, Preview as others see it, Preview as a contributor, See it on the marketplace).
- **Build section:** "n of N pieces ready" beside the heading and its ⓘ (the seed caption, "View only on a phone", the computer note); the piece rows (create flow icons, Ready · Failed · Building with its bar · Waiting · Not built with + Add) and Add the rest; Build check (See why while a Draft), Version (more than one), Downloads (sheet).
- **Media** is a row (video status, image count) opening `…/media`: the review strip, the player or render state, What's in this video, Takes, Images, and Generate AI video / Regenerate in the Bottom bar. Buyers keep Media as a tab.
- **Activity:** + beside the heading, the newest entry, History (n), NFT activity (Earn › Sell, n on sale). The history screen has one line under the bar and Add New Activity in the Bottom bar.
- **Piece screens:** failed, waiting, building and not built are the kit's clean states with their one action in the Bottom bar (Rebuild this piece + Open chat; Add pieces); a ready piece's file is the bar's primary. Parts lead with the Summary grid and list each part as a row; Pin to pin is a row per wire.
- **Buyer side** (`?view=market` / previews): the same hero and header, the Testnet banner under the header, tabs Media · Overview · Build · Contributors; the Marketplace block lists each copy as a row (no inner tab strip).

### Feed screens

- Search starts with Recent searches, then Browse (a row per kind that lists all of it) and a Search history row (On / Off → Settings › Data › Search history); typing puts "See all results for …" first.
- Search results: All plus the eight kind chips; people are rows with Follow at the end, posts a two-column grid of covers (♥ · comments · views on the picture, ⋯ the clip's menu), projects, parts, blogs, settings and help list rows, marketplace items product rows with the price and Buy now / View Auction; each group's heading has View all.
- Notifications are rows: the whole row opens the notice and marks it read; the kind's icon (a dot while unread), "tag · time", the title, two lines of body, the notice's small button(s), ⋮.
- Saved: Saved · Appreciated tabs with counts, no heading over the list. Marketplace activity: 7 / 30 / 90 day tabs, the week's average price and volume as two figures, compact sale rows that open a sale sheet (ID, from, to, quantity, View project / View sale).
- Comments composer is one growing line with Link · Image · @ and Post inside the box; Share to your Feed shows the clip being shared; the ⋯ rows show the current speed and quality.
- AR/VR mode: a slim ⓘ line over the stage says why there is nothing to place (its sheet has the detail), View in AR at the foot; the blog reader leads with the cover. The build bar and render tray dock under the Feed's top nav.

### Messages and account

- **Messages** rows read as a chat app's: the name with its relation badge and the time on one line, the subject, then the last line with the unread count (the time and the last line stand out while unread); rows run edge to edge with an inset line and darken while pressed.
- **Requests**: quiet mode ("You're taking a break until …", opens the break setting) and hidden words (Show / Hide again, Hidden words) are rows under the list.
- **A thread**: the top bar shows the avatar, the name and how they stand to it (a team: "Team" over its size; tap for the profile or Members); the subject is pinned under it as one bar (cover, name, how it started, chevron), folding to the name while you read back; the safety line is a centred system note.
- **Request bar**: one sentence with ⓘ (what Replying and Accept do), then Block · Delete · Accept.
- **Where did you hear about IDEEZA?** is one header over six full-width rows; **Welcome map** shows the free credits as a fact tile and the five stages as a timeline.

### Profile

- **Profile hub**: a tab root (no Back) laid out as grouped inset lists: your card (photo, name, headline, @handle · View profile, level and XP, chevron), then Wallet · Refer and Earn · Plan & pricing, then Projects · Saved Items, then Settings opening in place inside its own card, then Sign out as a row. Every row that opens something has a chevron. General and Others are the same kind of list.
- **A creator's profile**: the top bar takes the name once the large name scrolls away; one meta line (where · local time; with no location, since when); Open to and the tie as chips; the counts centred; "Building on IDEEZA since …" sits under the More about sheet's title. Your own: "Only you see this" is a small grouped list (public projects, private ones, You follow n, locked), and Edit profile is the bar's primary.
- **Edit profile**: the picture block (cover, photo over its foot, Add/Change on each), then grouped rows (label over value) that open focused sheet editors: Name (with the English-letters name), Headline (Suggest from my work), About, Location, Open to, the skills sheets, one row per link (Remove link inside, Add link at the foot) and one per social account. Editors write the draft as you type; a link or account is checked when its sheet closes (Done stays open on an error); Save checks everything and reopens the first bad field; Back closes an open editor first; Discard changes? as before.
- **Profile search**: See all / Show less is a row at the foot of Recent searches; "nothing yet" and "no results" are the kit's empty state (Clear search as its action).

### Settings

- Every Settings page, Sign-in & security included, is the kit's grouped rows: toggle on the right with one line of help, the value and chevron on rows that open something, destructive rows red and last.
- Words that don't fit on a row sit behind an ⓘ (`InfoButton`, `SettingsGroup info`, `SettingsRow info` in `settings/kit.tsx`): What each notification covers, This phone / IDEEZA's server, the AI switches, Download, Restore, Blocked people, Blog reuse, Hidden words (top bar).
- Account: the public profile is one row to Edit profile; Handle opens its editor, which also copies the profile link.
- Sign-in & security: Sign out of all other devices is an action row in Your devices; Delete account the red row at the foot.
- Notifications: "Set the low mark" is a row under Credits and plan; while push is blocked the Push row opens Allow notifications.
- AI & your data: Keep this phone from clearing it opens a sheet with Ask.

### Plans, Get paid, KYC, Help

- Money screens lead with their figure (`plans/parts.tsx` `Hero`): Get paid's balance, Withdraw's amount, the credit balance, an invoice's total; explanations sit behind ⓘ (`InfoButton`, `InfoLine`) and the one primary is in the Bottom action bar.
- Plan & pricing: plans and credit packs are pick-one lists (`RadioCard`); the picked plan's button (by relation) or "Purchase now · $x" sits in the tab's bar (`PlanFoot` portal); Compare plans and Pricing FAQs open in tall sheets; Billing is a hub of rows (Auto renewal, Benefits, AI credits, Payment method, Billing details, Downgrade, Cancel).
- Get paid: balance (rates in ⓘ), one identity row, By project, Withdrawal methods (row → ⋮), Get paid in (row → pick sheet), tax as an info line; Withdraw money in the bar (Go to your projects before anything sells).
- Checkout: the total and Connect wallet / Pay $x in the bar; Card and PayPal are an info line.
- Payment method is one screen (no tabs): your Demo wallet with Pay with / Manage / Remove rows, then Card, PayPal and the real wallets as "Not available yet" rows.
- KYC levels are one list; Level 2/3's Start KYC verification is in the bar. Contact support's mic replaces Send while the box is empty. Tutorials list categories as rows.

### Earn Coin

- **Earn Coin home** opens with the Current Balance. It shows the Available figure with its dollars and the Testnet demo badge, then Available · Staked · Ready to claim · Pending. When presale IDZ is ready, a claim line with Go to claim appears, and a Wallet balance row sits under them. Below that, "Ways to earn" holds four rows (Buy $IDZ Coin, Stake IDZ, Refer and Earn Coin, Watch and earn IDZ), each with a live line and a Ready badge. The full sentences are behind ⓘ.
- **The three tabs** each open with a compact balance strip that leads to Wallet balance. Filters sit in one row of chips. Each tab's primary action is in the BottomBar: Buy $IDZ Coin, Stake IDZ, and on Refer & Earn, Generate Link → Claim all points (with why it's off) → Join the next campaign. Import IDZ token and the Demo controls are in ⋯.
- **Records are rows; details are a tap away.** Tapping a purchase, referral or IDZ movement opens a sheet with every field. Each stake card leads to Stake detail, which shows the stake first, then All details, and has Withdraw and Claim All in the BottomBar.
- **Presale**: the round comes first (badge, countdown, next price, total raised, end), then the form. Available + Max sit in the You pay box. Buy $IDZ, or Buy With Crypto + Don't have a wallet?, is in the BottomBar. Connect Wallet lists the wallets as rows.
- **Wallet Balance**: the hero has the network chip, the claim line, the token address and the tiles Buy IDZ · Stake IDZ · Import IDZ. "About IDZ" is two rows (Buy credits with IDZ, My projects). The ledger is shown as rows.
- **One testnet mark per screen**: the hero's badge, or a single test-tube line at the end of the screen.

### AI tab

- **Start**:
  - the hero has one line ("Describe a device in plain words.") over the five piece chips;
  - Start from an idea shows two-line chips (picture or sparkle, title, parts) right above the pinned Prompt Box, three at a time with Shuffle;
  - out of credits, a slim row above the box says "Not enough credits for a concept." with Buy credits;
  - every composer control is a 44 px target.
- **The question**:
  - the reading card folds once the question is asked;
  - What should we build? is one grouped list (whole-row ticks, trash, "Always included"), with the web's note behind ⓘ and Continue / Start drawing in a foot that sticks to the screen's foot;
  - Which project…? lists "+ Start a new project" (its name field under it) and the existing projects as pick rows in the sheet, with the decided products as a row back to the question.
- **History**:
  - each tab is one grouped list: thumb, title with its time, one line of prompt or pieces, then project and build count;
  - a failed build has a "Steps · k of n ready" row (each failed step with Retry) and Try again.
- **Network**:
  - each link is a row (both ends' pictures, ends, how it connects or what's wrong, what travels) that opens Change link;
  - Remove network is the card's last row;
  - Change link is three rows (Protocol, Direction, What travels) with Save link, and Back to suggested for a changed link.

### Sheet footers (owner 2026-11-15)

- A sheet's footer holds **one primary**. The ✕, a swipe down and the scrim close it, so no Cancel / Close / Done / Not now button sits under it when that button only closes. A reason or helper line (`<p>` in `actions`) is drawn above the button.
- A confirm (`ConfirmSheet`) puts the way back and the action **in one row**, the action on the right; labels too long for half a row stack.
- The footer is tighter (less padding above and below the button), and a sheet's body never squeezes a card: it scrolls.
- What a sheet needs is said once: "every product needs an AI video" is the sheet's description, not a banner plus a footer line.

### Back keeps what was open (owner 2026-11-15)

- A screen that sends you away from a layer or a sheet (Sell's Main NFT screen and its "Add to marketplace" videos sheet, a Copies screen, a step's Make videos sheet, the project page's Publish readiness) opens it again when you come back with Back or Close (`useBackState` in `nav-trail.ts`, remembered per path in this tab). Arriving any other way opens the screen clean.
- Generate video's render view: Cancel render · Close in one row; Close goes back to where you came from while the render goes on. A failed take: Close · Try again in one row.

