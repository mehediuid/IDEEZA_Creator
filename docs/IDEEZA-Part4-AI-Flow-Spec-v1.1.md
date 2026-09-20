# IDEEZA — Part 4 · AI Project Creation Flow

**Spec addendum v1.1** — extends the locked Part 4 decisions in the Creator Panel Design Proposal (v1.0).

This document covers two additions to the AI flow:

- **4.3 — Manufacturability confidence tiering** (how much the user should trust generated engineering output)
- **4.4 — Companion products** (a single prompt producing a multi-product system, e.g. drone + remote)

Section 4.1 (AI flow locked decisions) is unchanged. Section 4.2 (manual flow) is reserved — it is referenced in the Part 4 header but its content has not yet been written into the proposal.

---

## 4.0 Baseline flow (as locked in 4.1)

```
[Prompt] → [Concept image] → [Refine / Regenerate loop] → [Use this concept]
                                        ↓
                            [Companion product selection]   ← 4.4, conditional
                                        ↓
                              [Generate full project]
                                        ↓
                          [Background job — long-running]
                                        ↓
                    [Engineering output: 3D + PCB + code + BOM]
                                        ↓
                                   [Project]
```

Cost model, background execution, draft-first save, and downstream outcomes (Showcase / Give to community / Sell) follow the rules already locked in 4.1 and Part 1.

**Locked in this addendum:**

| Item | Decision |
| --- | --- |
| Concept generation cost | Credit-based; every generate / refine / regenerate debits credits |
| Full project generation | Long-running, executes in the background; user is notified on completion |
| Concept ↔ engineering mismatch | Handled by an explicit pre-generation disclaimer (not by post-hoc comparison) |
| Draft project creation | Already solved — a draft project exists from the first prompt, so no stage can lose work |
| Downstream outcomes | Already solved — existing Showcase / Give / Sell rules apply unchanged |

---

## 4.3 Manufacturability confidence tiering

### 4.3.1 The problem

AI-generated PCB and 3D output is not automatically manufacturable. Trace widths, clearances, via sizes, and mechanical fit can all violate what a fab house will actually accept. If the platform delivers output with no signal about its quality, two failures follow: users send unmanufacturable designs to fabrication, and IDEEZA's credibility absorbs the blame.

### 4.3.2 Decision — non-blocking confidence tiering

Output is **always delivered**. It is never withheld or failed for quality reasons. Instead, every generated output carries a confidence badge that tells the user what level of checking it has passed.

| Badge | Trigger | User-facing meaning |
| --- | --- | --- |
| `Checked` | Automated design rule checks pass against the standard fab profile | Automated design rule checks passed |
| `Draft` | One or more checks failed, or checks could not be run | Design rule issues found — review required before manufacturing |

A third tier, `Verified` (expert human review), is **reserved but not implemented**. It is deliberately not shown in the UI: displaying an unreachable top tier only tells users the platform is withholding something. It activates only if paid expert review is introduced.

### 4.3.3 Why non-blocking

A blocking gate was considered and rejected. Generation is a long background job that has already consumed credits; ending it with "failed, nothing delivered" produces the worst possible combination — wasted time, wasted credits, and a refund dispute. Delivering output with an honest label preserves the value the user paid for while keeping the platform honest about quality.

### 4.3.4 Credit treatment of `Draft` output

**A `Draft` result is a valid output. Credits are not refunded.**

This is a deliberate decision, and the reasoning matters for the copy:

- Generation quality varies with prompt complexity — this is the nature of the technology, not a platform malfunction.
- Refunding `Draft` output would create a farming loop: users submit deliberately hard prompts, receive free retries, and the credit system leaks. This is the same class of exploit as the XP farming vulnerability already flagged in the proposal.

The **system failure** refund path (already locked in 4.1) is unchanged and distinct: infrastructure error, crashed job, or an artifact that fails to generate at all → full refund, with partial retry for partially failed builds. A DRC failure is **not** a system failure.

Because this distinction is invisible to users unless stated, the `Draft` state must say so explicitly. Getting this copy wrong is the single most likely source of refund disputes in this flow.

### 4.3.5 Issue reporting

A `Draft` badge expands into a grouped issue list. Every issue names the affected product and location, and is written in plain language rather than raw DRC output.

**Design rule issues**

