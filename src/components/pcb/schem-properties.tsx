"use client";

// IDEEZA PCB Software — Schematic right-panel properties.
// Default view of the Properties tab when nothing is selected in schematic
// mode. Three collapsible sections (Basic / Drawing Border / Title Block)
// with workable controls — values live in the store.

import * as React from "react";
import { Checkbox, Select } from "@/components/ideeza";
import { Icon } from "@/lib/pcb/icons";
import { usePcbActions, usePcbState } from "@/lib/pcb/store";

const CHEV_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M6 9l6 6 6-6"/></svg>';
const LINK_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M9 15l6-6M10 7H8a4 4 0 0 0 0 8h2M14 17h2a4 4 0 0 0 0-8h-2"/></svg>';
const SEL_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="3 3"/></svg>';
const REFRESH_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>';

const PAD_X = "var(--spacing-8)";
const ROW_GAP = "var(--spacing-5)";

function SectionHeader({
  title,
  open,
  onToggle,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      onClick={onToggle}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--spacing-3)",
        padding: `var(--spacing-5) ${PAD_X}`,
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          width: 13,
          height: 13,
          color: "var(--color-violet-600)",
          transform: open ? "rotate(0deg)" : "rotate(-90deg)",
          transition: "transform .15s ease",
        }}
      >
        <Icon html={CHEV_SVG} />
      </span>
      <span style={{ fontSize: "var(--font-size-md)", fontWeight: 700, color: "var(--color-text-primary)" }}>
        {title}
      </span>
    </div>
  );
}

function LabelCell({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
      {children}
    </span>
  );
}

function TextValue({
  value,
  onChange,
  minWidth = 130,
}: {
  value: string;
  onChange: (v: string) => void;
  minWidth?: number;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        minWidth,
        padding: "var(--spacing-2) var(--spacing-4)",
        border: "var(--border-width-1) solid var(--color-border-default)",
        borderRadius: "var(--radius-md)",
        background: "var(--color-bg-surface)",
        color: "var(--color-text-primary)",
        fontSize: "var(--font-size-sm)",
        outline: "none",
        fontFamily: "inherit",
      }}
    />
  );
}

function Row({
  label,
  right,
  paddingV = ROW_GAP,
}: {
  label: React.ReactNode;
  right: React.ReactNode;
  paddingV?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "var(--spacing-4)",
        padding: `${paddingV} ${PAD_X}`,
      }}
    >
      {typeof label === "string" ? <LabelCell>{label}</LabelCell> : label}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)" }}>{right}</div>
    </div>
  );
}

function IconBtn({
  svg,
  onClick,
  ariaLabel,
}: {
  svg: string;
  onClick?: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={ariaLabel}
      style={{
        width: 26,
        height: 26,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        border: "var(--border-width-1) solid var(--color-border-default)",
        borderRadius: "var(--radius-md)",
        background: "var(--color-bg-surface)",
        color: "var(--color-text-secondary)",
        cursor: "pointer",
      }}
    >
      <Icon html={svg} size={14} />
    </button>
  );
}

function BasicProperties() {
  const state = usePcbState();
  const actions = usePcbActions();
  const open = state.schemSectionOpen.basic;
  return (
    <div style={{ borderBottom: "var(--border-width-1) solid var(--color-border-subtle)" }}>
      <SectionHeader title="Basic properties" open={open} onToggle={() => actions.toggleSchemSection("basic")} />
      {open && (
        <Row
          label="Name"
          right={
            <TextValue
              value={state.schemBasic.name}
              onChange={(v) => actions.setSchemBasic({ name: v })}
              minWidth={150}
            />
          }
        />
      )}
    </div>
  );
}

