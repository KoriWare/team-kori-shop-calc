# Radial Chip Thinning Calculator · Team Kori

Static shop-floor tool for CNC machinists: **radial chip thinning** feed compensation, with an optional demo scrap-cost panel.

Pure HTML / CSS / JS — no build step, no backend, no private data. Ready for **GitHub Pages**.

## Open locally

```bash
cd team-kori-shop-calc
# Option A — open the file
open index.html          # macOS
xdg-open index.html      # Linux

# Option B — local server (recommended)
python3 -m http.server 8080
# then visit http://localhost:8080
```

## Deploy to GitHub Pages (free)

1. Create a new GitHub repo (public or private; Pages works on both with a free account for public, or with GitHub Pro/org for private).
2. Push this folder as the repo root (or `/docs`).
3. **Settings → Pages → Build and deployment**
   - Source: **Deploy from a branch**
   - Branch: `main` (or `gh-pages`), folder: `/ (root)` or `/docs`
4. After a minute, open `https://<user>.github.io/<repo>/`

**Public link caveat:** anyone with the URL can open it. This app ships **demo numbers only** — no balances, no real jobs, no personal data.

## What it does

### Core calc
| Input | Default (demo) |
|-------|----------------|
| Tool Ø D (in) | 0.75 |
| Radial engagement | 70% of D (or ae in) |
| Desired chipload ipt | 0.025 in/tooth |
| Flutes Z | 4 |
| Spindle RPM | 2200 |

**Formulas**

- `ae = (%/100) * D` when using percent mode  
- `ratio = ae / D` (clamped; slotting when ≥ 1)  
- Chip thinning factor:  
  `factor = sqrt(ratio * (2 - ratio))` when `ratio < 1`, else `1`  
- Effective chip (uncompensated): `heff = ipt * factor`  
- Feed multiplier: `mult = 1 / factor`  
- Adjusted chipload: `ipt' = ipt * mult` (holds desired heff)  
- Adjusted table feed: `ipm' = ipt' * rpm * Z`  
- Uncompensated: `ipm = ipt * rpm * Z`  
- Surface speed: `SFM = π * D * rpm / 12`

Toggle **Compensate for radial thinning** (ON by default). When OFF, programmed feed is shown without the multiplier and risk chips turn red/yellow for light cuts.

**Copy adjusted feed** puts a one-liner on the clipboard, e.g.  
`Adj: 312 ipm (mult 1.41) | 2200 rpm | Ø0.750 | ae 70%`

### Optional cost panel (Stacey · DEMO)
Collapsed by default. Demo defaults: blank $25 · 8 min · $85/hr · 1 scrap · tool $40 · 4 edges.

- Scrap $ = blank + cycle × (burden/60)  
- Remake $ = scrap $ × scrap count  
- Soft tool-life risk: red if thinning off & ae/D &lt; 0.5; yellow if compensated & ae/D &lt; 0.25; else green  

### Design (Maria)
Dark shop night mode — near-black, electric violet + teal, soft gold only on money callouts. Live SVG engagement diagram, chunky controls, greasy-phone contrast.

## Team lanes
- **Jenny** — math, scaffold, Pages  
- **Maria** — UI / diagram vibe  
- **Stacey** — demo $ / scrap-risk heuristic  
- **Casey** — setup/PM board (later tab)

## Caveats
- Chip thinning model is the common radial (circular interpolation / side-milling) approximation — not a full CAM cutter-engagement sim.
- Defaults are **demo** labels, not live job data.
- Clipboard needs a secure context (https or localhost); file:// may fall back to showing the line.
