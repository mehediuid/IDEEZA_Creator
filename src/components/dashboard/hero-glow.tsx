// The soft violet wash behind Home's hero, and behind the sign-up and sign-in
// pages, so arriving at IDEEZA and landing on Home feel like one place. Still,
// because it is the ground the headline sits on. Over it, one small light
// travels along the top edge and fades at both ends, so the loop has no seam.
// Decorative, never in the way: nothing below the hero moves, and under
// reduced motion the light is simply absent, leaving the wash as it was.
export function HeroGlow() {
  return (
    <div
      aria-hidden
      // Tall enough that the clip falls where the glow has already reached
      // the page's own colour. `overflow-hidden` is here for the travelling
      // light, which crosses ±42vw and would otherwise widen the page — but
      // it was cutting the wash at 420px while a 120px blur was still 33
      // levels above the background, leaving a hard rule across the hero.
      className="pointer-events-none absolute inset-x-0 top-0 h-[900px] overflow-hidden"
    >
      <div className="flex justify-center">
        <div
          className="h-[420px] w-[1100px] max-w-[140%] -translate-y-[38%] rounded-full opacity-25 blur-[120px]"
          style={{ backgroundImage: "var(--gradient-ai)" }}
        />
      </div>
      <div
        className="ix-hero-sweep absolute left-1/2 top-0 h-[190px] w-[380px] rounded-full blur-[90px]"
        style={{ backgroundImage: "var(--gradient-brand)" }}
      />
    </div>
  );
}
