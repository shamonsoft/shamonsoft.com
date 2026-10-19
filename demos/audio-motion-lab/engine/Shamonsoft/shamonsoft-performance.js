(() => {
  const preview = document.querySelector(".preview-art");
  if (!preview) return;
  const fullscreenTarget = document.getElementById("preview-viewport") || preview;
  const previewPanel = preview.closest(".preview-panel");
  const badge = document.createElement("div"); badge.className = "shamonsoft-performance-badge";
  badge.innerHTML = `<span id="shamonsoft-fps">-- FPS</span>`;
  const fps = badge.querySelector("#shamonsoft-fps");
  const quality = document.createElement("select");
  quality.id = "shamonsoft-preview-quality";
  quality.setAttribute("aria-label", "Preview quality");
  quality.title = "Adjust preview rendering quality without changing export quality.";
  quality.innerHTML = `<option value="0.5">Draft 50%</option><option value="0.75">Balanced 75%</option><option value="1" selected>Full 100%</option><option value="1.25">Ultra 125%</option>`;
  const state = {
    scale: 1,
    adaptiveScale: 1,
    renderScale: 1,
    loadFactor: 1,
    fps: 0,
    frameLimit: 60,
  };
  quality.addEventListener("change", () => {
    state.scale = Number(quality.value);
    state.renderScale = state.scale;
  });

  const guides = document.createElement("div");
  guides.className = "shamonsoft-safe-guides";
  guides.hidden = true;
  guides.innerHTML = '<i class="action-safe"></i><i class="title-safe"></i><i class="center-horizontal"></i><i class="center-vertical"></i>';
  preview.appendChild(guides);

  const fullscreenExit = document.createElement("button");
  fullscreenExit.type = "button";
  fullscreenExit.className = "shamonsoft-fullscreen-exit";
  fullscreenExit.textContent = "Exit Fullscreen";
  fullscreenExit.title = "Return to the full application window.";
  fullscreenExit.addEventListener("click", () => document.exitFullscreen().catch(() => {}));
  preview.appendChild(fullscreenExit);

  const tools = document.createElement("div");
  tools.className = "shamonsoft-preview-tools";
  tools.setAttribute("aria-label", "Preview tools");
  tools.innerHTML = `
    <button type="button" data-preview-tool="freeze" aria-pressed="false" title="Freeze or resume the preview without affecting settings.">Freeze</button>
    <button type="button" data-preview-tool="snapshot" title="Save the current composed frame as a PNG image.">Save Snapshot</button>
    <button type="button" data-preview-tool="fullscreen" aria-pressed="false" title="Show only the preview at full-screen size.">Fullscreen</button>
    <button type="button" data-preview-tool="guides" aria-pressed="false" title="Show non-exported title-safe, action-safe, and center guides.">Safe Guides</button>`;
  tools.appendChild(quality);
  tools.appendChild(badge);
  previewPanel?.appendChild(tools);

  const freezeButton = tools.querySelector('[data-preview-tool="freeze"]');
  const fullscreenButton = tools.querySelector('[data-preview-tool="fullscreen"]');
  const guidesButton = tools.querySelector('[data-preview-tool="guides"]');
  freezeButton.addEventListener("click", () => {
    const frozen = window.__shamonsoftCompositor?.toggleFrozen?.() === true;
    freezeButton.textContent = frozen ? "Resume" : "Freeze";
    freezeButton.setAttribute("aria-pressed", String(frozen));
  });
  tools.querySelector('[data-preview-tool="snapshot"]').addEventListener("click", async () => {
    try {
      await window.__shamonsoftCompositor?.snapshot?.("image/png");
      window.__shamonsoftProject?.notify?.("Snapshot saved");
    } catch {
      window.__shamonsoftProject?.notify?.("Snapshot could not be saved");
    }
  });
  fullscreenButton.addEventListener("click", async () => {
    try {
      if (document.fullscreenElement === fullscreenTarget) await document.exitFullscreen();
      else await fullscreenTarget.requestFullscreen();
    } catch {
      window.__shamonsoftProject?.notify?.("Fullscreen is unavailable in this window");
    }
  });
  document.addEventListener("fullscreenchange", () => {
    const active = document.fullscreenElement === fullscreenTarget;
    fullscreenButton.textContent = active ? "Exit Fullscreen" : "Fullscreen";
    fullscreenButton.setAttribute("aria-pressed", String(active));
    requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
  });
  guidesButton.addEventListener("click", () => {
    guides.hidden = !guides.hidden;
    const active = !guides.hidden;
    guidesButton.setAttribute("aria-pressed", String(active));
  });

  let frames = 0, started = performance.now(), slowSamples = 0, fastSamples = 0;
  function tick(now) {
    frames++;
    if (now - started >= 1000) {
      state.fps = Math.round(frames * 1000 / (now - started)); frames = 0; started = now;
      if (state.fps < 52) {
        slowSamples += 1;
        fastSamples = 0;
      } else if (state.fps >= 57) {
        fastSamples += 1;
        slowSamples = 0;
      } else {
        slowSamples = Math.max(0, slowSamples - 1);
        fastSamples = 0;
      }
      if (slowSamples >= 1) {
        state.loadFactor = Math.max(0.45, state.loadFactor - 0.12);
        slowSamples = 0;
      } else if (fastSamples >= 3) {
        state.loadFactor = Math.min(1, state.loadFactor + 0.06);
        fastSamples = 0;
      }
      // Preserve the selected preview resolution. Adapt invisible workload
      // (particle/trail density) instead of blurring every animation.
      state.adaptiveScale = 1;
      state.renderScale = state.scale;
      fps.textContent = `${state.fps} FPS`;
      fps.style.color = state.fps >= 50 ? "#75f0b2" : state.fps >= 28 ? "#ffd166" : "#ff7085";
    }
    requestAnimationFrame(tick);
  }
  window.__shamonsoftPerformance = state; requestAnimationFrame(tick);
})();
