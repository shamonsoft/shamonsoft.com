(() => {
  const sources = ["Sub Bass", "Bass", "Low Mid", "Mid", "High Mid", "Treble", "Custom A", "Custom B", "Overall", "Peak", "Transient", "Beat", "Beat / 2", "Beat / 4"];
  const targets = ["None", "Main Scale", "Main Motion", "Main Rotate", "Main Glow", "Post Hue", "Post Feedback"];
  const envelopes = Object.fromEntries(sources.map(name => [name, 0]));
  const modulatedValues = new Map();
  const routeState = [
    { source: "Bass", target: "Main Scale", amount: 24 },
    { source: "Mid", target: "Main Rotate", amount: 18 },
    { source: "Treble", target: "Main Glow", amount: 28 },
    { source: "Beat", target: "Main Motion", amount: 18 },
  ];
  let beatEnvelope = 0;
  let lastTime = performance.now();
  let lastBeatAt = 0;
  let beatCounter = 0;
  let bpm = 0;
  const beatIntervals = [];
  const raw = Object.fromEntries(sources.map(name => [name, 0]));
  const fluxBands = new Float32Array(48);
  let fluxMean = 0;
  let fluxPrimed = false;
  let lastAnalysisRevision = -1;
  let lastSignalAt = 0;
  let lastMetricsAt = 0;
  const visualSignals = { bass: 0, mid: 0, high: 0, overall: 0, peak: 0, transient: 0, beat: 0, beatCounter: 0, bpm: 0 };

  function options(values, selected) {
    return values.map(value => `<option${value === selected ? " selected" : ""}>${value}</option>`).join("");
  }

  function boundedNumber(value, minimum, maximum, fallback = 0) {
    const number = value === "" || value == null ? fallback : Number(value);
    return Math.max(minimum, Math.min(maximum, Number.isFinite(number) ? number : fallback));
  }

  function install() {
    const card = document.createElement("section");
    card.className = "anim-card collapsed";
    card.dataset.effectId = "audioRouter";
    card.innerHTML = `
      <div class="anim-head"><div class="anim-title">Music Response</div><div class="anim-head-actions"><button class="collapse-btn" type="button" aria-expanded="false">▸</button><label class="toggle" title="Enable these custom music-to-visual links. Built-in music response remains active when this is off."><input type="checkbox" aria-label="Enable custom music response"><span></span></label></div></div>
      <div class="anim-body shamonsoft-routing-grid">
        <div class="shamonsoft-layer-row" title="Strength of the custom visual response; does not change playback volume."><label>Response strength</label><input data-router="gain" type="range" min="0" max="300" value="110"></div>
        <div class="shamonsoft-layer-row" title="Higher values react faster to rising music energy."><label>React speed</label><input data-router="attack" type="range" min="1" max="100" value="34"></div>
        <div class="shamonsoft-layer-row" title="Higher values return to the base setting faster."><label>Settle speed</label><input data-router="release" type="range" min="1" max="100" value="18"></div>
        <div class="shamonsoft-layer-row"><label>Beat threshold</label><input data-router="threshold" type="range" min="1" max="100" value="22"></div>
        <div class="shamonsoft-route shamonsoft-custom-band"><label>Custom A Hz</label><input data-router="customAMin" type="number" min="20" max="20000" value="90"><input data-router="customAMax" type="number" min="20" max="20000" value="900"></div>
        <div class="shamonsoft-route shamonsoft-custom-band"><label>Custom B Hz</label><input data-router="customBMin" type="number" min="20" max="20000" value="2400"><input data-router="customBMax" type="number" min="20" max="20000" value="12000"></div>
        <div class="shamonsoft-audio-metrics"><span data-audio-metric="bpm">BPM —</span><span data-audio-metric="peak">Peak 0%</span><span data-audio-metric="transient">Transient 0%</span></div>
        <div class="shamonsoft-meter-row">${[0,1,2,3].map(i => `<div class="shamonsoft-meter"><i data-meter="${i}"></i></div>`).join("")}</div>
        ${routeState.map((route, index) => `<div class="shamonsoft-route" data-route="${index}"><select data-kind="source" aria-label="Music source ${index + 1}">${options(sources, route.source)}</select><select data-kind="target" aria-label="Visual destination ${index + 1}">${options(targets, route.target)}</select><input data-kind="amount" type="number" min="-100" max="100" value="${route.amount}" aria-label="Response amount ${index + 1}" title="Percent of the destination range. Positive adds; negative subtracts."></div>`).join("")}
        <div class="shamonsoft-audio-metrics" data-router-status title="Enable the destination effect to use its links.">Custom links off</div>
      </div>`;
    document.getElementById("left-rail")?.appendChild(card);
    const body = card.querySelector(".anim-body");
    body.hidden = true;
    const collapse = card.querySelector(".collapse-btn");
    collapse.addEventListener("click", () => {
      card.classList.toggle("collapsed");
      const hidden = card.classList.contains("collapsed");
      body.hidden = hidden; collapse.textContent = hidden ? "▸" : "▾"; collapse.setAttribute("aria-expanded", String(!hidden));
    });
    const rows = [...card.querySelectorAll("[data-route]")];
    const readRoutes = () => rows.forEach(row => {
      const index = Number(row.dataset.route);
      const source = row.querySelector("[data-kind='source']").value;
      const target = row.querySelector("[data-kind='target']").value;
      routeState[index].source = sources.includes(source) ? source : "Overall";
      routeState[index].target = targets.includes(target) ? target : "None";
      routeState[index].amount = boundedNumber(row.querySelector("[data-kind='amount']").value, -100, 100);
    });
    card.querySelectorAll("input[type='number']").forEach(control => {
      control.addEventListener("change", () => {
        control.value = String(boundedNumber(control.value, Number(control.min), Number(control.max), Number(control.defaultValue)));
        readRoutes();
      });
    });
    const read = (key, minimum, maximum, fallback) => boundedNumber(card.querySelector(`[data-router='${key}']`).value, minimum, maximum, fallback);
    return {
      readRoutes,
      enabled: () => card.querySelector(".toggle input").checked,
      gain: () => read("gain", 0, 300, 110) / 100,
      attack: () => read("attack", 1, 100, 34) / 100,
      release: () => read("release", 1, 100, 18) / 100,
      threshold: () => read("threshold", 1, 100, 22) / 100,
      customAMin: () => read("customAMin", 20, 20000, 90),
      customAMax: () => read("customAMax", 20, 20000, 900),
      customBMin: () => read("customBMin", 20, 20000, 2400),
      customBMax: () => read("customBMax", 20, 20000, 12000),
      bpm: card.querySelector("[data-audio-metric='bpm']"),
      peak: card.querySelector("[data-audio-metric='peak']"),
      transient: card.querySelector("[data-audio-metric='transient']"),
      meters: [...card.querySelectorAll("[data-meter]")],
      status: card.querySelector("[data-router-status]"),
    };
  }

  const ui = install();

  function findSlider(scope, label) {
    const normalized = label.toLowerCase().replace(/\s+/g, "");
    const cells = [...document.querySelectorAll(scope)];
    return cells.find(cell => {
      const text = (cell.querySelector(".slider-label-row span, .global-setting-label")?.textContent || "").toLowerCase().replace(/\s+/g, "");
      return text === normalized;
    })?.querySelector("input[type='range']") || null;
  }

  function resolveTarget(name) {
    if (name.startsWith("Main ")) return findSlider(".anim-card[data-effect-id='main'] .slider-cell", name.slice(5));
    if (name === "Post Hue") return document.querySelector("[data-post='hue']");
    if (name === "Post Feedback") return document.querySelector("[data-post='feedback']");
    return null;
  }

  function bandAverage(values, sampleRate, minHz, maxHz) {
    return boundedNumber(window.__shamonsoftAudioAnalysis?.bandMean(values, sampleRate, minHz, maxHz), 0, 1);
  }

  function resetBeatTracking() {
    fluxBands.fill(0);
    fluxPrimed = false;
    fluxMean = 0;
    beatEnvelope = 0;
    lastBeatAt = 0;
    beatCounter = 0;
    bpm = 0;
    beatIntervals.length = 0;
  }

  function rawBands(now, dt) {
    for (const source of sources) raw[source] = 0;
    try {
      const frame = window.__shamonsoftAudioAnalysis?.read();
      if (!frame || !frame.active) {
        if (fluxPrimed || lastBeatAt || bpm) resetBeatTracking();
        return raw;
      }
      if (frame.revision !== lastAnalysisRevision) {
        resetBeatTracking();
        lastAnalysisRevision = frame.revision;
      }
      const values = frame.frequencies;
      const sampleRate = frame.sampleRate;
      const result = {
        "Sub Bass": bandAverage(values, sampleRate, 20, 60),
        "Bass": bandAverage(values, sampleRate, 60, 250),
        "Low Mid": bandAverage(values, sampleRate, 250, 500),
        "Mid": bandAverage(values, sampleRate, 500, 2000),
        "High Mid": bandAverage(values, sampleRate, 2000, 6000),
        "Treble": bandAverage(values, sampleRate, 6000, 18000),
        "Custom A": bandAverage(values, sampleRate, Math.min(ui.customAMin(), ui.customAMax()), Math.max(ui.customAMin(), ui.customAMax())),
        "Custom B": bandAverage(values, sampleRate, Math.min(ui.customBMin(), ui.customBMax()), Math.max(ui.customBMin(), ui.customBMax())),
      };
      result.Overall = ["Sub Bass", "Bass", "Low Mid", "Mid", "High Mid", "Treble"].reduce((sum, key) => sum + result[key], 0) / 6;
      result.Peak = frame.peak;
      // Positive spectral flux catches a new kick/snare even when another
      // instrument is sustaining. Whole-mix loudness alone is not a beat.
      let flux = 0;
      let weightTotal = 0;
      const maximumHz = Math.min(14000, sampleRate * .48);
      for (let index = 0; index < fluxBands.length; index++) {
        const minimum = 30 * (maximumHz / 30) ** (index / fluxBands.length);
        const maximum = 30 * (maximumHz / 30) ** ((index + 1) / fluxBands.length);
        const energy = bandAverage(values, sampleRate, minimum, maximum);
        const weight = index < fluxBands.length * .45 ? 1 : .7;
        flux += Math.max(0, energy - fluxBands[index]) * weight;
        weightTotal += weight;
        fluxBands[index] = energy;
      }
      flux = flux / Math.max(1, weightTotal) * Math.min(3, (1 / 60) / dt);
      const threshold = ui.threshold();
      const onsetThreshold = fluxMean * (1.6 + threshold) + .0025 + threshold * .016;
      const sounding = frame.rms > .0015 && result.Overall > .018;
      if (sounding) lastSignalAt = now;
      result.Transient = fluxPrimed && sounding ? Math.min(1, Math.max(0, flux - fluxMean * .6) * 16) : 0;
      if (fluxPrimed && sounding && flux > onsetThreshold && now - lastBeatAt > 220) {
        if (lastBeatAt > 0) {
          const interval = now - lastBeatAt;
          if (interval >= 250 && interval <= 1500) {
            beatIntervals.push(interval);
            if (beatIntervals.length > 12) beatIntervals.shift();
            if (beatIntervals.length >= 3) {
              const ordered = [...beatIntervals].sort((a, b) => a - b);
              const median = ordered[Math.floor(ordered.length / 2)];
              const consistent = ordered.filter(value => Math.abs(value - median) < median * .2);
              if (consistent.length >= 3) bpm = Math.round(60000 / (consistent.reduce((sum, value) => sum + value, 0) / consistent.length));
            }
          }
        }
        lastBeatAt = now;
        beatCounter += 1;
        beatEnvelope = Math.min(1, .58 + result.Transient * .6);
      }
      fluxMean += (flux - fluxMean) * (1 - Math.exp(-dt / .65));
      fluxPrimed = true;
      if (now - lastSignalAt > 1800 || (lastBeatAt > 0 && now - lastBeatAt > 4000)) {
        bpm = 0;
        beatIntervals.length = 0;
        lastBeatAt = 0;
      }
      result.Beat = beatEnvelope;
      result["Beat / 2"] = beatCounter % 2 === 0 ? beatEnvelope : 0;
      result["Beat / 4"] = beatCounter % 4 === 0 ? beatEnvelope : 0;
      return Object.assign(raw, result);
    } catch {
      resetBeatTracking();
      return raw;
    }
  }

  function tick(now) {
    const dt = Math.min(.1, Math.max(.001, (now - lastTime) / 1000));
    lastTime = now;
    ui.readRoutes();
    const raw = rawBands(now, dt);
    const attack = .5 + ui.attack() * 24;
    const release = .4 + ui.release() * 10;
    const gain = ui.gain();
    for (const source of sources) {
      const target = boundedNumber(raw[source], 0, 1) * Math.min(3, gain);
      const limitedTarget = Math.min(1, target);
      const speed = limitedTarget > envelopes[source] ? attack : release;
      envelopes[source] += (limitedTarget - envelopes[source]) * (1 - Math.exp(-dt * speed));
    }
    const blendSignal = (key, target) => {
      const timeConstant = target > visualSignals[key] ? .038 : .19;
      visualSignals[key] += (target - visualSignals[key]) * (1 - Math.exp(-dt / timeConstant));
    };
    blendSignal("bass", Math.min(1, raw["Sub Bass"] * .38 + raw.Bass * .78));
    blendSignal("mid", Math.min(1, raw["Low Mid"] * .2 + raw.Mid * .65 + raw["High Mid"] * .25));
    blendSignal("high", Math.min(1, raw["High Mid"] * .28 + raw.Treble * .9));
    blendSignal("overall", raw.Overall);
    visualSignals.peak = raw.Peak;
    visualSignals.transient = raw.Transient;
    visualSignals.beat = raw.Beat;
    visualSignals.beatCounter = beatCounter;
    visualSignals.bpm = bpm;
    beatEnvelope *= Math.exp(-dt * (3.4 + release));
    if (beatEnvelope < .001) beatEnvelope = 0;
    const refreshMetrics = now - lastMetricsAt >= 50;
    if (refreshMetrics) {
      lastMetricsAt = now;
      ui.bpm.textContent = bpm ? `BPM ${bpm}` : "BPM —";
      ui.peak.textContent = `Peak ${Math.round((raw.Peak || 0) * 100)}%`;
      ui.transient.textContent = `Transient ${Math.round((raw.Transient || 0) * 100)}%`;
      ui.meters.forEach((meter, index) => meter.style.width = `${Math.round((envelopes[routeState[index].source] || 0) * 100)}%`);
    }
    modulatedValues.clear();
    let activeLinks = 0, waitingLinks = 0;
    if (ui.enabled()) {
      const targetMixes = new Map();
      for (const route of routeState) {
        if (route.target === "None" || route.amount === 0) continue;
        const control = resolveTarget(route.target);
        const effectEnabled = control?.closest(".anim-card")?.querySelector(".anim-head .toggle input")?.checked;
        if (!control || !effectEnabled) { waitingLinks++; continue; }
        const min = Number(control.min || 0), max = Number(control.max || 100);
        if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) { waitingLinks++; continue; }
        const base = boundedNumber(control.value, min, max, min);
        const span = max - min;
        // An explicitly enabled link may animate a zero baseline (e.g. Rotate
        // and Hue). The base slider itself is never changed by routing.
        activeLinks++;
        if (!targetMixes.has(route.target)) targetMixes.set(route.target, { base, min, max, offset: 0 });
        targetMixes.get(route.target).offset += boundedNumber(envelopes[route.source], 0, 1) * (boundedNumber(route.amount, -100, 100) / 100) * span;
      }
      for (const [target, mix] of targetMixes) modulatedValues.set(target, Math.max(mix.min, Math.min(mix.max, mix.base + mix.offset)));
    }
    if (refreshMetrics) ui.status.textContent = !ui.enabled() ? "Custom links off" : `${activeLinks} active link${activeLinks === 1 ? "" : "s"}${waitingLinks ? ` · ${waitingLinks} waiting for destination` : ""}`;
    requestAnimationFrame(tick);
  }

  window.__shamonsoftAudioRouter = {
    sources: [...sources],
    targets: [...targets],
    routes: routeState,
    value: (target, fallback = 0) => modulatedValues.has(target) ? modulatedValues.get(target) : fallback,
    signals: () => visualSignals,
    metrics: () => ({ bpm, beatCounter, envelopes: { ...envelopes }, modulatedValues: Object.fromEntries(modulatedValues) }),
  };
  requestAnimationFrame(tick);
})();