- Trace width below fab minimum
- Insufficient clearance between traces or pads
- Via size or annular ring below tolerance
- Board outline or drill conflicts

**Assembly issues**

- Dimensional fit conflict between a component and its enclosure
- Power budget mismatch — total current draw exceeds supply capacity
- Connector or interface incompatibility

---

## 4.4 Companion products

### 4.4.1 The pattern

Some prompts do not describe a single object. They describe a **system** — and the system needs more than one physical product to function. A drone needs a remote controller. A wireless earbud needs a charging case. A sensor node needs a base station.

The flow therefore branches after the concept is accepted: the user is shown the other products this system needs, selects the ones they want, generates a concept for each, and receives all of them in one generation.

### 4.4.2 Flow

```
Prompt: "I want to build a drone"
        ↓
Concept image — the drone
        ↓
[Use this concept]
        ↓
Companion product list:
    Drone .................. included (the original concept)
    Remote controller ...... selectable
    Charging dock .......... selectable
    Carrying case .......... selectable
        ↓
User selects: Remote controller
        ↓
Concept image — the remote  (own refine / regenerate loop)
        ↓
[Generate full project]
        ↓
Output: drone + remote — each with 3D, PCB, code, BOM
```

### 4.4.3 When the list appears

Classification is **automatic**. After the first concept is accepted, the system determines whether this product is part of a multi-product system. Most products are not, and those users never see this screen.

Because misclassification is inevitable, the result is **visible and overridable**. On the single-product path, an unobtrusive line offers the alternative:

> Single-product build — *Add a companion product*

Without this escape hatch, a user who wants a base station for their sensor node has no route to one.

### 4.4.4 The companion product list

The list is **AI-generated and read-only**. Users do not add or remove entries; they select from what is offered. Each entry carries:

| Field | Purpose |
| --- | --- |
| Product name | Remote controller |
| Why it's needed | One plain-language line — the user should understand the suggestion, not just see it |
| State | `Not selected` / `Concept ready` |
| Action | `Generate concept` → opens that product's own concept loop |

**Selection is entirely optional and nothing blocks generation.** A user may select every companion, one, or none, and proceed to full generation regardless. Unselected companions are simply not built — they are not treated as missing, incomplete, or as a reason to warn the user.

The original concept is always included and cannot be deselected.

### 4.4.5 Companion concept generation

Selecting a companion opens a focused concept view that behaves exactly like the primary concept loop — prompt bar, refine, regenerate, version thread, per-action credit debit.

Two differences:

- **Context is inherited.** The companion is generated as part of this system, not as a standalone object — a remote *for this drone*, not a generic remote.
- **The parent concept stays visible** alongside it as a style reference, so the products read as a coherent family rather than unrelated objects.

### 4.4.6 Cost estimate

Multi-product generation makes the total cost materially harder to predict, so the companion list carries an **upfront estimate**, updated live as selections change:

> **Estimated total: ~X credits**
> 2 product concepts (Y each) + full project generation (Z)

The word *estimated* is load-bearing. Refine and regenerate counts are unpredictable by nature, so an exact figure cannot be promised. Per-action debits and a running total remain visible throughout, as in the single-product flow.

### 4.4.7 Structure — flat, no nesting

Companion products do not decompose further. A remote controller is one product; its internal parts are handled automatically during generation. There is no second level of breakdown.

**Accepted limitation:** the user has no granular control inside a companion product. If the remote's output is unsatisfactory, the remedy is to regenerate the whole remote, not to tune one part of it. This will surface as a constraint on genuinely complex builds and should be tracked for a future phase.

### 4.4.8 Project structure

**All products live in one project.** Drone and remote are two products inside a single project, not two linked projects.

Rationale: they were conceived together, generated together, and are sold, showcased, or given as one thing. Splitting them into separate projects would fragment a single creative act across the project list and complicate every downstream action.

### 4.4.9 Confidence badge scope

**Each product carries its own badge.** The drone may be `Checked` while the remote is `Draft`.

A single project-level badge was rejected because it destroys information: one minor issue in the carrying case would mark the whole project `Draft`, and the user would not know where the problem is. Per-product badges keep the signal precise.

The project overview shows all product badges together, with the lowest tier surfaced as the project's headline state — so the user sees the weakest link without losing the detail.

### 4.4.10 Cross-product compatibility checks

