"use client";

// Save project on a phone (27 · A8 · 28), the web's one save (save-step.tsx)
// as a sheet. The mode is the web's (`useSaveMode`):
// · new — "Save project": the name and what it's for (Update with AI when
//   two or more products are described), and the cover when there are two
//   images or more;
// · join — "Add to {project}": the project picked at the question, nothing
//   to fill in;
// · version — "Save version N": a rebuild of a chat already saved.
// One record is written (saveBuild), the store's write is waited for, then
// the build names its project and the concept network becomes the project's
// network; the sheet turns into "Saved as a draft" with View project (the
// project page) and Back to chat. A refused write keeps what was typed.

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Folder01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { TextInput, Textarea } from "@/components/ideeza/text-input";
import { Field } from "@/components/auth/auth-parts";
import type { SaveModeInfo } from "@/components/create/save-step";
import { useStoreWrite } from "@/components/projects/details/use-store-write";
import { useDescriptionAiAssist } from "@/components/projects/description-ai-assist";
import { useCreateHistory, type BuildJob } from "@/lib/create/history";
import { buildsOf } from "@/lib/manual/project-read";
import { useManualProjects, type SaveInput } from "@/lib/manual/projects";
import { checkSaveDraft, coverChoicesOf, describedProductsOf, holderOf, saveDefaultsOf, savedNoticeOf } from "@/lib/manual/save-step";
import { useWriteGuard } from "@/lib/manual/use-write-guard";
import { networkForSave } from "@/lib/network/from-concept";
import { networkProducts } from "@/lib/network/products";
import { readNetwork, saveNetwork } from "@/lib/network/store";
import { cn } from "@/lib/utils";
import { T } from "../type";
import { Sheet } from "../kit/sheet";

type Kind = "new" | "join" | "version";

export function SaveSheet({ open, job, info, onClose }: { open: boolean; job: BuildJob; info: SaveModeInfo; onClose: () => void }) {
  return open ? <SavePanel job={job} info={info} onClose={onClose} /> : null;
}

