# Changelog

What changed in the live prototype (`main`), for the developers who build the
real product. Each change is one numbered entry (CL-###) that says exactly what
to build and how to check it is done, and links to its Jira ticket.

| CL | Change | In the prototype | Jira | Production |
| --- | --- | --- | --- | --- |
| [CL-011](#cl-011-redeem-a-code-for-ai-credits) | Redeem a code for AI credits | 16 Nov 2026 | [PR-9534](https://ideeza.atlassian.net/browse/PR-9534) | Ready for development |
| [CL-010](#cl-010-mobile-app-native-mobile-ux-everywhere) | Mobile app: native mobile UX everywhere | 15 Nov 2026 | None (owner: no ticket) | Not started |
| [CL-009](#cl-009-mobile-app-splash-onboarding-welcome-and-log-in) | Mobile app: splash, onboarding, Welcome and Log In | 9 Nov 2026 | Not created yet | Not started |
| [CL-008](#cl-008-mobile-app-create-flow-the-image-first-the-3d-as-the-result) | Mobile app create flow: the image first, the 3D as the result | 9 Nov 2026 | Not created yet | Not started |
| [CL-007](#cl-007-landing-page-events-section-moments-from-ideeza) | Landing page: Events section, Moments From IDEEZA | 8 Nov 2026 | [PR-9089](https://ideeza.atlassian.net/browse/PR-9089) | Ready for development |
| [CL-006](#cl-006-coupon-codes-when-buying-a-plan) | Coupon codes when buying a plan | 5 Nov 2026 | [PR-9062](https://ideeza.atlassian.net/browse/PR-9062) | Ready for development |
| [CL-005](#cl-005-each-account-has-its-own-work-a-new-account-starts-fresh) | Each account has its own work; a new account starts fresh | 4 Nov 2026 | None: prototype only | Nothing to build |
| [CL-004](#cl-004-welcome-offer-50-off-the-first-payment-for-12-hours) | Welcome offer: 50% off the first payment, for 12 hours | 4 Nov 2026 | [PR-9013](https://ideeza.atlassian.net/browse/PR-9013) | Ready for development |
| [CL-003](#cl-003-landing-page-the-way-into-ideeza) | Landing page, the way into IDEEZA | 4 Nov 2026 | [PR-9009](https://ideeza.atlassian.net/browse/PR-9009) | Ready for development |
| [CL-002](#cl-002-sign-up-and-sign-in) | Sign up and sign in | 4 Nov 2026 | [PR-9011](https://ideeza.atlassian.net/browse/PR-9011) | Ready for development |
| [CL-001](#cl-001-products-question-the-total-stays-at-the-bottom-of-the-screen) | Products question: the total stays at the bottom of the screen | 3 Nov 2026 | [PR-9012](https://ideeza.atlassian.net/browse/PR-9012) | Ready for development |

Each entry is one Story in Jira's IDEEZA-PRODUCT project (PR), under one of two
epics: [PR-9007](https://ideeza.atlassian.net/browse/PR-9007) **Landing Page, Sign
Up and Sign In** (everything before the Creator Panel) and
[PR-9008](https://ideeza.atlassian.net/browse/PR-9008) **Creator Panel**
(everything after signing in). A new entry gets its Story once its release is
approved.

Some changes exist only because the prototype keeps everything in the browser
(demo emails, demo accounts, demo data). They are marked **Prototype only**,
get no Jira ticket and have nothing to build; a line inside an entry that is a
demo stand-in says so.

<!--
How to add an entry: write it in the same merge that brings a change to main,
newest first, and add its row to the table. Each entry has: the title; the
prototype date, Jira link (a Story under its epic) and production status; Screen (where it is in the
app); What to build (a checklist of acceptance criteria: exact copy, every
state, mobile); Design (DS components and tokens); Before → After screenshots.
No code: no file names, functions or commit hashes. Screenshots go in
docs/changelog/ as <date>-<short-name>-before.png / -after.png.
-->

---

## CL-011 Redeem a code for AI credits

**In the prototype:** 16 November 2026 · **Jira:** [PR-9534](https://ideeza.atlassian.net/browse/PR-9534) · **Production:** Ready for development

**Screen:** Plan & pricing › Credits (`/settings/plan?tab=credits`): a new card between the three credit packs and Custom amount. Figma has no design for it; it is built from the page's own card and design system parts.

### What to build

- [ ] A card titled **Redeem a code**, with one line under the title: "Got a credit code from IDEEZA or an event? Enter it and its credits go straight into your balance."
- [ ] A text field (placeholder **Enter code**) with a **Redeem** button beside it. Enter in the field redeems too. What is typed shows in capitals; spaces and letter case don't matter (" ideeza 100" is IDEEZA100).
- [ ] A code has three things: the code, how many credits it adds, and the last day it can be redeemed (it works to the end of that day, UTC).
- [ ] Each code works once per account.
- [ ] A valid code adds its credits to the balance at once. The field clears, and a green line under it says: "{N} credits added from {CODE}, valid for 12 months. Your balance is now {B} credits." The **Current balance** at the top of the page shows the new total.
- [ ] Redeemed credits are valid for 12 months from the day they are redeemed, the same as bought credits, and are spent the same way (the credits that expire first are used first).
- [ ] **Credit history** lists the code as its own line: Type "Code {CODE}", the date, the credits, what remains, the expiry date, and Price "Free". The mobile app's credit history shows the same line.
- [ ] When a code doesn't work, the field shows its error state and a red line under it says why. Typing again clears the line.
  - Nothing typed: "Type a code first."
  - Unknown code: "Sorry, this code is not valid. Check the spelling and try again."
  - A plan coupon typed here: "{CODE} is a plan coupon. Use it when you buy a plan."
  - Past its last day: "Sorry, this code ended on {day month year}."
  - Already redeemed on this account: "You've already redeemed this code. Each one works once."
- [ ] On a phone-width browser the card stacks: the title, the line, then the field and **Redeem** in one row, the message under them.

Demo stand-ins (prototype only): the codes IDEEZA100 (100 credits), WELCOME50 (50), EVENT250 (250) and BETA20 (ended 31 Oct 2026).

### Design

- The Custom amount card's frame: radius 2xl, 1 px border, surface fill, 24 px padding.
- Title 20 semibold; the line Body 14, secondary text.
- DS Text Input 40 and Button Tonal 40, as in the plan checkout's coupon field.
- The message is Support Text 12/16: the input error colour for a problem, the success text colour when credits were added.
- No new colours or tokens; light and dark.

### Before → After

| Before | After |
| --- | --- |
| ![Before: the three packs, then Custom amount](docs/changelog/2026-11-16-redeem-code-before.png) | ![After: Redeem a code between the packs and Custom amount, after redeeming IDEEZA100](docs/changelog/2026-11-16-redeem-code-after.png) |

---

## CL-010 Mobile app: native mobile UX everywhere

**In the prototype:** 15 November 2026 · **Jira:** none (the owner asked for no ticket) · **Production:** Not started

**Screen:** the whole mobile app at `/m`. The owner reviewed it and asked that it work the way a phone app works, not like the website made smaller. Every screen was reworked by area. Nothing was removed: things moved, were grouped, or went one tap deeper.

### What to build

**Rules for every screen**
- [ ] One header: the top bar holds the context and takes the name once the large title scrolls away. No second title, link or chip stacked under it.
- [ ] Summary first. The 1–3 facts that matter come first (a large figure or a three-up fact grid); the full list sits behind **All details** or a row that opens it.
- [ ] Explanations take one line at most. Longer text opens from an **ⓘ** button beside the heading, in a sheet with the full words.
- [ ] No more than three tabs. A tab that held a whole workflow becomes a **row** (icon, title, live value, ›) that opens its own screen; Back returns.
- [ ] No text links outside sentences: a row with ›, or an action in the top bar's **⋯**.
- [ ] One primary action per screen, in the bottom bar (thumb zone). Secondary actions are rows or sit in **⋯**.
- [ ] An object's own page (project, product) leads with its picture or video.
- [ ] A running build shows as a slim bar under the header, and the video render tray sits above the bottom bar. Neither ever covers a title, a field or a button.
- [ ] Rows and buttons show a pressed state; every tap target is at least 44 px.

**Sheets and confirms**
- [ ] A sheet's foot holds **one** primary button. The ✕, a swipe down and a tap outside close it, so there is no Cancel / Close / Done / Not now button that only closes. A sheet whose only button was one of those has no foot.
- [ ] A reason the button is off (*2 products still need an AI video…*) sits above the button.
- [ ] A confirm (*Stop sharing to Feed?*, *Delete…?*) puts **Cancel** and the action side by side, the action on the right; labels too long for half the width stack.
- [ ] A sheet never squeezes its content: it scrolls.
- [ ] Coming back with Back or Close reopens what was open: the screen and sheet the maker left from (e.g. Sell › Main NFT › *Add to marketplace* → a product's video → Close lands on that sheet again). Arriving any other way opens the screen clean.

**Way in (follows the website's sign-up)**
- [ ] Onboarding: **Next** on screens 1–3, **Continue** on the last.
- [ ] Create account has the website's fields: first and last name, email, password with its checklist, re-type, date of birth (day, month, year), and the consent line in label size.
- [ ] After the code: *Where did you hear about IDEEZA?* (once, unless the link said), then the Welcome map. No handle step, no profile steps, no Face ID, no Apple anywhere (Google and Facebook only).
- [ ] The tour points at each tab: the screen dims around the tab, a small card with an arrow says what it does, with Back / Next and Skip. Tapping the lit tab is Next.

**Home · Feed**
- [ ] Only items on the marketplace appear, the maker's own shared projects too (they leave the Feed when nothing is for sale).
- [ ] A clip's text keeps to about a fifth of the screen: a type icon before the title (project or product), two lines of title, one line of description with *more*, and offers as one slim pill (*Main NFT · 0.8 ETH*, *+3*, ›) that opens the buy page.
- [ ] A clip that can't play says so in a small dark card that doesn't cover the side buttons.
- [ ] Share to Feed on a project with nothing for sale says *Share to Feed · List it first* and opens a sheet that goes to Sell. The mint flow offers Share to Feed after a sale listing only.
- [ ] Search: browse by kind and search history; *See all results* first; people as rows with Follow, posts as a cover grid. Notifications: the whole row opens it, an icon and an unread dot, one meta line. Saved: two tabs, **Saved · Appreciated**.

**Buying (someone else's item, or the demo buyer on your own listing)**
- [ ] The page leads with the clip's video, then the name, then a **buy box**: what is sold (*Whole project · Main NFT*), the price large, the facts three to a row, the wallet line, the last activity, *Testnet demo · shopping as Mira · Change*. Copies are rows with a small **Buy** (two prices ask which in a sheet). The bottom bar's **Buy now** buys the Main NFT.
- [ ] After buying: a receipt card (*You own 40% of the project*, Token · Paid · Purchased, **All details** closed).

**Project page (yours)**
- [ ] Media first (project video in use, else the cover), the name, the status chip and *Built · n products*, the description.
- [ ] Products are the main content; the description tip comes after them.
- [ ] Rows instead of tabs: Activity, Media, Versions, Team, Network, each with its live value.
- [ ] Bottom bar: Publish + Earn while it can be published, else the live fact (*Listed*, *Sold 40%*) beside **Earn**.

**Earn**
- [ ] One header with **⋯** (Preview as others see it, Sell copies of a product). The summary first: *Earned* large, Price · Copies sold · Bought by. Then rows **Sell · Business plan · Money**, each opening its own screen. A finished checklist folds to one row.
- [ ] Sell: Main NFT, Physical and Virtual as rows with their live state; each opens its screen (summary, *Before you can list* as one card, activity, edit and remove as rows, one bottom-bar action). The listing form has one bottom-bar button and puts advanced fields under **More options**. The mint keeps the website's four steps.
- [ ] Money: earnings first, then Splits, Sales and Rights as lists; adding is each list's last row.
- [ ] *Add to marketplace*: each product is one row (state, then *Generate AI video* ›) and both fit.

**Product page (yours)**
- [ ] One scroll, no tabs: the concept image (or video) first, one header, then Build (piece rows with their state), a Media row, Activity rows and Specs.

**Money screens**
- [ ] Get paid: the balance first, **Withdraw money** in the bottom bar, one *Verify your identity* row, demo rates and tax notes behind ⓘ.
- [ ] Plans, credits, checkout, withdraw: pick, then pay with the bottom-bar button.
- [ ] Earn Coin: your IDZ balance first, then *Ways to earn* as rows.

**Everything else**
- [ ] Settings and Profile: grouped rows with values and ›; long help behind ⓘ; Delete account red and last. Edit profile: the cover with the photo, then each field as a row that opens its own sheet.
- [ ] Messages: chat-app inbox rows (name, relation, time; subject; last line and unread count); the thread's header shows avatar and relation; a request is one sentence with ⓘ and Block · Delete · Accept.
- [ ] AI tab: the prompt box pinned at the foot, ideas as chips above it; the project question is one list with **Continue** pinned at the foot, and the prompt box steps aside while it's open.

Demo stand-ins (prototype only): testnet money, demo buyers (Mira, Leo, Sam), sample Feed items.

### Design

- Mobile design system only: the mobile type scale (no raw sizes anywhere), list cards and rows, bottom sheets (handle, title, ✕), the bottom bar, Primary / Secondary / Danger XL buttons, badges, the media chip and scrim for text on video.
- No new colours or tokens; DS default radius; light and dark.

### Before → After

| Before | After |
| --- | --- |
| ![Before: project page with no picture, two meta lines, a tip card and four tabs](docs/changelog/2026-11-15-m-project-before.png) | ![After: project page with the cover first and products as content](docs/changelog/2026-11-15-m-project-after.png) |
| ![Before: Earn with a stacked header and four tabs](docs/changelog/2026-11-15-m-earn-before.png) | ![After: Earn hub, summary first and rows](docs/changelog/2026-11-15-m-earn-after.png) |
| ![Before: Money with paragraphs and tables](docs/changelog/2026-11-15-m-money-before.png) | ![After: Money, earnings first and lists](docs/changelog/2026-11-15-m-money-after.png) |
| ![Before: product page with no picture and a banner](docs/changelog/2026-11-15-m-product-before.png) | ![After: product page, image first and piece rows](docs/changelog/2026-11-15-m-product-after.png) |
| ![Before: Earn Coin as four paragraph cards](docs/changelog/2026-11-15-m-earncoin-before.png) | ![After: Earn Coin, balance first and rows](docs/changelog/2026-11-15-m-earncoin-after.png) |
| ![Before: Get paid with Withdraw inside a card and greyed rows](docs/changelog/2026-11-15-m-getpaid-before.png) | ![After: Get paid, balance first and Withdraw in the bar](docs/changelog/2026-11-15-m-getpaid-after.png) |
| — | ![After: the buy page with the buy box](docs/changelog/2026-11-15-m-market-after.png) |
| — | ![After: the receipt after buying](docs/changelog/2026-11-15-m-receipt-after.png) |
| — | ![After: a Feed clip, slim text and one offer pill](docs/changelog/2026-11-15-m-feed-after.png) |
| — | ![After: Share to Feed, List it first](docs/changelog/2026-11-15-m-listfirst-after.png) |
| — | ![After: a confirm with Cancel and the action side by side](docs/changelog/2026-11-15-m-confirm-after.png) |
| — | ![After: Sign-in & security as grouped rows](docs/changelog/2026-11-15-m-security-after.png) |

---

## CL-009 Mobile app: splash, onboarding, Welcome and Log In

**In the prototype:** 9 November 2026 · **Jira:** not created yet (a Story under PR-9007 once Jira is connected) · **Production:** Not started

**Screen:** the mobile app's way in, in the phone prototype at `/m`: the splash
on opening, the onboarding (`/m/onboarding`), Welcome (`/m/welcome`), Log In
(`/m/sign-in`) and Sign up (`/m/sign-up`). Built from the owner's onboarding
design (4 screens) and dark auth design (8 screens). Every screen before
signing in is dark, in the light theme too.

### What to build

**Splash**
- [ ] On the brand night: the IDEEZA logo with a slow glow, *Build Hardware at the Speed of Software*, faint circuit traces behind, and three steps at the foot — **Idea → Concept → Build** — lighting one after another, in place of a spinner.
- [ ] Shown while the app opens (about 1.2 s on the first open), and while signing in (*Signing you in*). With reduced motion nothing moves.

**Onboarding (first open, signed out)**
- [ ] Order on the first open: Splash → Onboarding → Welcome. Once the maker skips or finishes it, it doesn't come back.
- [ ] Four screens, each an illustration, a title and one line; dots under them, **Continue** at the foot, **Skip** at the top; swiping works too.
  1. *Turn Your Idea Into a Real Product* — *Describe your hardware idea in a single prompt. Our AI instantly generates the PCB, Coding, and 3D enclosure.*
  2. *No Engineering Skills? No Problem* — *Let AI build it for you, or dive in manually if you're an engineer. Both paths lead to the same place.*
  3. *From Design to Manufacturing* — *Ready to build it for real? Connect with verified manufacturing partners and bring your product to life.*
  4. *Your Invention, Now your Digital Asset* — *Register your product as a digital asset, own it as an NFT, and showcase it to a global creator community.*
- [ ] **Continue** on the last screen, or **Skip**, goes to Welcome.

**Welcome**
- [ ] The logo in the middle; **Sign up** (primary) and **Log In** (secondary) at the foot. Nothing else: no Explore first, no Apple sign-in (owner decision).
- [ ] Offline: *You’re offline. Connect to sign up or log in.*

**Log In**
- [ ] Title *Enter your Email to Log In*; **Email** (*Enter your email*), **Password** (*8 characters and more*, with show/hide); **Remember me** and **Forgot password**; **Log In**.
- [ ] *Or login with* → **Google** and **Facebook**; at the foot *Don’t Have an Account? Sign Up*.
- [ ] Errors under their field: *Enter your email.*, *Invalid email address*, *Enter your password.*, *Your password is incorrect!*
- [ ] Account suspended: the title becomes *Welcome to IDEEZA*, a red alert *Account Suspended — Your account has been suspended due to a violation of our platform policies. Check your email or contact support@ideeza.io*, and the button reads **Account Suspended** (disabled).
- [ ] Kept from before: too many tries with a countdown, email not verified → **Send code**, offline with the input kept, session expired.
- [ ] **Remember me** unticked: the maker is signed out when the app is closed. Ticked: they stay signed in.

**Sign up**
- [ ] Same dark layout: centered *Create your IDEEZA account* / *Then choose your handle.*, the form, **Create account**, and at the foot *Have an Account? Log In*.

Demo stand-ins (prototype only): suspended and expired have no cause in the demo, so `?demo=suspended|expired` shows them; Remember me unticked lasts while the browser tab does.

### Design

- Mobile design system only: brand night (violet-950 → gray-950) with violet and blue glows, Primary / Secondary XL buttons, Text inputs XL, Checkbox, the mobile alert, the mobile type scale (title, body, caption).
- Dark tokens on every screen before signing in, whatever the app's theme.

### Before → After

| Before | After |
| --- | --- |
| — | ![After: the branded splash with Idea, Concept, Build](docs/changelog/2026-11-09-m-splash-after.png) |
| — | ![After: the four onboarding screens](docs/changelog/2026-11-09-m-onboarding-after.png) |
| ![Before: Welcome with a hero and four sign-in buttons](docs/changelog/2026-11-09-m-welcome-before.png) | ![After: Welcome, the logo with Sign up and Log In](docs/changelog/2026-11-09-m-welcome-after.png) |
| — | ![After: Log In](docs/changelog/2026-11-09-m-login-after.png) |
| — | ![After: Log In, wrong password](docs/changelog/2026-11-09-m-login-error-after.png) |
| — | ![After: Log In, account suspended](docs/changelog/2026-11-09-m-login-suspended-after.png) |
| — | ![After: Sign up](docs/changelog/2026-11-09-m-signup-after.png) |

---

## CL-008 Mobile app create flow: the image first, the 3D as the result

**In the prototype:** 9 November 2026 · **Jira:** not created yet (a Story under PR-9008 once Jira is connected) · **Production:** Not started

**Screen:** the mobile app's AI Product Generate chat (`/m/ai`, then the chat), in
the phone prototype at `/m`. This release brings the `/m` mobile prototype to the
live prototype; this entry covers only the create flow the owner approved
(design sample "create-flow round 2"): what the maker sees once concepts are
drawn, while the build runs, and when it is done.

### What to build

**Concepts ready**
- [ ] With two or more products, a switcher on top: one chip per product with its thumbnail, name and state — *Drawing…*, *Couldn't draw*, *Always built* (the main product), *In this build*, *Not in this build*.
- [ ] The chosen product's concept is the page: a big 4:3 image with its state badge (*Ready*, *Reading the parts*, *Doesn't fit its size*) and a full-screen button; under it the name, one line of up to three facts, and **Change**.
- [ ] **Change** opens one bottom sheet: the description, the fact chips, the prompt (with Copy), **Refine** (with its credit price), **Regenerate**, **Edit spec** (*View spec* once built).
- [ ] The prompt box gives way once concepts are on the page; the **Build** bar is pinned at the foot: *N products · X credits*, *Quality · About N min · Options*, and **Build** / **Build N products**.
- [ ] **Options** opens a bottom sheet: each product with a tick (the main product is always built), its credits and **Quality · …** (Low / Medium / High); the total and **Done**.

**While it builds**
- [ ] The concept stays big, with the build badge (no percentage), the project name and *N products · M pieces each*.
- [ ] One stage line — *Step k of n · Building the PCB* (or *Waiting in the build queue* / *Paused*) — and one bar. No per-piece percentage anywhere.
- [ ] *Runs in the background. You can leave, and we'll notify you when it's ready.*
- [ ] Each product's pieces behind one **Pieces · d of n ready** button (a bottom sheet; each row opens its deliverable).
- [ ] A failed piece stays on the page: *Wiring didn't finish* + why, and **Retry Wiring · Free**.

**Finished**
- [ ] The result is the page: a big 3D of the product (the Assembly, else the 3D Module) with **3D / Concept image**, one-tap **Explode** / **Put together**, and **Layers** (a sheet to show or hide each system, **Show all**).
- [ ] **Pieces · N ready** under it. With two or more products the switcher stays on top (*Ready · 6 pieces*).
- [ ] **Save project** (*Save project · 2 products*, *Add to {project}*, *Save version N*) is pinned at the foot with one helper line; once saved, **View project**.

**A piece failed — save what's ready**
- [ ] The build still opens on its result: badge *5 of 6 ready*, the failed piece with **Retry · Free**, **Pieces · 5 of 6 ready**.
- [ ] The foot says **Save what's ready** (*Save what's ready · 11 of 12 pieces* with two products; *Add what's ready to {project}* when joining) and *Wiring stays “Not built”. You can retry it after saving.*
- [ ] Saving keeps every product; the failed piece can be retried later from the chat or the product.

**A product left out of the build**
- [ ] A product unticked in Options shows in the finished switcher as *Drawn · not built*.
- [ ] Its card: the concept image, *Not in this build*, **You left this one out**, *Its concept stays in {project}. Build it any time, no need to draw it again.*, and **Build {product} · N credits**.
- [ ] Building it adds it to the same build, from its concept (no new drawing), charged on its own; the other product stays *Ready*. Short of credits → Buy credits; a size that doesn't fit → its spec opens to fix it.
- [ ] Until it is built, Save says *Saves {built product} and keeps the {left-out product} concept in {project}.* A project already saved gets the new product too.

### Design

- Mobile design system only; every popup is the mobile bottom sheet (handle, title, ✕). Text uses the mobile type scale (section, meta, body, row title).
- Switcher chips: surface card, 38 px thumbnail, border/brand 2 px when chosen, a red dot on a failed product.
- Concept and result frames: radius XL, bg/subtle behind the image; 3D stage 260 px tall on the result.
- Build bar and Save: primary XL button at the foot, helper in Caption.

### Before → After

| Before | After |
| --- | --- |
| ![Before: the concept is a small thumbnail](docs/changelog/2026-11-09-m-concept-before.png) | ![After: the concept is the page, Change and the pinned Build bar](docs/changelog/2026-11-09-m-concept-after.png) |
| ![Before: a percentage on every piece](docs/changelog/2026-11-09-m-building-before.png) | ![After: one stage line, no percentage](docs/changelog/2026-11-09-m-building-after.png) |
| ![Before: a finished list, no 3D](docs/changelog/2026-11-09-m-finished-before.png) | ![After: the 3D is the result, Explode and Layers](docs/changelog/2026-11-09-m-finished-after.png) |
| — | ![After: a failed piece, Save what's ready](docs/changelog/2026-11-09-m-partial-after.png) |
| — | ![After: a product left out, Build it later](docs/changelog/2026-11-09-m-left-out-after.png) |

---

## CL-007 Landing page: Events section, Moments From IDEEZA

**In the prototype:** 8 November 2026 · **Jira:** [PR-9089](https://ideeza.atlassian.net/browse/PR-9089) · **Production:** Ready for development

**Screen:** the landing page (`/landing`, and `/` for anyone signed out), a new
section between The Ecosystem and Mobile Application. From the Figma *IDEEZA
Website V-2*, page "Join Waitlist" › Event, the list frame's header and event
cards (18542:22943).

### What to build

- [ ] The section sits just above **Mobile Application**.
- [ ] Header, centred like every landing section: eyebrow **Events**, title **Moments From IDEEZA**, lead *Moments from IDEEZA hackathons, university tours, and product launches around the world — see where our community is building.*
- [ ] Three event cards, each the event's own photo with its title and one line over it:
  - **IDEEZA Hardware Hackathon** — *Build Hardware with AI*
  - **IDEEZA Launch In Ethiopia** — *IDEEZA's First Introduction to the African Ecosystem*
  - **The IDEEZA National Tour** — *Building Africa's Hardware Creator Ecosystem*
- [ ] The cards are one still picture: no card is a link and none reacts to hover or click.
- [ ] One **Explore Events** button, centred under the cards.
- [ ] Wide screens: three cards in a row. Phone: one row that swipes sideways with the next card peeking in; no horizontal scroll of the page at 375 px.

### Design

- Dark mode of the design system; the header is the landing section header (eyebrow chip, Display/MD title, lead).
- Card: a 20-radius frame with a soft lilac ring, 12 inside it the photo at radius 14 with a border/strong ring, fading to the page colour (bg/page) from the middle down; title Heading/H2 in text/primary, line Body/LG Medium in text/secondary.
- **Explore Events** is the page's one secondary button (no fill, gradient glass ring, pill), like Explore Marketplace and Explore Community.

### Before → After

| Before | After |
| --- | --- |
| ![Before: The Ecosystem goes straight into Mobile Application](docs/changelog/2026-11-08-events-landing-before.png) | ![After: Moments From IDEEZA, three event cards and Explore Events](docs/changelog/2026-11-08-events-landing-after.png) |

---

## CL-006 Coupon codes when buying a plan

**In the prototype:** 5 November 2026 · **Jira:** [PR-9062](https://ideeza.atlassian.net/browse/PR-9062) · **Production:** Ready for development

**Screen:** Settings › Plan & pricing › Checkout (`/settings/plan/checkout?plan=…&cycle=…`),
the invoice and Billing history. From the User Panel V2 Figma, ✅ Pricing ›
Upgrade Package flow: *Have a Coupon?*, *Coupon active*, *Coupon Invalid*, *Coupon Applied*.

> The prototype has no server, so the codes that work are one list in the app.
> Production keeps codes on the server (with the same rules), checks them there
> when they are applied and again when the payment is taken, and records each
> use against the account.

### What to build

**The codes and their rules**
- [ ] Each code has: the code; percent off **or** a dollar amount off; the paid plans it works on (or every paid plan); the last day it works.
- [ ] Codes are not case- or space-sensitive (*ideeza 30* = *IDEEZA30*) and show in capitals.
- [ ] A code comes off **what is left to pay today** (after the unused time of the plan being replaced). A dollar amount never takes the price below $0.
- [ ] A code is for **today's payment only**; renewals are at the full price.
- [ ] Each code works **once per account**.
- [ ] **One discount per order.** With the 50% welcome offer ([CL-004](#cl-004-welcome-offer-50-off-the-first-payment-for-12-hours)) live, the bigger of the two is used; a tie keeps the offer.
- [ ] Prototype codes (for testing): **IDEEZA30** 30% off every paid plan, until 31 Dec 2027 · **BUILDER5** $5 off Builder, until 30 Jun 2027 · **MAKER60** 60% off Tinkerer and Builder, until 31 Dec 2027 · **LAUNCH25** 25% off, ended 31 Oct 2026.

**Checkout (order summary, under the divider, above Subtotal)**
- [ ] A link **Have a coupon?** Pressed, it becomes the field's label with the field (*Enter coupon code*) and **Apply** beside it; Enter applies too.
- [ ] Applied: the field shows ✓ and the code, read only, with ✕ (*Remove coupon IDEEZA30*) at the end, and under it *Off today's payment only. Renewals are at the full price.* A line **Coupon IDEEZA30 (30% off) −$3.00** joins the summary and **Due today** drops ($10.00 → $7.00 for Builder monthly).
- [ ] ✕ takes the code off, puts the price back and leaves an empty field.
- [ ] Errors, in red under the field, with the field's red border:
  - empty: *Type a coupon code first.*
  - wrong: *Sorry, this coupon is not valid. Check the spelling and try again.*
  - ended: *Sorry, this coupon ended on 31 Oct 2026.*
  - not for this plan: *Sorry, this coupon is for Builder only.* (or *for Tinkerer and Builder only.*)
  - used before: *You've already used this coupon. Each one works once.*
  - nothing to pay today: *There's nothing left to pay today, so this coupon isn't needed.*
- [ ] Welcome offer bigger: the code is not added, in grey: *Your welcome offer already saves more ($5.00). One discount per order, so this coupon isn't added.*
- [ ] Coupon bigger: its line replaces the welcome offer's, and the summary says *Your coupon saves more than the welcome offer, so the offer isn't used.* The offer is not used up.
- [ ] No field when the unused time already covers the upgrade (nothing to pay).
- [ ] **Pay checks the code again.** If it stopped working (for example it ended while the page was open), it comes off, the field shows why, the summary says *Your coupon was taken off, so the price changed. Nothing was charged. Check Due today, then pay again.*, and no payment starts.
- [ ] The wallet's review lists *Coupon IDEEZA30 · −$3.00* above *Due today*, and charges the reduced amount.
- [ ] A coupon that brings Due today to $0 needs no wallet: the plan starts, paid with *Covered by coupon*.
- [ ] Pressing Pay twice starts one payment, never two.
- [ ] *Upgrade completed* adds *You saved $3.00 with IDEEZA30.*
- [ ] Apply and ✕ wait while a payment runs.

**After the payment**
- [ ] The plan order keeps the code, what it took off and its rule.
- [ ] Invoice: its own line **Coupon IDEEZA30 (30% off) −$3.00** between Subtotal and Tax; Total and Amount paid are the reduced amount.
- [ ] Billing history: under the row's Amount, *Coupon IDEEZA30 −$3.00*.

**Phone**
- [ ] At 375 px the field and Apply share one row and nothing scrolls sideways.

### Design

- *Have a coupon?*: Link (A03) brand, 16 / medium.
- Field: Text Input, size 36, with the Left Icon (✓, 16, icon default) when applied and Support Text 12/16 under it (helper grey, or the error colour on an error).
- **Apply**: Button Tonal, 36. ✕: Icon Button ghost, 32.
- The coupon line uses the summary's success colour, like the other discounts.

### Before → After

| Before | After |
| --- | --- |
| ![Before: the order summary with no way to enter a coupon — Subtotal $10.00, Due today $10.00](docs/changelog/2026-11-05-plan-coupons-before.png) | ![After: Have a coupon? with IDEEZA30 applied — Coupon IDEEZA30 (30% off) −$3.00, Due today $7.00](docs/changelog/2026-11-05-plan-coupons-after.png) |

---

## CL-005 Each account has its own work; a new account starts fresh

**In the prototype:** 4 November 2026 · **Jira:** none · **Production:** Nothing to build

> **Prototype only.** The prototype keeps every account in one browser, so
> signing out sets that account's work aside and signing in brings it back; a
> new account starts empty. A real backend gives every account its own data
> already, so there is nothing to build here (product owner, 4 Nov 2026).

### Before → After

| Before | After |
| --- | --- |
| ![Before: a new account opened on the last account's work — its name (Rafiq Ahmed), wallet (1.8K IDZ), credits and offer](docs/changelog/2026-11-04-own-work-before.png) | ![After: a new account starts fresh — the Welcome, 18 free credits, its own name (Tania Khan) and the Free plan](docs/changelog/2026-11-04-own-work-after.png) |

---

## CL-004 Welcome offer: 50% off the first payment, for 12 hours

**In the prototype:** 4 November 2026 · **Jira:** [PR-9013](https://ideeza.atlassian.net/browse/PR-9013) · **Production:** Ready for development

**Screen:** Home (a pop-up after the Welcome), the sidebar's Upgrade card,
Settings › Plan & pricing (`/settings/plan`), Checkout and the invoice.

> In the prototype the offer is kept in the browser, per account. Production
> keeps it on the server, per account, so the 12 hours and "already closed" hold
> on every device, and checkout applies the discount on the server.

### What to build

**Who gets it**
- [ ] A new account on Free that has never paid for a plan.
- [ ] Half off the first payment on any paid plan: the first month (Monthly) or the first year (Annual).
- [ ] It lasts 12 hours, counted from the moment the pop-up first shows. One offer per account; it never restarts — a reload or signing in again changes nothing.
- [ ] It ends when the 12 hours run out, or when a plan is bought with it.

**The pop-up (Home)**
- [ ] Opens on Home right after the Welcome closes (after the tour, when the Welcome's *Look around first* starts one), never on top of another dialog.
- [ ] Top band: the pill *A welcome gift, just for you*; the mark — a big **50%** with a yellow **OFF** sticker; *your first month of any plan* (*first year* on Annual); a price tag for the picked plan with its usual price struck through and the offer price under it (*Builder · $10.00 · $5.00 · first month*), changing with the plan and with Monthly · Annual; *Ends in* hh : mm : ss, counting down every second.
- [ ] **Monthly · Annual** switch.
- [ ] The three paid plans as a radio list, Builder picked: the name (*Most popular* on Builder), AI credits a month, the usual price struck through, the offer price and *You save $X.XX*. Monthly: Tinkerer $8.00 → $4.00, Builder $10.00 → $5.00, Disruptor $20.00 → $10.00. Annual: $76.80 → $38.40, $96.00 → $48.00, $192.00 → $96.00.
- [ ] Button **Claim 50% off: Builder for $5.00** (plan and price follow the choice) → checkout for that plan and billing.
- [ ] Under it: *Then $10.00 a month. Cancel any time.* (*a year* on Annual).
- [ ] **Compare all plans** → Plan & pricing. **Maybe later** and ✕ close it.
- [ ] Once closed it never pops up again, not after a reload and not on a later visit to Home.
- [ ] On a phone it rises from the bottom as a sheet; on a very narrow screen (about 320 px) the price tag is left out.

**After it is closed**
- [ ] The sidebar's Upgrade card becomes the offer: **50% OFF** *any plan*, *Ends in 11:42:10*, opening Plan & pricing. In the collapsed sidebar: a **50%** tile.
- [ ] When the offer ends or is used, the card goes back to *Upgrade to …*.

**Plan & pricing**
- [ ] A band at the top: **50% OFF**, *Your welcome gift: half price on any plan*, *Your first month, or your first year. The prices below already include it.* and the *Ends in* clock.
- [ ] Each paid plan card shows the offer price, a **50% OFF** sticker, the usual price struck through and *your first month* / *your first year*. The Compare plans heads show the same.

**Checkout and invoice**
- [ ] Checkout lists *Welcome offer (50% off)* as its own line (−$5.00 for Builder monthly); *Due today* is what is left, and it says when the offer ends.
- [ ] The invoice lists the same line: Subtotal $10.00, Welcome offer (50% off) −$5.00, Total $5.00.
- [ ] Buying a plan uses the offer up.

### Design

- The pop-up's top band, the sidebar card and the Plan & pricing band stand on the brand stage: deep violet (violet 900 → 950) lit by the brand violet and blue, with a faint dot grid. One look in light and dark mode; words on it are white.
- The mark: Display font, extra bold; **50%** at the 8xl size in the pop-up, 6xl on Plan & pricing, 4xl in the sidebar. The **OFF** sticker is yellow 400 with violet 950 text, turned −6°.
- Price tag: a white card, the offer price in violet 700, the usual price in gray with a red 500 line through it.
- Clock: glass chips (white at 12 % with a 20 % ring).
- DS components: Modal (M07; a bottom sheet on a phone), Segmented, Badge (*Most popular* brand, *You save* success), the AI-gradient Button (XL) for the claim, Link, ghost Button.

### Before → After

| Before | After |
| --- | --- |
| ![Before: Plan & pricing at full price, and the sidebar's Upgrade to Builder card](docs/changelog/2026-11-04-welcome-offer-before.png) | ![After: the welcome offer pop-up on Home — 50% OFF, the price tag, the clock and the three plans](docs/changelog/2026-11-04-welcome-offer-after.png) |
| | ![After: Plan & pricing with the offer band and 50% OFF prices, and the sidebar's offer card](docs/changelog/2026-11-04-welcome-offer-pricing-after.png) |

---

## CL-003 Landing page, the way into IDEEZA

**In the prototype:** 4 November 2026 · **Jira:** [PR-9009](https://ideeza.atlassian.net/browse/PR-9009) · **Production:** Ready for development

**Screen:** the landing page (`/landing`, and `/` for anyone signed out), built
from the Figma *IDEEZA Website V-2* (frame 18532:46268, 1440 wide, dark mode).
Website and platform live on one domain: the landing page is the front door
and its buttons lead through Sign up / Sign in ([CL-002](#cl-002-sign-up-and-sign-in)) into the app.

### What to build

**One domain**
- [ ] Signed out, `/` (with nothing but `utm_` tags) shows the landing page; any other app page asks you to sign in or sign up and returns you there afterwards.
- [ ] Top bar: **Log in** → Sign in; **Join Us** → Sign up (keeping the visit's `utm_` tags, so the one question is skipped when they answer it).
- [ ] **Start Project**, **Start With AI**, the hero prompt bar, and For Everyone's **Start Creating** and **Explore Engineer Mode** → Sign up, or Sign in once this browser has an account, carrying where they lead (Explore Engineer Mode → My Projects). No button leads back to the landing page.
- [ ] An idea typed in the hero prompt bar arrives in Home's prompt box after sign-up, the code and the one question; an empty send focuses the field.
- [ ] Footer **Sign In** → Sign in.
- [ ] Signed in: **Log in** is gone, **Join Us** and the footer link read **Open IDEEZA**, and every way in goes straight to the app.
- [ ] The landing page itself never asks anyone to sign in.

**Sections, top to bottom (copy as on the page)**
- [ ] **Top bar**, fixed and blurred: logo, Airdrop · NFT Marketplace · I'm Manufacturer · Pricing · ICO · About Us · **Resources** (Tutorials, Blog) · **EN** menu · Log in · Start Project · Join Us; under 1280 px a menu button opens the links and both buttons.
- [ ] **Hero:** *Build Hardware at the Speed of Software*, the line under it, the prompt bar *Describe your hardware idea…* with **Generate**.
- [ ] **Backed by World-Class Programs:** Member of Google AI Startup Program · Member of Microsoft for Startups · Member of NVIDIA Inception (owner confirmed all three).
- [ ] **For Everyone:** *Beginner-Friendly. Engineer-capable.*, For Creators (five points, **Start Creating**) and For Engineers (five points, **Explore Engineer Mode**).
- [ ] **What You Can Do:** AI Design Generation · Engineer Mode · Digital Ownership; a slider with a pager on narrow screens.
- [ ] **The Problem & Solution:** *The Complete Hardware Stack In One Platform.*
- [ ] **Ownership & Monetization:** Secure Digital Ownership · Sell on the Marketplace · Recurring Royalties; **Publish as Digital Product** and **Explore Marketplace**.
- [ ] **Creator Community — The Hardware Creator Feed:** one still picture (no card is a link) — *Worldwide creators*, *Follow creators*, *Get inspired*, *Browse innovations*, *Creators Story* (AI Engineering · VR & Wearables · Aerorobotics), *Share your inventions* — and one **Explore Community** button under it (→ Innovations).
- [ ] **Manufacturing Network:** four step tabs (Your Design · Prototype · Review & Approve · Production), arrow keys move between them.
- [ ] **The Ecosystem:** six stacked cards (AI Engine · Manufacturing Network · Creator Feed · Digital Ownership · Marketplace · $IDZ Token); a click or the arrow keys bring the next to the front; still with reduced motion.
- [ ] **Mobile Application:** *Coming soon to iOS and Android*; both store badges say *(coming soon)*.
- [ ] **Final call:** *The Next Hardware Product Could Be Yours.* with **Start With AI** and **Explore Projects**.
- [ ] **Footer:** Company · Product · Legal · Support columns, **Newsletter** (checks the address, then says *Newsletter sign-up isn't open yet, so your email wasn't saved.* — prototype only: production subscribes the address), © line.
- [ ] Links with no page yet (Airdrop, I'm Manufacturer, About Us, store badges, social and most footer links) show *Coming soon* and lead nowhere, never to a 404.

**Honesty rules (owner, 4 Nov 2026)**
- [ ] No invented people or figures: no creator counts, names, handles, follower or like counts, app downloads or ratings — even where the Figma draws them.
- [ ] Interaction only where it shows something otherwise hidden (tabs, the card deck, the slider); a showcase is a still picture with one clear button.

**Layout**
- [ ] At 1440 every section sits at the Figma's position and height.
- [ ] Below 1280 px the columns stack; no horizontal scroll at 375 px.

### Design

- Dark mode of the design system throughout the page.
- **One look per button kind:** the A01 **primary** (brand violet with the inner highlight) for Join Us, Generate, Start Creating and Publish as Digital Product; the **AI** gradient for Start With AI; and one **secondary** — no fill, a gradient glass ring — for Start Project, Explore Marketplace, Explore Community and Explore Projects. All pill-shaped.
- Type from the DS scale (Display headings, body lg/md); Hugeicons; art that CSS can't draw (glows, star fields, the globe, glass) comes from the Figma file.

### Before → After

| Before | After |
| --- | --- |
| ![Before: a signed-out visitor opening IDEEZA lands straight on Sign up](docs/changelog/2026-11-04-sign-up-after.png) | ![After: the landing page, with Log in, Start Project and Join Us in the top bar](docs/changelog/2026-11-04-landing-after.png) |
| | ![After: the Creator Feed as one still picture](docs/changelog/2026-11-04-creator-feed-after.png) |

---

## CL-002 Sign up and sign in

**In the prototype:** 4 November 2026 · **Jira:** [PR-9011](https://ideeza.atlassian.net/browse/PR-9011) · **Production:** Ready for development

**Screen:** Sign up (`/sign-up`), Check your email (`/sign-up/check-email`), the
one question (`/sign-up/welcome`), Sign in (`/sign-in`, with Forgot password),
Home (Finish your profile card), the account menus and Settings › Account ›
Sign-in and security. The flow is the Notion "Creator Panel Design Proposal",
Part 1, without the waitlist (owner, 4 Nov 2026).

> In the prototype, accounts, sessions, emails and codes are a demo kept in the
> browser: the email arrives as a **Demo** card on the page and the code types
> itself in. Production builds the same screens on a real backend: accounts and
> sessions on the server, real emails with a real one-time code.

### What to build

**Who sees what**
- [ ] Every page needs you signed in, except Sign up and Sign in.
- [ ] Signed out, opening any page goes to **Sign in** when the browser has signed in before, else to **Sign up**; after signing in you land on the page you opened.
- [ ] Signed in, opening Sign up or Sign in goes to Home.
- [ ] A campaign link's `utm_source` is kept as where the person heard of IDEEZA.

**Sign up**
- [ ] Title **Create your account**; line *Build electronics with AI or on your own. No wallet or KYC to start.*
- [ ] Fields: **First name**, **Last name** (side by side; stacked on a phone), **Email**, **Password** and **Confirm password** (each with a show/hide eye), **Date of birth** as Day · Month · Year, and the box *I agree to the IDEEZA Privacy policy and Terms and conditions.*
- [ ] First name is focused when the page opens.
- [ ] Pressing **Create account** with mistakes shows the reason under each field and focuses the first: *Enter your first name.* · *Enter your last name.* · *Enter your email.* / *Enter an email like name@example.com.* · *Type the password again.* / *The passwords don't match.* · *Choose a day.* / *Choose a month.* / *Choose a year.* / *That date doesn't exist.* · *Agree to the Privacy policy and Terms to continue.*
- [ ] Date of birth is required and must be a real, past date; there is no age limit.
- [ ] An email that already has an account: *There's already an account with this email.* with **Sign in instead** (it carries the email).
- [ ] Under the button: *Already have an account?* **Sign in**.

**Password rules**
- [ ] Focusing the password unfolds its rules under it: *At least 8 characters* · *An uppercase letter (A–Z)* · *A lowercase letter (a–z)* · *A number (0–9)* · *A symbol, like ! @ # $*.
- [ ] Each rule ticks green as it is met while typing; a five-step bar fills and reads **Weak**, **Fair**, **Almost there** or **Strong**.
- [ ] The rules stay open while any is unmet; when all are met and focus leaves, they fold away.
- [ ] The account is not created until every rule is met (the unmet rules then show in red).
- [ ] Setting a new password (Forgot password) uses the same checker.

**Check your email**
- [ ] Title **Check your email** with a mail icon; line *Verify it, and you're in. We sent it to* **email** ✎ **Change**.
- [ ] **Change** goes back to Sign up with the names and email filled in, to fix a typo.
- [ ] The email: from IDEEZA, subject **Verify your email**, *Hi {first name}, confirm this is your email to finish creating your IDEEZA account.*, button **Verify email**.
- [ ] **Verify email** opens the code step in its place: **Enter the 6-digit code**, six boxes; then *Checking the code…*, then **Verified**, and on to the next step. A wrong code: *That code doesn't match. Check it and try again.* The boxes take typing, pasting, Backspace and the arrow keys.
- [ ] *Didn't get it?* **Send it again**.
- [ ] Verifying signs the person in at once — they never type the password again.

**The one question**
- [ ] *Your account is ready, {first name}*; title **Where did you hear about IDEEZA?**; line *One tap and you're in. It helps us reach more makers like you.*
- [ ] Six tiles, each with its icon and a hint: YouTube (*A video or a channel*), Friend (*Someone told you*), Google (*You searched*), LinkedIn (*A post or a profile*), Event (*A fair, talk or meetup*), Other (*Somewhere else*). One tap saves and goes on; Other asks *Where? (optional)* with **Continue**.
- [ ] **Skip for now** goes on without an answer.
- [ ] The question is not asked when the campaign link already said where they came from.
- [ ] After a Skip, Home shows a card **Finish your profile** — *Where did you hear about IDEEZA? One tap.* — with the same choices, until they answer or close it.
- [ ] The country is saved to the profile from where the person is (no question); the name is saved to the profile when it has none.

**Sign in**
- [ ] Title **Welcome back**; line *Sign in to pick up where you left off.*; **Email**, **Password** with **Forgot password?** beside its label.
- [ ] A wrong email or password always gives one message: *That email and password don't match.*
- [ ] An account whose email isn't verified yet goes to Check your email.
- [ ] Under the button: *New to IDEEZA?* **Create an account** (it carries the email).
- [ ] After signing out, a green note on top: **You've signed out** — *Your account and your work are saved in this browser.* (the second line is prototype only)

**Forgot password**
- [ ] **Reset your password** — *Enter your account's email and we'll send you a link to set a new one.* — **Send link**.
- [ ] Check your email (with ✎ **Change**) → email **Reset your password** → **Set a new password** → the same code step → **Set a new password** with the checker and a confirmation → **Save and sign in**.
- [ ] An email with no account: **No account for that email** with **Try another email** and *New to IDEEZA?* **Create an account**.
- [ ] **Back to sign in** on every step.

**Sign out**
- [ ] **Sign out** works in the sidebar's account menu, the editors' account menu and Settings › Account › **Sign-in and security** (which shows *Signed in as* the email, **Download your information** and **Sign out**).
- [ ] Signing out keeps the account and the work; signing in again finds everything. (prototype only: a real backend does this already)

**The 3D stage (left of the form)**
- [ ] From 1024 px wide: a dark violet stage fills the left of the window and stays put while the form scrolls; the form sits on the right.
- [ ] On it: the IDEEZA logo, **Drag to turn it**, a live 3D circuit board (traces lit, labelled *ESP32-S3 · MCU*, *SX1262 · LoRa radio*, *Solar in · 6 V*, *Antenna · 868 MHz*, its case opening and closing), the prompt *A solar weather station that reports over LoRa*, the title **Describe it. We engineer it.**, one line, and the build's pieces (PCB · Code · 3D Module · Assembly · Wiring · Parts).
- [ ] It turns slowly by itself and turns with a drag; with reduced motion it stands still.
- [ ] Below 1024 px it is a 300 px band above the form with the logo, the prompt and the title; no horizontal scroll at 375 px.
- [ ] Under the form: *Demo: your account and your work stay in this browser.* (prototype only).

### Design

- Design system components only: Text Input (XL, the eye as its action), Select Menu (date of birth), Checkbox, Button (the **AI** gradient for every main action, Ghost for secondary ones, Secondary), Tag (Home card choices), Badge (warning, "Demo"; prototype only), Banner (good, "You've signed out"), Hugeicons through the app's icon component.
- Tokens: brand violet and blue (the AI button gradient on buttons and the icon tiles), success / warning / error inks for the rules and the code; radius 2xl–3xl; title 4xl, body md, labels sm; the stage's colours are the violet, blue and gray scales; motion 200 ms.
- Light and dark mode; the stage is dark in both.

### Before → After

| Before | After |
| --- | --- |
| ![Before: anyone opening the app lands on Home, no account](docs/changelog/2026-11-04-sign-in-before.png) | ![After: Sign up beside the 3D stage](docs/changelog/2026-11-04-sign-up-after.png) |
| ![Before: Sign out is greyed out, "Soon"](docs/changelog/2026-11-04-sign-out-before.png) | ![After: Sign in after signing out, with the "You've signed out" note](docs/changelog/2026-11-04-sign-out-after.png) |
| | ![After: the password rules ticking as the password is typed](docs/changelog/2026-11-04-password-rules-after.png) |
| | ![After: the code step filling in the six-digit code](docs/changelog/2026-11-04-code-step-after.png) |

---

## CL-001 Products question: the total stays at the bottom of the screen

**In the prototype:** 3 November 2026 · **Jira:** [PR-9012](https://ideeza.atlassian.net/browse/PR-9012) · **Production:** Ready for development

**Screen:** Concept chat › canvas › **What should we build?** (the question
after a prompt that needs more than one product), and the next step, **What
should the project be called?**

### What to build

- [ ] The count, the credits and the button sit in a bar pinned to the bottom of the canvas, spanning its full width, with the button at the right edge.
- [ ] The bar stays in view however long the product list is; a short list leaves it at the bottom edge.
- [ ] The count reads **"{ticked} of {offered} products selected"** (for example "2 of 2 products selected"); with one product offered, **"1 product"**.
- [ ] The button reads **Continue** on "What should we build?" and **Start drawing** on "What should the project be called?" (and when adding to an existing project).

### Design

- A bar with a top border and the page background, padded by the page inset; the credits as the Credit badge; the primary Button.

### Before → After

| Before | After |
| --- | --- |
| ![Before: the total and Continue sit under the list](docs/changelog/2026-11-03-products-total-before.png) | ![After: the total and Continue sit in a full-width bar at the bottom](docs/changelog/2026-11-03-products-total-after.png) |
