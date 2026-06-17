"use client";

// IDEEZA PCB Software — menu bar (Edit / View / Place / … / Help).
// Faithful conversion of the prototype's menu markup: click a label to toggle
// its dropdown; items can carry icons, shortcuts, and nested submenus (shown on
// hover via the .ix-submenu CSS rule).

import { DsIcon } from "@/lib/pcb/icons";
import { buildMenus, buildMenus2D, buildMenus3D } from "@/lib/pcb/data";
import { usePcbActions, usePcbState } from "@/lib/pcb/store";

type MenuSub = {
  divider?: boolean;
  label?: string;
  k?: string;
  icon?: string;
  fg?: string;
  onClick?: () => void;
};
type MenuItem = {
  divider?: boolean;
  label?: string;
  k?: string;
  icon?: string;
  submenu?: boolean;
  hasSub?: boolean;
  sub?: MenuSub[];
  onClick?: () => void;
};

const chevron = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="2.4">
    <path d="M9 6l6 6-6 6" />
  </svg>
);

export function MenuBar() {
  const state = usePcbState();
  const actions = usePcbActions();
  const menus =
    state.mode === "3d"
      ? buildMenus3D(state, actions)
      : state.mode === "2d"
      ? buildMenus2D(state, actions)
      : buildMenus(state, actions);

  return (
    <div
      style={{
        position: "absolute",
        top: 104,
        left: 0,
        right: 0,
        height: 38,
        background: "var(--color-bg-surface)",
        borderBottom: "var(--border-width-1) solid var(--color-border-subtle)",
        display: "flex",
        alignItems: "center",
        padding: "var(--spacing-0) var(--spacing-7)",
        zIndex: 50,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-1)" }}>
        {menus.map((m) => (
          <div key={m.label} style={{ position: "relative" }}>
            <div
              className="ix-menu"
              onClick={m.toggle}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--spacing-2)",
                padding: "var(--spacing-3) var(--spacing-5)",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                fontSize: "var(--font-size-md)",
                color: "var(--color-text-primary)",
                fontWeight: 500,
              }}
            >
              <span>{m.label}</span>
              <span style={{ color: "var(--color-text-tertiary)", fontSize: "var(--font-size-sm)" }}>{m.key}</span>
            </div>

            {m.open && (
              <div
                style={{
                  position: "absolute",
                  top: 38,
                  left: 0,
                  minWidth: 262,
                  background: "var(--color-bg-surface)",
                  border: "var(--border-width-1) solid var(--color-border-default)",
                  borderRadius: "var(--radius-xl)",
                  boxShadow: "var(--elevation-6)",
                  padding: "var(--spacing-3)",
                  zIndex: 60,
                  animation: "ideeza-pop .16s cubic-bezier(.2,.9,.3,1.2)",
                }}
              >
                {m.items.map((it: MenuItem, idx: number) =>
                  it.divider ? (
                    <div key={idx} style={{ height: 1, background: "var(--color-border-subtle)", margin: "var(--spacing-2) var(--spacing-5)" }} />
                  ) : (
                    <div
                      key={idx}
                      className="ix-mi"
                      onClick={it.onClick}
                      style={{
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--spacing-6)",
                        padding: "var(--spacing-4) var(--spacing-6)",
                        borderRadius: "var(--radius-lg)",
                        cursor: "pointer",
                      }}
                    >
                      <span style={{ width: 17, height: 17, flex: "0 0 auto", color: "var(--color-text-secondary)", display: "inline-flex" }}>
                        <DsIcon name={it.icon} size={16} />
                      </span>
                      <span style={{ flex: 1, fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)", fontWeight: 500 }}>{it.label}</span>
                      {it.submenu && chevron}
                      <span className="ix-mi-k" style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)" }}>
                        {it.k}
                      </span>

                      {it.hasSub && (
                        <div
                          className="ix-submenu"
                          style={{
                            display: "none",
                            position: "absolute",
                            left: "100%",
                            top: -8,
                            marginLeft: "var(--spacing-2)",
                            minWidth: 232,
                            background: "var(--color-bg-surface)",
                            border: "var(--border-width-1) solid var(--color-border-default)",
                            borderRadius: "var(--radius-xl)",
                            boxShadow: "var(--elevation-6)",
                            padding: "var(--spacing-3)",
                            zIndex: 62,
                          }}
                        >
                          {it.sub?.map((su: MenuSub, j: number) =>
                            su.divider ? (
                              <div key={j} style={{ height: 1, background: "var(--color-border-subtle)", margin: "var(--spacing-2) var(--spacing-5)" }} />
                            ) : (
                              <div
                                key={j}
                                className="ix-mi"
                                onClick={su.onClick}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "var(--spacing-6)",
                                  padding: "var(--spacing-4) var(--spacing-6)",
                                  borderRadius: "var(--radius-lg)",
                                  cursor: "pointer",
                                }}
                              >
                                <span style={{ width: 17, height: 17, flex: "0 0 auto", color: "var(--color-text-secondary)", display: "inline-flex" }}>
                                  <DsIcon name={su.icon} size={16} />
                                </span>
                                <span style={{ flex: 1, fontSize: "var(--font-size-sm)", color: su.fg, fontWeight: 500, whiteSpace: "nowrap" }}>
                                  {su.label}
                                </span>
                                <span className="ix-mi-k" style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)" }}>
                                  {su.k}
                                </span>
                              </div>
                            ),
                          )}
                        </div>
                      )}
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ marginLeft: "auto", fontSize: "var(--font-size-md)", color: "var(--color-text-secondary)", fontWeight: 500 }}>
        Price For Premium Parts:{" "}
        <span style={{ color: "var(--color-violet-600)", fontWeight: 700 }}>$0.00</span>
      </div>
    </div>
  );
}
