# Handoff: FilmIQ Redesign — "Trade Paper" Direction

## Overview
A full visual redesign + feature expansion of **FilmIQ**, an AI film-acquisition analysis tool (FastAPI + CrewAI backend, Next.js frontend). Seven specialist AI agents analyze uploaded film PDFs (press kits, scripts, financials) and produce a cited acquisition report with a three-tier bid range.

This handoff covers **six screens** replacing/extending the current app:

1. **Deal Room — ledger table** (new feature: history of analyses)
2. **Deal Room — poster grid** (alternate view of the same feature)
3. **Compare — head-to-head** (new feature)
4. **Report** (redesign of the existing report page)
5. **Analysis — live agent feed** (redesign of the existing progress page)
6. **Landing** (redesign of the existing upload page)

## About the Design Files
The files in this bundle are **design references created in HTML** — prototypes showing intended look and behavior, **not production code to copy directly**. The task is to recreate these designs in the FilmIQ codebase (Next.js App Router + Tailwind + TypeScript, repo `sainruthik/FilmIQ`) using its established patterns. Map the inline-styled prototype markup onto Tailwind utility classes / components.

`FilmIQ Explorations.dc.html` renders a canvas of design options. The relevant hi-fi screens are the **turn-3 section** (ids `3a`–`3f`). Turns 1–2 are earlier wireframes — ignore for implementation. Open the file in a browser and scroll to the section headed "Hi-fi — turn 1 taken to full fidelity".

## Fidelity
**High-fidelity.** Colors, typography, spacing, and copy in screens 3a–3f are final intent. Recreate pixel-perfectly; exact values below. (Sample film data is invented placeholder content — real data comes from the backend.)

## Design Tokens

### Colors
| Token | Value | Use |
|---|---|---|
| paper | `#f7f3ec` | page background |
| card | `#fffdf9` | card / surface background |
| card-alt | `#f2ede2` | table headers, label columns |
| ink | `#1a160f` | primary text, dark panels, primary buttons |
| body | `#3a352b` | long-form body text |
| muted | `#5c564a` | secondary text |
| faint | `#837b6c` | mono labels, metadata |
| ghost | `#b3aa99` | disabled/queued text |
| accent (vermillion) | `#c94f32` | CTAs, live states, PDF citations, active tab underline |
| pursue (green) | `#2f7d52` | PURSUE verdict, positive numbers, winner marks |
| caution (amber) | `#a97a1c` | CAUTION verdict |
| pass (red) | = accent `#c94f32` | PASS verdict |
| web-source (slate blue) | `#5878a0` | WEB citation chips |
| border | `rgba(26,22,15,.14)` | card borders, dividers (`.08` for row dividers, `.16` inputs) |

Verdict tints (badge backgrounds): `rgba(47,125,82,.1)`, `rgba(169,122,28,.1)`, `rgba(201,79,50,.1)`.

### Typography (Google Fonts)
- **Instrument Serif** (400, italic) — display: page titles, film titles, pull quotes. Logo is italic 23px. H1s 42–64px, weight 400, line-height ~1.04.
- **Schibsted Grotesk** (400–700) — UI/body text. Body 13–16px.
- **Spline Sans Mono** (400–600) — all data: numbers, labels, metadata, citations. Labels are 9–10px, `letter-spacing: .14–.2em`, UPPERCASE, color faint.

### Spacing / shape
- Page gutter 32px; nav bar padding `14px 32px`, bottom border 1px `border`.
- Cards: radius 10–12px, 1px `border`; chips/badges radius 4–6px; pills 99px.
- Buttons: radius 6–8px, padding `8px 16px`, 13px semibold. Primary = accent bg + `#fffdf9` text; secondary = ink bg; tertiary = 1px border, muted text.
- Citation chips: mono 9px semibold, 1px border in the source color at 40% alpha, radius 3px, padding `1px 6px`. PDF = vermillion (`PDF P.12`), web = slate blue (`WEB · DEADLINE.COM`).

### Bid-range bar (shared component)
Horizontal track (`rgba(26,22,15,.08)`, radius 99px, 5–10px tall). A filled span from LOW→WALK in the verdict color at 75% opacity; a 2px ink tick at FAIR. All bars in a list/table share ONE dollar scale ($0–$2M in samples) so ranges compare visually. Labels beneath in mono 9–10px: low / `fair $X` / walk.

### Animations
- `fq-up`: fade-up entrance `translateY(14px)→0`, opacity 0→1, `.5–.7s ease`, staggered 70–100ms per item.
- `fq-dot`: opacity pulse 1→.25→1, 1.2–2s, on "live" dots.
- `fq-shimmer`: background-position sweep on the progress bar gradient, 2.2s linear infinite.
- `fq-blink`: step-end cursor blink 1s on the streaming-text caret.
- `fq-float`: gentle y-float ±7px, 5s, on the landing sample card.
- Hover: poster cards lift `translateY(-4px)` + `0 12px 28px rgba(26,22,15,.12)` shadow; table rows tint `#f6f1e6`.

