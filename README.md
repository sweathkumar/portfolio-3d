# Portfolio (sweathkumar.com)

Personal portfolio for Sweath Kumar Gopi. Static HTML, CSS and JavaScript with a Three.js particle scene. No build step.

```bash
node dev-server.mjs   # http://localhost:4400
```

## Files
- `index.html` – content and the inline icon sprite (Lucide-style, `#i-*` symbols).
- `styles.css` – layout, components, motion. Colours and fonts are tokens at the top.
- `main.js` – loader, scroll effects, cursor, orbit, loop, marquee. **Edit `CONFIG` at the top** to add your email and social links (empty values stay hidden).
- `scene.js` – the particle field. Each section's `data-shape`, `data-side`, `data-dim` and `data-colors` attributes pick its formation, position, brightness and colours. Shapes: `sphere`, `rings`, `helix`, `knot`, `lattice`, `galaxy`, `grid`, `network`, `burst`.

Three.js loads from jsDelivr through the import map in `index.html` (pinned to 0.170.0).

## Deploy (Cloudflare Pages)
Connect this repo to Cloudflare Pages with **no build command** and the **repository root** as the output directory, then attach `sweathkumar.com`. `_headers` sets security and cache headers.

## AdSense
`ads.txt` authorises the AdSense account that runs ads on tools.sweathkumar.com (subdomains are covered by the root
domain's ads.txt). The `google-adsense-account` meta tag in `index.html` verifies the site without loading any ads here.

## Accessibility and fallbacks
- `prefers-reduced-motion` turns off the cursor, marquee, shimmer and auto-rotation.
- Without WebGL the canvas is replaced by a gradient; without JavaScript all content is visible.
