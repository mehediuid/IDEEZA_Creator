"use client";

// New Package flow — host. Owns the store and picks the step body; the shell
// around it (top bar, step rail, Back/Next) is the same at every step, and the
// confirmation replaces the body once the package is filed.

import * as React from "react";
import { PackageProvider, usePackageState } from "@/lib/package/store";
import { FlowShell } from "./flow-shell";
import { Step3D } from "./step-3d";
import { StepConfirm } from "./step-confirm";
import { StepEntry } from "./step-entry";
import { StepFinalize } from "./step-finalize";
import { StepFootprint } from "./step-footprint";
import { StepSymbol } from "./step-symbol";

function StepBody() {
  const { step, done } = usePackageState();
  if (done) return <StepConfirm saved={done} />;
  switch (step) {
    case "package":
      return <StepEntry />;
    case "symbol":
      return <StepSymbol />;
    case "footprint":
      return <StepFootprint />;
    case "place3d":
      return <Step3D />;
    case "finalize":
      return <StepFinalize />;
  }
}

export function PackageFlow() {
  return (
    <PackageProvider>
      <FlowShell>
        <StepBody />
      </FlowShell>
    </PackageProvider>
  );
}
