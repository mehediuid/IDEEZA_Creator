"use client";

// Step 3 — "Ready to {sell|publish|save}"
// Compact summary + intent-aware mint fields + 2 confirms + share toggle +
// Pay & Mint button. Big focus on the final action.

import * as React from "react";
import { C } from "@/lib/pcb/colors";
import type { BriefState, Intent } from "./brief-app";

const NETWORKS: { id: BriefState["network"]; label: string; sub: string }[] = [
  { id: "ethereum", label: "Ethereum", sub: "ETH" },
  { id: "polygon",  label: "Polygon",  sub: "MATIC" },
  { id: "solana",   label: "Solana",   sub: "SOL" },
];

const HEADING_BY_INTENT: Record<Intent, string> = {
  sell: "Ready to sell",
  give: "Ready to give",
  save: "Ready to save",
};

const COLLECTIONS: Record<Intent, string[]> = {
  sell: ["Discord Bots", "Open Hardware", "AI Tools", "Default Collection"],
  give: ["Discord Bots", "Open Hardware", "Community Drops"],
  save: ["My Private", "Workspace", "Default Collection"],
};

const MINT_FEE = 4;

export function Step3Mint({
  state,
  onChange,
  onBack,
  onMint,
  minting,
}: {
  state: BriefState;
  onChange: (patch: Partial<BriefState>) => void;
  onBack: () => void;
  onMint: () => void;
  minting: boolean;
}) {
  const intent = state.intent || "sell";
  const heading = HEADING_BY_INTENT[intent];

  const canMint = (() => {
    if (!state.confirmGasFees || !state.confirmOwnership) return false;
    if (intent === "sell") return !!state.collection && !!state.price && Number(state.price) > 0;
    if (intent === "give") return !!state.recipientCommunity;
    if (intent === "save") return !state.blockchainMint || !!state.collection;
    return false;
  })();

  return (
    <div style={{ width: "100%", maxWidth: 560, display: "flex", flexDirection: "column", gap: 28 }}>
      <div>
        <div onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: C.body, fontSize: 13, cursor: "pointer", marginBottom: 12 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 6l-6 6 6 6" />
          </svg>
          Back
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 700, color: C.text, margin: 0, letterSpacing: -0.5 }}>
          {heading}
        </h1>
        <p style={{ fontSize: 14, color: C.body, marginTop: 6 }}>
          Confirm the details and mint.
        </p>
      </div>

      {/* Summary card */}
      <div
        style={{
          background: "var(--color-bg-surface)",
          border: "var(--border-width-1) solid var(--color-border-subtle)",
          borderRadius: "var(--radius-lg)",
          padding: 16,
          display: "flex",
          gap: 14,
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: "var(--radius-md)",
            background: "var(--color-bg-brand-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "0 0 80px",
          }}
        >
          {state.mediaType === "skip" ? (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-violet-600)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            </svg>
          ) : (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="var(--color-violet-600)">
              <polygon points="6,4 22,12 6,20" />
            </svg>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {state.productName || "Untitled"}
          </div>
          <div style={{ fontSize: 13, color: C.body, marginTop: 4, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {state.productDescription || "—"}
          </div>
        </div>
      </div>

      {/* Intent-aware fields */}
      {intent === "sell" && (
        <SellFields state={state} onChange={onChange} />
      )}
      {intent === "give" && (
        <GiveFields state={state} onChange={onChange} />
      )}
      {intent === "save" && (
        <SaveFields state={state} onChange={onChange} />
      )}

      {/* Confirmations + share */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Check label="I confirm that additional gas fees will be added" checked={state.confirmGasFees} onChange={(v) => onChange({ confirmGasFees: v })} />
        <Check label="I confirm that I'm the rightful owner of this idea" checked={state.confirmOwnership} onChange={(v) => onChange({ confirmOwnership: v })} />
        <Check label="Share to Newsfeed" checked={state.shareToNewsfeed} onChange={(v) => onChange({ shareToNewsfeed: v })} />
      </div>

      {/* Cost + Pay */}
      <div
        style={{
          background: "var(--color-bg-surface-raised)",
          borderRadius: "var(--radius-lg)",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <CostRow label="Mint fee" value={`${MINT_FEE} IDZ`} />
        <CostRow label={`Network (${state.network.toUpperCase()})`} value={intent === "sell" || (intent === "save" && state.blockchainMint) || intent === "give" ? "~ 0.001 ETH gas" : "Not minted"} />
        <div style={{ height: 1, background: "var(--color-border-subtle)", margin: "4px 0" }} />
        <CostRow label="Total" value={`${MINT_FEE} IDZ`} bold />
      </div>

      <button
        onClick={onMint}
        disabled={!canMint || minting}
        style={{
          padding: "16px 32px",
          background: canMint && !minting ? C.primary : "var(--color-bg-surface-raised)",
          color: canMint && !minting ? "var(--color-text-on-brand)" : "var(--color-text-tertiary)",
          border: "none",
          borderRadius: "var(--radius-3xl)",
          fontSize: 15,
          fontWeight: 700,
          cursor: canMint && !minting ? "pointer" : "default",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          transition: "background .14s",
        }}
      >
        {minting ? "Minting…" : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v10 M9 9.5h4.5a2 2 0 0 1 0 4H9h4.5a2 2 0 0 1 0 4H9" />
            </svg>
            Pay {MINT_FEE} IDZ &amp; Mint
          </>
        )}
      </button>
    </div>
  );
}

function SellFields({ state, onChange }: { state: BriefState; onChange: (p: Partial<BriefState>) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <FieldGroup label="Network">
        <div style={{ display: "flex", gap: 8 }}>
          {NETWORKS.map((n) => (
            <Pill key={n.id} selected={state.network === n.id} onClick={() => onChange({ network: n.id })}>
              {n.label}
            </Pill>
          ))}
        </div>
      </FieldGroup>

      <FieldGroup label="Collection">
        <SelectField
          value={state.collection}
          onChange={(v) => onChange({ collection: v })}
          options={COLLECTIONS.sell}
          placeholder="Choose collection"
        />
      </FieldGroup>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <FieldGroup label={`Price (${state.network === "ethereum" ? "ETH" : state.network === "polygon" ? "MATIC" : "SOL"})`}>
          <input
            value={state.price}
            onChange={(e) => onChange({ price: e.target.value.replace(/[^\d.]/g, "") })}
            placeholder="0.05"
            inputMode="decimal"
            style={inputStyle}
          />
        </FieldGroup>
        <FieldGroup label="Royalties (%)">
          <input
            value={String(state.royalties)}
            onChange={(e) => {
              const n = Math.max(0, Math.min(100, Number(e.target.value.replace(/[^\d]/g, "") || 0)));
              onChange({ royalties: n });
            }}
            inputMode="numeric"
            style={inputStyle}
          />
        </FieldGroup>
      </div>
    </div>
  );
}

function GiveFields({ state, onChange }: { state: BriefState; onChange: (p: Partial<BriefState>) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <FieldGroup label="Network">
        <div style={{ display: "flex", gap: 8 }}>
          {NETWORKS.map((n) => (
            <Pill key={n.id} selected={state.network === n.id} onClick={() => onChange({ network: n.id })}>
              {n.label}
            </Pill>
          ))}
        </div>
      </FieldGroup>

      <FieldGroup label="Collection">
        <SelectField
          value={state.collection}
          onChange={(v) => onChange({ collection: v })}
          options={COLLECTIONS.give}
          placeholder="Choose collection"
        />
      </FieldGroup>

      <FieldGroup label="Recipient community">
        <input
          value={state.recipientCommunity || ""}
          onChange={(e) => onChange({ recipientCommunity: e.target.value })}
          placeholder="e.g. @ideeza-makers"
          style={inputStyle}
        />
      </FieldGroup>

      <FieldGroup label="Distribution rule">
        <SelectField
          value={state.distributionRule || "First-come-first-serve"}
          onChange={(v) => onChange({ distributionRule: v })}
          options={["First-come-first-serve", "Random allocation", "Allowlist only"]}
          placeholder="Choose rule"
        />
      </FieldGroup>
    </div>
  );
}

function SaveFields({ state, onChange }: { state: BriefState; onChange: (p: Partial<BriefState>) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div
        onClick={() => onChange({ blockchainMint: !state.blockchainMint })}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: 14,
          background: "var(--color-bg-surface)",
          border: "var(--border-width-1) solid var(--color-border-subtle)",
          borderRadius: "var(--radius-lg)",
          cursor: "pointer",
        }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Mint on blockchain?</div>
          <div style={{ fontSize: 12, color: C.body, marginTop: 2 }}>Off = stays only in your library</div>
        </div>
        <Toggle on={!!state.blockchainMint} onChange={(v) => onChange({ blockchainMint: v })} />
      </div>

      {state.blockchainMint && (
        <>
          <FieldGroup label="Network">
            <div style={{ display: "flex", gap: 8 }}>
              {NETWORKS.map((n) => (
                <Pill key={n.id} selected={state.network === n.id} onClick={() => onChange({ network: n.id })}>
                  {n.label}
                </Pill>
              ))}
            </div>
          </FieldGroup>

          <FieldGroup label="Collection">
            <SelectField
              value={state.collection}
              onChange={(v) => onChange({ collection: v })}
              options={COLLECTIONS.save}
              placeholder="Choose collection"
            />
          </FieldGroup>
        </>
      )}
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)" }}>{label}</span>
      {children}
    </label>
  );
}

function SelectField({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: string[]; placeholder: string }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        ...inputStyle,
        appearance: "none",
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2.4'><path d='M6 9l6 6 6-6'/></svg>\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 14px center",
        paddingRight: 36,
      }}
    >
      <option value="" disabled>{placeholder}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function Pill({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 16px",
        background: selected ? "var(--color-bg-brand-subtle)" : "var(--color-bg-surface)",
        border: `var(--border-width-1) solid ${selected ? "var(--color-border-brand)" : "var(--color-border-subtle)"}`,
        borderRadius: 999,
        color: selected ? C.primary : C.body,
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        transition: "background .14s, border-color .14s",
      }}
    >
      {children}
    </button>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <span
      onClick={(e) => { e.stopPropagation(); onChange(!on); }}
      style={{ width: 34, height: 20, borderRadius: 10, background: on ? "var(--color-violet-600)" : "var(--color-bg-surface-raised)", position: "relative", transition: "background .14s", flex: "0 0 34px" }}
    >
      <span style={{ position: "absolute", top: 2, left: on ? 16 : 2, width: 16, height: 16, background: "var(--color-bg-surface)", borderRadius: "50%", boxShadow: "0 1px 2px rgba(0,0,0,.2)", transition: "left .14s" }} />
    </span>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13, color: C.text, fontWeight: 500 }}>
      <span
        onClick={(e) => { e.preventDefault(); onChange(!checked); }}
        style={{
          width: 18,
          height: 18,
          borderRadius: 4,
          border: `var(--border-width-1-5) solid ${checked ? "var(--color-violet-600)" : "var(--color-border-default)"}`,
          background: checked ? "var(--color-violet-600)" : "var(--color-bg-surface)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flex: "0 0 18px",
          transition: "background .14s, border-color .14s",
        }}
      >
        {checked && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13l4 4 10-10" />
          </svg>
        )}
      </span>
      {label}
    </label>
  );
}

function CostRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: bold ? 14 : 13, color: bold ? C.text : C.body, fontWeight: bold ? 700 : 500 }}>
      <span>{label}</span>
      <span style={{ fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  height: 44,
  width: "100%",
  padding: "0 14px",
  background: "var(--color-bg-surface)",
  border: "var(--border-width-1) solid var(--color-border-subtle)",
  borderRadius: "var(--radius-lg)",
  fontSize: 14,
  color: "var(--color-text-primary)",
  outline: "none",
  fontFamily: "inherit",
};
