# Chip Thinning Calculator · Team Kori

Static shop-floor tool for CNC machinists: **radial** and **axial** chip thinning feed compensation, unit convert strip (SFM↔rpm, ipt↔ipm), global **in | mm**, plus an optional demo scrap-cost panel.

Pure HTML / CSS / JS — no build step, no backend, no private data. Ready for **GitHub Pages**.

**Live:** https://korianna71.github.io/team-kori-shop-calc/

## Open locally

```bash
cd team-kori-shop-calc
python3 -m http.server 8080
# then visit http://localhost:8080
```

## What it does

### Modes (one URL)
- **Radial** — side-milling engagement. `factor = sqrt((ae/D)*(2-ae/D))` when ae/D &lt; 1, else 1.
- **Axial** — lead/entering angle. `factor = sin(κ°)` (90°≈1, 45°≈0.707, 15°≈0.259).

When **Compensate** is on: `mult = 1/factor`, adjusted chipload = ipt × mult, adjusted feed = adjusted ipt × rpm × Z.

### Convert strip
- SFM ↔ RPM (inch) or m/min ↔ RPM (mm) using tool Ø
- ipt ↔ IPM or mm/tooth ↔ mm/min using Z + RPM
- **Use this…** buttons push results into the main calc

### in | mm
Global toggle (session via `localStorage`). Scales length fields ×25.4 and rewrites labels. Angles, Z, RPM unchanged.

### DEMO cost panel (Stacey)
Sample dollars only — not real shop costs. Gold accents reserved for $ callouts.

### Not in this build
Setup / PM board stays parked (Casey).

## Team lanes
- **Jenny** — math, scaffold, Pages
- **Maria** — UI / diagram vibe
- **Stacey** — demo $ / scrap-risk heuristic
- **Casey** — setup/PM board (later)

## Caveats
- Radial model is the common side-milling approximation — not a full CAM engagement sim.
- Axial model uses sin(κ) lead-angle thinning — confirm against insert vendor data for high-feed tools.
- Defaults are **demo** labels, sample data only.
