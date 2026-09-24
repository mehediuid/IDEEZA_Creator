"use client";

// MapCanvas — the connection map itself (Figma 05–07, 11–14). HTML boxes and
// an SVG layer of arrows share one transformed plane, so pan and zoom move
// them together and the text stays crisp at any zoom.
//
//   • Select — click a box or an arrow's label to select it, drag a box to
//     move it, drag the ground to pan. Click the ground to clear.
//   • Draw link — hover a box and its four ports appear; click one on the
//     source, then one on the target. The editor turns that into a new link
//     waiting for its three answers.
//
// Wheel pans; ⌘/Ctrl + wheel zooms around the pointer. Arrows are neutral
// until selected — brand violet marks the selection only.

import * as React from "react";
import { Add01Icon, MinusSignIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { cn } from "@/lib/utils";
import { protocolInfo } from "@/lib/network/catalog";
import { brokerName, nodeName } from "@/lib/network/derive";
import {
  NODE_W,
  boundsOf,
  boxOf,
  portPoint,
  routeOf,
  type Pt,
} from "@/lib/network/geometry";
import type {
  CloudType,
  MapLink,
  MapNode,
  NetProduct,
  ProtocolKey,
  Role,
  Side,
} from "@/lib/network/types";
import { RoleChip } from "./ui";

export type Selection = { kind: "link" | "node"; id: string } | null;
export type Tool = "select" | "draw";

const SIDES: Side[] = ["top", "right", "bottom", "left"];
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2;
const DRAG_THRESHOLD = 3;
const GRID = 20;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function MapCanvas({
  nodes,
  links,
  products,
  cloudType,
  roles,
  protocolOf,
  tool = "select",
  readOnly = false,
  selection,
  pending,
  onSelect,
  onMoveNode,
  onDrawLink,
  fitKey,
  className,
}: {
  nodes: MapNode[];
  links: MapLink[];
  products: NetProduct[];
  cloudType: CloudType;
  roles: Record<string, Role>;
  /** The protocol a product box names on its chip. */
  protocolOf: (nodeId: string) => ProtocolKey | null;
  tool?: Tool;
  readOnly?: boolean;
  selection: Selection;
  /** A link drawn but not yet saved — shown, but not part of the map. */
  pending?: MapLink | null;
  onSelect: (sel: Selection) => void;
  onMoveNode?: (id: string, x: number, y: number) => void;
  onDrawLink?: (from: string, fromSide: Side, to: string, toSide: Side) => void;
  /** Change it to re-fit the view (a new map landed). */
  fitKey?: string | number;
  className?: string;
}) {
  const viewRef = React.useRef<HTMLDivElement>(null);
  const [view, setView] = React.useState({ x: 40, y: 40, zoom: 1 });
  const [size, setSize] = React.useState({ w: 0, h: 0 });
  const [drag, setDrag] = React.useState<{ id: string; x: number; y: number } | null>(null);
  const [start, setStart] = React.useState<{ id: string; side: Side } | null>(null);
  const [cursor, setCursor] = React.useState<Pt | null>(null);
  const gesture = React.useRef<
    | { type: "pan"; sx: number; sy: number; vx: number; vy: number; moved: boolean }
    | { type: "node"; id: string; sx: number; sy: number; nx: number; ny: number; moved: boolean }
    | null
  >(null);

  const drawing = tool === "draw" && !readOnly;

  // The draw state belongs to the tool: leaving Draw link drops a half-made
  // link rather than leaving a dangling rubber band.
  const [shownTool, setShownTool] = React.useState(tool);
  if (shownTool !== tool) {
    setShownTool(tool);
    setStart(null);
  }

  const placed = React.useMemo(
    () => (drag ? nodes.map((n) => (n.id === drag.id ? { ...n, x: drag.x, y: drag.y } : n)) : nodes),
    [nodes, drag],
  );

  React.useEffect(() => {
    const el = viewRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fit = React.useCallback(() => {
    const b = boundsOf(nodes);
    if (!b || !size.w || !size.h) return;
    const pad = 48;
    // Leave the legend's strip at the foot clear.
    const usableH = size.h - pad * 2 - 56;
    const zoom = clamp(Math.min((size.w - pad * 2) / b.w, usableH / b.h, 1), MIN_ZOOM, 1);
    setView({
      zoom,
      x: (size.w - b.w * zoom) / 2 - b.x * zoom,
      y: pad + (usableH - b.h * zoom) / 2 - b.y * zoom,
    });
  }, [nodes, size.w, size.h]);

  // Fit once the viewport has a size, and again whenever the owner says a
  // new map has landed.
  const fitted = React.useRef<string | number | undefined | null>(null);
  React.useEffect(() => {
    if (!size.w || !size.h || !nodes.length) return;
    const key = fitKey ?? "first";
    if (fitted.current === key) return;
    fitted.current = key;
    fit();
  }, [fit, fitKey, size.w, size.h, nodes.length]);

  const toMap = React.useCallback(
    (clientX: number, clientY: number): Pt => {
      const r = viewRef.current?.getBoundingClientRect();
      if (!r) return { x: 0, y: 0 };
      return { x: (clientX - r.left - view.x) / view.zoom, y: (clientY - r.top - view.y) / view.zoom };
    },
    [view],
  );

  const zoomAt = React.useCallback((factor: number, at?: Pt) => {
    setView((v) => {
      const zoom = clamp(Math.round(v.zoom * factor * 100) / 100, MIN_ZOOM, MAX_ZOOM);
      const px = at?.x ?? size.w / 2;
      const py = at?.y ?? size.h / 2;
      const k = zoom / v.zoom;
      return { zoom, x: px - (px - v.x) * k, y: py - (py - v.y) * k };
    });
  }, [size.w, size.h]);

  React.useEffect(() => {
    const el = viewRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const r = el.getBoundingClientRect();
        zoomAt(e.deltaY < 0 ? 1.1 : 1 / 1.1, { x: e.clientX - r.left, y: e.clientY - r.top });
      } else {
        setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  const onGroundDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || e.target !== e.currentTarget) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    gesture.current = { type: "pan", sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y, moved: false };
  };

  const onNodeDown = (e: React.PointerEvent, node: MapNode) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    if (drawing) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    gesture.current = { type: "node", id: node.id, sx: e.clientX, sy: e.clientY, nx: node.x, ny: node.y, moved: false };
  };

  const onMove = (e: React.PointerEvent) => {
    if (drawing && start) setCursor(toMap(e.clientX, e.clientY));
    const g = gesture.current;
    if (!g) return;
    const dx = e.clientX - g.sx;
    const dy = e.clientY - g.sy;
    if (!g.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    g.moved = true;
    // A read-only map selects on click but never moves a box.
    if (g.type === "node" && readOnly) return;
    if (g.type === "pan") setView((v) => ({ ...v, x: g.vx + dx, y: g.vy + dy }));
    else setDrag({ id: g.id, x: Math.round(g.nx + dx / view.zoom), y: Math.round(g.ny + dy / view.zoom) });
  };

  const onUp = () => {
    const g = gesture.current;
    gesture.current = null;
    if (!g) return;
    if (g.type === "pan") {
      if (!g.moved) {
        setStart(null);
        onSelect(null);
      }
      return;
    }
    if (g.moved && drag) {
      onMoveNode?.(drag.id, drag.x, drag.y);
      setDrag(null);
    } else if (!g.moved) {
      onSelect({ kind: "node", id: g.id });
    }
  };

  const onPort = (node: MapNode, side: Side) => {
    if (!start || start.id === node.id) {
      setStart({ id: node.id, side });
      setCursor(portPoint(boxOf(node), side));
      return;
    }
    onDrawLink?.(start.id, start.side, node.id, side);
    setStart(null);
    setCursor(null);
  };

  const name = (id: string) => nodeName(id, products, cloudType);
  const shownLinks = pending ? [...links, pending] : links;
  const zoomPct = Math.round(view.zoom * 100);
  const startNode = start ? placed.find((n) => n.id === start.id) : null;
  const band = startNode && start && cursor ? { a: portPoint(boxOf(startNode), start.side), b: cursor } : null;

  return (
    <div
      ref={viewRef}
      role="application"
      aria-label={readOnly ? "Connection map" : "Connection map editor"}
      aria-roledescription="canvas"
      onPointerDown={onGroundDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={() => {
        gesture.current = null;
        setDrag(null);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && start) {
          e.preventDefault();
          e.stopPropagation();
          setStart(null);
          setCursor(null);
        }
      }}
      className={cn(
        "relative h-full w-full touch-none select-none overflow-hidden rounded-xl border border-solid border-border bg-bg-subtle",
        drawing ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing",
        className,
      )}
      style={{
        backgroundImage: "radial-gradient(var(--color-canvas-grid) var(--border-width-1), transparent var(--border-width-1))",
        backgroundSize: `${GRID * view.zoom}px ${GRID * view.zoom}px`,
        backgroundPosition: `${view.x}px ${view.y}px`,
      }}
    >
      <div
        className="pointer-events-none absolute left-0 top-0"
        style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`, transformOrigin: "0 0" }}
      >
        <svg className="absolute left-0 top-0 overflow-visible" width={1} height={1} aria-hidden>
          <defs>
            {(["idle", "on"] as const).map((state) => (
              <marker
                key={state}
                id={`net-arrow-${state}`}
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="10"
                markerHeight="10"
                markerUnits="userSpaceOnUse"
                orient="auto-start-reverse"
              >
                <path
                  d="M1 1L9 5L1 9"
                  fill="none"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ stroke: state === "on" ? "var(--color-icon-brand)" : "var(--color-icon-secondary)" }}
                />
              </marker>
            ))}
          </defs>
          {shownLinks.map((link) => {
            const route = routeOf(link, placed);
            if (!route) return null;
            const isPending = pending?.id === link.id;
            const on = isPending || (selection?.kind === "link" && selection.id === link.id);
            const color = on ? "var(--color-icon-brand)" : "var(--color-icon-secondary)";
            const marker = `url(#net-arrow-${on ? "on" : "idle"})`;
            const tail = link.initiator === "both" ? marker : undefined;
            // The arrowhead points at the receiver: drawn from→to, it flips
            // when the target is the one that starts the conversation.
            const toward = link.initiator === "target" ? { start: marker, end: undefined } : { start: tail, end: marker };
            return (
              <g key={link.id}>
                {link.middle === "gateway" ? (
                  <>
                    <path d={route.d} fill="none" strokeWidth={5} style={{ stroke: color }} markerStart={toward.start} markerEnd={toward.end} />
                    <path d={route.d} fill="none" strokeWidth={2} style={{ stroke: "var(--color-bg-subtle)" }} />
                  </>
                ) : (
                  <path
                    d={route.d}
                    fill="none"
                    strokeWidth={on ? 2 : 1.5}
                    strokeDasharray={link.middle === "cloud" ? "6 5" : undefined}
                    strokeOpacity={isPending ? 0.7 : 1}
                    style={{ stroke: color }}
                    markerStart={toward.start}
                    markerEnd={toward.end}
                  />
                )}
                {!isPending ? (
                  <path
                    d={route.d}
                    fill="none"
                    strokeWidth={14}
                    stroke="transparent"
                    className="pointer-events-auto cursor-pointer"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => !isPending && onSelect({ kind: "link", id: link.id })}
                  />
                ) : null}
              </g>
            );
          })}
          {band && (
            <path
              d={`M${band.a.x} ${band.a.y}L${band.b.x} ${band.b.y}`}
              fill="none"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              style={{ stroke: "var(--color-icon-brand)" }}
            />
          )}
        </svg>

        {placed.map((node) => {
          const box = boxOf(node);
          const on = selection?.kind === "node" && selection.id === node.id;
          const isStart = start?.id === node.id;
          return (
            <div
              key={node.id}
              className="group pointer-events-auto absolute"
              style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
            >
              <div
                role="button"
                tabIndex={0}
                aria-pressed={on}
                aria-label={`${name(node.id)}${node.kind === "product" && roles[node.id] ? `, ${roles[node.id]}` : ""}`}
                onPointerDown={(e) => onNodeDown(e, node)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect({ kind: "node", id: node.id });
                  }
                }}
                className={cn(
                  "flex h-full w-full flex-col rounded-xl border border-solid bg-bg-surface p-6 text-left shadow-1 outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus",
                  on || isStart ? "border-border-brand" : "border-border",
                  !readOnly && !drawing && "cursor-move",
                )}
              >
                <NodeBody node={node} products={products} cloudType={cloudType} role={roles[node.id]} protocol={protocolOf(node.id)} />
              </div>
              {drawing &&
                SIDES.map((side) => {
                  const p = portPoint({ ...box, x: 0, y: 0 }, side);
                  return (
                    <button
                      key={side}
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => onPort(node, side)}
                      aria-label={
                        start && start.id !== node.id
                          ? `Finish the link at ${name(node.id)}, ${side} edge`
                          : `Start a link from ${name(node.id)}, ${side} edge`
                      }
                      className={cn(
                        "absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-solid border-border-brand bg-bg-surface outline-none transition-opacity duration-fast focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-border-focus",
                        isStart && start?.side === side
                          ? "bg-bg-brand opacity-100"
                          : start
                            ? "opacity-100"
                            : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
                      )}
                      style={{ left: p.x, top: p.y }}
                    />
                  );
                })}
            </div>
          );
        })}

        {shownLinks.map((link) => {
          const route = routeOf(link, placed);
          if (!route || !link.label) return null;
          const isPending = pending?.id === link.id;
          const on = isPending || (selection?.kind === "link" && selection.id === link.id);
          return (
            <button
              key={`label-${link.id}`}
              type="button"
              disabled={isPending}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onSelect({ kind: "link", id: link.id })}
              aria-label={`Link ${name(link.from)} to ${name(link.to)}: ${link.label}`}
              className={cn(
                "pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-md border border-solid px-3 py-1 text-2xs font-medium outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus",
                on ? "border-border-brand bg-bg-brand-subtle text-text-brand" : "border-border bg-bg-surface text-text-secondary hover:text-text-primary",
              )}
              style={{ left: route.mid.x, top: route.mid.y - 14 }}
            >
              {link.label}
            </button>
          );
        })}
      </div>

      {drawing && (
        <p className="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 rounded-lg border border-solid border-border bg-bg-surface px-6 py-3 text-xs text-text-secondary shadow-1">
          {start ? `From ${name(start.id)} — now click a port on the target. Esc cancels.` : "Hover a box and click a port to start a link."}
        </p>
      )}

      <Legend />

      <div
        className="absolute bottom-6 right-6 flex items-center gap-2 rounded-lg border border-solid border-border bg-bg-surface p-2 shadow-1"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button type="button" aria-label="Zoom out" onClick={() => zoomAt(1 / 1.2)} className={zoomBtn}>
          <Icon icon={MinusSignIcon} size={16} />
        </button>
        <span className="w-24 text-center text-sm font-semibold tabular-nums text-text-primary" aria-live="polite">
          {zoomPct}%
        </span>
        <button type="button" aria-label="Zoom in" onClick={() => zoomAt(1.2)} className={zoomBtn}>
          <Icon icon={Add01Icon} size={16} />
        </button>
        <button type="button" onClick={fit} className={cn(zoomBtn, "w-auto px-5 text-sm font-semibold")}>
          Fit
        </button>
      </div>
    </div>
  );
}

