// The landing page's one secondary button look, worn by every "Explore …"
// button (Explore Marketplace, Explore Community, Explore Projects): A01
// secondary with no fill, Figma 18714:24911's two gradient strokes (1.5 px,
// inside) and a 2 px glass blur. The strokes are a 1.5 px ring masked out of a
// pseudo-element laid over the button's transparent border. Use it with
// buttonVariants({ hierarchy: "secondary", size }) — one style, so the page
// never shows two kinds of secondary button.
export const LANDING_SECONDARY =
  "relative rounded-full border-transparent bg-transparent text-[color:var(--color-text-primary)] backdrop-blur-[2px] before:pointer-events-none before:absolute before:inset-[-1.5px] before:rounded-[inherit] before:p-[1.5px] before:content-[''] before:[background:linear-gradient(11.75deg,rgba(223,212,254,0)_20.7%,rgba(223,212,254,0.38)_46.2%,rgba(223,212,254,0)_74.9%),linear-gradient(90deg,rgba(73,73,154,0.27)_0%,rgba(69,62,112,0.27)_53.8%,rgba(66,53,76,0.72)_100%)] before:[mask:linear-gradient(#000_0_0)_content-box_exclude,linear-gradient(#000_0_0)]";
