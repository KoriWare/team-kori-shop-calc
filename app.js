/**
 * Team Kori — Radial Chip Thinning Calculator
 * Pure static; demo numbers only.
 */

(function () {
  "use strict";

  // --- DOM refs ---
  const $ = (id) => document.getElementById(id);

  const inpD = $("inp-d");
  const inpPct = $("inp-pct");
  const inpPctNum = $("inp-pct-num");
  const inpAe = $("inp-ae");
  const inpIpt = $("inp-ipt");
  const inpZ = $("inp-z");
  const inpRpm = $("inp-rpm");
  const inpCompensate = $("inp-compensate");
  const modePct = $("mode-pct");
  const modeAe = $("mode-ae");
  const fieldPct = $("field-pct");
  const fieldAe = $("field-ae");
  const warnBox = $("warn-box");
  const riskChip = $("risk-chip");
  const multBadge = $("mult-badge");
  const badgeMult = $("badge-mult");
  const aeWedge = $("ae-wedge");
  const labelD = $("label-d");
  const labelAe = $("label-ae");
  const btnCopy = $("btn-copy");
  const copyStatus = $("copy-status");
  const costToggle = $("cost-toggle");
  const costBody = $("cost-body");
  const costChevron = $("cost-chevron");

  const costBlank = $("cost-blank");
  const costCycle = $("cost-cycle");
  const costBurden = $("cost-burden");
  const costScrap = $("cost-scrap");
  const costTool = $("cost-tool");
  const costEdges = $("cost-edges");
  const toolRiskChip = $("tool-risk-chip");

  let engagementMode = "pct"; // "pct" | "ae"
  let lastCopyLine = "";
  let lastMult = 1;

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
    return n.toFixed(4);
  }

  function setInvalid(el, bad) {
    el.classList.toggle("invalid", !!bad);
  }

  /**
   * Radial chip thinning factor:
   *   factor = sqrt( (ae/D) * (2 - ae/D) )   when ae/D < 1
   *   factor = 1                             when ae/D >= 1 (slotting)
   * heff = ipt * factor
   * feed_multiplier = 1 / factor  (raise programmed feed to hold desired heff)
   */
  function thinningFactor(ratio) {
    if (ratio >= 1) return 1;
    if (ratio <= 0) return 0;
    return Math.sqrt(ratio * (2 - ratio));
  }

  // SVG wedge: tool center at (160,140), r=90
  // Engagement arc centered on +X (3 o'clock) spanning ±halfAngle from horizontal
  function updateDiagram(ratio) {
    const cx = 160;
    const cy = 140;
    const r = 90;
    const clamped = Math.max(0.001, Math.min(1, ratio));

    // Chord geometry: half-angle from center for engagement arc
    // ae/D = 1 - cos(θ/2) for end-mill radial? Shop diagram: wedge spanning
    // angle whose chord fraction matches ae. Use: halfAngle = acos(1 - ratio)
    // so full engagement angle = 2 * acos(1 - ae/D)
    let halfRad;
    if (clamped >= 1) {
      halfRad = Math.PI; // full circle shade almost
    } else {
      halfRad = Math.acos(1 - clamped);
    }

    // Wedge opens to the RIGHT (cutter engaging material on +X side)
    const a0 = -halfRad;
    const a1 = halfRad;
    const x0 = cx + r * Math.cos(a0);
    const y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    const large = halfRad * 2 > Math.PI ? 1 : 0;

    // Pie slice from center through arc
    const d = [
      `M ${cx} ${cy}`,
      `L ${x0} ${y0}`,
      `A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`,
      "Z",
    ].join(" ");
    aeWedge.setAttribute("d", d);

    labelD.textContent = `Ø ${fmt(num(inpD), 3)} in`;
    if (engagementMode === "pct") {
      labelAe.textContent = `ae ${fmt(num(inpPctNum), 0)}% of D`;
    } else {
      labelAe.textContent = `ae ${fmt(num(inpAe), 3)} in`;
    }
  }

  function setRiskChip(el, level, label) {
    el.className = "risk-chip " + level;
    el.textContent = label;
  }

  function pulseBadge() {
    multBadge.classList.remove("pulse");
    // force reflow
    void multBadge.offsetWidth;
    multBadge.classList.add("pulse");
  }

  function calc() {
    const D = num(inpD);
    const ipt = num(inpIpt);
    const Z = num(inpZ);
    const rpm = num(inpRpm);
    const compensate = inpCompensate.checked;

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

    const badD = !(D > 0);
    const badIpt = !(ipt > 0);
    const badZ = !(Z >= 1 && Number.isFinite(Z));
    const badRpm = !(rpm > 0);
    const badAe = !(ae > 0) || (Number.isFinite(D) && ae > D * 1.0001);

    setInvalid(inpD, badD);
    setInvalid(inpIpt, badIpt);
    setInvalid(inpZ, badZ);
    setInvalid(inpRpm, badRpm);

    if (badD || badIpt || badZ || badRpm || !Number.isFinite(ae) || ae <= 0) {
      paintEmpty();
      warnBox.classList.remove("hidden");
      warnBox.textContent = "Check inputs — need positive D, ipt, Z, RPM, and engagement ≤ D.";
      return;
    }

    // Clamp ae to D for math (slotting)
    const aeClamped = Math.min(ae, D);
    const ratio = aeClamped / D;
    const factor = thinningFactor(ratio);
    const heffUncompensated = ipt * factor;
    const feedMult = factor > 0 ? 1 / factor : 1;
    const adjustedIpt = compensate ? ipt * feedMult : ipt;
    const adjustedIpm = adjustedIpt * rpm * Z;
    const rawIpm = ipt * rpm * Z;
    const sfm = (Math.PI * D * rpm) / 12;
    const heff = compensate ? ipt : heffUncompensated;
    // When compensated: you program adjustedIpt so heff ≈ desired ipt
    // When not: heff is thinned

    const displayHeff = compensate ? ipt : heffUncompensated;
    const displayMult = compensate ? feedMult : 1;

    // Warnings
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

    if (warn) {
      warnBox.classList.remove("hidden");
      warnBox.textContent = warn;
    } else {
      warnBox.classList.add("hidden");
      warnBox.textContent = "";
    }

    // Cut risk chip (simple heuristic)
    let cutLevel = "green";
    let cutLabel = "OK";
    if (!compensate && ratio < 0.5) {
      cutLevel = "red";
      cutLabel = "Rub risk";
    } else if (compensate && ratio < 0.25) {
      cutLevel = "yellow";
      cutLabel = "Light cut";
    } else if (ratio < 0.1) {
      cutLevel = "yellow";
      cutLabel = "Very light";
    }
    setRiskChip(riskChip, cutLevel, cutLabel);

    // Paint outputs
    $("out-mult").textContent = fmt(displayMult, 2) + "×";
    $("out-adj-ipm").textContent = fmt(adjustedIpm, 1);
    $("out-heff").textContent = fmtIpt(displayHeff);
    $("out-sfm").textContent = fmt(sfm, 0);

    $("out-ratio").textContent = fmt(ratio * 100, 1) + "%";
    $("out-factor").textContent = fmt(factor, 3);
    $("out-heff2").textContent = fmtIpt(displayHeff) + " in";
    $("out-mult2").textContent = fmt(displayMult, 2) + "×";
    $("out-adj-ipt").textContent = fmtIpt(adjustedIpt) + " in";
    $("out-adj-ipm2").textContent = fmt(adjustedIpm, 1) + " ipm";
    $("out-raw-ipm").textContent = fmt(rawIpm, 1) + " ipm";
    $("out-sfm2").textContent = fmt(sfm, 0);

    badgeMult.textContent = fmt(displayMult, 2);
    if (Math.abs(displayMult - lastMult) > 0.001) {
      pulseBadge();
      lastMult = displayMult;
    }

    updateDiagram(ratio);

    // Copy line
    const aeLabel =
      engagementMode === "pct"
        ? `ae ${fmt(num(inpPctNum), 0)}%`
        : `ae ${fmt(aeClamped, 3)}"`;
    lastCopyLine = compensate
      ? `Adj: ${fmt(adjustedIpm, 0)} ipm (mult ${fmt(feedMult, 2)}) | ${fmt(rpm, 0)} rpm | Ø${fmt(D, 3)} | ${aeLabel}`
      : `Uncomp: ${fmt(rawIpm, 0)} ipm (thinning OFF · heff ${fmtIpt(heffUncompensated)}) | ${fmt(rpm, 0)} rpm | Ø${fmt(D, 3)} | ${aeLabel}`;

    // Cost panel
    calcCost(ratio, compensate);
  }

  function paintEmpty() {
    [
      "out-mult", "out-adj-ipm", "out-heff", "out-sfm",
      "out-ratio", "out-factor", "out-heff2", "out-mult2",
      "out-adj-ipt", "out-adj-ipm2", "out-raw-ipm", "out-sfm2",
      "out-scrap-cost", "out-remake-cost",
    ].forEach((id) => {
      $(id).textContent = "—";
    });
    badgeMult.textContent = "—";
    lastCopyLine = "";
  }

  function calcCost(ratio, compensate) {
    const blank = num(costBlank);
    const cycle = num(costCycle);
    const burden = num(costBurden);
    const scrapCount = num(costScrap);
    // tool & edges reserved for future soft meter; heuristic uses compensate + ratio

    const scrapEach =
      (Number.isFinite(blank) ? blank : 0) +
      (Number.isFinite(cycle) && Number.isFinite(burden) ? cycle * (burden / 60) : 0);
    const remake =
      scrapEach * (Number.isFinite(scrapCount) && scrapCount > 0 ? scrapCount : 0);

    $("out-scrap-cost").textContent = "$" + fmt(scrapEach, 2);
    $("out-remake-cost").textContent = "$" + fmt(remake, 2);

    // Soft tool-life risk (Stacey heuristic)
    // red: thinning NOT compensated and ae/D < 0.5
    // yellow: compensated but ae/D < 0.25
    // green: otherwise
    let level = "green";
    let label = "OK";
    if (!compensate && ratio < 0.5) {
      level = "red";
      label = "High";
    } else if (compensate && ratio < 0.25) {
      level = "yellow";
      label = "Watch";
    }
    setRiskChip(toolRiskChip, level, label);
  }

  // --- Engagement mode ---
  function setMode(mode) {
    engagementMode = mode;
    const isPct = mode === "pct";
    modePct.classList.toggle("active", isPct);
    modeAe.classList.toggle("active", !isPct);
    modePct.setAttribute("aria-pressed", isPct ? "true" : "false");
    modeAe.setAttribute("aria-pressed", !isPct ? "true" : "false");
    fieldPct.classList.toggle("hidden", !isPct);
    fieldAe.classList.toggle("hidden", isPct);

    // Sync ae ↔ % when switching
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
        inpAe.value = fmt((pct / 100) * D, 4);
      }
    }
    calc();
  }

  modePct.addEventListener("click", () => setMode("pct"));
  modeAe.addEventListener("click", () => setMode("ae"));

  // Sync range ↔ number for %
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

  // All other inputs
  [
    inpD, inpAe, inpIpt, inpZ, inpRpm, inpCompensate,
    costBlank, costCycle, costBurden, costScrap, costTool, costEdges,
  ].forEach((el) => {
    el.addEventListener("input", calc);
    el.addEventListener("change", calc);
  });

  // When D changes in % mode, keep % and recalc ae implicitly
  inpD.addEventListener("input", () => {
    if (engagementMode === "ae") {
      // leave ae as typed
    }
    calc();
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
      // Fallback
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
    setTimeout(() => {
      copyStatus.textContent = "";
    }, 2500);
  });

  // Cost accordion
  costToggle.addEventListener("click", () => {
    const open = costBody.classList.contains("hidden");
    costBody.classList.toggle("hidden", !open);
    costChevron.classList.toggle("open", open);
    costToggle.setAttribute("aria-expanded", open ? "true" : "false");
  });

  // Init
  calc();
})();