const zoomBtn =
  "inline-flex h-16 w-16 items-center justify-center rounded-md text-text-secondary outline-none transition-colors duration-fast hover:bg-bg-subtle hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus";

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span
      aria-hidden
      className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-solid border-border bg-bg-subtle text-xs font-bold text-text-secondary"
    >
      {children}
    </span>
  );
}

function NodeBody({
  node,
  products,
  cloudType,
  role,
  protocol,
}: {
  node: MapNode;
  products: NetProduct[];
  cloudType: CloudType;
  role?: Role;
  protocol: ProtocolKey | null;
}) {
  const chips = "mt-auto flex min-w-0 flex-wrap items-center gap-3";
  const chip = "inline-flex items-center rounded-md border border-solid border-border px-3 py-1 text-2xs font-medium text-text-secondary";
  if (node.kind === "broker") {
    return (
      <>
        <Badge>C</Badge>
        <p className="mt-3 truncate text-md font-semibold text-text-primary">{brokerName(cloudType)}</p>
        <div className={cn(chips, "mt-3")}>
          <span className={chip}>Cloud</span>
          <span className="text-2xs text-text-secondary">{cloudType === "mqtt" ? "Cloud · Pub/Sub" : "Cloud"}</span>
        </div>
      </>
    );
  }
  if (node.kind === "app") {
    return (
      <>
        <Badge>A</Badge>
        <p className="mt-3 truncate text-md font-semibold text-text-primary">App (APK)</p>
        <div className={chips}>
          <span className={chip}>App</span>
          <span className="text-2xs text-text-secondary">Android app</span>
        </div>
      </>
    );
  }
  const product = products.find((p) => p.id === node.id);
  return (
    <>
      {product?.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={product.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-md object-cover" />
      ) : (
        <Badge>{(product?.name ?? "?").charAt(0).toUpperCase()}</Badge>
      )}
      <p className="mt-3 truncate text-md font-semibold text-text-primary" style={{ maxWidth: NODE_W - 24 }}>
        {product?.name ?? "Removed product"}
      </p>
      <div className={chips}>
        {role && <RoleChip role={role} />}
        {protocol && <span className="truncate text-2xs text-text-secondary">{protocolInfo(protocol).name}</span>}
      </div>
    </>
  );
}