function SavePanel({ job, info: infoProp, onClose }: { job: BuildJob; info: SaveModeInfo; onClose: () => void }) {
  const router = useRouter();
  const { projects, saveBuild } = useManualProjects();
  const { builds, setBuildProject, getChat } = useCreateHistory();
  const [info] = React.useState(infoProp);
  const defaults = React.useMemo(() => saveDefaultsOf(job), [job]);
  const single = (job.companions?.length ?? 0) === 0;
  const kind: Kind = info.mode.kind === "version" ? "version" : info.mode.kind === "join" ? "join" : "new";
  const target = info.mode.kind === "version" || info.mode.kind === "join" ? info.mode.project : null;
  const [name, setName] = React.useState(defaults.name);
  const [description, setDescription] = React.useState(defaults.description);
  const [cover, setCover] = React.useState<string>(defaults.coverProductId);
  const [shown, setShown] = React.useState(false);
  const [refusal, setRefusal] = React.useState<string | null>(null);
  const [storageFull, setStorageFull] = React.useState(false);
  const [pending, setPending] = React.useState<{ projectId: string; revert: () => void } | null>(null);
  const [saved, setSaved] = React.useState<{ projectId: string; at: number } | null>(null);
  const busy = React.useRef(false);
  const otherNames = React.useMemo(() => projects.map((p) => p.name), [projects]);
  const choices = React.useMemo(() => coverChoicesOf(job), [job]);
  const aiProducts = React.useMemo(() => describedProductsOf(job), [job]);
  const ai = useDescriptionAiAssist({ products: aiProducts, value: description, onReplace: setDescription, pillClassName: "min-h-[36px]" });
  const gate = useWriteGuard(kind === "new" ? null : (target?.id ?? null));
  const blocked = kind !== "new" && target ? gate.reasonOf("addProduct") : null;
  const nameId = React.useId();
  const descId = React.useId();

  const applied = pending !== null && holderOf(job, projects)?.id === pending.projectId;
  const write = useStoreWrite(applied, () => {
    if (!pending) return;
    if (job.projectId !== pending.projectId) setBuildProject(job.id, pending.projectId);
    const holder = projects.find((p) => p.id === pending.projectId);
    if (holder && kind !== "join") {
      const network = networkForSave({
        existing: readNetwork(holder.id),
        projectId: holder.id,
        name: holder.name,
        products: networkProducts(holder, buildsOf(holder, builds)),
        job,
        chat: getChat(job.chatId),
        now: Date.now(),
      });
      if (network) saveNetwork(network);
    }
    setSaved({ projectId: pending.projectId, at: Date.now() });
    setPending(null);
    busy.current = false;
  });
  const saving = pending !== null || write.saving;
  React.useEffect(() => {
    if (!write.failed || !pending) return;
    const frame = window.requestAnimationFrame(() => {
      pending.revert();
      setPending(null);
      busy.current = false;
      setStorageFull(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [write.failed, pending]);

  const commit = (input: SaveInput) => {
    busy.current = true;
    setStorageFull(false);
    write.start();
    const result = saveBuild(job, info.lineage, input);
    if (!result) {
      write.reset();
      busy.current = false;
      setRefusal("That project isn't in this browser any more.");
      return;
    }
    setPending({ projectId: result.project.id, revert: result.revert });
  };

  const check = checkSaveDraft({ mode: "new", name, description, coverProductId: cover, joinId: null }, otherNames);
  const submit = () => {
    if (busy.current || saving) return;
    setRefusal(null);
    if (kind === "new") {
      if (!check.ok) {
        setShown(true);
        return;
      }
      const picked = cover !== "primary" && choices.some((c) => c.productId === cover) ? { buildId: job.id, productId: cover } : null;
      commit({ kind: "new", name: check.name.value, description: check.description.value, cover: picked });
      return;
    }
    if (!target) return;
    if (blocked) {
      setRefusal(blocked);
      return;
    }
    const outcome = gate.guard("addProduct", () => commit(kind === "version" ? { kind: "version", projectId: target.id } : { kind: "join", projectId: target.id }));
    if (outcome.kind === "refused") setRefusal(outcome.reason);
  };

  if (saved) {
    const project = projects.find((p) => p.id === saved.projectId);
    if (!project) return null;
    const n = project.products?.length || 1;
    const notice = savedNoticeOf(kind, {
      name: project.name,
      product: job.title,
      version: info.mode.kind === "version" ? info.mode.version : 0,
      draft: true,
    });
    return (
      <Sheet
        open
        onClose={onClose}
        title={notice.title}
        description={`${notice.body}${notice.publishLine ? " When it’s ready, publish it from the project page." : ""}`}
        actions={
          <>
            <Button size="xl" className="w-full" onClick={() => router.push(`/m/projects/${project.id}`)}>
              View project
            </Button>
            <Button hierarchy="secondary" size="xl" className="w-full" onClick={onClose}>
              Back to chat
            </Button>
          </>
        }
      >
        <div className="flex items-center gap-6 rounded-xl bg-bg-subtle p-6">
          <span className="inline-flex size-[44px] shrink-0 items-center justify-center rounded-lg bg-bg-surface text-[color:var(--color-icon-brand)]">
            <Icon icon={Folder01Icon} size={20} />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className={cn(T.bodyStrong, "truncate")}>{project.name}</span>
            <span className={T.meta}>
              {n} {n === 1 ? "product" : "products"} · Draft
            </span>
          </span>
        </div>
      </Sheet>
    );
  }

  const title = kind === "new" ? "Save project" : kind === "version" ? `Save version ${info.mode.kind === "version" ? info.mode.version : ""}` : `Add to ${target?.name ?? "a project"}`;
  const description_ =
    kind === "new"
      ? "Name it and say what it's for. You can change both later on the project page."
      : kind === "version" && info.mode.kind === "version"
        ? `This is a rebuild in the chat “${info.mode.chatTitle}”, so it becomes version ${info.mode.version} of ${info.mode.project.name}.`
        : single
          ? `${job.title} joins ${target?.name} as a new product. You picked this project at the start, so there's nothing to fill in.`
          : `These products join ${target?.name} as new products. You picked this project at the start, so there's nothing to fill in.`;

  return (
    <>
      <Sheet
        open
        onClose={() => !saving && onClose()}
        title={title}
        description={description_}
        actions={
          <>
            <Button size="xl" className="w-full" loading={saving} onClick={submit} disabled={!!blocked}>
              {kind === "new" ? "Save project" : kind === "version" ? title : `Add to ${target?.name ?? "project"}`}
            </Button>
            <Button hierarchy="secondary" size="xl" className="w-full" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
          </>
        }
      >
        {storageFull && (
          <Banner tone="error" title="Couldn't save">
            This browser&apos;s storage is full, so the project wasn&apos;t kept. What you typed is still here.
          </Banner>
        )}
        {(refusal || blocked || info.broken) && <Banner tone="attention">{refusal ?? blocked ?? info.broken}</Banner>}
        {kind === "new" && (
          <>
            <Field label="Project name" htmlFor={nameId} error={shown ? check.name.error ?? undefined : undefined}>
              <TextInput id={nameId} size="xl" value={name} onValueChange={setName} invalid={shown && !!check.name.error} maxLength={120} />
            </Field>
            <Field label="Description" htmlFor={descId} aside={ai.pill} error={shown ? check.description.error ?? undefined : undefined}>
              <Textarea id={descId} value={description} onValueChange={setDescription} rows={4} invalid={shown && !!check.description.error} />
            </Field>
            <p className={cn(T.meta, "-mt-3 text-text-tertiary")}>Optional.</p>
            {choices.length > 1 && (
              <div className="flex flex-col gap-3">
                <p className={T.rowTitle}>Cover</p>
                <p className={T.meta}>Shown on the project card in My projects.</p>
                <div role="radiogroup" aria-label="Cover" className="flex gap-4 overflow-x-auto pb-1">
                  {choices.map((c) => (
                    <button
                      key={c.productId}
                      type="button"
                      role="radio"
                      aria-checked={cover === c.productId}
                      aria-label={c.name}
                      onClick={() => setCover(c.productId)}
                      className={cn(
                        "relative size-[120px] shrink-0 overflow-hidden rounded-xl border-[length:var(--border-width-2)] border-solid outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
                        cover === c.productId ? "border-border-brand" : "border-border-subtle",
                      )}
                    >
                      <Image src={c.imageUrl} alt="" fill sizes="120px" className="object-cover" unoptimized />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </Sheet>
      {gate.dialog}
    </>
  );
}