## Screens

### 1. Deal Room — ledger table (`#3a`) — NEW `/deals`
Purpose: history of all analyses; select rows to compare.
- Nav: logo, mono section label "DEAL ROOM", spacer, search input (200px, 1px border, radius 6), primary button "+ New analysis".
- Header row: H1 "Deal Room" (Instrument Serif 46px) left; right-aligned stat group, each stat `padding 0 24px` with 1px left border: mono 22px number over 9px uppercase label (FILMS ANALYZED / AVG DEAL SCORE / FAIR-VALUE PIPELINE — pipeline number in pursue green).
- Filter pills: `All · 6` active (ink bg, paper text), others outlined (Pursue/Caution/Pass with counts). Right: mono "SORT: SCORE ↓".
- Table card: grid columns `44px 280px 110px 90px 1fr 130px 40px`, gap 12. Header row on card-alt bg, mono 9px labels: FILM / ANALYZED / SCORE / BID RANGE (LOW — FAIR — WALK) / VERDICT. Rows: checkbox (accent-color vermillion), film title (Instrument Serif 19px) over mono 10px meta, date, score (mono 17px semibold in verdict color), bid-range bar, verdict badge (mono 9px, 1px border + tint in verdict color), `→` affordance.
- Selection bar (appears when ≥1 checked): ink bg, radius 10, pulsing accent dot, "2 films selected — **titles**", Clear link, primary "Compare 2 →".

### 2. Deal Room — poster grid (`#3b`) — alternate view (Grid/Table toggle in nav)
- 3-column card grid, gap 20. Card: 190px art area (duotone gradient placeholder with a large ghosted serif initial, genre tag chip top-left, solid verdict badge top-right), then body: title (serif 22px) + score (mono 20px, verdict color) on one line, mono meta, bid bar, low/walk labels.
- Poster art: use duotone gradients until real posters exist (e.g. `linear-gradient(165deg,#0e2233,#3a5a74)`); design intent is to later pull the press-kit cover.
- Compare tray pinned at bottom: card bg, 1px ink border, shadow `0 8px 24px rgba(26,22,15,.12)`; mono label "COMPARE TRAY", removable film pills, dashed "+ add a third", ink "Compare 2 →" button.

### 3. Compare (`#3c`) — NEW `/compare?ids=…`
- Nav breadcrumb "DEAL ROOM / COMPARE"; secondary buttons "+ Add film", "Export ⤓".
- H1 "Head to head"; sub-line notes shared bid scale and "★ marks the stronger position per row".
- Matrix: CSS grid `170px 1fr 1fr 1fr`, 1px gaps on border color (gap-as-gridline technique), radius 12 clipped. Column headers: art thumbnail (44px tall duotone), film title (serif 21px), mono meta. Overall leader column gets a 3px pursue-green top border.
- Rows: DEAL SCORE / VERDICT / RISK LEVEL / TALENT / BUZZ / BEST COMP / BID RANGE. Label cells on card-alt, mono 10px. Winner cell per row: `inset 3px 0 0 #2f7d52` + green ★.
- Bid range row uses the shared bar component on one scale.
- Verdict panel below: ink bg, radius 12; mono accent label "STRATEGIST VERDICT", quote in Instrument Serif italic 19px, `rgba(255,253,249,.92)`.
- Backend: optionally `POST /api/compare` for the verdict paragraph; rest derives from stored reports.

### 4. Report (`#3d`) — redesign of `/analyze/[jobId]` complete state
- Nav: breadcrumb "REPORT / MIDNIGHT HARBOR", green status "● ANALYSIS COMPLETE · 4M 12S", ink button "Export memo ⤓" (print-to-PDF of this view).
- Title block (bordered below): mono accent eyebrow "ACQUISITION REPORT · NO. 0247", H1 serif 56px, mono metadata line (genre · director · runtime · festival · doc count · sources cited).
- Two-column body: **sticky 280px left rail** + fluid content, gap 28.
- Rail card 1 — Deal Score: 132px conic-gauge ring (`conic-gradient(green 0→score%, track rest)`, 13px ring via inner circle), mono 38px score + label inside; full-width verdict banner (green bg, mono 11px "VERDICT: PURSUE"); confidence line "CONFIDENCE HIGH · 6/6 AGENTS AGREE".
- Rail card 2 — Bid Guidance: 10px segmented gradient track (grey 0–18%, green 18–48%, amber 48–78%, red 78–100%), 3px ink marker at fair value with a pulsing handle; three labeled figures: OPENING $500K / FAIR VALUE $850K (green) / WALK-AWAY $1.2M (red).
- Rail card 3 — One-line thesis: ink bg, mono accent label, serif italic quote 16px.
- Content column: tab bar (Summary / Talent / Market / Deals / Risks / Bid rationale; active = semibold + 2px accent underline). Summary tab shows: two body paragraphs (14.5px/1.75) with **inline citation chips**; Strengths/Concerns two-up cards (3px left border green/red, mono headers, 13px/2 lists); **Risk matrix** 3×3 grid (severity ↑ / likelihood →), empty cells `rgba(26,22,15,.04)`, occupied cells tinted + bordered in severity color with the risk name at 11.5px; **Comparables table** (grid `2fr 1fr 1fr 1fr`: serif title / buyer / year / right-aligned mono price).
- Backend: strategist output needs `deal_score` (0–100) and `verdict` enum added; Risk Analyst should emit structured `{name, severity, likelihood}` risks; agents should attribute sources (PDF page or URL) for the chips.

