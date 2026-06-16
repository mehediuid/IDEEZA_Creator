"use client";

// IDEEZA PCB Software — editor store.
// Holds the editor state and every handler, ported 1:1 from the prototype's
// class methods. `merge` reproduces React class `setState` (shallow merge,
// partial or updater-function), so the ported handlers read identically.

import * as React from "react";
import {
  DEL_OBJ_NAMES,
  initialState,
  type BottomTab,
  type LeftMain,
  type LeftSub,
  type MenuId,
  type ModalId,
  type Mode,
  type PcbState,
  type RightTab,
  type SettingsPage,
} from "./types";

type Merge = (
  patch: Partial<PcbState> | ((s: PcbState) => Partial<PcbState>),
) => void;

export interface PcbActions {
  merge: Merge;
  enterApp: () => void;
  toggleMenu: (id: MenuId) => void;
  closeAll: () => void;
  setMode: (m: Mode) => void;
  openSettings: (page?: SettingsPage) => void;
  closeSettings: () => void;
  setSettingsPage: (page: SettingsPage) => void;
  openModal: (m: Exclude<ModalId, null>) => void;
  closeModal: () => void;
  toggleDelObj: (n: string) => void;
  toggleDelAll: () => void;
  setArr: (k: keyof PcbState["arr"], v: string) => void;
  setTbl: (k: keyof PcbState["tbl"], v: string) => void;
  startFloatDrag: (e: React.MouseEvent) => void;
  setLeftMain: (k: LeftMain) => void;
  setLeftSub: (k: LeftSub) => void;
  setNetSub: (k: PcbState["netSub"]) => void;
  setCompSub: (k: PcbState["compSub"]) => void;
  setRightTab: (k: RightTab) => void;
  clickBottomTab: (k: BottomTab) => void;
  closeBottom: () => void;
  toggleBottom: () => void;
  setTool: (t: string) => void;
  setSelectedTree: (label: string) => void;
  toggleExpanded: (label: string) => void;
  toggleExpandedKey: (key: string) => void;
  toggleView: (label: string) => void;
  openCanvasCtx: (e: React.MouseEvent) => void;
  setAnnot: (patch: Partial<PcbState["annot"]>) => void;
  setFr: (patch: Partial<Pick<PcbState, "frScope" | "frRegex" | "frMatch" | "frExt">>) => void;
  selectObject: (o: PcbState["selected"]) => void;
  startTextEdit: () => void;
  setEditText: (v: string) => void;
  stopTextEdit: () => void;
  setNetColor: (hex: string) => void;
  toggleColorPicker: (open?: boolean) => void;
}

const StateCtx = React.createContext<PcbState | null>(null);
const ActionsCtx = React.createContext<PcbActions | null>(null);

