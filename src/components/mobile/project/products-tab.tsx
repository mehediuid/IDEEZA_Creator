"use client";

// 02 · Products and Add a product (02b–02h). On the project page, the
// Products section is the page's main content: the count and pieces line, the
// Build check, the rows (all up to 5, else the first 3 and "All n products"),
// a product a chat is building for this project (02f: it opens that chat), and
// "Add a product" as the last row. The Products screen (`?tab=products`, the
// old tab's address) is the web's Products tab as one list: Search + Sort once
// a project has 6 or more products (kept in `?pq=&psort=`, so a reload and
// Back keep them), every product as a compact row (M5), and Add a product as
// the bar's one primary.
//
// Add a product is the web's dialog as one sheet with three steps:
// · Choose (02b): Build with AI · Build manually;
// · Build with AI (02c, 02e): the AI tab's Prompt Box — the mic, the
//   inspiration image (CL-027), Quality (CL-021, the level picked last, here
//   or on the AI tab), Enhance and ✦ — the web's cost line ("1 concept
//   [credit] · you have n") and, out of credits, "You need 1 credit to start.
//   You have 0." with Buy credits (Plan & pricing › Credits) and the next plan
//   up (CL-032); ✦ stores the picture, then starts the chat that adds it
//   (`createChat(prompt, { quality, addTo, ...image })`), which opens on the AI
//   tab — the web opens the chat too; Back;
// · Build manually (02d, 02g, 02h): the name ("Give the product a name."),
//   then `addProduct` behind the edit gate. The editors need a computer
//   (D3), so the phone adds it here and says so with a toast.

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Add01Icon, AiMagicIcon, ArrowRight01Icon, PackageIcon, PencilEdit01Icon, SortingDownIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Field, errorProps, useFieldIds } from "@/components/auth/auth-parts";
import { CreditBadge } from "@/components/credits/credit-badge";
import { Button } from "@/components/ideeza/button";
import { SearchInput } from "@/components/ideeza/search-input";
import { TextInput } from "@/components/ideeza/text-input";
import { CONCEPT_COST, useCredits } from "@/lib/create/credits";
import { productsOf, statusOf, useCreateHistory } from "@/lib/create/history";
import { can } from "@/lib/manual/permissions";
import { piecesOf } from "@/lib/manual/project-read";
import { PROJECT_NAME_MAX, useManualProjects } from "@/lib/manual/projects";
import { PRODUCT_SORTS, PRODUCT_TOOLS_FROM, filterProductRows, parseProductSort, phoneProjectHref, type ProductSort } from "@/lib/manual/phone-project";
import { cn } from "@/lib/utils";
import type { PromptImage } from "@/components/dashboard/prompt-card";
import { PromptBox } from "../ai/prompt-box";
import { QualityPicker, useLastQuality } from "../ai/quality";
import { PLAN_LINK, PlanLink } from "../plans/upsell";
import { BottomBar } from "../kit/bottom-bar";
import { PickSheet } from "../kit/pick-list";
import { Sheet } from "../kit/sheet";
import { EmptyState } from "../kit/state";
import { useToast } from "../kit/toast";
import { PRESSED } from "../kit/press";
import { T } from "../type";
import { useProject } from "./context";
import { BuildCheckLine, useProductRows } from "./product-rows";
import { Chevron, LIST_ROW, ListCard, ProductRow, SubLine } from "./parts";

/** 02f · A product a chat is building for this project (started from Build with AI): its newest
 *  build that isn't saved anywhere yet. The row opens that chat, where it is saved to the project. */
function useAddingRows(projectId: string): { key: string; name: string; thumb: string | null; chip: string; line: string; href: string }[] {
  const { chats, builds } = useCreateHistory();
  return React.useMemo(() => {
    const out = [];
    for (const chat of chats) {
      if (!chat.turns.some((t) => "addTo" in t && t.addTo === projectId)) continue;
      const job = builds.filter((b) => b.chatId === chat.id && !b.projectId).sort((a, b) => b.createdAt - a.createdAt)[0];
      if (!job) continue;
      const status = statusOf(job);
      const { ready, total } = piecesOf(job);
      const first = productsOf(job)[0];
      out.push({
        key: job.id,
        name: first?.name ?? chat.title,
        thumb: first?.conceptImageUrl || null,
        chip: status === "ready" ? "Ready to save" : status === "failed" || status === "partial" ? "Needs a retry" : status === "queued" ? "Waiting" : "Building",
        line:
          status === "ready"
            ? "Open the chat to save it to this project."
            : status === "failed" || status === "partial"
              ? "Open the chat to retry it."
              : `${ready} of ${total} pieces. You can leave this screen.`,
        href: `/m/ai/chat/${encodeURIComponent(chat.id)}`,
      });
    }
    return out;
  }, [chats, builds, projectId]);
}

