// The schematic/board symbol geometry, in one place.
//
// Lifted out of placed-objects.tsx so a surface that only wants to *draw* a
// symbol — the library card, the parts catalogue, a preview — can import the
// real geometry without pulling in the PCB store the editor module carries.
// placed-objects re-exports it, so the canvas keeps its existing import.

import * as React from "react";
// Supply rail (VCC / +5V / -5V / any named rail). The arrow is drawn 20 units
// wide — the same span as the GND bar below — so a rail no longer reads as the
// smallest thing on the sheet, and the name it carries is part of the symbol.
// One source: the placed object renders this with its own text, and GLYPHS
// holds the default, so the two can't drift apart.
export function supplyGlyph(label: string) {
  return (
    <g stroke="currentColor" strokeWidth={1.9} fill="currentColor" strokeLinejoin="round" strokeLinecap="round">
      <path d="M0 -15l-10 8h20z" />
      <path d="M0 -7v16" fill="none" />
      <text x="0" y="-17.5" textAnchor="middle" fontSize={9} stroke="none" fontWeight={700}>{label}</text>
    </g>
  );
}

/** The symbol a place tool will drop, drawn from the same geometry the placed
 *  object uses — the ghost preview must never be a second copy. */
export function glyphFor(kind: string): React.ReactNode {
  return GLYPHS[kind] ?? <circle cx={0} cy={0} r={6} fill="currentColor" />;
}