export function PcbProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<PcbState>(initialState);
  const stateRef = React.useRef(state);
  React.useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const merge = React.useCallback<Merge>((patch) => {
    setState((s) => ({ ...s, ...(typeof patch === "function" ? patch(s) : patch) }));
  }, []);

  const actions = React.useMemo<PcbActions>(() => {
    return {
      merge,
      enterApp: () => merge({ showCover: false }),
      toggleMenu: (id) =>
        merge((s) => ({ openMenu: s.openMenu === id ? null : id, ctx: null })),
      closeAll: () => merge({ openMenu: null, ctx: null }),
      setMode: (m) => merge({ mode: m, openMenu: null, ctx: null }),
      openSettings: (page) =>
        merge({ settingsOpen: true, settingsPage: page ?? "system", openMenu: null }),
      closeSettings: () => merge({ settingsOpen: false }),
      setSettingsPage: (page) => merge({ settingsPage: page }),
      openModal: (m) => merge({ modal: m, openMenu: null, ctx: null }),
      closeModal: () => merge({ modal: null }),
      toggleDelObj: (n) =>
        merge((s) => ({ delObj: { ...s.delObj, [n]: !s.delObj[n as keyof typeof s.delObj] } })),
      toggleDelAll: () =>
        merge((s) => {
          const on = DEL_OBJ_NAMES.every((n) => s.delObj[n]);
          const next = {} as PcbState["delObj"];
          DEL_OBJ_NAMES.forEach((n) => (next[n] = !on));
          return { delObj: next };
        }),
      setArr: (k, v) => merge((s) => ({ arr: { ...s.arr, [k]: v } })),
      setTbl: (k, v) => merge((s) => ({ tbl: { ...s.tbl, [k]: v } })),
      startFloatDrag: (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        const sx = e.clientX;
        const sy = e.clientY;
        const ox = stateRef.current.floatPos.x;
        const oy = stateRef.current.floatPos.y;
        const move = (ev: MouseEvent) =>
          merge({
            floatPos: {
              x: Math.max(0, ox + ev.clientX - sx),
              y: Math.max(0, oy + ev.clientY - sy),
            },
          });
        const up = () => {
          document.removeEventListener("mousemove", move);
          document.removeEventListener("mouseup", up);
        };
        document.addEventListener("mousemove", move);
        document.addEventListener("mouseup", up);
      },
      setLeftMain: (k) => merge({ leftMain: k }),
      setLeftSub: (k) => merge({ leftSub: k }),
      setNetSub: (k) => merge({ netSub: k }),
      setCompSub: (k) => merge({ compSub: k }),
      setRightTab: (k) => merge({ rightTab: k }),
      clickBottomTab: (k) =>
        merge((s) => ({
          bottomTab: k,
          bottomOpen: s.bottomTab === k ? !s.bottomOpen : true,
        })),
      closeBottom: () => merge({ bottomOpen: false }),
      toggleBottom: () => merge((s) => ({ bottomOpen: !s.bottomOpen })),
      setTool: (t) => merge({ tool: t }),
      setSelectedTree: (label) => merge({ selectedTree: label }),
      toggleExpanded: (label) =>
        merge((s) => ({ expanded: { ...s.expanded, [label]: !s.expanded[label] } })),
      toggleExpandedKey: (key) =>
        merge((s) => ({ expanded: { ...s.expanded, [key]: s.expanded[key] === false ? true : false } })),
      toggleView: (label) =>
        merge((s) => ({ viewTog: { ...s.viewTog, [label]: !s.viewTog[label] } })),
      openCanvasCtx: (e) => {
        e.preventDefault();
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
        merge({
          ctx: true,
          openMenu: null,
          ctxX: `${e.clientX - r.left + 366}px`,
          ctxY: `${e.clientY - r.top + 225}px`,
        });
      },
      setAnnot: (patch) => merge((s) => ({ annot: { ...s.annot, ...patch } })),
      setFr: (patch) => merge(patch),
      selectObject: (o) => merge({ selected: o, editingText: false, colorPickerOpen: false }),
      startTextEdit: () => merge({ selected: "comp", editingText: true }),
      setEditText: (v) => merge({ editText: v }),
      stopTextEdit: () => merge({ editingText: false }),
      setNetColor: (hex) => merge({ netColor: hex }),
      toggleColorPicker: (open) => merge((s) => ({ colorPickerOpen: open ?? !s.colorPickerOpen })),
    };
  }, [merge]);

  return (
    <StateCtx.Provider value={state}>
      <ActionsCtx.Provider value={actions}>{children}</ActionsCtx.Provider>
    </StateCtx.Provider>
  );
}

export function usePcbState(): PcbState {
  const ctx = React.useContext(StateCtx);
  if (!ctx) throw new Error("usePcbState must be used within PcbProvider");
  return ctx;
}

export function usePcbActions(): PcbActions {
  const ctx = React.useContext(ActionsCtx);
  if (!ctx) throw new Error("usePcbActions must be used within PcbProvider");
  return ctx;
}