/** Add a product, from the page's row or the Products screen's bar: the edit gate's reason when
 *  it can't (a live listing, a sold project), else the Add a product sheet. */
function useAddProduct() {
  const { view, viewer, gate, open } = useProject();
  const canAdd = can(viewer, "product.add", view.canCtx);
  const reason = canAdd ? gate.reasonOf("addProduct") : null;
  const [refused, setRefused] = React.useState<string | null>(null);
  return {
    canAdd,
    reason,
    refused,
    tryAdd: () => {
      if (reason) return setRefused(reason);
      open({ kind: "add-product" });
    },
  };
}

const ROW = cn("flex w-full items-center gap-6 p-6 text-left outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:bg-bg-subtle", PRESSED);

/** The page shows every product up to this many; past it, the first 3 and All n products. */
const PAGE_ROWS = 5;

/** The project page's Products (its main content): the count and pieces line, the Build check,
 *  the rows (all up to 5, else the first 3 and "All n products" → the Products screen), a product
 *  a chat is building for it, and Add a product as the last row. */
export function ProductsSection() {
  const { project } = useProject();
  const { rows, line, headline } = useProductRows();
  const adding = useAddingRows(project.id);
  const add = useAddProduct();
  const cut = rows.length > PAGE_ROWS;
  const shown = cut ? rows.slice(0, 3) : rows;
  return (
    <section aria-labelledby="pj-products" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="pj-products" className={T.section}>
          Products
        </h2>
        <SubLine>{line}</SubLine>
      </div>
      <BuildCheckLine headline={headline} />
      {rows.length === 0 && adding.length === 0 && !add.canAdd ? (
        <SubLine>No products yet.</SubLine>
      ) : (
        <ListCard label="Products">
          {add.canAdd &&
            adding.map((a) => (
              <ProductRow key={a.key} href={a.href} thumb={a.thumb} name={a.name} stage={{ short: a.chip, ariaLabel: a.chip }} meta="New product from the chat" facts={a.line} />
            ))}
          {shown.map((r) => (
            <ProductRow key={r.id} href={r.href} thumb={r.thumb} name={r.name} stage={r.stage} meta={r.meta} facts={r.facts} />
          ))}
          {cut && (
            <li className={LIST_ROW}>
              <Link href={phoneProjectHref(project.id, "products")} className={ROW}>
                <span className={cn(T.rowTitle, "min-w-0 flex-1")}>All {rows.length} products</span>
                <Chevron />
              </Link>
            </li>
          )}
          {add.canAdd && (
            <li className={LIST_ROW}>
              <button type="button" aria-haspopup="dialog" aria-disabled={add.reason ? true : undefined} onClick={add.tryAdd} className={ROW}>
                <span aria-hidden className="flex size-[56px] shrink-0 items-center justify-center rounded-md bg-bg-surface-raised text-[color:var(--color-icon-default)]">
                  <Icon icon={Add01Icon} size={24} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className={T.name}>Add a product</span>
                  <span className={cn(T.meta, "line-clamp-2")}>Build it with AI or by hand. It joins {project.name}.</span>
                  {add.refused && <span className={cn(T.meta, "text-text-primary")}>{add.refused}</span>}
                </span>
                <Chevron />
              </button>
            </li>
          )}
        </ListCard>
      )}
    </section>
  );
}

/** The Products screen (`?tab=products`): the line and the Build check, Search + Sort from 6
 *  products, a product a chat is building, every product; Add a product is the bar's. */
