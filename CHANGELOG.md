# Changelog

This is what changed in the live app (`main`), newest first. Every entry has
the same four parts:

- **Where** it shows up in the app.
- **The decision** the product owner made, and why.
- **What changed** for the person using the app: what it was before, and what it is now.
- **Before and after** screenshots, side by side.

Code changes are not listed here. They live in the git history. Work that is
only on `staging` and has not reached `main` is not listed either.

The log starts from the live app of 1 November 2026.

<!--
How to add an entry: an entry is written in the same merge that brings a
feature to main. Releases are grouped under the date they went live, newest
first. Each entry has four parts: Where, Decision, What changed (Before / After)
and a Before | After screenshot table. Screenshots go in docs/changelog/ and are
named <date>-<short-name>-before.png and <date>-<short-name>-after.png.
-->

## 3 November 2026

### Products question: the total stays at the bottom of the screen

**Where:** Concept chat › canvas › "What should we build?". This is the
question that comes after a prompt that needs more than one product.

**Decision (owner, 3 Nov 2026):** The count, the price and the Continue button
must always be visible, at the very bottom of the canvas and across its full
width. The count must show how many products are chosen out of how many the
idea can have.

**What changed**

- **Before:** "2 concepts", the credits and **Continue** sat right under the
  product list, in the middle of the screen. A long list pushed them off the
  bottom, and you had to scroll to find the button.
- **After:** they sit in a bar pinned to the bottom of the canvas, which spans
  the full width, with the button at the right edge. The bar stays in view
  however long the list is. The note now reads **"2 of 2 products selected"**:
  ticked products out of all the products offered. On the next step ("What
  should the project be called?") the same bar holds **Start drawing**.

| Before | After |
| --- | --- |
| ![Before: the total and Continue sit under the list](docs/changelog/2026-11-03-products-total-before.png) | ![After: the total and Continue sit in a full-width bar at the bottom](docs/changelog/2026-11-03-products-total-after.png) |
