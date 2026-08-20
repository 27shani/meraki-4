# Meraki 2026 — Vanilla Site

A single-page recreation of the Meraki 2026 landing page in plain HTML/CSS/JS —
no React, no build step. Built with [Lenis](https://github.com/darkroomengineering/lenis)
for smooth scroll and [GSAP](https://gsap.com) + ScrollTrigger for every animation,
following the same technical patterns as lukebaffait.fr (direct DOM writes,
`gsap.quickTo` for the cursor, `gsap.ticker` for the 3D tilt, DOM updates only on
actual state change rather than every scroll frame).

## File structure

```
meraki-vanilla/
├── index.html            single page, all 9 sections
├── styles/
│   └── index.css         design tokens + every section's styles
├── js/
│   ├── vendor/            gsap.min.js, ScrollTrigger.min.js, lenis.min.js
│   └── index.js           all animation logic, one section per IIFE
├── assets/
│   ├── images/            hero + How It Works step photos
│   ├── logos/              14 past-investor logos
│   ├── meraki-logo.png
│   └── meraki-full-logo.png
├── vercel.json
└── README.md
```

## Sections (in order)

1. **Loader** — logo scale-in → coral/black wipe → hero title reveal
2. **Hero** — pinned scroll: small box expands to a fullscreen mission statement
3. **About** — 3 benefit cards slide in over a reveal image
4. **How It Works** — sticky 6-step list with a 3D-tilt preview card and custom cursor
5. **Floating Gallery** — two investor-logo tracks scrolling in opposite directions
6. **Tracks** — two track cards slide in, then prize-money cards stagger in
7. **Save the Dates** — scrollable accordion timeline with a coral→purple arrow
8. **FAQ** — a white highlight sweeps down through the questions as you scroll
9. **Contact** — a small circle expands to reveal the closing CTA
10. **Footer** — fixed panel that fades in as you approach the bottom

## Editing content

All copy lives directly in `index.html` — search for the section's `<!-- N. NAME -->`
comment. Colors and fonts are CSS custom properties at the top of `styles/index.css`
(`:root`), so a brand tweak only needs to happen in one place.

## Swapping images

Drop a same-name file into `assets/images/` or `assets/logos/` to replace it, or
add a new one and update the matching `<img src="...">` / `background` reference
in `index.html`. Images are already compressed for web (JPEGs at ~150–230KB,
long side capped at 1600–1920px). If you add new photos, run them through the
same treatment before committing — large source photos will slow the page down
noticeably given how many images are on this page.

## Running locally

No build step — just serve the folder statically, e.g.:

```bash
npx serve .
# or
python3 -m http.server 8000
```

Opening `index.html` directly via `file://` will NOT work correctly (Lenis/GSAP
and the image preloads expect a real HTTP origin).

## Deploying to Vercel

1. Push this folder to a GitHub repo (or drag-and-drop it in the Vercel dashboard).
2. Import the repo in Vercel — no framework preset needed, it's a static site.
   Leave the build command empty and set the output directory to `.` (the repo root).
3. `vercel.json` is already set up with long-cache headers for `/assets` and
   `/js/vendor` (the vendor libraries and images never change between deploys,
   so browsers can cache them aggressively).

## Notes

- Fonts (Merriweather + Urbanist) load from Google Fonts via the `<link>` tags in
  `<head>`. If you'd rather self-host them, download the woff2 files and swap the
  `<link>` for local `@font-face` rules in `styles/index.css`.
- Reduced-motion is respected — animations shorten to near-instant for users with
  `prefers-reduced-motion: reduce` set.
- The scroll-progress indicator on the right edge is hidden below 768px width by
  design (it would collide with the pinned sections' own content on small screens).