export function ProductsTab() {
  const { project } = useProject();
  const { rows, line, headline } = useProductRows();
  const params = useSearchParams();
  const [query, setQueryState] = React.useState(() => params.get("pq") ?? "");
  const [sort, setSortState] = React.useState<ProductSort>(() => parseProductSort(params.get("psort")));
  const [sorting, setSorting] = React.useState(false);
  const adding = useAddingRows(project.id);
  const { canAdd } = useAddProduct();
  // The search and the sort live in the address (`?pq=&psort=`), written in place: no navigation.
  const write = (q: string, s: ProductSort) => {
    const next = new URLSearchParams(window.location.search);
    if (q) next.set("pq", q);
    else next.delete("pq");
    if (s === "project") next.delete("psort");
    else next.set("psort", s);
    const search = next.toString();
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`);
  };
  const setQuery = (q: string) => {
    setQueryState(q);
    write(q, sort);
  };
  const setSort = (s: ProductSort) => {
    setSortState(s);
    write(query, s);
  };
  const tools = rows.length >= PRODUCT_TOOLS_FROM;
  const shown = tools ? filterProductRows(rows, query, sort) : rows;
  const inChat = canAdd && !query ? adding : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <SubLine>{line}</SubLine>
        <BuildCheckLine headline={headline} />
      </div>
      {tools && (
        <div className="flex items-center gap-4">
          <SearchInput
            value={query}
            onValueChange={setQuery}
            placeholder="Search products"
            aria-label="Search products"
            enterKeyHint="search"
            size="xl"
            containerClassName="min-w-0 flex-1"
          />
          <Button
            hierarchy="secondary"
            size="xl"
            iconLeading={<Icon icon={SortingDownIcon} size={20} />}
            aria-haspopup="dialog"
            onClick={() => setSorting(true)}
          >
            Sort
          </Button>
        </div>
      )}
      {rows.length === 0 && inChat.length === 0 ? (
        <EmptyState icon={PackageIcon} title="No products yet" />
      ) : (
        <ListCard label="Products">
          {inChat.map((a) => (
            <ProductRow key={a.key} href={a.href} thumb={a.thumb} name={a.name} stage={{ short: a.chip, ariaLabel: a.chip }} meta="New product from the chat" facts={a.line} />
          ))}
          {shown.map((r) => (
            <ProductRow key={r.id} href={r.href} thumb={r.thumb} name={r.name} stage={r.stage} meta={r.meta} facts={r.facts} />
          ))}
          {tools && shown.length === 0 && <li className={cn(T.body, "p-6")}>No product matches “{query.trim()}”.</li>}
        </ListCard>
      )}
      {/* The kit's one pick-one sheet: a pick applies and closes it, as My projects' sort does. */}
      <PickSheet open={sorting} onClose={() => setSorting(false)} title="Sort" options={PRODUCT_SORTS} value={sort} onPick={setSort} />
    </div>
  );
}

/** The Products screen's one primary: Add a product, the gate's reason above it when it can't. */
export function ProductsBar() {
  const add = useAddProduct();
  if (!add.canAdd) return null;
  return (
    <BottomBar className="gap-4 pt-8">
      {add.refused && (
        <p role="alert" className={cn(T.meta, "text-text-primary")}>
          {add.refused}
        </p>
      )}
      <Button size="xl" className="w-full" aria-haspopup="dialog" iconLeading={<Icon icon={Add01Icon} size={20} />} onClick={add.tryAdd}>
        Add a product
      </Button>
    </BottomBar>
  );
}

// ─────────────────────────── Add a product (02b–02h) ───────────────────────────

type Step = "choose" | "ai" | "manual";

const OPTION =
  "flex w-full items-start gap-6 rounded-xl border-[length:var(--border-width-1)] border-solid border-border p-8 text-left outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus";

export function AddProductSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { project } = useProject();
  const [step, setStep] = React.useState<Step>("choose");
  const close = () => {
    setStep("choose");
    onClose();
  };
  const title = step === "ai" ? "Build with AI" : step === "manual" ? "Build manually" : `Add a product to ${project.name}`;
  const description = step === "choose" ? "Pick how you want to make it." : `It's added to ${project.name}.`;
  return (
    <Sheet
      open={open}
      onClose={close}
      title={title}
      description={description}
      actions={step === "choose" ? undefined : <StepActions step={step} onBack={() => setStep("choose")} onDone={close} />}
    >
      {step === "choose" && (
        <div className="flex flex-col gap-6 pb-8">
          <button type="button" onClick={() => setStep("ai")} className={OPTION}>
            <span aria-hidden className="inline-flex size-[36px] shrink-0 items-center justify-center rounded-lg bg-bg-brand-subtle text-[color:var(--color-icon-brand)]">
              <Icon icon={AiMagicIcon} size={18} />
            </span>
            <span className="flex min-w-0 flex-col gap-1">
              <span className={T.name}>Build with AI</span>
              <span className={T.body}>Describe it, and AI draws concepts and builds the files.</span>
            </span>
          </button>
          <button type="button" onClick={() => setStep("manual")} className={OPTION}>
            <span aria-hidden className="inline-flex size-[36px] shrink-0 items-center justify-center rounded-lg bg-bg-brand-subtle text-[color:var(--color-icon-brand)]">
              <Icon icon={PencilEdit01Icon} size={18} />
            </span>
            <span className="flex min-w-0 flex-col gap-1">
              <span className={T.name}>Build manually</span>
              <span className={T.body}>Start an empty product here; design it in the editors on a computer.</span>
            </span>
          </button>
        </div>
      )}
      {step === "ai" && <BuildWithAi onStarted={close} />}
      {step === "manual" && <BuildManually onAdded={close} />}
    </Sheet>
  );
}

/** The sheet's footer per step: Back alone for Build with AI (✦ in the prompt box starts it, 02c);
 *  Create product + Back for Build manually (02d). */
function StepActions({ step, onBack, onDone }: { step: Step; onBack: () => void; onDone: () => void }) {
  void onDone;
  return (
    <>
      {step === "manual" && (
        <Button size="xl" className="w-full" type="submit" form="m-add-manual">
          Create product
        </Button>
      )}
      <Button hierarchy="secondary" size="xl" className="w-full" onClick={onBack}>
        Back
      </Button>
    </>
  );
}

const PROMPT_MAX = 2000;

function BuildWithAi({ onStarted }: { onStarted: () => void }) {
  const { project } = useProject();
  const router = useRouter();
  const { createChat } = useCreateHistory();
  const { hydrated, balance } = useCredits();
  const [prompt, setPrompt] = React.useState("");
  // The AI tab's Quality, remembered across both boxes: the next idea starts at the one picked last.
  const [quality, setQuality] = useLastQuality();
  const [starting, setStarting] = React.useState(false);
  const canRender = !hydrated || balance >= CONCEPT_COST;
  const short = `You need ${CONCEPT_COST} credit to start. You have ${balance}.`;

  // `image`: the inspiration image, already stored by the box; the new product's concept is drawn from it.
  const start = (text: string, image?: PromptImage) => {
    if (starting || !canRender) return false;
    setStarting(true);
    const chat = createChat(text, { quality, addTo: project.id, ...image });
    onStarted();
    router.push(`/m/ai/chat/${encodeURIComponent(chat.id)}`);
    return true;
  };

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* The AI tab's Prompt Box (it brings its own 16 px sides): the mic, Enhance and ✦. */}
      <div className="-mx-8">
        <PromptBox
          value={prompt}
          onChange={(v) => setPrompt(v.slice(0, PROMPT_MAX))}
          onSubmit={start}
          placeholder="Describe your device"
          canSend={canRender}
          sendReason={short}
          busy={starting}
          takesImage
          extra={<QualityPicker value={quality} onChange={setQuality} />}
        />
      </div>
      {canRender ? (
        <p className={cn(T.meta, "flex flex-wrap items-center gap-2")}>
          1 concept <CreditBadge credits={CONCEPT_COST} />
          {hydrated ? ` · you have ${balance}` : ""}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <p className={cn(T.body, "text-text-error")}>{short}</p>
          {/* CL-032: the quick fix and the next plan up, one link style. */}
          <div className="flex flex-col items-start">
            <Link href="/m/plans?tab=credits" className={PLAN_LINK}>
              Buy credits
            </Link>
            <PlanLink />
          </div>
        </div>
      )}
    </div>
  );
}

