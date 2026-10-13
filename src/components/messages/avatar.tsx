// A person's initials in a circle, or the team mark for a team conversation.
// Decorative: the name always sits beside it.

import { UserGroupIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { cn } from "@/lib/utils";

export function Avatar({ initials, team = false, className }: { initials: string; team?: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-[40px] shrink-0 select-none items-center justify-center rounded-full bg-bg-subtle text-md font-semibold leading-md text-text-secondary",
        className,
      )}
    >
      {team ? <Icon icon={UserGroupIcon} size={18} /> : initials}
    </span>
  );
}
