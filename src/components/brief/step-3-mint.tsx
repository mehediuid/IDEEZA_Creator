"use client";

// Step 3 — "Ready to {sell|publish|save}"
//
// Mint completes IMMEDIATELY when the form is valid. The 20-min video render
// is no longer a gate — it's kicked off in the background after Pay, tracked
// by the GlobalRenderIndicator visible on every page. So this screen is just
// a clean form + a single Pay button.

import * as React from "react";
import { C } from "@/lib/pcb/colors";
import {
  LISTING_TYPES,
  TOKENS_BY_NETWORK,
  type BriefState,
  type Intent,
  type Network,
  type Token,
} from "./brief-app";
import { useVideoJobs } from "@/components/video-jobs/video-jobs-provider";

const NETWORKS: { id: BriefState["network"]; label: string; sub: string }[] = [
  { id: "ethereum", label: "Ethereum", sub: "ETH" },
  { id: "polygon", label: "Polygon", sub: "MATIC" },
  { id: "solana", label: "Solana", sub: "SOL" },
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
  projectName,
}: {
  state: BriefState;
  onChange: (patch: Partial<BriefState>) => void;
  onBack: () => void;
  onMint: () => void;
  minting: boolean;
  projectName: string;
}) {
  const { jobs } = useVideoJobs();
  const intent = state.intent || "sell";
  const heading = HEADING_BY_INTENT[intent];

  // The render job was kicked off at Step 2 → Step 3 transition. Look it up
  // from the global store so we can show inline progress + opt-ins.
  const job = React.useMemo(
    () => (state.videoJobId ? jobs.find((j) => j.id === state.videoJobId) || null : null),
    [jobs, state.videoJobId],
  );
  const willRenderVideo =
    state.mediaType === "ai" && state.storyboardGenerated;
  const videoDone = job?.stage === "done";

  const formReady = (() => {
    if (!state.confirmGasFees || !state.confirmOwnership) return false;
    if (intent === "sell")
      return (
        !!state.collection &&
        !!state.listingType &&
        !!state.token &&
        !!state.price &&
        Number(state.price) > 0
      );
    if (intent === "give") return !!state.recipientCommunity;
    if (intent === "save") return !state.blockchainMint || !!state.collection;
    return false;
  })();

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 560,
        display: "flex",
        flexDirection: "column",
        gap: 28,
      }}
    >
      <div>
        <div
          onClick={onBack}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: C.body,
            fontSize: 13,
            cursor: "pointer",
            marginBottom: 12,
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 6l-6 6 6 6" />
          </svg>
          Back
        </div>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: C.text,
            margin: 0,
            letterSpacing: -0.5,
          }}
        >
          {heading}
        </h1>
        <p style={{ fontSize: 14, color: C.body, marginTop: 6 }}>
          Confirm the details and mint.{" "}
          {willRenderVideo && "Project goes live when the video is final."}
        </p>
      </div>

      {willRenderVideo && job && (
        <RenderInfo videoDone={videoDone} />
      )}

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
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-violet-600)"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            </svg>
          ) : (
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="var(--color-violet-600)"
            >
              <polygon points="6,4 22,12 6,20" />
            </svg>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 11,
              color: C.primary,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 0.4,
              marginBottom: 2,
            }}
          >
            {projectName || "No project"}
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: C.text,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {state.productName || "Untitled"}
          </div>
          <div
            style={{
              fontSize: 13,
              color: C.body,
              marginTop: 4,
              lineHeight: 1.4,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {state.productDescription || "—"}
          </div>
        </div>
      </div>

      {intent === "sell" && <SellFields state={state} onChange={onChange} />}
      {intent === "give" && <GiveFields state={state} onChange={onChange} />}
      {intent === "save" && <SaveFields state={state} onChange={onChange} />}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <Check
          label="I confirm that additional gas fees will be added"
          checked={state.confirmGasFees}
          onChange={(v) => onChange({ confirmGasFees: v })}
        />
        <Check
          label="I confirm that I'm the rightful owner of this idea"
          checked={state.confirmOwnership}
          onChange={(v) => onChange({ confirmOwnership: v })}
        />
        <Check
          label="Share to Innovations"
          checked={state.shareToNewsfeed}
          onChange={(v) => onChange({ shareToNewsfeed: v })}
        />
      </div>

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
        {intent === "sell" && state.price && Number(state.price) > 0 && (
          <CostRow
            label={`Listing (${LISTING_TYPES.find((l) => l.id === state.listingType)?.label})`}
            value={`${state.price} ${state.token}`}
          />
        )}
        <CostRow
          label={`Network (${state.network.toUpperCase()})`}
          value={
            intent === "sell" ||
            (intent === "save" && state.blockchainMint) ||
            intent === "give"
              ? "~ 0.001 gas"
              : "Not minted"
          }
        />
        <div
          style={{
            height: 1,
            background: "var(--color-border-subtle)",
            margin: "4px 0",
          }}
        />
        <CostRow label="Total to pay now" value={`${MINT_FEE} IDZ`} bold />
      </div>

      {/* Pay button — enabled the moment the form is valid. Minting just locks
          the listing data; the project only goes live when the video render
          (already in flight) finishes. */}
      <button
        onClick={onMint}
        disabled={!formReady || minting}
        style={{
          padding: "16px 32px",
          background:
            !formReady || minting
              ? "var(--color-bg-surface-raised)"
              : C.primary,
          color:
            !formReady || minting
              ? "var(--color-text-tertiary)"
              : "var(--color-text-on-brand)",
          border: "none",
          borderRadius: "var(--radius-3xl)",
          fontSize: 15,
          fontWeight: 700,
          cursor: !formReady || minting ? "default" : "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          boxShadow:
            !formReady || minting
              ? "none"
              : "0 6px 24px -6px rgba(124, 45, 185, .4)",
          transition: "background .14s, box-shadow .2s",
        }}
      >
        {minting ? (
          <>
            <Spinner />
            Minting…
          </>
        ) : !formReady ? (
          "Fill the required fields to mint"
        ) : videoDone || !willRenderVideo ? (
          <>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v10 M9 9.5h4.5a2 2 0 0 1 0 4H9h4.5a2 2 0 0 1 0 4H9" />
            </svg>
            Pay {MINT_FEE} IDZ &amp; go live
          </>
        ) : (
          <>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v10 M9 9.5h4.5a2 2 0 0 1 0 4H9h4.5a2 2 0 0 1 0 4H9" />
            </svg>
            Pay {MINT_FEE} IDZ &amp; Mint
          </>
        )}
      </button>

      {willRenderVideo && formReady && !minting && (
        <div
          style={{
            fontSize: 12,
            color: C.body,
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          {videoDone ? (
            <>
              Video is ready. Minting now publishes your listing immediately.
            </>
          ) : (
            <>
              You don&rsquo;t have to wait — mint now and we&rsquo;ll publish
              automatically the moment the video finishes.
              <br />
              <strong>Project stays hidden until the video is final.</strong>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// RenderInfo — slim info banner on Step 3 reminding the user that the project
// goes live when the in-flight render finishes. The actual render progress +
// notification opt-ins live on Step 2 (inline) and in the top-right indicator,
// so we don't duplicate them here. This banner is just signal.
function RenderInfo({ videoDone }: { videoDone: boolean }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        padding: "12px 14px",
        background: videoDone
          ? "var(--color-green-50, var(--color-bg-surface))"
          : "var(--color-bg-brand-subtle)",
        border: `var(--border-width-1) solid ${
          videoDone
            ? "var(--color-green-500)"
            : "var(--color-border-brand)"
        }`,
        borderRadius: "var(--radius-lg)",
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontSize: 13,
        lineHeight: 1.5,
        color: videoDone
          ? "var(--color-green-700)"
          : "var(--color-violet-700, var(--color-violet-600))",
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          background: videoDone
            ? "var(--color-green-100)"
            : "rgba(255,255,255,.55)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flex: "0 0 22px",
        }}
      >
        {videoDone ? (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 13l4 4 10-10" />
          </svg>
        ) : (
          <span
            className="ix-s3i-pulse"
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              background: "var(--color-violet-600)",
            }}
          />
        )}
      </span>
      <span style={{ flex: 1 }}>
        {videoDone ? (
          <>
            <strong>Video is ready.</strong> Finish the mint setup and pay to
            go live.
          </>
        ) : (
          <>
            Your video is still rendering. Set up the mint here — your
            project will go live when the video is final. Progress lives in
            the top-right indicator.
          </>
        )}
      </span>
      <style>{`
        @keyframes ix-s3i-pulse-kf { 0%, 100% { opacity: 1 } 50% { opacity: .35 } }
        .ix-s3i-pulse { animation: ix-s3i-pulse-kf 1.4s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

function SellFields({
  state,
  onChange,
}: {
  state: BriefState;
  onChange: (p: Partial<BriefState>) => void;
}) {
  const onNetwork = (n: Network) => {
    const allowed = TOKENS_BY_NETWORK[n];
    const nextToken = allowed.includes(state.token) ? state.token : allowed[0];
    onChange({ network: n, token: nextToken });
  };
  const validTokens = TOKENS_BY_NETWORK[state.network];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <FieldGroup label="Blockchain Mint (Network)">
        <div style={{ display: "flex", gap: 8 }}>
          {NETWORKS.map((n) => (
            <Pill
              key={n.id}
              selected={state.network === n.id}
              onClick={() => onNetwork(n.id)}
            >
              {n.label}
            </Pill>
          ))}
        </div>
      </FieldGroup>

      <FieldGroup label="Choose Collection">
        <SelectField
          value={state.collection}
          onChange={(v) => onChange({ collection: v })}
          options={COLLECTIONS.sell}
          placeholder="Select collection"
        />
      </FieldGroup>

      <FieldGroup label="Listing Type">
        <SelectField
          value={state.listingType}
          onChange={(v) =>
            onChange({ listingType: v as BriefState["listingType"] })
          }
          options={LISTING_TYPES.map((l) => l.id)}
          renderOption={(id) =>
            LISTING_TYPES.find((l) => l.id === id)?.label || id
          }
          placeholder="Select listing type"
        />
      </FieldGroup>

      <FieldGroup label="Price">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "120px 1fr",
            gap: 8,
          }}
        >
          <select
            value={state.token}
            onChange={(e) => onChange({ token: e.target.value as Token })}
            style={{
              ...inputStyle,
              appearance: "none",
              backgroundImage:
                "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2.4'><path d='M6 9l6 6 6-6'/></svg>\")",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 12px center",
              paddingRight: 30,
              fontWeight: 600,
            }}
          >
            {validTokens.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            value={state.price}
            onChange={(e) =>
              onChange({ price: e.target.value.replace(/[^\d.]/g, "") })
            }
            placeholder="ex. 0.001"
            inputMode="decimal"
            style={inputStyle}
          />
        </div>
      </FieldGroup>

      <FieldGroup
        label="Royalties (%)"
        right={
          <span
            style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}
          >
            2 – 100
          </span>
        }
      >
        <input
          value={String(state.royalties)}
          onChange={(e) => {
            const raw = Number(e.target.value.replace(/[^\d]/g, "") || 0);
            const clamped = Math.max(2, Math.min(100, raw));
            onChange({ royalties: clamped });
          }}
          inputMode="numeric"
          placeholder="ex. 2-100%"
          style={inputStyle}
        />
      </FieldGroup>
    </div>
  );
}

function GiveFields({
  state,
  onChange,
}: {
  state: BriefState;
  onChange: (p: Partial<BriefState>) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <FieldGroup label="Network">
        <div style={{ display: "flex", gap: 8 }}>
          {NETWORKS.map((n) => (
            <Pill
              key={n.id}
              selected={state.network === n.id}
              onClick={() => onChange({ network: n.id })}
            >
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
          options={[
            "First-come-first-serve",
            "Random allocation",
            "Allowlist only",
          ]}
          placeholder="Choose rule"
        />
      </FieldGroup>
    </div>
  );
}

function SaveFields({
  state,
  onChange,
}: {
  state: BriefState;
  onChange: (p: Partial<BriefState>) => void;
}) {
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
          <div
            style={{ fontSize: 14, fontWeight: 600, color: C.text }}
          >
            Mint on blockchain?
          </div>
          <div
            style={{ fontSize: 12, color: C.body, marginTop: 2 }}
          >
            Off = stays only in your library
          </div>
        </div>
        <Toggle
          on={!!state.blockchainMint}
          onChange={(v) => onChange({ blockchainMint: v })}
        />
      </div>

      {state.blockchainMint && (
        <>
          <FieldGroup label="Network">
            <div style={{ display: "flex", gap: 8 }}>
              {NETWORKS.map((n) => (
                <Pill
                  key={n.id}
                  selected={state.network === n.id}
                  onClick={() => onChange({ network: n.id })}
                >
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

function FieldGroup({
  label,
  right,
  children,
}: {
  label: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--color-text-secondary)",
          }}
        >
          {label}
        </span>
        {right}
      </span>
      {children}
    </label>
  );
}

function SelectField({
  value,
  onChange,
  options,
  placeholder,
  renderOption,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
  renderOption?: (id: string) => string;
}) {
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
      <option value="" disabled>
        {placeholder}
      </option>
      {options.map((o) => (
        <option key={o} value={o}>
          {renderOption ? renderOption(o) : o}
        </option>
      ))}
    </select>
  );
}

function Pill({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 16px",
        background: selected
          ? "var(--color-bg-brand-subtle)"
          : "var(--color-bg-surface)",
        border: `var(--border-width-1) solid ${
          selected ? "var(--color-border-brand)" : "var(--color-border-subtle)"
        }`,
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

function Toggle({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <span
      onClick={(e) => {
        e.stopPropagation();
        onChange(!on);
      }}
      style={{
        width: 34,
        height: 20,
        borderRadius: 10,
        background: on
          ? "var(--color-violet-600)"
          : "var(--color-bg-surface-raised)",
        position: "relative",
        transition: "background .14s",
        flex: "0 0 34px",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: on ? 16 : 2,
          width: 16,
          height: 16,
          background: "var(--color-bg-surface)",
          borderRadius: "50%",
          boxShadow: "0 1px 2px rgba(0,0,0,.2)",
          transition: "left .14s",
        }}
      />
    </span>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        cursor: "pointer",
        fontSize: 13,
        color: C.text,
        fontWeight: 500,
      }}
    >
      <span
        onClick={(e) => {
          e.preventDefault();
          onChange(!checked);
        }}
        style={{
          width: 18,
          height: 18,
          borderRadius: 4,
          border: `var(--border-width-1-5) solid ${
            checked ? "var(--color-violet-600)" : "var(--color-border-default)"
          }`,
          background: checked
            ? "var(--color-violet-600)"
            : "var(--color-bg-surface)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flex: "0 0 18px",
          transition: "background .14s, border-color .14s",
        }}
      >
        {checked && (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 13l4 4 10-10" />
          </svg>
        )}
      </span>
      {label}
    </label>
  );
}

function CostRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontSize: bold ? 14 : 13,
        color: bold ? C.text : C.body,
        fontWeight: bold ? 700 : 500,
      }}
    >
      <span>{label}</span>
      <span style={{ fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

function Spinner() {
  return (
    <span
      style={{
        width: 14,
        height: 14,
        borderRadius: "50%",
        border: "2px solid rgba(255,255,255,0.45)",
        borderTopColor: "currentColor",
        animation: "ix-mint-spin .8s linear infinite",
        display: "inline-block",
      }}
    >
      <style>{`@keyframes ix-mint-spin{to{transform:rotate(360deg)}}`}</style>
    </span>
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
