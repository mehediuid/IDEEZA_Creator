# Changelog

What changed in the live prototype (`main`), for the developers who build the
real product. Each change is one numbered entry (CL-###) that says exactly what
to build and how to check it is done, and links to its Jira ticket.

| CL | Change | In the prototype | Jira | Production |
| --- | --- | --- | --- | --- |
| [CL-002](#cl-002-sign-up-and-sign-in) | Sign up and sign in | 4 Nov 2026 | Not created yet | To do |
| [CL-001](#cl-001-products-question-the-total-stays-at-the-bottom-of-the-screen) | Products question: the total stays at the bottom of the screen | 3 Nov 2026 | Not created yet | To do |

Jira tickets are created after the release is approved, in the project the
product owner names; until then the Jira column says "Not created yet".

<!--
How to add an entry: write it in the same merge that brings a change to main,
newest first, and add its row to the table. Each entry has: the title; the
prototype date, Jira link and production status; Screen (where it is in the
app); What to build (a checklist of acceptance criteria: exact copy, every
state, mobile); Design (DS components and tokens); Before → After screenshots.
No code: no file names, functions or commit hashes. Screenshots go in
docs/changelog/ as <date>-<short-name>-before.png / -after.png.
-->

---

## CL-002 Sign up and sign in

**In the prototype:** 4 November 2026 · **Jira:** not created yet · **Production:** To do

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
- [ ] After signing out, a green note on top: **You've signed out** — *Your account and your work are saved in this browser.*

**Forgot password**
- [ ] **Reset your password** — *Enter your account's email and we'll send you a link to set a new one.* — **Send link**.
- [ ] Check your email (with ✎ **Change**) → email **Reset your password** → **Set a new password** → the same code step → **Set a new password** with the checker and a confirmation → **Save and sign in**.
- [ ] An email with no account: **No account for that email** with **Try another email** and *New to IDEEZA?* **Create an account**.
- [ ] **Back to sign in** on every step.

**Sign out**
- [ ] **Sign out** works in the sidebar's account menu, the editors' account menu and Settings › Account › **Sign-in and security** (which shows *Signed in as* the email, **Download your information** and **Sign out**).
- [ ] Signing out keeps the account and the work; signing in again finds everything.

**The 3D stage (left of the form)**
- [ ] From 1024 px wide: a dark violet stage fills the left of the window and stays put while the form scrolls; the form sits on the right.
- [ ] On it: the IDEEZA logo, **Drag to turn it**, a live 3D circuit board (traces lit, labelled *ESP32-S3 · MCU*, *SX1262 · LoRa radio*, *Solar in · 6 V*, *Antenna · 868 MHz*, its case opening and closing), the prompt *A solar weather station that reports over LoRa*, the title **Describe it. We engineer it.**, one line, and the build's pieces (PCB · Code · 3D Module · Assembly · Wiring · Parts).
- [ ] It turns slowly by itself and turns with a drag; with reduced motion it stands still.
- [ ] Below 1024 px it is a 300 px band above the form with the logo, the prompt and the title; no horizontal scroll at 375 px.
- [ ] Under the form: *Demo: your account and your work stay in this browser.* (prototype only).

### Design

- Design system components only: Text Input (XL, the eye as its action), Select Menu (date of birth), Checkbox, Button (the **AI** gradient for every main action, Ghost for secondary ones, Secondary), Tag (Home card choices), Badge (warning, "Demo"), Banner (good, "You've signed out"), Hugeicons through the app's icon component.
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

**In the prototype:** 3 November 2026 · **Jira:** not created yet · **Production:** To do

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
