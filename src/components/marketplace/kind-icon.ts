// Each sellable kind's mark, one map for the web and the phone app (owner, 2026-11-18: testers could not
// tell Main / Physical / Virtual apart on Earn › Sell, so the type sits on the thing itself, with the same
// icon the phone's rows already used): the project itself, a built unit, the design files.

import { CrownIcon, DeliveryBox01Icon, FileDownloadIcon } from "@hugeicons/core-free-icons";
import type { IconValue } from "@/components/dashboard/icon";

export const KIND_ICON: Record<"main" | "physical" | "virtual", IconValue> = {
  main: CrownIcon,
  physical: DeliveryBox01Icon,
  virtual: FileDownloadIcon,
};
