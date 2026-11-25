"use client";

// "Download files" for a product a bought copy covers (owner, 2026-11-25: "after buying a Physical or a
// Virtual NFT I can download it — it needs a Download button"). Each piece's file was there, one at a time,
// inside its piece tab (product-deliverables.tsx) or piece screen (the phone); this is the one button that
// takes everything the copy's kind opens for the product, in one .zip:
// - Physical NFT: the firmware, the parts list, the netlist (the PCB's and the wiring's), the 3D model;
// - Virtual NFT: the parts list, the 3D model, and the render (the product's picture), since the copy
//   licenses the 3D model and renders.
// Only what the build has ready goes in: the 3D model only when the build made one for this product (a
// sample's has none), the render only when there is a picture. A file that can't be fetched is left out and
// said so; the rest still download.

import * as React from "react";
import type { BuildItemKind, BuildJob, BuildProduct } from "@/lib/create/history";
import { makeZip, type ZipEntry } from "@/lib/data/zip";
import type { EditionKind } from "@/lib/market/types";
import { fileFor, modelFileOf, saveBlob } from "@/components/projects/product/product-deliverables";

/** The pieces whose files a kind takes, in the order the tabs show them. */
const PIECES: Record<EditionKind, BuildItemKind[]> = {
  physical: ["3d", "pcb", "code", "wiring", "parts"],
  virtual: ["3d", "parts"],
};

const WORD: Partial<Record<BuildItemKind, string>> = { code: "firmware", parts: "parts list", pcb: "netlist", wiring: "netlist", "3d": "3D model" };

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

export type NftDownload = {
  /** What the .zip holds, in words: "Firmware, parts list, netlist and 3D model". Null when nothing is ready. */
  what: string | null;
  state: "idle" | "busy" | "done" | "failed";
  /** After a download: what couldn't be added, or why nothing came. */
  note: string;
  run: () => void;
};

export function useNftDownload(
  kind: EditionKind,
  build: { job: BuildJob; bp: BuildProduct } | null,
  product: { name: string; image: string | null },
): NftDownload {
  const [state, setState] = React.useState<NftDownload["state"]>("idle");
  const [note, setNote] = React.useState("");

  const plan = React.useMemo(() => {
    if (!build) return null;
    const { job, bp } = build;
    const ready = (k: BuildItemKind) => bp.items.some((i) => i.kind === k && i.status === "ready");
    const texts = new Map<string, ReturnType<typeof fileFor>>();
    const words: string[] = [];
    const say = (w: string | undefined) => {
      if (w && !words.includes(w)) words.push(w);
    };
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
    const render = kind === "virtual" ? product.image || job.conceptImageUrl || null : null;
    if (render) say("render");
    if (words.length === 0) return null;
    const what = andList(words);
    return { texts: [...texts.values()].filter((f): f is NonNullable<typeof f> => f !== null), model, render, what: what[0].toUpperCase() + what.slice(1) };
  }, [build, kind, product.image]);

  const run = () => {
    if (!plan || state === "busy") return;
    setState("busy");
    setNote("");
    void (async () => {
      const base = slug(product.name);
      const entries: ZipEntry[] = plan.texts.map((f) => ({ name: f.filename, data: f.text() }));
      const missed: string[] = [];
      const fetchInto = async (url: string, name: (type: string) => string, word: string) => {
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error(String(res.status));
          const blob = await res.blob();
          entries.push({ name: name(blob.type), data: new Uint8Array(await blob.arrayBuffer()) });
        } catch {
          missed.push(word);
        }
      };
      if (plan.model) await fetchInto(plan.model.url, () => plan.model?.filename ?? `${base}-3d-model.glb`, "the 3D model");
      if (plan.render) await fetchInto(plan.render, (type) => `${base}-render.${extOf(plan.render ?? "", type)}`, "the render");
      if (entries.length === 0) {
        setState("failed");
        setNote("The files couldn't be downloaded. Try again.");
        return;
      }
      const zip = makeZip(entries);
      saveBlob(new Blob([zip as BlobPart], { type: "application/zip" }), `${base}-${kind}-nft-files.zip`);
      setState("done");
      const lost = andList(missed);
      setNote(lost ? `${lost[0].toUpperCase()}${lost.slice(1)} couldn't be added; the other files are in the zip.` : "");
    })();
  };

  return { what: plan?.what ?? null, state, note, run };
}
