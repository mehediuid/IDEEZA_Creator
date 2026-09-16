"use client";

// New Package flow — state store.
//
// Same shape as the PCB store so the two read alike: one state object, actions
// built with useMemo, and a `stateRef` so an event handler can read the latest
// state without going stale. The draft auto-saves (debounced) to localStorage,
// so a reload in the middle of authoring a part loses nothing; the transient UI
// (which tool is armed, what is selected, which step you're on) is deliberately
// session-only, because it is not part of the part.

import * as React from "react";
import { savePackage, type SavedPackage } from "./library";
import { componentBodyColor } from "@/lib/pcb/pcb-3d";
import { familyById, padsFor, silkFor, symbolFor } from "./wizard";
import {
  type Body3D,
  type FpObj,
  type FpTool,
  type PackageDraft,
  type PadKind,
  type StepId,
  type SymObj,
  type SymTool,
  STEPS,
  blockedReason,
  clearDraft,
  entrySub,
  initialDraft,
  loadDraft,
  loadStep,
  newId,
  nextPinNumber,
  saveDraft,
  saveStep,
  stepIndex,
  symPins,
} from "./types";

type PackageState = {
  draft: PackageDraft;
  step: StepId;
  symTool: SymTool;
  fpTool: FpTool;
  /** The Add Pad tool's inline sub-selector — lives in the toolbar, mirrored
   *  into the pad's own Kind field once placed. */
  padKind: PadKind;
  /** Selection is exclusive in both editors — one object or nothing. */
  selected: string | null;
  toast: string | null;
  /** Set once the package is saved — the flow ends on its confirmation. */
  done: SavedPackage | null;
};

const initialState = (): PackageState => ({
  draft: initialDraft(),
  step: "package",
  symTool: "select",
  fpTool: "select",
  padKind: "Pad",
  selected: null,
  toast: null,
  done: null,
});

type Ctx = {
  state: PackageState;
  actions: PackageActions;
  stateRef: React.RefObject<PackageState>;
};

const PackageCtx = React.createContext<Ctx | null>(null);

export type PackageActions = {
  /** Patch the part itself — persisted. */
  patch: (p: Partial<PackageDraft>) => void;
  setStep: (s: StepId) => void;
  goNext: () => void;
  goBack: () => void;

  setSymTool: (t: SymTool) => void;
  setFpTool: (t: FpTool) => void;
  setPadKind: (k: PadKind) => void;
  select: (id: string | null) => void;

  addSym: (o: SymObj) => void;
  updateSym: (id: string, p: Partial<SymObj>) => void;
  removeSym: (id: string) => void;

  addFp: (o: FpObj) => void;
  updateFp: (id: string, p: Partial<FpObj>) => void;
  removeFp: (id: string) => void;

  /** Delete whatever is selected in the editor the flow is currently on. */
  deleteSelected: () => void;

  addPins: (count: number) => void;
  renumberPin: (id: string, num: number) => void;
  setBody: (p: Partial<Body3D>) => void;

  /** Write the package to the library and land on the confirmation. */
  finish: () => void;
  reset: () => void;
  flash: (msg: string) => void;
};

