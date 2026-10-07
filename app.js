/**
 * Team Kori — Chip Thinning Calculator (Radial / Axial + Convert + in|mm)
 * Pure static; demo numbers only.
 */

(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const IN_TO_MM = 25.4;

  // --- DOM ---
  const inpD = $("inp-d");
  const inpPct = $("inp-pct");
  const inpPctNum = $("inp-pct-num");
  const inpAe = $("inp-ae");
  const inpAp = $("inp-ap");
  const inpKappa = $("inp-kappa");
  const inpIpt = $("inp-ipt");
  const inpZ = $("inp-z");
  const inpRpm = $("inp-rpm");
  const inpCompensate = $("inp-compensate");
  const modePct = $("mode-pct");
  const modeAe = $("mode-ae");
  const fieldPct = $("field-pct");
  const fieldAe = $("field-ae");
  const blockRadial = $("block-radial");
  const blockAxial = $("block-axial");
  const primaryRadial = $("primary-radial");
  const primaryAxial = $("primary-axial");
  const unitsIn = $("units-in");
  const unitsMm = $("units-mm");
  const warnBox = $("warn-box");
  const riskChip = $("risk-chip");
  const multBadge = $("mult-badge");
  const badgeMult = $("badge-mult");
  const aeWedge = $("ae-wedge");
  const labelD = $("label-d");
  const labelAe = $("label-ae");
  const svgRadial = $("svg-radial");
  const svgAxial = $("svg-axial");
  const btnCopy = $("btn-copy");
  const copyStatus = $("copy-status");
  const costToggle = $("cost-toggle");
  const costBody = $("cost-body");
  const costChevron = $("cost-chevron");
  const convertToggle = $("convert-toggle");
  const convertBody = $("convert-body");
  const convertChevron = $("convert-chevron");

  const costBlank = $("cost-blank");
  const costCycle = $("cost-cycle");
  const costBurden = $("cost-burden");
  const costScrap = $("cost-scrap");
  const costTool = $("cost-tool");
  const costEdges = $("cost-edges");
  const toolRiskChip = $("tool-risk-chip");

  const convSfm = $("conv-sfm");
  const convRpm = $("conv-rpm");
  const convIpt = $("conv-ipt");
  const convIpm = $("conv-ipm");

  let primaryMode = "radial"; // "radial" | "axial"
  let engagementMode = "pct"; // "pct" | "ae"
  let units = "in"; // "in" | "mm"
  let lastCopyLine = "";
  let lastMult = 1;
  let converting = false; // guard convert↔calc loops

  // --- Helpers ---
  function num(el) {
    const v = parseFloat(el.value);
    return Number.isFinite(v) ? v : NaN;
  }

  function fmt(n, digits) {
    if (!Number.isFinite(n)) return "—";
    if (Math.abs(n) >= 100) return n.toFixed(0);
    if (Math.abs(n) >= 10) return n.toFixed(Math.min(digits, 2));
    return n.toFixed(digits);
  }

  function fmtIpt(n) {
    if (!Number.isFinite(n)) return "—";
    return units === "mm" ? n.toFixed(3) : n.toFixed(4);
  }

  function setInvalid(el, bad) {
    el.classList.toggle("invalid", !!bad);
  }

  function uLen() {
    return units === "mm" ? "mm" : "in";
  }
  function uFeed() {
    return units === "mm" ? "mm/min" : "ipm";
  }
  function uTooth() {
    return units === "mm" ? "mm/tooth" : "in/tooth";
  }
  function uSurf() {
    return units === "mm" ? "m/min" : "SFM";
  }

  /** Radial factor */
  function radialFactor(ratio) {
    if (ratio >= 1) return 1;
    if (ratio <= 0) return 0;
    return Math.sqrt(ratio * (2 - ratio));
  }

  /** Axial factor = sin(κ°) */
  function axialFactor(kappaDeg) {
    if (!Number.isFinite(kappaDeg) || kappaDeg <= 0) return 0;
    const k = Math.min(90, kappaDeg);
    return Math.sin((k * Math.PI) / 180);
  }

  /** Surface speed: inch → SFM; mm → Vc m/min */
  function surfaceSpeed(D, rpm) {
    if (units === "mm") {
      return (Math.PI * D * rpm) / 1000;
    }
    return (Math.PI * D * rpm) / 12;
  }

  function rpmFromSurface(Vc, D) {
    if (!(D > 0)) return NaN;
    if (units === "mm") {
      return (Vc * 1000) / (Math.PI * D);
    }
    return (Vc * 12) / (Math.PI * D);
  }

  function updateUnitLabels() {
    const len = uLen();
    $("unit-d").textContent = "(" + len + ")";
    $("unit-ae").textContent = "(" + len + ")";
    $("unit-ap").textContent = "(" + len + ")";
    $("unit-ipt").textContent = "(" + uTooth() + ")";
    $("ae-unit-btn").textContent = "(" + len + ")";
    $("lbl-ipt-name").textContent = units === "mm" ? "fz" : "ipt";
    $("lbl-adj-feed").textContent = "Adjusted " + (units === "mm" ? "mm/min" : "IPM");
    $("lbl-sfm").textContent = uSurf();
    $("dt-adj-ipt").textContent = units === "mm" ? "Adjusted fz" : "Adjusted ipt";
    $("dt-adj-ipm").textContent = "Adjusted " + (units === "mm" ? "mm/min" : "IPM");
    $("dt-raw-ipm").textContent = "Uncompensated " + (units === "mm" ? "mm/min" : "IPM");
    $("dt-sfm").textContent = uSurf();
    $("conv-speed-title").textContent = units === "mm" ? "m/min ↔ RPM" : "SFM ↔ RPM";
    $("lbl-conv-sfm").textContent = units === "mm" ? "m/min" : "SFM";
    $("conv-feed-title").textContent = units === "mm" ? "mm/tooth ↔ mm/min" : "ipt ↔ IPM";
    $("lbl-conv-ipt").textContent = units === "mm" ? "mm/tooth" : "ipt";
    $("lbl-conv-ipm").textContent = units === "mm" ? "mm/min" : "IPM";
    $("conv-speed-hint").textContent = "Uses tool Ø above · " + len;
    if (primaryMode === "radial") {
      $("dt-ratio").textContent = "ae / D";
      $("lbl-compensate").textContent = "Compensate for radial thinning";
      $("dt-adj-ipt").textContent = units === "mm" ? "Adjusted fz" : "Adjusted ipt";
      $("dt-adj-ipm").textContent = "Adjusted " + (units === "mm" ? "mm/min" : "IPM");
      $("lbl-adj-feed").textContent = "Adjusted " + (units === "mm" ? "mm/min" : "IPM");
      const dm = $("dt-mult");
      if (dm) dm.textContent = "Feed multiplier";
    } else {
      $("dt-ratio").textContent = "κ / sin(κ)";
      $("dt-adj-ipt").textContent = units === "mm" ? "Programmed fz" : "Programmed ipt";
      $("dt-adj-ipm").textContent = "Programmed " + (units === "mm" ? "mm/min" : "IPM");
      $("lbl-adj-feed").textContent = "Programmed " + (units === "mm" ? "mm/min" : "IPM");
      const dm = $("dt-mult");
      if (dm) dm.textContent = "Theoretical × (info)";
    }
  }

  function updateDiagramRadial(ratio) {
    const cx = 160, cy = 140, r = 90;
    const clamped = Math.max(0.001, Math.min(1, ratio));
    let halfRad = clamped >= 1 ? Math.PI : Math.acos(1 - clamped);
    const a0 = -halfRad, a1 = halfRad;
    const x0 = cx + r * Math.cos(a0);
    const y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    const large = halfRad * 2 > Math.PI ? 1 : 0;
    aeWedge.setAttribute(
      "d",
      ["M " + cx + " " + cy, "L " + x0 + " " + y0, "A " + r + " " + r + " 0 " + large + " 1 " + x1 + " " + y1, "Z"].join(" ")
    );
    labelD.textContent = "Ø " + fmt(num(inpD), 3) + " " + uLen();
    if (engagementMode === "pct") {
      labelAe.textContent = "ae " + fmt(num(inpPctNum), 0) + "% of D";
    } else {
      labelAe.textContent = "ae " + fmt(num(inpAe), 3) + " " + uLen();
    }
  }

  function updateDiagramAxial(kappaDeg, ap) {
    // Side view: cutter 130–190 x, bottom at y=160 (work surface)
    // Lead face from bottom-right of cutter sloping at κ from horizontal
    // κ = angle between cutting edge and work plane (entering/lead)
    const k = Math.max(1, Math.min(90, kappaDeg || 45));
    const rad = (k * Math.PI) / 180;
    const baseY = 160;
    const cutterLeft = 130;
    const cutterRight = 190;
    const cutterTop = 40;
    // Face starts at bottom-left of insert zone and rises at angle κ
    // For square (90°): vertical face. For small κ: shallow ramp.
    // Draw insert wedge from (cutterRight, baseY) along lead angle into material
    const faceLen = 70;
    // Angle from vertical: 90-κ means deviation from square shoulder
    // Lead κ from work: edge makes κ with XY plane → in side view slope = tan(κ) rise/run? 
    // Simpler: line from tip going up-left at angle κ from horizontal
    const tipX = cutterRight;
    const tipY = baseY;
    const endX = tipX - faceLen * Math.cos(rad);
    const endY = tipY - faceLen * Math.sin(rad);
    const path = [
      "M " + tipX + " " + tipY,
      "L " + endX + " " + endY,
      "L " + cutterLeft + " " + endY,
      "L " + cutterLeft + " " + tipY,
      "Z",
    ].join(" ");
    $("axial-face").setAttribute("d", path);

    // ap depth visual — scale a bit for display
    const apPx = Math.min(55, Math.max(8, (Number.isFinite(ap) ? ap : 0.1) * (units === "mm" ? 1.2 : 30)));
    const apBottom = baseY + apPx;
    $("ap-line").setAttribute("y1", String(baseY));
    $("ap-line").setAttribute("y2", String(apBottom));
    $("ap-line").setAttribute("x1", "210");
    $("ap-line").setAttribute("x2", "210");
    // depth fill hint
    $("label-ap").setAttribute("y", String((baseY + apBottom) / 2 + 4));
    $("label-ap").textContent = "ap " + fmt(ap, units === "mm" ? 2 : 3) + " " + uLen();
    $("label-kappa").textContent = "κ " + fmt(k, 0) + "°";
    $("label-d-ax").textContent = "Ø " + fmt(num(inpD), 3) + " " + uLen() + " · sin(κ)=" + fmt(axialFactor(k), 3);
    $("label-ax-sub").textContent = "axial thinning · lead angle";
  }

  function setRiskChip(el, level, label) {
    el.className = "risk-chip " + level;
    el.textContent = label;
  }

  function pulseBadge() {
    multBadge.classList.remove("pulse");
    void multBadge.offsetWidth;
    multBadge.classList.add("pulse");
  }

  function calc() {
    const D = num(inpD);
    const ipt = num(inpIpt);
    const Z = num(inpZ);
    const rpm = num(inpRpm);
    // Axial: never auto-compensate (safety — low κ can imply 4–5× feeds)
    const compensate = primaryMode === "radial" && inpCompensate.checked;

    const badD = !(D > 0);
    const badIpt = !(ipt > 0);
    const badZ = !(Z >= 1 && Number.isFinite(Z));
    const badRpm = !(rpm > 0);
    setInvalid(inpD, badD);
    setInvalid(inpIpt, badIpt);
    setInvalid(inpZ, badZ);
    setInvalid(inpRpm, badRpm);

    let factor, ratioOrKappaLabel, warnExtra, riskRatio;

    if (primaryMode === "radial") {
      let ae;
      if (engagementMode === "pct") {
        const pct = num(inpPctNum);
        setInvalid(inpPctNum, !(pct > 0 && pct <= 100));
        setInvalid(inpPct, !(pct > 0 && pct <= 100));
        ae = (pct / 100) * D;
      } else {
        ae = num(inpAe);
        setInvalid(inpAe, !(ae > 0));
      }

      if (badD || badIpt || badZ || badRpm || !Number.isFinite(ae) || ae <= 0) {
        paintEmpty();
        warnBox.classList.remove("hidden");
        warnBox.textContent = "Check inputs — need positive D, chipload, Z, RPM, and engagement ≤ D.";
        return;
      }

      const aeClamped = Math.min(ae, D);
      const ratio = aeClamped / D;
      factor = radialFactor(ratio);
      riskRatio = ratio;
      ratioOrKappaLabel = fmt(ratio * 100, 1) + "%";
      updateDiagramRadial(ratio);

      let warn = "";
      if (ratio < 0.1) {
        warn = "Very light radial cut (ae/D < 10%). Chip thinning is severe — multiplier is high. Confirm rigidity & chip evacuation.";
      } else if (ratio < 0.25 && compensate) {
        warn = "Light engagement. Compensated feed is up — watch deflection and tool stick-out.";
      } else if (!compensate && ratio < 0.5) {
        warn = "Thinning NOT compensated. Effective chip is thinner than ipt — risk of rubbing, heat, and short tool life.";
      } else if (ae > D) {
        warn = "ae > D — treating as full slot (multiplier = 1).";
      }
      warnExtra = warn;
    } else {
      // Axial
      const ap = num(inpAp);
      const kappa = num(inpKappa);
      setInvalid(inpAp, !(ap > 0));
      setInvalid(inpKappa, !(kappa > 0 && kappa <= 90));

      if (badD || badIpt || badZ || badRpm || !(ap > 0) || !(kappa > 0 && kappa <= 90)) {
        paintEmpty();
        warnBox.classList.remove("hidden");
        warnBox.textContent = "Check inputs — need positive D, ap, κ (1–90°), chipload, Z, RPM.";
        return;
      }

      factor = axialFactor(kappa);
      riskRatio = factor; // use sin(κ) as severity proxy (small κ = more thinning)
      ratioOrKappaLabel = fmt(kappa, 1) + "° / " + fmt(factor, 3);
      updateDiagramAxial(kappa, ap);

      let warn = "";
      if (kappa < 20) {
        warn = "Low lead angle (high-feed). Chip is much thinner than ipt (sin κ). Theoretical × is INFO ONLY — Axial never auto-bumps feed. Cap IPM yourself vs insert card / spindle load.";
      } else if (kappa < 75) {
        warn = "Axial shows thinning only — no Compensate button. Raise feed yourself if you want thicker chips; watch tool and spindle limits.";
      }
      warnExtra = warn;
    }

    const heffUncompensated = ipt * factor;
    const feedMult = factor > 0 ? 1 / factor : 1;
    const adjustedIpt = compensate ? ipt * feedMult : ipt;
    const adjustedIpm = adjustedIpt * rpm * Z;
    const rawIpm = ipt * rpm * Z;
    const sfm = surfaceSpeed(D, rpm);
    const displayHeff = compensate ? ipt : heffUncompensated;
    // Axial: always show theoretical multiplier for awareness, but feed stays programmed
    const displayMult = primaryMode === "axial" ? feedMult : (compensate ? feedMult : 1);

    if (warnExtra) {
      warnBox.classList.remove("hidden");
      warnBox.textContent = warnExtra;
    } else {
      warnBox.classList.add("hidden");
      warnBox.textContent = "";
    }

    // Cut risk
    let cutLevel = "green", cutLabel = "OK";
    if (primaryMode === "radial") {
      if (!compensate && riskRatio < 0.5) {
        cutLevel = "red"; cutLabel = "Rub risk";
      } else if (compensate && riskRatio < 0.25) {
        cutLevel = "yellow"; cutLabel = "Light cut";
      } else if (riskRatio < 0.1) {
        cutLevel = "yellow"; cutLabel = "Very light";
      }
    } else {
      if (riskRatio < 0.3) {
        cutLevel = "yellow"; cutLabel = "High-feed";
      } else if (riskRatio < 0.7) {
        cutLevel = "yellow"; cutLabel = "Thin chip";
      }
    }
    setRiskChip(riskChip, cutLevel, cutLabel);

    // Paint
    $("out-mult").textContent = fmt(displayMult, 2) + "×";
    $("out-adj-ipm").textContent = fmt(adjustedIpm, 1);
    $("out-heff").textContent = fmtIpt(displayHeff);
    $("out-sfm").textContent = fmt(sfm, 0);

    $("out-ratio").textContent = ratioOrKappaLabel;
    $("out-factor").textContent = fmt(factor, 3);
    $("out-heff2").textContent = fmtIpt(displayHeff) + " " + uLen();
    $("out-mult2").textContent = fmt(displayMult, 2) + "×";
    $("out-adj-ipt").textContent = fmtIpt(adjustedIpt) + " " + uLen();
    $("out-adj-ipm2").textContent = fmt(adjustedIpm, 1) + " " + uFeed();
    $("out-raw-ipm").textContent = fmt(rawIpm, 1) + " " + uFeed();
    $("out-sfm2").textContent = fmt(sfm, 0) + (units === "mm" ? " m/min" : "");

    badgeMult.textContent = fmt(displayMult, 2);
    if (Math.abs(displayMult - lastMult) > 0.001) {
      pulseBadge();
      lastMult = displayMult;
    }

    // Copy line
    if (primaryMode === "radial") {
      const aeLabel =
        engagementMode === "pct"
          ? "ae " + fmt(num(inpPctNum), 0) + "%"
          : "ae " + fmt(Math.min(num(inpAe), D), 3) + (units === "mm" ? "mm" : '"');
      lastCopyLine = compensate
        ? "Adj: " + fmt(adjustedIpm, 0) + " " + uFeed() + " (mult " + fmt(feedMult, 2) + ") | " + fmt(rpm, 0) + " rpm | Ø" + fmt(D, 3) + " | " + aeLabel + " | Radial"
        : "Uncomp: " + fmt(rawIpm, 0) + " " + uFeed() + " (thinning OFF · heff " + fmtIpt(heffUncompensated) + ") | " + fmt(rpm, 0) + " rpm | Ø" + fmt(D, 3) + " | " + aeLabel + " | Radial";
    } else {
      const k = num(inpKappa);
      lastCopyLine =
        "Axial: " + fmt(rawIpm, 0) + " " + uFeed() + " programmed · heff " + fmtIpt(heffUncompensated) +
        " · theo ×" + fmt(feedMult, 2) + " (NOT auto-applied) | " + fmt(rpm, 0) + " rpm | Ø" + fmt(D, 3) +
        " | κ " + fmt(k, 0) + "°";
    }

    calcCost(riskRatio, compensate);
    syncConvertFromCalc(false);
  }

  function paintEmpty() {
    [
      "out-mult", "out-adj-ipm", "out-heff", "out-sfm",
      "out-ratio", "out-factor", "out-heff2", "out-mult2",
      "out-adj-ipt", "out-adj-ipm2", "out-raw-ipm", "out-sfm2",
      "out-scrap-cost", "out-remake-cost",
    ].forEach((id) => { $(id).textContent = "—"; });
    badgeMult.textContent = "—";
    lastCopyLine = "";
  }

  function calcCost(ratio, compensate) {
    const blank = num(costBlank);
    const cycle = num(costCycle);
    const burden = num(costBurden);
    const scrapCount = num(costScrap);

    const scrapEach =
      (Number.isFinite(blank) ? blank : 0) +
      (Number.isFinite(cycle) && Number.isFinite(burden) ? cycle * (burden / 60) : 0);
    const remake =
      scrapEach * (Number.isFinite(scrapCount) && scrapCount > 0 ? scrapCount : 0);

    $("out-scrap-cost").textContent = "$" + fmt(scrapEach, 2);
    $("out-remake-cost").textContent = "$" + fmt(remake, 2);

    let level = "green", label = "OK";
    if (primaryMode === "radial") {
      if (!compensate && ratio < 0.5) { level = "red"; label = "High"; }
      else if (compensate && ratio < 0.25) { level = "yellow"; label = "Watch"; }
    } else {
      // ratio here is sin(κ)
      if (!compensate && ratio < 0.85) { level = "red"; label = "High"; }
      else if (compensate && ratio < 0.5) { level = "yellow"; label = "Watch"; }
    }
    setRiskChip(toolRiskChip, level, label);
  }

  // --- Primary mode ---
  function setPrimaryMode(mode) {
    primaryMode = mode;
    const isRadial = mode === "radial";
    primaryRadial.classList.toggle("active", isRadial);
    primaryAxial.classList.toggle("active", !isRadial);
    primaryRadial.setAttribute("aria-pressed", isRadial ? "true" : "false");
    primaryAxial.setAttribute("aria-pressed", !isRadial ? "true" : "false");
    blockRadial.classList.toggle("hidden", !isRadial);
    blockAxial.classList.toggle("hidden", isRadial);
    svgRadial.classList.toggle("hidden", !isRadial);
    svgAxial.classList.toggle("hidden", isRadial);
    $("mode-hint").textContent = isRadial
      ? "Radial · ae engagement chip thinning"
      : "Axial · lead/entering angle (κ) thinning · no auto-compensate";
    $("hero-lede").textContent = isRadial
      ? "Light radial cuts thin the chip. Raise table feed so effective chip thickness matches what you want."
      : "Low lead angles thin the chip axially. Math shows how thin — you choose feed. No one-tap Compensate (safety).";
    $("diagram-heading").textContent = isRadial ? "Engagement diagram" : "Lead-angle diagram";
    const rowComp = $("row-compensate");
    const axialNote = $("axial-safe-note");
    if (rowComp) rowComp.classList.toggle("hidden", !isRadial);
    if (axialNote) axialNote.classList.toggle("hidden", isRadial);
    updateUnitLabels();
    calc();
  }

  primaryRadial.addEventListener("click", () => setPrimaryMode("radial"));
  primaryAxial.addEventListener("click", () => setPrimaryMode("axial"));

  // --- Engagement mode (radial) ---
  function setEngagementMode(mode) {
    engagementMode = mode;
    const isPct = mode === "pct";
    modePct.classList.toggle("active", isPct);
    modeAe.classList.toggle("active", !isPct);
    modePct.setAttribute("aria-pressed", isPct ? "true" : "false");
    modeAe.setAttribute("aria-pressed", !isPct ? "true" : "false");
    fieldPct.classList.toggle("hidden", !isPct);
    fieldAe.classList.toggle("hidden", isPct);

    const D = num(inpD);
    if (isPct && Number.isFinite(D) && D > 0) {
      const ae = num(inpAe);
      if (Number.isFinite(ae) && ae > 0) {
        const pct = Math.min(100, Math.max(1, Math.round((ae / D) * 100)));
        inpPct.value = pct;
        inpPctNum.value = pct;
      }
    } else if (!isPct && Number.isFinite(D) && D > 0) {
      const pct = num(inpPctNum);
      if (Number.isFinite(pct)) {
        inpAe.value = fmt((pct / 100) * D, units === "mm" ? 3 : 4);
      }
    }
    calc();
  }

  modePct.addEventListener("click", () => setEngagementMode("pct"));
  modeAe.addEventListener("click", () => setEngagementMode("ae"));

  inpPct.addEventListener("input", () => {
    inpPctNum.value = inpPct.value;
    calc();
  });
  inpPctNum.addEventListener("input", () => {
    let v = num(inpPctNum);
    if (Number.isFinite(v)) {
      v = Math.min(100, Math.max(1, v));
      inpPct.value = v;
    }
    calc();
  });

  // κ presets
  document.querySelectorAll(".preset-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const k = parseFloat(btn.getAttribute("data-kappa"));
      inpKappa.value = k;
      document.querySelectorAll(".preset-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      calc();
    });
  });
  inpKappa.addEventListener("input", () => {
    const k = num(inpKappa);
    document.querySelectorAll(".preset-btn").forEach((b) => {
      b.classList.toggle("active", Math.abs(parseFloat(b.getAttribute("data-kappa")) - k) < 0.05);
    });
    calc();
  });

  // --- Units ---
  function setUnits(next, { convertValues = true } = {}) {
    if (next === units) return;
    const prev = units;
    units = next;

    unitsIn.classList.toggle("active", units === "in");
    unitsMm.classList.toggle("active", units === "mm");
    unitsIn.setAttribute("aria-pressed", units === "in" ? "true" : "false");
    unitsMm.setAttribute("aria-pressed", units === "mm" ? "true" : "false");

    try {
      localStorage.setItem("tk-shop-units", units);
    } catch (_) { /* ignore */ }

    if (convertValues && prev !== units) {
      const factor = units === "mm" ? IN_TO_MM : 1 / IN_TO_MM;
      // length fields
      [inpD, inpAe, inpAp, inpIpt].forEach((el) => {
        const v = num(el);
        if (Number.isFinite(v)) {
          el.value = units === "mm" ? (v * IN_TO_MM).toFixed(3) : (v / IN_TO_MM).toFixed(4);
        }
      });
      // convert strip length-ish
      [convIpt, convIpm].forEach((el) => {
        const v = num(el);
        if (Number.isFinite(v) && v > 0) {
          el.value = (v * factor).toFixed(units === "mm" ? 3 : 4);
        }
      });
      // SFM ↔ m/min: SFM * 0.3048 = m/min
      const sfmV = num(convSfm);
      if (Number.isFinite(sfmV) && sfmV > 0) {
        convSfm.value = units === "mm"
          ? (sfmV * 0.3048).toFixed(1)
          : (sfmV / 0.3048).toFixed(0);
      }
      // Adjust steps
      inpD.step = units === "mm" ? "0.01" : "0.001";
      inpAe.step = units === "mm" ? "0.01" : "0.001";
      inpAp.step = units === "mm" ? "0.01" : "0.001";
      inpIpt.step = units === "mm" ? "0.001" : "0.0001";
    }

    updateUnitLabels();
    calc();
  }

  unitsIn.addEventListener("click", () => setUnits("in"));
  unitsMm.addEventListener("click", () => setUnits("mm"));

  // --- Convert strip ---
  function syncConvertFromCalc(force) {
    if (converting && !force) return;
    converting = true;
    try {
      const D = num(inpD);
      const rpm = num(inpRpm);
      const ipt = num(inpIpt);
      const Z = num(inpZ);
      if (D > 0 && rpm > 0) {
        convSfm.value = fmt(surfaceSpeed(D, rpm), units === "mm" ? 1 : 0);
        convRpm.value = fmt(rpm, 0);
      }
      if (ipt > 0 && rpm > 0 && Z >= 1) {
        convIpt.value = fmtIpt(ipt);
        convIpm.value = fmt(ipt * rpm * Z, 1);
      }
    } finally {
      converting = false;
    }
  }

  function onConvSfmInput() {
    if (converting) return;
    converting = true;
    try {
      const D = num(inpD);
      const Vc = num(convSfm);
      if (D > 0 && Vc > 0) {
        convRpm.value = fmt(rpmFromSurface(Vc, D), 0);
      }
    } finally {
      converting = false;
    }
  }

  function onConvRpmInput() {
    if (converting) return;
    converting = true;
    try {
      const D = num(inpD);
      const rpm = num(convRpm);
      if (D > 0 && rpm > 0) {
        convSfm.value = fmt(surfaceSpeed(D, rpm), units === "mm" ? 1 : 0);
      }
    } finally {
      converting = false;
    }
  }

  function onConvIptInput() {
    if (converting) return;
    converting = true;
    try {
      const ipt = num(convIpt);
      const rpm = num(inpRpm);
      const Z = num(inpZ);
      if (ipt > 0 && rpm > 0 && Z >= 1) {
        convIpm.value = fmt(ipt * rpm * Z, 1);
      }
    } finally {
      converting = false;
    }
  }

  function onConvIpmInput() {
    if (converting) return;
    converting = true;
    try {
      const ipm = num(convIpm);
      const rpm = num(inpRpm);
      const Z = num(inpZ);
      if (ipm > 0 && rpm > 0 && Z >= 1) {
        convIpt.value = fmtIpt(ipm / (rpm * Z));
      }
    } finally {
      converting = false;
    }
  }

  convSfm.addEventListener("input", onConvSfmInput);
  convRpm.addEventListener("input", onConvRpmInput);
  convIpt.addEventListener("input", onConvIptInput);
  convIpm.addEventListener("input", onConvIpmInput);

  $("btn-use-rpm").addEventListener("click", () => {
    const rpm = num(convRpm);
    if (rpm > 0) {
      inpRpm.value = Math.round(rpm);
      calc();
    }
  });

  $("btn-use-sfm").addEventListener("click", () => {
    syncConvertFromCalc(true);
  });

  $("btn-use-ipt").addEventListener("click", () => {
    const ipt = num(convIpt);
    if (ipt > 0) {
      inpIpt.value = fmtIpt(ipt);
      calc();
    }
  });

  $("btn-use-ipm").addEventListener("click", () => {
    // Derive ipt from IPM using current Z+RPM, push into calc
    const ipm = num(convIpm);
    const rpm = num(inpRpm);
    const Z = num(inpZ);
    if (ipm > 0 && rpm > 0 && Z >= 1) {
      const ipt = ipm / (rpm * Z);
      inpIpt.value = fmtIpt(ipt);
      convIpt.value = fmtIpt(ipt);
      calc();
    }
  });

  // All other inputs
  [
    inpD, inpAe, inpAp, inpIpt, inpZ, inpRpm, inpCompensate,
    costBlank, costCycle, costBurden, costScrap, costTool, costEdges,
  ].forEach((el) => {
    el.addEventListener("input", calc);
    el.addEventListener("change", calc);
  });

  // Copy
  btnCopy.addEventListener("click", async () => {
    if (!lastCopyLine) {
      copyStatus.textContent = "Nothing to copy — fix inputs first.";
      return;
    }
    try {
      await navigator.clipboard.writeText(lastCopyLine);
      copyStatus.textContent = "Copied ✓";
    } catch {
      const ta = document.createElement("textarea");
      ta.value = lastCopyLine;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        copyStatus.textContent = "Copied ✓";
      } catch {
        copyStatus.textContent = lastCopyLine;
      }
      document.body.removeChild(ta);
    }
    setTimeout(() => { copyStatus.textContent = ""; }, 2500);
  });

  // Convert accordion (collapsed by default)
  convertToggle.addEventListener("click", () => {
    const open = convertBody.classList.contains("hidden");
    convertBody.classList.toggle("hidden", !open);
    convertChevron.classList.toggle("open", open);
    convertToggle.setAttribute("aria-expanded", open ? "true" : "false");
  });

  // Cost accordion
  costToggle.addEventListener("click", () => {
    const open = costBody.classList.contains("hidden");
    costBody.classList.toggle("hidden", !open);
    costChevron.classList.toggle("open", open);
    costToggle.setAttribute("aria-expanded", open ? "true" : "false");
  });

  // Init units from localStorage (defaults are inch)
  let saved = null;
  try { saved = localStorage.getItem("tk-shop-units"); } catch (_) { /* ignore */ }
  updateUnitLabels();
  if (saved === "mm") {
    setUnits("mm", { convertValues: true }); // converts defaults in→mm + calc
  }
  setPrimaryMode("radial");
})();
