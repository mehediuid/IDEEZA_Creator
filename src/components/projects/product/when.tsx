// A date on the product page, the way every date on the two project pages is
// printed: the one formatter (A3's `formatDate`) inside a <time>, with the
// full date and time in its title (COR-10, COR-107).

import * as React from "react";
import { formatDate, formatDateTime } from "@/lib/manual/project-summary";

export function When({ at }: { at: number }) {
  return (
    <time dateTime={new Date(at).toISOString()} title={formatDateTime(at)}>
      {formatDate(at)}
    </time>
  );
}
