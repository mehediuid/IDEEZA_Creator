"use client";

// "Download files" on each bought copy (owner, 2026-11-25: "after buying a Physical or a Virtual NFT I can
// download it"; then: "not inside Overview — one Download on each row of Your copies, because a download takes
// from that copy's manufacturing units"). One .zip of everything the copy's kind opens, for every product the
// copy covers (a product's own copy: that product; a whole-project copy: each product, in its own folder):
// - Physical NFT: the firmware, the parts list, the netlist (the PCB's and the wiring's), the 3D model;
// - Virtual NFT: the parts list, the 3D model, and the render (the product's picture), since the copy licenses
//   the 3D model and renders.
// Only what the build has ready goes in: the 3D model only when the build made one for the product (a sample's
// has none), the render only when there is a picture. A file that can't be fetched is left out and said so;
// the rest still download. `run` hands back once the zip is saved, so the caller takes the unit then, never
// before (a Physical copy: 1 unit a download, the owner's rule).

import * as React from "react";
import type { BuildItemKind, BuildJob, BuildProduct } from "@/lib/create/history";
import { makeZip, type ZipEntry } from "@/lib/data/zip";
import type { EditionKind } from "@/lib/market/types";
import { fileFor, modelFileOf, saveBlob, type DownloadFile } from "@/components/projects/product/product-deliverables";

/** The pieces whose files a kind takes, in the order the tabs show them. */
const PIECES: Record<EditionKind, BuildItemKind[]> = {
  physical: ["3d", "pcb", "code", "wiring", "parts"],
  virtual: ["3d", "parts"],
};

const WORD: Partial<Record<BuildItemKind, string>> = { code: "firmware", parts: "parts list", pcb: "netlist", wiring: "netlist", "3d": "3D model" };

/** One product the copy covers: its name, its picture, and the build behind it (null when none). */
export type CopyProduct = { name: string; image: string | null; build: { job: BuildJob; bp: BuildProduct } | null };

function slug(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "product"
  );
}

function extOf(url: string, type: string): string {
  const m = /\.(png|jpe?g|webp|gif)(?:[?#]|$)/i.exec(url);
  if (m) return m[1].toLowerCase();
  if (type.includes("jpeg")) return "jpg";
  if (type.includes("webp")) return "webp";
  return "png";
}

/** "A", "A and B", "A, B and C". */
function andList(words: string[]): string {
  return words.length <= 1 ? (words[0] ?? "") : `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}

const cap = (s: string) => (s ? `${s[0].toUpperCase()}${s.slice(1)}` : s);

type ProductPlan = { folder: string; texts: DownloadFile[]; model: { url: string; filename: string } | null; render: string | null; base: string };

export type CopyDownload = {
  /** What the .zip holds, in words: "Firmware, parts list, netlist and 3D model". Null when nothing is ready. */
  what: string | null;
  state: "idle" | "busy" | "done" | "failed";
  /** After a download: what couldn't be added, or why nothing came. */
  note: string;
  /** Builds and saves the zip; `onSaved` runs once it is handed to the browser. */
  run: (onSaved?: () => void) => void;
};

export function useCopyDownload(kind: EditionKind, products: readonly CopyProduct[], zipName: string): CopyDownload {
  const [state, setState] = React.useState<CopyDownload["state"]>("idle");
  const [note, setNote] = React.useState("");

  const plan = React.useMemo(() => {
    const words: string[] = [];
    const say = (w: string | undefined) => {
      if (w && !words.includes(w)) words.push(w);
    };
    const several = products.length > 1;
    const plans: ProductPlan[] = products.flatMap((p) => {
      if (!p.build) return [];
      const { job, bp } = p.build;
      const ready = (k: BuildItemKind) => bp.items.some((i) => i.kind === k && i.status === "ready");
      const texts = new Map<string, DownloadFile>();
      let model: { url: string; filename: string } | null = null;
      for (const k of PIECES[kind]) {
        if (!ready(k)) continue;
        if (k === "3d") {
          model = modelFileOf(job, bp);
          if (model) say(WORD["3d"]);
          continue;
        }
        const f = fileFor(k, bp);
        if (f && !texts.has(f.filename)) {
          texts.set(f.filename, f);
          say(WORD[k]);
        }
      }
      const render = kind === "virtual" ? p.image || job.conceptImageUrl || null : null;
      if (render) say("render");
      return [{ folder: several ? `${slug(p.name)}/` : "", texts: [...texts.values()], model, render, base: slug(p.name) }];
    });
    if (words.length === 0) return null;
    return { plans, what: cap(andList(words)) };
  }, [products, kind]);

  const run = (onSaved?: () => void) => {
    if (!plan || state === "busy") return;
    setState("busy");
    setNote("");
    void (async () => {
      const entries: ZipEntry[] = [];
      const missed: string[] = [];
      const fetchInto = async (url: string, name: (type: string) => string, word: string) => {
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error(String(res.status));
          const blob = await res.blob();
          entries.push({ name: name(blob.type), data: new Uint8Array(await blob.arrayBuffer()) });
        } catch {
          if (!missed.includes(word)) missed.push(word);
        }
      };
      for (const p of plan.plans) {
        for (const f of p.texts) entries.push({ name: `${p.folder}${f.filename}`, data: f.text() });
        const model = p.model;
        if (model) await fetchInto(model.url, () => `${p.folder}${model.filename}`, "the 3D model");
        const render = p.render;
        if (render) await fetchInto(render, (type) => `${p.folder}${p.base}-render.${extOf(render, type)}`, "the render");
      }
      if (entries.length === 0) {
        setState("failed");
        setNote("The files couldn't be downloaded. Try again.");
        return;
      }
      saveBlob(new Blob([makeZip(entries) as BlobPart], { type: "application/zip" }), zipName);
      onSaved?.();
      setState("done");
      const lost = andList(missed);
      setNote(lost ? `${cap(lost)} couldn't be added; the other files are in the zip.` : "");
    })();
  };

  return { what: plan?.what ?? null, state, note, run };
}

/** The zip's name: "{project}-copy-7-physical-nft.zip". */
export function copyZipName(projectName: string, serial: number | null, kind: EditionKind): string {
  return `${slug(projectName)}${serial !== null ? `-copy-${serial}` : ""}-${kind}-nft.zip`;
}