function BuildManually({ onAdded }: { onAdded: () => void }) {
  const { project, gate } = useProject();
  const { addProduct } = useManualProjects();
  const toast = useToast();
  const ids = useFieldIds(["name"] as const);
  const [name, setName] = React.useState("");
  const [tried, setTried] = React.useState(false);
  const [refused, setRefused] = React.useState<string | null>(null);
  const clean = name.trim();
  const fieldError =
    clean === "" ? "Give the product a name." : Array.from(clean).length > PROJECT_NAME_MAX ? `Keep it to ${PROJECT_NAME_MAX} characters.` : null;
  const shown = tried ? fieldError : null;
  const blocked = gate.reasonOf("addProduct") ?? refused;

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    if (fieldError) return setTried(true);
    const out = gate.guard("addProduct", () => {
      const rowId = addProduct(project.id, clean);
      if (!rowId) return setRefused("This browser's storage is full — the product wasn't added.");
      onAdded();
      toast({ title: `${clean} added to ${project.name}` });
    });
    setRefused(out.kind === "refused" ? out.reason : null);
  };

  return (
    <form id="m-add-manual" onSubmit={create} noValidate className="flex flex-col gap-6 pb-4">
      <Field label="Product name" htmlFor={ids.name.id} error={shown} errorId={ids.name.errorId}>
        <TextInput
          id={ids.name.id}
          size="xl"
          value={name}
          onValueChange={(v) => {
            setName(v);
            setTried(false);
          }}
          autoComplete="off"
          enterKeyHint="done"
          {...errorProps(shown, ids.name.errorId)}
        />
      </Field>
      <p className={T.meta}>You can describe it later on its own page.</p>
      <p className={cn(T.body, "flex items-start gap-2")}>
        <span aria-hidden className="mt-1 text-[color:var(--color-icon-secondary)]">
          <Icon icon={ArrowRight01Icon} size={14} />
        </span>
        The editors open on a computer. On your phone the product is added to this project.
      </p>
      {blocked && (
        <p role="alert" className={cn(T.body, "text-text-error")}>
          {blocked}
        </p>
      )}
    </form>
  );
}