Companion products must actually work together, so generation includes a compatibility check pass. Failures appear in the issue list of **both** affected products.

| Check | Failure example |
| --- | --- |
| Wireless protocol match | Drone uses one radio protocol, remote another |
| Pairing / addressing scheme | No shared binding mechanism between the two |
| Power and charging interface | Dock connector does not match the drone's charging port |
| Physical fit | Drone does not fit the generated carrying case |
| Control mapping | Remote's control count does not match the drone's actuators |

Compatibility failures produce a `Draft` badge on the affected products. Credit treatment is unchanged — this is valid output, not a system failure.

---

## 4.5 Generation gate copy

The confirm gate for a multi-product generation:

> **From concept to engineering output**
>
> 2 products will be generated — 3D models, PCBs, firmware, and a bill of materials for each.
>
> Your concept images are a visual reference. The engineered output may differ from them.
>
> Automated design rule checks run on completion. If issues are found, you'll still receive the full output with a **Draft** label and a list of what needs review.
>
> This will use **X credits** and runs in the background — we'll notify you when it's ready.
>
> ☐ I understand, don't show this again
>
> [ Cancel ]   [ Generate — X credits ]

The dismissal checkbox persists per user. The credit amount is always shown regardless of dismissal.

The third paragraph exists specifically to pre-empt the `Draft` refund dispute: the user is told *before paying* that a `Draft` result is a possible and legitimate outcome.

---

## 4.6 Background job states

```
Queued (position N)
    → Modeling products (1/2)
    → Generating PCBs
    → Compatibility checks
    → Design rule checks
    → Complete
```

| Rule | Behavior |
| --- | --- |
| Cancellation | Allowed only in `Queued` state, with full credit return. Once generation starts, cancellation is unavailable — otherwise cancel-refund becomes a farming loop |
| Leaving the app | Job continues. Completion notifies via in-app and email; mobile receives push |
| Queue position | Derived from the pricing plan's concurrency limit — existing pattern, unchanged |
| Overrun | If the job exceeds roughly twice expected duration, the status card offers cancellation with full refund |
| System failure | Infrastructure error or crash → full refund, partial retry for partially completed output |

---

## 4.7 Output structure

Project overview lists every product. Each product opens into its own tabs:

`3D` · `PCB` · `Code` · `BOM` · `Files`

Project level carries: all product badges, the combined BOM, compatibility check results, and assembly documentation.

---

## 4.8 Edge cases

| Case | Behavior |
| --- | --- |
| User selects no companions | Generates the primary product alone. No warning, no incomplete state |
| User generates a companion concept, then deselects it | Concept is preserved; re-selecting does not require regeneration |
| Primary concept regenerated after companion concepts exist | Companion concepts are discarded with an explicit warning — they were generated in the old concept's context |
| Companion list refreshed mid-flow | Does not happen. The list is generated once and locked for that concept |
| Credits exhausted mid-flow | Completed concepts persist in the draft project. User tops up and continues |
| Credits exhausted during generation | Job unaffected — credits were debited at start |
| User leaves the companion screen | All state preserved in the draft project |
| Second generation from the same concept | Allowed as a new version. Previous output preserved |
| Prompt violates content policy | Blocked at prompt stage; no credits debited |

---

## 4.9 Open dependencies

| # | Item | Blocks |
| --- | --- | --- |
| 1 | **Fab profile definition** — which manufacturing standard DRC runs against (layer count, minimum trace, via size, clearance) | The `Checked` badge is meaningless without this. Highest priority in this addendum |
| 2 | **Credit pricing values** — per-concept and per-generation cost; multi-product totals may need bundled or slab pricing | Cost estimate UI, gate copy |
| 3 | **Compatibility check engine** — a new requirement introduced by 4.4; distinct from DRC and not yet scoped | 4.4.10 |
| 4 | **Order-time fab rejection** — what happens when a fab partner rejects a design the platform marked `Checked` | Fulfillment module |
| 5 | **`Verified` tier** — requires a paid expert review flow to activate | Reserved, not blocking |
| 6 | **Sub-product granularity** — the flat-structure limitation in 4.4.7 | Future phase |
| 7 | **Section 4.2 (manual flow)** — referenced in the Part 4 header but absent from the proposal document | Part 4 completeness |

---

*Part 4 addendum v1.1 — to be merged into the IDEEZA Creator Panel Design Proposal.*