function LegendLine({ dashed, double, both }: { dashed?: boolean; double?: boolean; both?: boolean }) {
  const d = "M4 6H40";
  return (
    <svg width="44" height="12" viewBox="0 0 44 12" aria-hidden className="shrink-0">
      {double ? (
        <>
          <path d={d} strokeWidth={5} style={{ stroke: "var(--color-icon-secondary)" }} />
          <path d={d} strokeWidth={2} style={{ stroke: "var(--color-bg-surface)" }} />
        </>
      ) : (
        <path d={d} strokeWidth={1.5} strokeDasharray={dashed ? "4 3" : undefined} style={{ stroke: "var(--color-icon-secondary)" }} />
      )}
      <path d="M36 2L41 6L36 10" fill="none" strokeWidth={1.5} style={{ stroke: "var(--color-icon-secondary)" }} />
      {both && <path d="M8 2L3 6L8 10" fill="none" strokeWidth={1.5} style={{ stroke: "var(--color-icon-secondary)" }} />}
    </svg>
  );
}

function Legend() {
  const row = "flex items-center gap-4 text-2xs text-text-secondary";
  return (
    <div
      className="absolute bottom-6 left-6 grid grid-cols-2 gap-x-8 gap-y-3 rounded-lg border border-solid border-border bg-bg-surface px-6 py-4 shadow-1"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <span className={row}>
        <LegendLine dashed /> Wi-Fi + MQTT · one-way
      </span>
      <span className={row}>
        <LegendLine dashed both /> App ↔ Cloud · two-way
      </span>
      <span className={row}>
        <LegendLine double both /> Gateway Hub · two-way
      </span>
      <span className={row}>
        <LegendLine /> Wi-Fi Direct · ESP-NOW
      </span>
    </div>
  );
}
