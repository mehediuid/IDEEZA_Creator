# Find & Replace — field picker (UIUX-76)

**Ticket:** UIUX-76 — the redesigned Find & Replace looks right but can't
search inside one specific field (EasyEDA's Find Content list). Add the
capability in IDEEZA's own style, per the ticket's design example: an
**All fields** dropdown at the left of the search box.

## Design (user-approved)

- **Field picker** — a `DsSelect` inline-left of the search input, default
  *All fields*. Options are only fields the model really carries (no
  Simulide/NGspice pretence): Designator / Text · Net name · Value ·
  Footprint · Comment · Pin type · Symbol kind · Object ID · Package · MPN ·
  Manufacturer.
- **All fields** searches the union of the user-meaningful text fields —
  designator, net, value, footprint, comment, package, MPN, manufacturer, pin
  type (fixing the old caption's lie: `props.value` was named but never read).
  Symbol kind and Object ID are searchable only when picked explicitly — in
  the union they'd make "res" match every resistor by its internal kind.
- **Net name searches the live netlist** — schematic objects store no net (the
  netlist derives it), so the Net field reads the stored `net` first and the
  derived net (the Nets tab's own `computeNets`) otherwise. Searching "GND"
  finds the members the Nets tab would highlight.
- **Replace writes the picked field** — Value rewrites `props.value`, Net
  rewrites stored nets (board objects); when the matches carry only derived
  nets, the toast teaches the real rename path ("rename the net label or flag
  text instead"). *All fields* keeps the existing behaviour (writes
  Designator / Text) and the caption says so. Symbol kind and Object ID are
  read-only — replace disables with the reason stated.
- The caption under the chips names what is being searched, live. Everything
  else (chips, scope, kind chips, count, footer) unchanged — the ticket keeps
  the look.

## Verification

`tsc` + CDP: field-specific counts differ from All fields (Designator "R1" =
1 vs Net name "R1" = 0); Value really searched under All fields; replace in
the Net field renames the net (found again under the new name); kind/ID
replace disabled; both themes screenshotted.
