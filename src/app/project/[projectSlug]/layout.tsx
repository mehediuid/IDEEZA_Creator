// Project workspace layout — loads the shared editor fonts + CSS once for
// every step under /project/<slug>/<step>. The providers themselves live in
// the root layout, so this only carries styling.

import "../../pcb/fonts.css";
import "../../pcb/pcb-editor.css";

export default function ProjectWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
