"use client";

// The settings record as React state; every write (this tab or another)
// re-renders its readers. Server render and hydration read the defaults.

import * as React from "react";
import { DEFAULT_SETTINGS, readSettings, subscribeSettings, type SettingsV1 } from "./prefs";

export function useSettings(): SettingsV1 {
  return React.useSyncExternalStore(subscribeSettings, readSettings, () => DEFAULT_SETTINGS);
}