function DrawingBorder() {
  const state = usePcbState();
  const actions = usePcbActions();
  const open = state.schemSectionOpen.border;
  const b = state.schemBorder;
  return (
    <div style={{ borderBottom: "var(--border-width-1) solid var(--color-border-subtle)" }}>
      <SectionHeader title="Drawing Border" open={open} onToggle={() => actions.toggleSchemSection("border")} />
      {open && (
        <>
          <Row
            label="Title Block"
            right={
              <Checkbox
                checked={b.showTitleBlock}
                onChange={() => actions.setSchemBorder({ showTitleBlock: !b.showTitleBlock })}
              />
            }
          />
          <Row
            label="Drawing"
            right={
              <Select
                value={b.drawing}
                options={["Right Bottom", "Right Top", "Left Bottom", "Left Top"].map((v) => ({ label: v, value: v }))}
                onChange={(v) => actions.setSchemBorder({ drawing: v })}
                minWidth={150}
              />
            }
          />
          <Row
            label="Size"
            right={
              <Select
                value={b.size}
                options={["A0", "A1", "A2", "A3", "A4", "A5", "Letter", "Legal", "Tabloid"].map((v) => ({ label: v, value: v }))}
                onChange={(v) => actions.setSchemBorder({ size: v })}
                minWidth={150}
              />
            }
          />
          <Row
            label="Drawing Height"
            right={
              <>
                <TextValue
                  value={b.drawingHeight}
                  onChange={(v) => actions.setSchemBorder({ drawingHeight: v })}
                  minWidth={100}
                />
                <IconBtn svg={LINK_SVG} ariaLabel="Link aspect" />
              </>
            }
          />
          <Row
            label="Drawing Height"
            right={
              <>
                <TextValue
                  value={b.drawingHeightAlt}
                  onChange={(v) => actions.setSchemBorder({ drawingHeightAlt: v })}
                  minWidth={100}
                />
                <IconBtn svg={SEL_SVG} ariaLabel="Pick region" />
              </>
            }
          />
          <Row
            label="Region Start"
            right={
              <Select
                value={b.regionStart}
                options={["Left Top", "Right Top", "Left Bottom", "Right Bottom"].map((v) => ({ label: v, value: v }))}
                onChange={(v) => actions.setSchemBorder({ regionStart: v })}
                minWidth={150}
              />
            }
          />
          <Row
            label="X Region Count"
            right={
              <TextValue
                value={b.xRegion}
                onChange={(v) => actions.setSchemBorder({ xRegion: v })}
                minWidth={150}
              />
            }
          />
          <Row
            label="Y Region Count"
            right={
              <TextValue
                value={b.yRegion}
                onChange={(v) => actions.setSchemBorder({ yRegion: v })}
                minWidth={150}
              />
            }
          />
          <Row
            label="Color"
            right={
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--spacing-2)",
                  border: "var(--border-width-1) solid var(--color-border-default)",
                  borderRadius: "var(--radius-md)",
                  padding: "var(--spacing-1) var(--spacing-3)",
                  minWidth: 150,
                }}
              >
                <label
                  style={{
                    position: "relative",
                    width: 22,
                    height: 22,
                    borderRadius: "var(--radius-sm)",
                    background: b.color,
                    border: "var(--border-width-1) solid var(--color-border-subtle)",
                    flex: "0 0 auto",
                    cursor: "pointer",
                    overflow: "hidden",
                  }}
                  title="Pick a color"
                >
                  <input
                    type="color"
                    value={b.color}
                    onChange={(e) => actions.setSchemBorder({ color: e.target.value })}
                    style={{
                      position: "absolute",
                      inset: 0,
                      opacity: 0,
                      cursor: "pointer",
                      border: "none",
                      padding: 0,
                    }}
                  />
                </label>
                <input
                  value={b.color}
                  onChange={(e) => actions.setSchemBorder({ color: e.target.value })}
                  spellCheck={false}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    border: "none",
                    background: "transparent",
                    color: "var(--color-text-primary)",
                    fontSize: "var(--font-size-sm)",
                    fontFamily: "var(--font-family-mono), monospace",
                    outline: "none",
                  }}
                />
                <button
                  type="button"
                  onClick={() => actions.setSchemBorder({ color: "#1E1E1E" })}
                  aria-label="Reset color"
                  title="Reset color"
                  style={{
                    width: 22,
                    height: 22,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--color-text-tertiary)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <Icon html={REFRESH_SVG} size={12} />
                </button>
              </div>
            }
          />
        </>
      )}
    </div>
  );
}

function TitleBlock() {
  const state = usePcbState();
  const actions = usePcbActions();
  const open = state.schemSectionOpen.title;
  return (
    <div style={{ borderBottom: "var(--border-width-1) solid var(--color-border-subtle)" }}>
      <SectionHeader title="Title Block" open={open} onToggle={() => actions.toggleSchemSection("title")} />
      {open && (
        <>
          <Row
            label="Title Block"
            right={<Checkbox checked={state.schemTitleShow} onChange={actions.toggleSchemTitleShow} />}
          />
          {state.schemTitleFields.map((f) => (
            <div
              key={f.key}
              style={{
                display: "grid",
                gridTemplateColumns: "18px 1fr 18px 110px",
                alignItems: "center",
                gap: "var(--spacing-3)",
                padding: `var(--spacing-3) ${PAD_X}`,
              }}
            >
              <Checkbox checked={f.on} onChange={() => actions.toggleSchemTitleField(f.key, "on")} />
              <span
                style={{
                  fontSize: "var(--font-size-sm)",
                  color: "var(--color-text-secondary)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {f.label}
              </span>
              <Checkbox
                checked={f.valueOn}
                onChange={() => actions.toggleSchemTitleField(f.key, "valueOn")}
              />
              <input
                value={f.value}
                onChange={(e) => actions.setSchemTitleFieldValue(f.key, e.target.value)}
                disabled={!f.valueOn}
                style={{
                  padding: "var(--spacing-2) var(--spacing-3)",
                  border: "var(--border-width-1) solid var(--color-border-default)",
                  borderRadius: "var(--radius-md)",
                  background: f.valueOn ? "var(--color-bg-surface)" : "var(--color-bg-subtle)",
                  color: f.valueOn ? "var(--color-text-primary)" : "var(--color-text-disabled)",
                  fontSize: "var(--font-size-sm)",
                  outline: "none",
                  fontFamily: "inherit",
                  width: "100%",
                }}
              />
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export function SchematicProperties() {
  return (
    <div>
      <BasicProperties />
      <DrawingBorder />
      <TitleBlock />
    </div>
  );
}
