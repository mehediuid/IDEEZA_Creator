# Verification — the definition of done

Work is "done" only when **all** of these hold:

1. `npx tsc --noEmit -p tsconfig.json` passes.
2. `npm run lint` introduces no **new** errors (pre-existing ones are noted,
   not fixed silently, and never blamed on your change without proof — verify
   with `git stash` if unsure).
3. The behaviour is **proven in the real app**, in a real browser — not by
   reading the code, not by a unit of synthetic reasoning.

## The browser harness (CDP)
- Headless Chrome with `--remote-debugging-port`, driven over WebSocket
  (`/json` → `webSocketDebuggerUrl`).
- Seed a project first: set `ideeza:manual:projects` and `ideeza:manual:active`
  in `localStorage` on the app origin, then navigate to
  `/project/<slug>/pcb`.
- **Menus and toolbar need real input** — `Input.dispatchMouseEvent`
  (pressed/released at element coordinates). Synthetic `element.click()` does
  not open the menu bar. Panel/list rows generally accept `.click()`.
- Assert on the DOM (counts, titles, computed styles) and on the persisted doc
  (`ideeza:pcb:doc:<projectId>` in `localStorage`), and capture
  `Page.captureScreenshot` for the report.
- Verify **both themes** when the change touches canvas or color, and both
  editor modes (schematic / 2D) when the surface exists in both.
- Three.js views need `--enable-unsafe-swiftshader --use-gl=angle
  --use-angle=swiftshader`.

## Documentation is part of done
4. Update `CLAUDE.md` **in the same change**: §5 entry for any feature
   added/changed/removed (never document something not browser-verified),
   §4 for persisted-state/`CanvasObject` changes, §6/§7 for convention
   changes.
5. Production safety before any push: `npm run build` must compile.
