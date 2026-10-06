# Greygate — First Strategy Meeting (online presentation)

Static site. No build step, no dependencies. `index.html` is the agenda (home page).

## Pages
- `index.html`        Agenda — scroll-driven hero page (move cursor to scrub the films, scroll to open the agenda)
- `opening.html`, `structuring.html`, `planning.html`, `process-flow.html`, `procurement-qc.html`,
  `finance.html`, `sops-workshop.html`, `consolidation.html`, `close.html`   One page per agenda item
- `brief.html`        The Brief — attendees, what to bring, pain-point map

On any page: ← / → move through the agenda, Esc returns to the agenda.

## Deploy (Vercel / Netlify / any static host)
Upload the CONTENTS of this folder so that `index.html` sits at the top level of the repo / site root
(not inside a sub-folder), then deploy. Hosts must support HTTP Range requests (all normal hosts do) —
this is what lets the videos scrub smoothly. Do not preview with `python -m http.server` (no Range support).
Double-clicking `index.html` also works in Chrome.

## Notes
- Font: Inter Tight (Google Fonts) — needs an internet connection to load; falls back to system sans otherwise.
- Decision & Action Log (Consolidation page) and the "what leadership leaves with" ticks are saved in the viewer's browser only.
- Text is taken from "Greygate — First Strategy Meeting Agenda", Version 1.0 (draft for CEO review).
