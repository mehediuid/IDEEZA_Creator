"use client";

// The phone's Feed-sample purchases in this browser (`PHONE_SAMPLE_SALES_KEY`,
// lib/market/phone-sample-sales.ts): a live read every screen follows at once,
// in this tab and in another, and the one write a purchase makes.

import * as React from "react";
import { normalizeSampleSales, PHONE_SAMPLE_SALES_KEY, type SampleSale } from "@/lib/market/phone-sample-sales";

const listeners = new Set<() => void>();

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(PHONE_SAMPLE_SALES_KEY);
  } catch {
    return null;
  }
}

let cache: { raw: string | null; sales: SampleSale[] } = { raw: null, sales: [] };

function parse(raw: string | null): SampleSale[] {
  if (raw === cache.raw) return cache.sales;
  let sales: SampleSale[] = [];
  try {
    sales = normalizeSampleSales(raw ? JSON.parse(raw) : []);
  } catch {
    sales = [];
  }
  cache = { raw, sales };
  return sales;
}

/** The list as stored right now (a purchase's recheck and commit read it fresh). */
export function readSampleSales(): SampleSale[] {
  return parse(readRaw());
}

/** Writes the whole list; false when the browser refused it. */
export function writeSampleSales(next: SampleSale[]): boolean {
  try {
    window.localStorage.setItem(PHONE_SAMPLE_SALES_KEY, JSON.stringify(next));
  } catch {
    return false;
  }
  listeners.forEach((l) => l());
  return true;
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key === PHONE_SAMPLE_SALES_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

const EMPTY: SampleSale[] = [];

export function useSampleSales(): SampleSale[] {
  return React.useSyncExternalStore(subscribe, readSampleSales, () => EMPTY);
}