### 5. Analysis — live agent feed (`#3e`) — redesign of the progress view
- 860px content width. Nav: "ANALYZING" label; pulsing "● LIVE" in accent.
- Header: accent eyebrow "ACQUISITION ANALYSIS IN PROGRESS", H1 serif 42px film title; right: mono 26px percent + "4 OF 7 AGENTS DONE"; 4px progress bar with animated accent gradient shimmer.
- Vertical timeline, 26px spine column: DONE agents = green-outlined ✓ circle, name + mono "DONE · m:ss", 13px muted finding summary; connector = 1.5px line.
- ACTIVE agent = solid accent pulsing dot + highlighted card (card bg, 1px accent border, accent-tinted shadow): name + mono "WORKING · 0:42", streaming mono 12.5px text with blinking 8×14px accent caret, row of source chips.
- QUEUED agents = dashed circle, ghost-colored name + "QUEUED".
- Footer note: mono "→ Report assembles automatically when the Strategist completes".
- Backend: enrich existing SSE events with `finding` text and `sources[]` per agent.

### 6. Landing (`#3f`) — redesign of `/`
- Full-bleed decorative film-strip edges: 14px vertical strips both sides, `repeating-linear-gradient(180deg, transparent 0 16px, rgba(201,79,50,.18) 16px 24px)`.
- Nav: logo, links "How it works" / "Deal Room", primary "New analysis".
- Two-column hero (1.05fr/1fr, gap 48, padding `64px 60px`): left — pulsing-dot pill badge "AI ACQUISITION INTELLIGENCE" (mono 10px, accent, outlined pill); H1 serif 64px "Know what a film is worth — *in minutes.*" (italic phrase in accent); 16px muted subcopy; three stats (mono 24px over 9px labels, 1px left borders): 7 / <5m / 46.
- Right — floating **sample report card** (230px, absolute, rotated ~1.6deg, `fq-float`): "SAMPLE REPORT · LIVE" eyebrow, film title, score + PURSUE badge, mini bid bar. Below it the **upload zone**: 2px dashed accent-at-45% border, radius 14; ⤒ icon tile, "Drop film documents here" (serif 24px), doc-types line, primary "Choose PDFs" button, mono fine print "PDF ONLY · MAX 50MB · MULTIPLE FILES · NO SIGNUP". Hover: solid accent border + `0 0 0 6px rgba(201,79,50,.06)` ring.
- Footer strip: "THE TEAM:" + the seven agent names (Strategist bolded); right: "CITED SOURCES IN EVERY REPORT".

## Interactions & Navigation
- Landing "Choose PDFs"/drop → upload → Analysis feed (`/analyze/[jobId]`) → auto-transition to Report on completion.
- Nav "Deal Room" → ledger (default) with Grid/Table toggle.
- Row checkboxes / tray → selection bar → "Compare N →" → Compare view.
- Report tabs switch content panes client-side; "Export memo" triggers print stylesheet.
- All screens: staggered `fq-up` entrance on load.

## State Management
- Reports list (new persistence — jobs are currently in-memory; add DB + `GET /api/reports`, `GET /api/reports/{id}`).
- Compare selection (client state, survives navigation — e.g. URL params or store).
- Analysis page: SSE-driven agent states (queued → working → done) with accumulated findings.
- Filter/sort state on Deal Room.

## Assets
- Google Fonts: Instrument Serif (400 + italic), Schibsted Grotesk (400–700), Spline Sans Mono (400–600).
- No image assets; poster art is CSS duotone gradients until real key art is wired in.
- All icons are text glyphs (⤒ ⤓ → ✓ ● ⌕ ✕ ★) — swap for the codebase's icon set if preferred.

## Files
- `FilmIQ Explorations.dc.html` — design canvas. Implementation targets are the six cards in the turn-3 section (element ids `3a`–`3f`). Sample data + bid-bar math live in the inline logic class at the bottom of the file.
- `support.js` — runtime for viewing the prototype in a browser; not part of the design.
