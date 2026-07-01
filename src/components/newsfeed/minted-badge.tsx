// MintedBadge — small purple pill shown only on minted projects. Uses the
// pro/purple token; white-on-violet meets contrast (same pairing as the
// dashboard's primary buttons).

import { CubeIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";

export function MintedBadge() {
  return (
    <span className="inline-flex items-center gap-[4px] rounded-full bg-violet-600 px-[8px] py-[3px] text-2xs font-bold text-text-on-brand shadow-1">
      <Icon icon={CubeIcon} size={11} strokeWidth={2} />
      Minted
    </span>
  );
}
