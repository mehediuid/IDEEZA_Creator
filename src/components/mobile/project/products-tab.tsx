"use client";

// 02 · Products tab and Add a product (02b–02h). The web's Products tab as
// one list: the count and pieces line and the Build check, Search + Sort once
// a project has 6 or more products (kept in `?pq=&psort=`, so a reload and
// Back keep them), then "Add a product" first (the web's first tile), a
// product a chat is building for this project (02f: it opens that chat), and
// every product as a compact row (M5).
//
// Add a product is the web's dialog as one sheet with three steps:
// · Choose (02b): Build with AI · Build manually;
// · Build with AI (02c, 02e): the AI tab's Prompt Box (mic, Enhance, ✦), the
//   web's cost line ("1 concept [credit] · you have n") and, out of credits,
//   Top up credits; ✦ starts the chat that adds it (`createChat(prompt,
//   { addTo })`), which opens on the AI tab — the web opens the chat too; Back;
// · Build manually (02d, 02g, 02h): the name ("Give the product a name."),
//   then `addProduct` behind the edit gate. The editors need a computer
//   (D3), so the phone adds it here and says so with a toast.

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Add01Icon, AiMagicIcon, ArrowRight01Icon, PencilEdit01Icon, SortingDownIcon } from "@hugeicons/core-free-icons";
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
import { PRODUCT_SORTS, PRODUCT_TOOLS_FROM, filterProductRows, parseProductSort, type ProductSort } from "@/lib/manual/phone-project";
import { cn } from "@/lib/utils";
import { PromptBox } from "../ai/prompt-box";
import { PickSheet } from "../kit/pick-list";
import { Sheet } from "../kit/sheet";
import { useToast } from "../kit/toast";
import { T } from "../type";
import { useProject } from "./context";
import { BuildCheckLine, useProductRows } from "./product-rows";
import { Chevron, LIST_ROW, ListCard, ProductRow, SubLine, TapLink } from "./parts";

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

export function ProductsTab() {
  const { project, view, viewer, gate, open } = useProject();
  const { rows, line, headline } = useProductRows();
  const params = useSearchParams();
  const [query, setQueryState] = React.useState(() => params.get("pq") ?? "");
  const [sort, setSortState] = React.useState<ProductSort>(() => parseProductSort(params.get("psort")));
  const [sorting, setSorting] = React.useState(false);
  const adding = useAddingRows(project.id);
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
  const [refused, setRefused] = React.useState<string | null>(null);
  const tools = rows.length >= PRODUCT_TOOLS_FROM;
  const shown = tools ? filterProductRows(rows, query, sort) : rows;
  const canAdd = can(viewer, "product.add", view.canCtx);
  const reason = canAdd ? gate.reasonOf("addProduct") : null;

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
      <ListCard label="Products">
        {canAdd && !query && (
          <li className={LIST_ROW}>
            <button
              type="button"
              aria-haspopup="dialog"
              aria-disabled={reason ? true : undefined}
              onClick={() => {
                if (reason) return setRefused(reason);
                open({ kind: "add-product" });
              }}
              className="flex w-full items-center gap-6 p-6 text-left outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:bg-bg-subtle"
            >
              <span aria-hidden className="flex size-[56px] shrink-0 items-center justify-center rounded-md bg-bg-surface-raised text-[color:var(--color-icon-default)]">
                <Icon icon={Add01Icon} size={24} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className={T.name}>Add a product</span>
                <span className={T.meta}>Build it with AI or by hand. It joins {project.name}.</span>
                {refused && <span className={cn(T.meta, "text-text-primary")}>{refused}</span>}
              </span>
              <Chevron />
            </button>
          </li>
        )}
        {canAdd &&
          !query &&
          adding.map((a) => (
            <ProductRow key={a.key} href={a.href} thumb={a.thumb} name={a.name} stage={{ short: a.chip, ariaLabel: a.chip }} meta="New product from the chat" facts={a.line} />
          ))}
        {shown.map((r) => (
          <ProductRow key={r.id} href={r.href} thumb={r.thumb} name={r.name} stage={r.stage} meta={r.meta} facts={r.facts} />
        ))}
        {tools && shown.length === 0 && <li className={cn(T.body, "p-6")}>No product matches “{query.trim()}”.</li>}
      </ListCard>
      {/* The kit's one pick-one sheet: a pick applies and closes it, as My projects' sort does. */}
      <PickSheet open={sorting} onClose={() => setSorting(false)} title="Sort" options={PRODUCT_SORTS} value={sort} onPick={setSort} />
    </div>
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
  const [starting, setStarting] = React.useState(false);
  const canRender = !hydrated || balance >= CONCEPT_COST;
  const short = `You need ${CONCEPT_COST} credit to start. You have ${balance}.`;

  const start = (text: string) => {
    if (starting || !canRender) return false;
    setStarting(true);
    const chat = createChat(text, { addTo: project.id });
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
          <div>
            <TapLink href="/m/plans?tab=credits">Top up credits</TapLink>
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
