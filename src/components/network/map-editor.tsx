"use client";

// MapEditor — the canvas with its toolbar, its side panel and its history
// (Figma 05–07 in the wizard, 14 on the Connection Map). The document it
// edits belongs to the owner; the editor keeps the undo and redo stacks and
// the link that is being drawn but not yet saved.
//
// Keys while it is on screen: V select · L draw link · Delete removes the
// selected link · ⌘Z / ⇧⌘Z undo and redo; with focus inside it, Esc drops a
// half-made link or the selection.

import * as React from "react";
import {
  Cursor01Icon,
  Link01Icon,
  Redo02Icon,
  Undo02Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { SelectMenu } from "@/components/ideeza/select-menu";
import { cn } from "@/lib/utils";
import {
  defaultLabel,
  mapStatusLine,
  rolesOf,
} from "@/lib/network/derive";
import { linkId } from "@/lib/network/planner";
import type {
  CloudType,
  MapLink,
  MapNode,
  NetProduct,
  ProtocolKey,
  Side,
} from "@/lib/network/types";
import { LinkPanel, PROTOCOL_OPTIONS } from "./link-panel";
import { MapCanvas, type Selection, type Tool } from "./map-canvas";
import { btn } from "./ui";

export type MapDoc = { nodes: MapNode[]; links: MapLink[]; masterId: string | null };

const isTyping = (t: EventTarget | null) => {
  if (!(t instanceof HTMLElement)) return false;
  if (t.isContentEditable) return true;
  if (["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return true;
  const role = t.getAttribute("role");
  return role === "combobox" || role === "listbox" || role === "option";
};

export function MapEditor({
  doc,
  onChange,
  products,
  cloudType,
  protocol,
  onProtocolChange,
  onHowTo,
  onPendingChange,
  renderNode,
  renderIdle,
  canvasHeight,
  fitKey,
  keysActive = true,
}: {
  doc: MapDoc;
  onChange: (next: MapDoc) => void;
  products: NetProduct[];
  cloudType: CloudType;
  /** The protocol the next drawn link takes. */
  protocol: ProtocolKey;
  onProtocolChange: (p: ProtocolKey) => void;
  onHowTo: () => void;
  /** Tells the owner a link is waiting for Save link — a step cannot be
   *  left with half a link on it. */
  onPendingChange?: (pending: boolean) => void;
  renderNode?: (id: string) => React.ReactNode;
  renderIdle?: () => React.ReactNode;
  canvasHeight: string;
  /** A new map landed: re-fit the view and start a fresh history. */
  fitKey?: string | number;
  /** False while another dialog sits on top and owns the keyboard. */
  keysActive?: boolean;
}) {
  const [tool, setTool] = React.useState<Tool>("select");
  const [selection, setSelection] = React.useState<Selection>(null);
  const [pending, setPending] = React.useState<MapLink | null>(null);
  const [past, setPast] = React.useState<MapDoc[]>([]);
  const [future, setFuture] = React.useState<MapDoc[]>([]);
  const [note, setNote] = React.useState("");

  const [historyKey, setHistoryKey] = React.useState(fitKey);
  if (historyKey !== fitKey) {
    setHistoryKey(fitKey);
    setPast([]);
    setFuture([]);
    setSelection(null);
    setPending(null);
  }

  React.useEffect(() => {
    onPendingChange?.(!!pending);
  }, [pending, onPendingChange]);

  const commit = (next: MapDoc) => {
    setPast((p) => [...p.slice(-49), doc]);
    setFuture([]);
    onChange(next);
  };
  const undo = () => {
    const prev = past[past.length - 1];
    if (!prev) return;
    setPast((p) => p.slice(0, -1));
    setFuture((f) => [doc, ...f]);
    setSelection(null);
    onChange(prev);
  };
  const redo = () => {
    const next = future[0];
    if (!next) return;
    setFuture((f) => f.slice(1));
    setPast((p) => [...p, doc]);
    setSelection(null);
    onChange(next);
  };

  const roles = React.useMemo(
    () => rolesOf(products.map((p) => p.id), doc.links, doc.masterId),
    [products, doc.links, doc.masterId],
  );
  const protocolOf = React.useCallback(
    (id: string) => doc.links.find((l) => (l.from === id || l.to === id) && l.from !== "app" && l.to !== "app")?.protocol ?? null,
    [doc.links],
  );

  const selectedLink =
    selection?.kind === "link" ? doc.links.find((l) => l.id === selection.id) ?? null : null;

  const deleteLink = (id: string) => {
    commit({ ...doc, links: doc.links.filter((l) => l.id !== id) });
    setSelection(null);
  };

  const onDrawLink = (from: string, fromSide: Side, to: string, toSide: Side) => {
    const existing = doc.links.find(
      (l) => (l.from === from && l.to === to) || (l.from === to && l.to === from),
    );
    if (existing) {
      setSelection({ kind: "link", id: existing.id });
      setNote("These two already have a link — it is selected, so change that one.");
      return;
    }
    const isSystem = (id: string) => id === "broker" || id === "app";
    const source = products.find((p) => p.id === from);
    const draft = {
      from,
      to,
      initiator: "source" as const,
      carries: !source?.senses
        ? ("commands" as const)
        : source.sensor === "reed" || source.sensor === "pir"
          ? ("events" as const)
          : ("sensor" as const),
    };
    setNote("");
    setSelection(null);
    setPending({
      id: linkId(),
      ...draft,
      fromSide,
      toSide,
      protocol,
      middle: isSystem(from) || isSystem(to) ? "cloud" : "direct",
      label: defaultLabel(draft, products),
    });
  };

  // Tool keys work while the editor is on screen, not only once something
  // inside it has focus — "Press L" has to work straight after the canvas
  // opens. Escape stays with focus (below): outside the editor it belongs to
  // the dialog around it.
  const onToolKey = React.useEffectEvent((e: KeyboardEvent) => {
    if (e.defaultPrevented || isTyping(e.target)) return;
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === "z") {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
      return;
    }
    if (mod && e.key.toLowerCase() === "y") {
      e.preventDefault();
      redo();
      return;
    }
    if (mod || e.altKey) return;
    if (e.key === "v" || e.key === "V") setTool("select");
    else if (e.key === "l" || e.key === "L") setTool("draw");
    else if ((e.key === "Delete" || e.key === "Backspace") && selectedLink) {
      e.preventDefault();
      deleteLink(selectedLink.id);
    }
  });
  React.useEffect(() => {
    if (!keysActive) return;
    const onKey = (e: KeyboardEvent) => onToolKey(e);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [keysActive]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && (pending || selection) && !isTyping(e.target)) {
      e.preventDefault();
      e.stopPropagation();
      setPending(null);
      setSelection(null);
    }
  };

  let panel: React.ReactNode;
  if (pending) {
    panel = (
      <LinkPanel
        link={pending}
        mode="new"
        products={products}
        cloudType={cloudType}
        onChange={setPending}
        onCancel={() => setPending(null)}
        onSave={() => {
          commit({ ...doc, links: [...doc.links, pending] });
          setSelection({ kind: "link", id: pending.id });
          setPending(null);
          setTool("select");
        }}
      />
    );
  } else if (selectedLink) {
    panel = (
      <LinkPanel
        link={selectedLink}
        mode="edit"
        products={products}
        cloudType={cloudType}
        onChange={(next) => commit({ ...doc, links: doc.links.map((l) => (l.id === next.id ? next : l)) })}
        onDelete={() => deleteLink(selectedLink.id)}
      />
    );
  } else if (selection?.kind === "node" && renderNode) {
    panel = renderNode(selection.id);
  } else {
    panel = renderIdle?.() ?? (
      <div className="flex h-full flex-col items-center justify-center gap-3 py-20 text-center">
        <p className="text-md font-semibold text-text-primary">No link selected</p>
        <p className="max-w-[32ch] text-sm text-text-secondary">
          Click any arrow on the canvas to set who starts it, what sits in the middle and what it carries.
        </p>
      </div>
    );
  }

  const tb = "inline-flex h-16 items-center gap-3 rounded-md px-5 text-sm font-semibold outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus";

  return (
    <div onKeyDown={onKeyDown} className="flex min-h-0 flex-col gap-6">
      <div className="flex flex-wrap items-center gap-6">
        <span className="text-xs text-text-tertiary">Tool</span>
        <div role="group" aria-label="Tool" className="inline-flex rounded-lg border border-solid border-border bg-bg-surface p-1">
          {(
            [
              { key: "select", label: "Select", icon: Cursor01Icon, kbd: "V" },
              { key: "draw", label: "Draw link", icon: Link01Icon, kbd: "L" },
            ] as const
          ).map((t) => {
            const on = tool === t.key;
            return (
              <button
                key={t.key}
                type="button"
                aria-pressed={on}
                title={`${t.label} (${t.kbd})`}
                onClick={() => setTool(t.key)}
                className={cn(tb, on ? "bg-bg-brand-subtle text-text-brand" : "text-text-secondary hover:bg-bg-subtle hover:text-text-primary")}
              >
                <Icon icon={t.icon} size={15} />
                {t.label}
              </button>
            );
          })}
        </div>
        <span className="text-xs text-text-tertiary">Protocol</span>
        <div className="w-64">
          <SelectMenu<ProtocolKey>
            ariaLabel="Protocol for new links"
            value={protocol}
            options={PROTOCOL_OPTIONS}
            placeholder="Pick a protocol"
            onChange={onProtocolChange}
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={undo} disabled={!past.length} title="Undo (⌘Z)" className={cn(tb, "text-text-primary hover:bg-bg-subtle disabled:cursor-not-allowed disabled:text-text-disabled disabled:hover:bg-transparent")}>
            <Icon icon={Undo02Icon} size={15} />
            Undo
          </button>
          <button type="button" onClick={redo} disabled={!future.length} title="Redo (⇧⌘Z)" className={cn(tb, "text-text-primary hover:bg-bg-subtle disabled:cursor-not-allowed disabled:text-text-disabled disabled:hover:bg-transparent")}>
            <Icon icon={Redo02Icon} size={15} />
            Redo
          </button>
          <button type="button" onClick={onHowTo} className={cn(btn.link, "ml-4")}>
            How to draw
          </button>
        </div>
      </div>

      <div className="grid min-h-0 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-3">
          <div style={{ height: canvasHeight }}>
            <MapCanvas
              nodes={doc.nodes}
              links={doc.links}
              products={products}
              cloudType={cloudType}
              roles={roles}
              protocolOf={protocolOf}
              tool={tool}
              selection={selection}
              pending={pending}
              fitKey={fitKey}
              onSelect={(sel) => {
                setNote("");
                if (!pending) setSelection(sel);
              }}
              onMoveNode={(id, x, y) => commit({ ...doc, nodes: doc.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)) })}
              onDrawLink={onDrawLink}
            />
          </div>
          <p className="text-xs text-text-tertiary" role="status">
            {note || mapStatusLine(doc.nodes, doc.links)}
          </p>
        </div>
        <aside
          aria-label="Selection"
          className="min-h-0 overflow-y-auto rounded-xl border border-solid border-border bg-bg-surface p-8"
          style={{ maxHeight: canvasHeight }}
        >
          {panel}
        </aside>
      </div>
    </div>
  );
}