export function PackageProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<PackageState>(initialState);
  const stateRef = React.useRef(state);
  // The latest-state ref an event/async action reads instead of a stale closure —
  // the same idiom lib/pcb/store.tsx uses. It is written during render on
  // purpose; nothing renders from it.
  // eslint-disable-next-line react-hooks/refs
  stateRef.current = state;

  // The draft lives in localStorage, so it is read on mount rather than during
  // render — reading it in the initialiser would render different markup on the
  // server and on the client, and React 19 does not patch that up.
  React.useEffect(() => {
    const saved = loadDraft();
    // Reading localStorage in the state initialiser would render different
    // markup on the server and the client, and React 19 does not patch a
    // mismatch up — so the draft is hydrated here, once, on purpose. The step
    // comes back with it, clamped to what this draft really opens, so the
    // flow reopens where it was left instead of always on step 1.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState((s) => ({ ...s, draft: saved, step: loadStep(saved) }));
  }, []);

  const dirty = React.useRef(false);
  React.useEffect(() => {
    if (!dirty.current) return;
    const t = window.setTimeout(() => saveDraft(stateRef.current.draft), 300);
    return () => window.clearTimeout(t);
  }, [state.draft]);

  // Written on every step change, including the hydrating one — writing back
  // the step just read is a no-op, and skipping it would lose the step of a
  // flow the user opens and leaves without touching anything.
  React.useEffect(() => {
    saveStep(state.step);
  }, [state.step]);

  const toastTimer = React.useRef<number | null>(null);
  // `renumberPin` reports a collision through `flash`, which is defined in the
  // same object — the ref breaks that cycle without rebuilding the actions.
  const actionsRef = React.useRef<PackageActions | null>(null);

  const actions = React.useMemo<PackageActions>(() => {
    const merge = (p: Partial<PackageState>) => setState((s) => ({ ...s, ...p }));
    const patch = (p: Partial<PackageDraft>) => {
      dirty.current = true;
      setState((s) => ({ ...s, draft: { ...s.draft, ...p } }));
    };
    const mapSym = (fn: (list: SymObj[]) => SymObj[]) => patch({ symbol: fn(stateRef.current.draft.symbol) });
    const mapFp = (fn: (list: FpObj[]) => FpObj[]) => patch({ footprint: fn(stateRef.current.draft.footprint) });

    return {
      patch,
      setStep: (step) => merge({ step, selected: null }),
      goNext: () => {
        const s = stateRef.current;
        if (blockedReason(s.step, s.draft)) return;
        // Leaving the wizard is where its parameters become a real part. The
        // generated objects are wizard-owned, so a second pass replaces them
        // rather than piling a second copy on top.
        if (s.step === "package" && s.draft.path === "wizard" && s.draft.wizard) {
          const f = familyById(s.draft.wizard.family);
          if (f) {
            const pads = padsFor(f, s.draft.wizard.params);
            const silk = silkFor(f, pads);
            patch({
              prefix: s.draft.prefix === initialDraft().prefix ? f.prefix : s.draft.prefix,
              mounting: f.mount,
              symbol: symbolFor(f, pads),
              footprint: silk ? [...pads, silk] : pads,
              body: { ...s.draft.body, height: f.bodyHeight, color: componentBodyColor(f.prefix) },
            });
          }
        }
        const i = stepIndex(s.step);
        if (i < STEPS.length - 1) merge({ step: STEPS[i + 1], selected: null });
      },
      goBack: () => {
        const s = stateRef.current;
        // Step 1 is three screens deep for the wizard and import paths; Back
        // walks out of them by clearing whatever got the user in.
        if (s.step === "package") {
          const sub = entrySub(s.draft);
          if (sub === "wizard-params") return patch({ wizard: null });
          if (sub === "import-result") return patch({ imported: null });
          if (sub !== "paths") return patch({ path: null });
          return;
        }
        const i = stepIndex(s.step);
        if (i > 0) merge({ step: STEPS[i - 1], selected: null });
      },

      setSymTool: (symTool) => merge({ symTool, selected: symTool === "select" ? stateRef.current.selected : null }),
      setFpTool: (fpTool) => merge({ fpTool, selected: fpTool === "select" ? stateRef.current.selected : null }),
      setPadKind: (padKind) => merge({ padKind }),
      select: (selected) => merge({ selected }),

      addSym: (o) => {
        mapSym((l) => [...l, o]);
        merge({ selected: o.id, symTool: "select" });
      },
      updateSym: (id, p) => mapSym((l) => l.map((o) => (o.id === id ? ({ ...o, ...p } as SymObj) : o))),
      removeSym: (id) => {
        mapSym((l) => l.filter((o) => o.id !== id));
        if (stateRef.current.selected === id) merge({ selected: null });
      },

      addFp: (o) => {
        mapFp((l) => [...l, o]);
        merge({ selected: o.id, fpTool: "select" });
      },
      updateFp: (id, p) => mapFp((l) => l.map((o) => (o.id === id ? ({ ...o, ...p } as FpObj) : o))),
      removeFp: (id) => {
        mapFp((l) => l.filter((o) => o.id !== id));
        if (stateRef.current.selected === id) merge({ selected: null });
      },

      deleteSelected: () => {
        const s = stateRef.current;
        if (!s.selected) return;
        if (s.step === "symbol") mapSym((l) => l.filter((o) => o.id !== s.selected));
        else if (s.step === "footprint") mapFp((l) => l.filter((o) => o.id !== s.selected));
        merge({ selected: null });
      },

      addPins: (count) => {
        const d = stateRef.current.draft;
        const existing = symPins(d);
        // Stack new pins down the left edge, on the grid, below the last one —
        // so "+ Add 4 pins" lands a readable column instead of a pile.
        const startY = existing.length ? Math.max(...existing.map((p) => p.y)) + d.symGrid * 2 : 200;
        const made: SymObj[] = [];
        let n = nextPinNumber(d);
        for (let i = 0; i < count; i += 1) {
          made.push({
            id: newId("pin"),
            kind: "pin",
            num: n,
            name: `Pin${n}`,
            etype: "Passive",
            length: 30,
            // Terminal on the left with the lead running right, into where a
            // body would sit — the same orientation the Pin tool places.
            angle: 0,
            x: 200,
            y: startY + i * d.symGrid * 2,
          });
          n += 1;
          while (made.some((m) => m.kind === "pin" && m.num === n)) n += 1;
        }
        patch({ symbol: [...d.symbol, ...made] });
      },

      renumberPin: (id, num) => {
        const d = stateRef.current.draft;
        // Refuse rather than coerce. `Math.max(1, Math.round(n))` used to sit
        // here, so 0 silently became pin 1 and a NaN — which `Math.max` passes
        // straight through — was written into the pin *and* every pad pointing
        // at it. A pin number is an identity; landing on a different one than
        // the one asked for is worse than not moving at all.
        if (!Number.isInteger(num) || num < 1) {
          actionsRef.current?.flash("Pin numbers are whole numbers from 1");
          return;
        }
        const taken = symPins(d).some((p) => p.num === num && p.id !== id);
        if (taken) {
          actionsRef.current?.flash(`Pin ${num} already exists`);
          return;
        }
        // The pads reference pins by number, so a renumber has to carry the
        // pad with it or the match banner would go wrong for no visible reason.
        const before = symPins(d).find((p) => p.id === id)?.num;
        patch({
          symbol: d.symbol.map((o) => (o.id === id && o.kind === "pin" ? { ...o, num } : o)),
          footprint: d.footprint.map((o) => (o.kind === "pad" && o.pin === before ? { ...o, pin: num } : o)),
        });
      },

      setBody: (p) => patch({ body: { ...stateRef.current.draft.body, ...p } }),

      finish: () => {
        const d = stateRef.current.draft;
        if (blockedReason("finalize", d)) return;
        const rec = savePackage(d);
        clearDraft();
        dirty.current = false;
        // The draft is filed, so the next visit starts a new package rather
        // than reopening on the step this one finished at.
        merge({ done: rec, selected: null, step: STEPS[0] });
      },

      reset: () => {
        dirty.current = true;
        setState({ ...initialState(), draft: initialDraft() });
      },

      flash: (toast) => {
        merge({ toast });
        if (toastTimer.current) window.clearTimeout(toastTimer.current);
        toastTimer.current = window.setTimeout(() => merge({ toast: null }), 2600);
      },
    };
  }, []);

  // eslint-disable-next-line react-hooks/refs
  actionsRef.current = actions;

  React.useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
  }, []);

  const value = React.useMemo<Ctx>(() => ({ state, actions, stateRef }), [state, actions]);
  return <PackageCtx.Provider value={value}>{children}</PackageCtx.Provider>;
}

function useCtx(): Ctx {
  const ctx = React.useContext(PackageCtx);
  if (!ctx) throw new Error("usePackage* must be used inside PackageProvider");
  return ctx;
}

export const usePackageState = () => useCtx().state;
export const usePackageActions = () => useCtx().actions;
export const usePackageDraft = () => useCtx().state.draft;
