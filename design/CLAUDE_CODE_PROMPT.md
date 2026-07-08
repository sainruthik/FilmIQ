# Claude Code Prompt — FilmIQ "Trade Paper" Redesign

Copy everything below the line into Claude Code, run from the root of the `FilmIQ` repo. Also drop the bundled `FilmIQ Explorations.dc.html` into the repo (e.g. `design/`) so Claude Code can reference it.

---

Implement a full visual redesign + two new features for this repo (FilmIQ — FastAPI + CrewAI backend in `backend/`, Next.js App Router + Tailwind + TypeScript frontend in `frontend/`). The design reference is `design/FilmIQ Explorations.dc.html` — open it and use ONLY the section headed "Hi-fi — turn 1 taken to full fidelity" (element ids `3a`–`3f`). It is an HTML prototype, not production code: recreate it with our existing Next.js/Tailwind patterns and components. Fidelity is HIGH — match colors, type, and spacing exactly. Sample film data in the prototype is placeholder; wire real backend data.

## Design system ("Trade Paper")

Replace the current gold-on-black theme everywhere.

Colors (add as Tailwind theme tokens):
- paper `#f7f3ec` (page bg), card `#fffdf9`, card-alt `#f2ede2` (table headers/label cells)
- ink `#1a160f` (primary text, dark panels, secondary buttons), body `#3a352b`, muted `#5c564a`, faint `#837b6c` (mono labels), ghost `#b3aa99` (disabled)
- accent vermillion `#c94f32` (primary CTAs, live states, PDF citation chips, active tab underline)
- verdicts: PURSUE green `#2f7d52`, CAUTION amber `#a97a1c`, PASS `#c94f32`; badge tints = same color at 10% alpha
- web-source slate blue `#5878a0`; borders `rgba(26,22,15,.14)` (rows `.08`)

Fonts (Google Fonts via next/font):
- Instrument Serif (400 + italic) — display only: page titles (42–64px, weight 400, lh ~1.04), film titles, pull quotes. Logo "FilmIQ" = italic 23px.
- Schibsted Grotesk (400–700) — all UI/body (13–16px).
- Spline Sans Mono (400–600) — ALL data: numbers, metadata, labels. Labels: 9–10px, uppercase, letter-spacing .14–.2em, color faint.

Shape: cards radius 10–12px + 1px border; buttons radius 6–8px, padding 8px 16px, 13px semibold (primary = vermillion bg/white text, dark = ink bg, tertiary = 1px border); pills radius-full; citation chips = mono 9px semibold, 1px border in source color at 40% alpha, radius 3px, padding 1px 6px — vermillion for `PDF P.12`, slate blue for `WEB · DOMAIN.COM`.

Shared component — BidRangeBar: track `rgba(26,22,15,.08)` radius-full (5–10px tall); filled span LOW→WALK in verdict color at 75% opacity; 2px ink tick at FAIR; mono 9–10px labels under (low / fair / walk). IMPORTANT: all bars rendered in the same list/table share one dollar scale (max of the set) so ranges compare visually.

Animations (CSS keyframes, respect prefers-reduced-motion):
- fade-up entrance (translateY(14px)→0 + opacity, .5–.7s ease) staggered ~80ms per major block on every page load
- pulsing dot (opacity 1→.25, 1.2–2s) for live indicators
- shimmer sweep on the analysis progress bar; blinking caret on streaming text; gentle 5s y-float on the landing sample card
- hovers: poster cards lift -4px + shadow `0 12px 28px rgba(26,22,15,.12)`; table rows tint `#f6f1e6`

## Screens to build

1. **Landing `/` (redesign — prototype id 3f):** 14px decorative film-strip edge strips both sides (`repeating-linear-gradient(180deg,transparent 0 16px,rgba(201,79,50,.18) 16px 24px)`). Nav: logo, "How it works", "Deal Room", primary "New analysis". Hero grid 1.05fr/1fr: left = outlined pill badge with pulsing dot "AI ACQUISITION INTELLIGENCE", serif 64px H1 `Know what a film is worth — *in minutes.*` (italic phrase vermillion), muted subcopy, three mono stats with left dividers (7 agents / <5m / 46 sources). Right = upload dropzone (2px dashed vermillion@45% border, radius 14, icon tile, serif 24px "Drop film documents here", primary "Choose PDFs", mono fine print "PDF ONLY · MAX 50MB · MULTIPLE FILES · NO SIGNUP") with a floating rotated (~1.6deg) sample-report mini card overlapping its top-right (score 82 + PURSUE badge + mini bid bar, floating animation). Footer strip lists the seven agent names. Keep existing upload/POST logic.