// Each glyph is centered on (0, 0) in its own local coords. The wrapper
// translates and rotates it.
export const GLYPHS: Record<string, React.ReactNode> = {
  resistor: (
    <g stroke="currentColor" strokeWidth={1.7} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M-26 0h6l3-8 6 16 6-16 3 8h6" />
    </g>
  ),
  capacitor: (
    <g stroke="currentColor" strokeWidth={1.9} strokeLinecap="round">
      <path d="M-18 0h8M10 0h8M-10 -10v20M10 -10v20" />
    </g>
  ),
  diode: (
    <g stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M-18 0h6M8 0h10" />
      <path d="M-12 -7v14l16 -7z" fill="currentColor" />
      <path d="M8 -7v14" />
    </g>
  ),
  inductor: (
    <g stroke="currentColor" strokeWidth={1.7} fill="none" strokeLinecap="round">
      <path d="M-20 0h4" />
      <path d="M-16 0a4 4 0 1 1 8 0M-8 0a4 4 0 1 1 8 0M0 0a4 4 0 1 1 8 0M8 0a4 4 0 1 1 8 0" />
      <path d="M16 0h4" />
    </g>
  ),
  crystal: (
    <g stroke="currentColor" strokeWidth={1.7} fill="none" strokeLinecap="round">
      <path d="M-18 0h9M9 0h9" />
      <path d="M-6 -9v18M6 -9v18" />
      <rect x={-3} y={-11} width={6} height={22} />
    </g>
  ),
  // Op-amp / in-amp triangle: two inputs left (+ top, − bottom), output right.
  opamp: (
    <g stroke="currentColor" strokeWidth={1.5} fill="none" strokeLinejoin="round" strokeLinecap="round">
      <path d="M-13 -16 L-13 16 L17 0 Z" />
      <path d="M-20 -8 H-13 M-20 8 H-13 M17 0 H23" />
      <path d="M-10 -8 h4 M-8 -10 v4" />
      <path d="M-10 8 h4" />
    </g>
  ),
  // Rectangular (IEC) resistor — matches the reference sheet's resistor style.
  resistorBox: (
    <g stroke="currentColor" strokeWidth={1.6} fill="none" strokeLinecap="round">
      <path d="M-24 0h6M18 0h6" />
      <rect x={-18} y={-7} width={36} height={14} />
    </g>
  ),
  // Current source: circle with an internal arrow, vertical leads.
  currentSource: (
    <g stroke="currentColor" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <circle cx={0} cy={0} r={11} />
      <path d="M0 -11 V-20 M0 11 V20" />
      <path d="M0 6 V-5 M-4 -1 L0 -6 L4 -1" />
    </g>
  ),
  vcc5v: supplyGlyph("+5V"),
  pgnd: (
    <g stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" fill="none">
      <path d="M0 -8v8" />
      <path d="M-10 0h20M-7 4h14M-4 8h8" />
    </g>
  ),
  agnd: (
    <g stroke="currentColor" strokeWidth={1.7} strokeLinejoin="round" strokeLinecap="round">
      <path d="M0 -8v6" />
      <path d="M-10 -2l10 10 10 -10z" fill="currentColor" />
    </g>
  ),
  pin: (
    <g stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" fill="none">
      <path d="M-16 0h20" /><circle cx={6} cy={0} r={3} fill="currentColor" />
    </g>
  ),
  netFlag: (
    <g stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d="M-12 12V-12h18l-4 6 4 6h-18" />
    </g>
  ),
  shortFlag: (
    <g stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" fill="none">
      <circle cx={-14} cy={0} r={2} fill="currentColor" />
      <path d="M-14 0h26" />
      <path d="M12 -6v12" />
    </g>
  ),
  port: (
    <g stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d="M-16 -8h22l6 8-6 8h-22z" />
    </g>
  ),
  noConnect: (
    <g stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M-8 -8l16 16M8 -8l-16 16" />
    </g>
  ),
  pad: (
    <g stroke="currentColor" strokeWidth={1.7} fill="none">
      <rect x={-10} y={-10} width={20} height={20} />
      <circle cx={0} cy={0} r={4} fill="currentColor" />
    </g>
  ),
  via: (
    <g stroke="currentColor" strokeWidth={1.8} fill="none">
      <circle cx={0} cy={0} r={10} />
      <circle cx={0} cy={0} r={3.5} fill="currentColor" />
    </g>
  ),
  sutureVias: (
    <g stroke="currentColor" strokeWidth={1.5} fill="none">
      {[[-12, -8], [12, -8], [-12, 8], [12, 8], [0, 0]].map(([cx, cy], i) => (
        <React.Fragment key={i}>
          <circle cx={cx} cy={cy} r={4} />
          <circle cx={cx} cy={cy} r={1.4} fill="currentColor" />
        </React.Fragment>
      ))}
    </g>
  ),
  netLabel: (
    <g stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d="M-16 0h6" />
      <path d="M-10 -6h18l4 6-4 6h-18z" />
    </g>
  ),
  // ── Schematic objects with dedicated property panels (placeable) ────────
  offPageConnector: (
    <g stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" fill="none">
      <path d="M-16 0h6" />
      <path d="M-10 -7h10l8 7-8 7h-10z" />
    </g>
  ),
  maskRegion: (
    <g stroke="currentColor" strokeWidth={1.5} strokeDasharray="4 3" fill="currentColor" fillOpacity={0.12}>
      <rect x={-16} y={-12} width={32} height={24} rx={2} />
    </g>
  ),
  componentMask: (
    <g stroke="currentColor" strokeWidth={1.5} fill="none">
      <rect x={-16} y={-12} width={32} height={24} rx={2} strokeDasharray="4 3" />
      <rect x={-7} y={-5} width={14} height={10} rx={1} />
    </g>
  ),
  // UIUX-36 — the tag is fused to the wire it marks: the object's origin sits
  // ON the conductor, a filled junction dot lands there, and a stem carries the
  // tag body above it. It used to be a free-floating ")=(" that gave no clue
  // which line it belonged to. The body is our own shape, not a copy: a tag
  // with the two rails of a pair drawn inside it.
  diffPairFlag: (
    <g stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" fill="none">
      <circle cx={0} cy={0} r={2.6} fill="currentColor" stroke="none" />
      <path d="M0 0v-9" />
      <path d="M-13 -23h26a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H2l-2 2-2-2h-11a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z" />
      <path d="M-8 -19.5h16M-8 -15.5h16" strokeWidth={1.4} opacity={0.75} />
    </g>
  ),
  reuseBlock: (
    <g stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" fill="none">
      <rect x={-15} y={-12} width={30} height={24} rx={2} strokeDasharray="5 3" />
      <rect x={-5} y={-4} width={10} height={8} rx={1} fill="currentColor" fillOpacity={0.2} />
    </g>
  ),
  netBusLabel: (
    <g stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d="M-16 0h5" />
      <path d="M-11 -6h16l4 6-4 6h-16z" />
      <path d="M-6 0h9" strokeDasharray="2 2" opacity={0.55} />
    </g>
  ),
  polygon: (
    <g stroke="currentColor" strokeWidth={1.7} strokeLinejoin="round" fill="none">
      <path d="M-14 -2l8-12 16 4 4 14-12 10-16-4z" />
    </g>
  ),
  fillRegion: (
    <g stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" fill="currentColor" fillOpacity={0.35}>
      <path d="M-14 -2l8-12 16 4 4 14-12 10-16-4z" />
    </g>
  ),
  slot: (
    <g stroke="currentColor" strokeWidth={1.7} fill="none">
      <rect x={-16} y={-6} width={32} height={12} rx={6} />
      <circle cx={-8} cy={0} r={2} fill="currentColor" stroke="none" />
      <circle cx={8} cy={0} r={2} fill="currentColor" stroke="none" />
    </g>
  ),
  component: (
    <g stroke="currentColor" strokeWidth={1.6} fill="none">
      <rect x={-14} y={-10} width={28} height={20} rx={1.5} />
      <path d="M-14 -5h-4M-14 0h-4M-14 5h-4M14 -5h4M14 0h4M14 5h4" strokeLinecap="round" />
      <text x={0} y={2} textAnchor="middle" fontSize={8} stroke="none" fill="currentColor">U?</text>
    </g>
  ),
  // The part catalogue's own kinds — they used to fall back to the generic
  // dot, so an IC placed from the library was a dot on the sheet.
  ic: (
    <g stroke="currentColor" strokeWidth={1.6} fill="none">
      <rect x={-14} y={-10} width={28} height={20} rx={1.5} />
      <path d="M-14 -5h-4M-14 0h-4M-14 5h-4M14 -5h4M14 0h4M14 5h4" strokeLinecap="round" />
      <circle cx={-10} cy={-6} r={1.3} fill="currentColor" stroke="none" />
    </g>
  ),
  // NPN BJT — envelope, base bar, collector and the emitter arrow.
  transistor: (
    <g stroke="currentColor" strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <circle cx={2} cy={0} r={11} />
      <path d="M-14 0h10M-4 -7v14" />
      <path d="M-4 -3l10 -7M6 -10v-4M-4 3l10 7M6 10v4" />
      <path d="M6 10l-4.6 -1.2M6 10l-1.4 -4.4" strokeWidth={1.3} />
    </g>
  ),
  // Header connector — housing with a column of pins.
  connector: (
    <g stroke="currentColor" strokeWidth={1.6} fill="none" strokeLinecap="round">
      <rect x={-6} y={-14} width={12} height={28} rx={1.5} />
      {[-9, -3, 3, 9].map((y) => (
        <g key={y}>
          <circle cx={0} cy={y} r={1.4} fill="currentColor" stroke="none" />
          <path d={`M6 ${y}h6`} />
        </g>
      ))}
    </g>
  ),
  // ── Real land patterns (Schematic → PCB convert output) ────────────────
  // Filled copper pads in the layer color + faint silkscreen body outline.
  // 0805 chip (R / C / L): two pads flanking a body.
  fp0805: (
    <g>
      <rect x={-9} y={-9} width={18} height={18} rx={1.5} fill="none" stroke="currentColor" strokeWidth={0.8} strokeOpacity={0.4} />
      <rect x={-15} y={-8} width={10} height={16} rx={1.5} fill="currentColor" />
      <rect x={5} y={-8} width={10} height={16} rx={1.5} fill="currentColor" />
    </g>
  ),
  // SOD-123 diode: two pads, cathode end marked with a band.
  fpSOD123: (
    <g>
      <rect x={-6} y={-8} width={12} height={16} rx={1} fill="none" stroke="currentColor" strokeWidth={0.8} strokeOpacity={0.45} />
      <rect x={2} y={-8} width={4} height={16} fill="currentColor" fillOpacity={0.55} />
      <rect x={-15} y={-7} width={9} height={14} rx={1.5} fill="currentColor" />
      <rect x={6} y={-7} width={9} height={14} rx={1.5} fill="currentColor" />
    </g>
  ),
  // SOT-23: three pads (two bottom, one top) + body.
  fpSOT23: (
    <g>
      <rect x={-10} y={-5} width={20} height={10} rx={1.5} fill="none" stroke="currentColor" strokeWidth={0.8} strokeOpacity={0.45} />
      <rect x={-13} y={5} width={9} height={7} rx={1.2} fill="currentColor" />
      <rect x={4} y={5} width={9} height={7} rx={1.2} fill="currentColor" />
      <rect x={-4.5} y={-12} width={9} height={7} rx={1.2} fill="currentColor" />
    </g>
  ),
  // SOIC-8: 4 pads per side, body outline + pin-1 dot.
  fpSOIC8: (
    <g>
      <rect x={-9} y={-18} width={18} height={36} rx={1.5} fill="none" stroke="currentColor" strokeWidth={0.9} strokeOpacity={0.55} />
      {[-13.5, -4.5, 4.5, 13.5].map((cy) => (
        <React.Fragment key={cy}>
          <rect x={-18} y={cy - 3} width={8} height={6} rx={1} fill="currentColor" />
          <rect x={10} y={cy - 3} width={8} height={6} rx={1} fill="currentColor" />
        </React.Fragment>
      ))}
      <circle cx={-5} cy={-14} r={1.6} fill="currentColor" />
    </g>
  ),
  boardOutline: (
    <g stroke="currentColor" strokeWidth={1.7} fill="none" strokeDasharray="3 3">
      <rect x={-18} y={-14} width={36} height={28} rx={2} />
    </g>
  ),
  gnd: (
    <g stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" fill="none">
      <path d="M0 -8v8" /><path d="M-10 0h20M-6 4h12M-2 8h4" />
    </g>
  ),
  net: (
    <g stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" fill="none">
      <path d="M-14 0h28" /><circle cx={0} cy={0} r={3} fill="currentColor" />
    </g>
  ),
  junction: (
    <g stroke="none" fill="currentColor"><circle cx={0} cy={0} r={4} /></g>
  ),
  circle: (
    <g stroke="currentColor" strokeWidth={1.7} fill="none"><circle cx={0} cy={0} r={12} /></g>
  ),
  rectangle: (
    <g stroke="currentColor" strokeWidth={1.7} fill="none"><rect x={-14} y={-10} width={28} height={20} /></g>
  ),
  ellipse: (
    <g stroke="currentColor" strokeWidth={1.7} fill="none"><ellipse cx={0} cy={0} rx={14} ry={9} /></g>
  ),
  arc: (
    <g stroke="currentColor" strokeWidth={1.7} fill="none"><path d="M-12 8a12 12 0 0 1 24 0" /></g>
  ),
  bezier: (
    <g stroke="currentColor" strokeWidth={1.7} fill="none"><path d="M-14 8C-6 -12 6 -12 14 8" /></g>
  ),
  image: (
    <g stroke="currentColor" strokeWidth={1.6} fill="none">
      <rect x={-13} y={-10} width={26} height={20} rx={2} /><circle cx={-5} cy={-3} r={2.5} /><path d="M-13 8l8-7 6 5 4-3 8 5" />
    </g>
  ),
  mountingHole: (
    <g stroke="currentColor" strokeWidth={1.7} fill="none"><circle cx={0} cy={0} r={11} /><circle cx={0} cy={0} r={5} /></g>
  ),
  prohibitedRegion: (
    <g stroke="currentColor" strokeWidth={1.6} fill="none" strokeDasharray="4 3">
      <rect x={-14} y={-12} width={28} height={24} rx={2} /><path d="M-14 12L14 -12" />
    </g>
  ),
  constraintRegion: (
    <g stroke="currentColor" strokeWidth={1.6} fill="none" strokeDasharray="4 3">
      <rect x={-14} y={-12} width={28} height={24} rx={2} />
    </g>
  ),
  // ── PDF §10 place-menu inventory ──────────────────────────────────────
  testPoint: (
    <g stroke="currentColor" strokeWidth={1.7} fill="none">
      <circle cx={0} cy={0} r={9} />
      <circle cx={0} cy={0} r={2.5} fill="currentColor" stroke="none" />
      <path d="M0 -13v-3M0 13v3M-13 0h-3M13 0h3" strokeLinecap="round" />
    </g>
  ),
  shapedPad: (
    <g stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" fill="currentColor" fillOpacity={0.25}>
      <path d="M-14 -6q4 -8 12 -6l10 3q6 2 4 9l-3 8q-2 6 -9 4l-11 -3q-7 -2 -5 -9z" />
      <circle cx={0} cy={0} r={2.5} fillOpacity={1} stroke="none" />
    </g>
  ),
  canvasOrigin: (
    <g stroke="currentColor" strokeWidth={1.7} fill="none" strokeLinecap="round">
      <circle cx={0} cy={0} r={7} />
      <path d="M0 -14v28M-14 0h28" />
    </g>
  ),
};
