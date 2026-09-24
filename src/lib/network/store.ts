// A project's network, kept in this browser beside the project itself
// (`ideeza:network:<projectId>`). One hook reads it, so the review card, the
// project page and the Connection Map page always agree — and a save on one
// of them reaches the others without a reload.

import * as React from "react";
import { PROTOCOL_KEYS } from "./catalog";
import type { Network } from "./types";

const KEY = (projectId: string) => `ideeza:network:${projectId}`;
const EVENT = "ideeza:network-change";

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object";
const str = (v: unknown, d = "") => (typeof v === "string" ? v : d);
const num = (v: unknown, d = 0) => (typeof v === "number" && Number.isFinite(v) ? v : d);

/** Shape-checks a stored network. A record that is not one comes back null
 *  — the surfaces then offer to create a network instead of drawing a
 *  broken one. */
export function sanitizeNetwork(raw: unknown, projectId: string): Network | null {
  if (!isObj(raw) || raw.version !== 1) return null;
  if (!Array.isArray(raw.nodes) || !Array.isArray(raw.links) || !Array.isArray(raw.productIds)) return null;
  const nodes = raw.nodes
    .filter(isObj)
    .filter((n) => typeof n.id === "string" && ["product", "broker", "app"].includes(n.kind as string))
    .map((n) => ({
      id: n.id as string,
      kind: n.kind as Network["nodes"][number]["kind"],
      x: num(n.x),
      y: num(n.y),
      ...(typeof n.h === "number" ? { h: n.h } : null),
    }));
  const ids = new Set(nodes.map((n) => n.id));
  const links = raw.links
    .filter(isObj)
    .filter(
      (l) =>
        typeof l.id === "string" &&
        ids.has(l.from as string) &&
        ids.has(l.to as string) &&
        PROTOCOL_KEYS.includes(l.protocol as never),
    ) as unknown as Network["links"];
  return {
    ...(raw as unknown as Network),
    projectId,
    name: str(raw.name),
    cloudName: str(raw.cloudName),
    cloudPassword: str(raw.cloudPassword),
    productIds: raw.productIds.filter((x): x is string => typeof x === "string"),
    nodes,
    links,
    products: isObj(raw.products) ? (raw.products as Network["products"]) : {},
    masterId: typeof raw.masterId === "string" && ids.has(raw.masterId) ? raw.masterId : null,
    createdAt: num(raw.createdAt, Date.now()),
    updatedAt: num(raw.updatedAt, Date.now()),
  };
}

function readRaw(projectId: string): string | null {
  try {
    return window.localStorage.getItem(KEY(projectId));
  } catch {
    return null;
  }
}

export function readNetwork(projectId: string): Network | null {
  const raw = readRaw(projectId);
  if (!raw) return null;
  try {
    return sanitizeNetwork(JSON.parse(raw), projectId);
  } catch {
    return null;
  }
}

export function saveNetwork(network: Network): void {
  try {
    window.localStorage.setItem(
      KEY(network.projectId),
      JSON.stringify({ ...network, updatedAt: Date.now() }),
    );
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

export function deleteNetwork(projectId: string): void {
  try {
    window.localStorage.removeItem(KEY(projectId));
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

const SERVER = "\u0000server";

/** The project's network, live. `hydrated` is false until the browser's
 *  copy has been read, so a surface never flashes "No network yet" at a
 *  project that has one. */
export function useProjectNetwork(projectId: string | null | undefined): {
  hydrated: boolean;
  network: Network | null;
} {
  const raw = React.useSyncExternalStore(
    subscribe,
    () => (projectId ? readRaw(projectId) : null),
    () => SERVER,
  );
  return React.useMemo(() => {
    if (raw === SERVER) return { hydrated: false, network: null };
    if (!raw || !projectId) return { hydrated: true, network: null };
    try {
      return { hydrated: true, network: sanitizeNetwork(JSON.parse(raw), projectId) };
    } catch {
      return { hydrated: true, network: null };
    }
  }, [raw, projectId]);
}
