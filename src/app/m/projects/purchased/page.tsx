// My projects › Purchased has no page of its own: its tab in My projects (CL-035).
import { redirect, RedirectType } from "next/navigation";

export default function Page() {
  redirect("/m/projects?tab=purchased", RedirectType.replace);
}
