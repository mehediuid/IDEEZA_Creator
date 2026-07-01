// Templated prompt refinement. Stub-only for now — designed so the API
// route handler can later swap in a real LLM call without changing
// callers. Given the user's raw idea T, produce a concrete project brief
// that names the microcontroller, sensors, power, enclosure, and the
// expected outputs (schematic / parts list / build steps).

export function refinePromptTemplate(raw: string): string {
  const trimmed = raw.trim().replace(/\.+$/, "");
  if (!trimmed) return "";
  const lower = trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
  return `Design ${lower}. Specify the microcontroller, key sensors, power source, and enclosure. Output a wiring schematic, a beginner-friendly parts list, and step-by-step build instructions.`;
}
