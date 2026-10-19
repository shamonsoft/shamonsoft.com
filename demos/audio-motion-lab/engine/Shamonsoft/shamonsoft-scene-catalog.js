(() => {
  const presets = window.SHAMONSOFT_VIDEO_LAB_PRESETS || [];
  const byName = new Map(presets.map(preset => [preset.Name, preset]));
  const proceduralCanvas = document.getElementById("glcanvas");
  if (!proceduralCanvas || !presets.length) return;

  // Every Hue slider reads left-to-right as orange through the spectrum to red.
  // This avoids the duplicate-red endpoints of a raw 0–360 degree hue wheel.
  const spectrumHue = value => 30 + Math.max(0, Math.min(1, Number(value) / 360)) * 330;

  const definitions = [
    ["BaseHue", "Base hue", 0, 360, 1], ["HueSpread", "Hue spread", 0, 180, 1],
    ["Saturation", "Saturation", 0, 1, .01], ["Contrast", "Contrast", 0, 1.5, .01],
    ["Symmetry", "Symmetry", 1, 16, 1], ["Speed", "Speed", .01, 1.5, .01],
    ["Turbulence", "Turbulence", 0, 1.5, .01], ["Drift", "Drift", 0, 1, .01],
    ["Pulse", "Pulse", 0, 1, .01], ["Zoom", "Zoom", 0, .8, .01],
    ["ScreenFill", "Screen fill", .2, 1.5, .01], ["Trail", "Trails", 0, 1, .01],
    ["Bloom", "Bloom", 0, 1.5, .01], ["Glow", "Glow", 0, 1.5, .01],
    ["Grain", "Grain", 0, .35, .005], ["Vignette", "Vignette", 0, 1, .01],
    ["ParticleCount", "Particle count", 0, 300, 1], ["ParticleSize", "Particle size", .1, 6, .05],
    ["RibbonWidth", "Ribbon width", .05, 2, .01], ["WaveDensity", "Wave density", .1, 2.5, .01],
    ["BackgroundLift", "Background lift", 0, .7, .01], ["ReactiveBoost", "Audio reactivity", 0, 2.5, .01],
    ["OrbCount", "Orb count", 1, 24, 1], ["LayerComplexity", "Layer complexity", .1, 2.5, .01],
    ["Seed", "Seed", 0, 20000, .01],
  ];

  const card = document.createElement("section");
  card.className = "anim-card collapsed";
  card.dataset.effectId = "proceduralScene";
  card.innerHTML = `
    <div class="anim-head">
      <div class="anim-head-main"><div class="anim-title">Procedural</div></div>
      <div class="anim-head-actions">
        <button class="collapse-btn" type="button" aria-label="Expand procedural settings" aria-expanded="false">▸</button>
        <label class="toggle"><input type="checkbox"><span></span></label>
      </div>
    </div>
    <div class="anim-body">
      <select class="anim-select procedural-preset-select" aria-label="Procedural scene">
        ${presets.map(preset => `<option value="${preset.Name}">${preset.Name}</option>`).join("")}
      </select>
      <div class="shamonsoft-procedural-grid">
        ${definitions.map(([key,label,min,max,step]) => `<div class="shamonsoft-procedural-control"><label>${label}</label><input class="${key === "BaseHue" ? "spectrum-slider" : ""}" type="range" data-scene-setting="${key}" min="${min}" max="${max}" step="${step}"></div>`).join("")}
        <div class="shamonsoft-procedural-control"><label for="shamonsoft-procedural-opacity">Opacity</label><input id="shamonsoft-procedural-opacity" type="range" min="0" max="100" step="1" value="25" title="0% clear, 100% fully solid" /></div>
      </div>
    </div>`;
  const leftRail = document.getElementById("left-rail");
  const visualizersCard = leftRail?.querySelector('[data-effect-id="main"]');
  if (visualizersCard) visualizersCard.after(card); else leftRail?.appendChild(card);

  const select = card.querySelector(".procedural-preset-select");
  const enabled = card.querySelector(".toggle input");
  const opacity = card.querySelector("#shamonsoft-procedural-opacity");
  const body = card.querySelector(".anim-body");
  body.hidden = true;
  const controls = new Map([...card.querySelectorAll("[data-scene-setting]")].map(input => [input.dataset.sceneSetting, input]));

  card.querySelector(".collapse-btn").addEventListener("click", event => {
    card.classList.toggle("collapsed");
    const collapsed = card.classList.contains("collapsed");
    body.hidden = collapsed;
    event.currentTarget.textContent = collapsed ? "▸" : "▾";
    event.currentTarget.setAttribute("aria-expanded", String(!collapsed));
  });

  let current = null;
  function loadPreset(preset) {
    if (!preset) return;
    current = structuredClone(preset);
    for (const [key, input] of controls) {
      input.value = String(current[key]);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  function syncEnabled() {
    const active = Boolean(enabled.checked && current);
    proceduralCanvas.hidden = !active;
    proceduralCanvas.dataset.active = String(active);
  }

  select.addEventListener("change", () => {
    loadPreset(byName.get(select.value));
    syncEnabled();
  });
  enabled.addEventListener("change", syncEnabled);

  let fallbackFrequencyData = null;

  function averageBand(data, hzPerBin, minimumHz, maximumHz) {
    const first = Math.max(0, Math.floor(minimumHz / hzPerBin));
    const last = Math.min(data.length - 1, Math.ceil(maximumHz / hzPerBin));
    if (last < first) return 0;
    let sum = 0;
    for (let index = first; index <= last; index++) sum += data[index];
    return sum / Math.max(1, (last - first + 1) * 255);
  }

  function audioBands() {
    try {
      const shared = window.__shamonsoftAudioRouter?.signals?.();
      if (shared) {
        return { bass: shared.bass, mid: shared.mid, treble: shared.high, overall: shared.overall, smoothed: true };
      }
      // Standalone/older hosts retain audio support. The normal app shares its analysis.
      if (typeof analyser !== "undefined" && analyser) {
        if (!fallbackFrequencyData || fallbackFrequencyData.length !== analyser.frequencyBinCount) {
          fallbackFrequencyData = new Uint8Array(analyser.frequencyBinCount);
        }
        const data = fallbackFrequencyData;
        analyser.getByteFrequencyData(data);
        const sampleRate = typeof audioContext !== "undefined" && audioContext?.sampleRate ? audioContext.sampleRate : 48000;
        const hzPerBin = (sampleRate * 0.5) / Math.max(1, data.length);
        const bass = Math.min(1, averageBand(data, hzPerBin, 25, 180) * 1.28);
        const mid = Math.min(1, averageBand(data, hzPerBin, 180, 2400) * 1.12);
        const treble = Math.min(1, averageBand(data, hzPerBin, 2400, 12000) * 1.18);
        return { bass, mid, treble, overall: bass * 0.44 + mid * 0.36 + treble * 0.20, smoothed: false };
      }
    } catch { /* A silent analyser should simply settle the visual response. */ }
    return { bass: 0, mid: 0, treble: 0, overall: 0, smoothed: false };
  }

  let catalogTime = 0;
  let previousCatalogFrame = null;
  function frame(now) {
    const dt = previousCatalogFrame === null ? 1 / 60 : Math.max(0, Math.min(0.05, (now - previousCatalogFrame) / 1000));
    previousCatalogFrame = now;
    if (window.__shamonsoftCompositor?.isFrozen?.()) {
      requestAnimationFrame(frame);
      return;
    }
    if (current && enabled.checked && window.videoLab) {
      catalogTime += dt;
      const settings = { ...current };
      for (const [key, input] of controls) {
        settings[key] = key === "BaseHue" ? spectrumHue(input.value) : Number(input.value);
      }
      const rgbEnabled = card.querySelector(".randomize-btn")?.classList.contains("active-toggle");
      const rgbMode = card.querySelector(".rgb-mode-select")?.value || "flow";
      if (rgbEnabled) {
        settings.BaseHue = (settings.BaseHue + catalogTime * 36) % 360;
        if (rgbMode === "flow") settings.HueSpread = Math.max(settings.HueSpread, 120);
      }
      if (window.__shamonsoftMotionSafety?.enabled?.()) {
        settings.Speed = Math.min(settings.Speed, .56);
        settings.Drift = Math.min(settings.Drift, .34);
        settings.Pulse = Math.min(settings.Pulse, .38);
        settings.Turbulence = Math.min(settings.Turbulence, .72);
        settings.ReactiveBoost = Math.min(settings.ReactiveBoost, 1.05);
        settings.Bloom = Math.min(settings.Bloom, .82);
      }
      settings.GeometryStyle = current.GeometryStyle;
      const bands = audioBands();
      window.videoLab.applyState({ settings, timelineSeconds: catalogTime, energy: bands.overall, bands, audioSmoothed: bands.smoothed, isPlaying: true });
    }
    requestAnimationFrame(frame);
  }

  loadPreset(presets[0]);
  select.value = presets[0].Name;
  syncEnabled();
  window.__shamonsoftSceneCatalog = {
    names: presets.map(preset => preset.Name),
    enabled: () => enabled.checked,
    opacity: () => Math.max(0, Math.min(100, Number(opacity.value) || 0)) / 100,
    current: () => current ? { ...current, ...Object.fromEntries([...controls].map(([key,input]) => [key, Number(input.value)])) } : null,
  };
  requestAnimationFrame(frame);
})();