2. **Analysis `/analyze/[jobId]` in-progress (redesign — id 3e):** replace the agent-card grid with a vertical live feed, 860px max width. Header: vermillion mono eyebrow, serif 42px film title, right-aligned mono percent + "N OF 7 AGENTS DONE", 4px shimmer progress bar. Timeline: done agents = green ✓ circle + name + mono "DONE · m:ss" + one-line finding (13px muted); active agent = pulsing vermillion dot + highlighted card (1px vermillion border, tinted shadow) with streaming mono text + blinking caret + source chips; queued agents = dashed circle + ghost text "QUEUED". Footer mono note "→ Report assembles automatically when the Strategist completes". Drive from the existing SSE stream; enrich backend events to include per-agent `finding` text and `sources[]` ({type: 'pdf'|'web', label}).

3. **Report `/analyze/[jobId]` complete (redesign — id 3d):** title block with mono vermillion eyebrow "ACQUISITION REPORT · NO. XXXX", serif 56px title, mono metadata line; green "● ANALYSIS COMPLETE · mm ss" in nav + ink "Export memo ⤓" button (print stylesheet → PDF). Layout: sticky 280px left rail + content. Rail: (a) Deal Score card — 132px conic-gradient ring filled to score% in green, mono 38px score inside, solid green "VERDICT: PURSUE" banner, "CONFIDENCE HIGH · 6/6 AGENTS AGREE"; (b) Bid Guidance card — segmented gradient track (grey/green/amber/red zones), ink marker + pulsing handle at fair value, three figures OPENING/FAIR VALUE/WALK-AWAY; (c) ink One-line Thesis card with serif italic quote. Content: tab bar (Summary/Talent/Market/Deals/Risks/Bid rationale, active = 2px vermillion underline); Summary = body paragraphs with INLINE citation chips, Strengths/Concerns two-up cards (3px left border green/red), Risk Matrix 3×3 grid (severity ↑ / likelihood →, empty cells `rgba(26,22,15,.04)`, occupied cells tinted/bordered by severity with risk name), Comparables table (serif title / buyer / year / right-aligned mono price).

4. **Deal Room `/deals` (NEW — ids 3a + 3b):** history of all analyses. Nav has Grid/Table toggle. Table view: header row = serif 46px "Deal Room" + right stat group (FILMS ANALYZED / AVG DEAL SCORE / FAIR-VALUE PIPELINE in green); filter pills All/Pursue/Caution/Pass with counts (active = ink bg); table grid `44px 280px 110px 90px 1fr 130px 40px` with mono 9px headers FILM/ANALYZED/SCORE/BID RANGE/VERDICT — rows: checkbox (accent-color vermillion), serif 19px title + mono meta, date, score in verdict color, shared-scale BidRangeBar, outlined verdict badge, → link to report. Selecting rows shows an ink selection bar (pulsing dot, "N films selected — titles", Clear, "Compare N →"). Grid view: 3-col cards — 190px duotone-gradient art area with ghosted serif initial + genre chip + solid verdict badge, then title+score line, meta, bid bar; pinned compare tray at bottom (removable pills, "+ add a third", ink Compare button). Poster art = CSS duotone gradients for now.

5. **Compare `/compare?ids=a,b,c` (NEW — id 3c):** grid `170px 1fr 1fr 1fr` with 1px border-color gaps (gridline effect), radius 12. Column headers: 44px duotone thumb, serif 21px title, mono meta; overall leader column gets 3px green top border. Rows: DEAL SCORE, VERDICT, RISK LEVEL, TALENT, BUZZ, BEST COMP, BID RANGE (shared scale). Winner cell per row: `inset 3px 0 0 #2f7d52` shadow + green ★. Below: ink "STRATEGIST VERDICT" panel with serif italic 19px comparison paragraph.

## Backend changes

- **Persistence:** jobs are currently in-memory. Add SQLite (SQLAlchemy) storing completed reports: id, title, genre, director, date, deal_score, verdict, bid_low, bid_fair, bid_walk, full report JSON. Endpoints: `GET /api/reports`, `GET /api/reports/{id}`.
- **Strategist output schema:** add `deal_score` (int 0–100) and `verdict` ("PURSUE"|"CAUTION"|"PASS") alongside the existing bid_range in the strategist's JSON output; update the task prompt accordingly.
- **Risk Analyst:** output structured risks `[{name, severity: low|med|high, likelihood: low|med|high}]` for the risk matrix.
- **SSE enrichment:** emit `finding` (one-line summary) and `sources[]` per agent event for the live feed and citation chips.
- **Compare endpoint (optional):** `POST /api/compare {report_ids}` → strategist-style paragraph comparing them; otherwise compose compare view client-side from stored reports.

## Constraints

- Don't ship the prototype HTML; recreate with Tailwind + existing component conventions.
- Extract shared components: BidRangeBar, VerdictBadge, CitationChip, ScoreRing, section nav bar.
- Keep all existing upload / SSE / job-status logic working; this is a reskin + additive features.
- Verdict color-codes everything: score numbers, badges, bar fills.
- All uppercase micro-labels are Spline Sans Mono with wide tracking — never the UI font.
- Respect prefers-reduced-motion.
