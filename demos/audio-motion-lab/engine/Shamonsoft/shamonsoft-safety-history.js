(() => {
  const rail = document.getElementById("left-rail");
  if (!rail || !window.__shamonsoftProject) return;

  const outputEffectIds = new Set([
    "background", "main", "floorGrid", "sonicRunway", "particles", "lightBeams", "shockwave",
    "shamonsoftOverlays", "proceduralScene",
  ]);
  const rgbEffectIds = new Set([
    "background", "main", "floorGrid", "sonicRunway", "particles", "lightBeams", "shockwave",
    "shamonsoftOverlays", "proceduralScene",
  ]);

  const utility = document.createElement("section");
  utility.className = "anim-card shamonsoft-utility-card";
  utility.dataset.projectControl = "false";
  utility.innerHTML = `
    <div class="shamonsoft-utility-controls">
      <button id="shamonsoft-undo" type="button" title="Undo the last visual setting change (Ctrl+Z)"><span class="shamonsoft-history-icon" aria-hidden="true">↶</span><span>Undo</span></button>
      <button id="shamonsoft-redo" type="button" title="Redo the last undone visual setting change (Ctrl+Y)"><span class="shamonsoft-history-icon" aria-hidden="true">↷</span><span>Redo</span></button>
      <button id="shamonsoft-reset-all" type="button" title="Restore every visual effect and control to its factory setting">Reset All</button>
    </div>`;
  rail.insertBefore(utility, rail.firstElementChild);

  function topToggle(card) {
    return card.querySelector(".anim-head .toggle input[type='checkbox']");
  }

  let soloSnapshot = null;
  let soloCard = null;

  function dispatchToggle(input) {
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function clearSolo(restore = true) {
    if (restore && soloSnapshot) {
      for (const [input, checked] of soloSnapshot) {
        if (!input.isConnected) continue;
        input.checked = checked;
        dispatchToggle(input);
      }
    }
    soloSnapshot = null;
    soloCard = null;
    rail.querySelectorAll(".solo-btn").forEach(button => {
      button.classList.remove("active-toggle");
      button.setAttribute("aria-pressed", "false");
    });
  }

  function toggleSolo(card, button) {
    if (soloCard === card) {
      clearSolo(true);
      window.__shamonsoftProject.notify("Solo released");
      return;
    }
    const targetToggle = topToggle(card);
    if (card.dataset.effectId === "background" && !targetToggle?.checked) {
      window.__shamonsoftProject.notify("Turn on Background before using Solo");
      return;
    }
    clearSolo(true);
    const candidates = [...rail.querySelectorAll(":scope > .anim-card[data-effect-id]")]
      .filter(candidate => outputEffectIds.has(candidate.dataset.effectId))
      .map(candidate => topToggle(candidate))
      .filter(Boolean);
    soloSnapshot = new Map(candidates.map(input => [input, input.checked]));
    soloCard = card;
    candidates.forEach(input => {
      input.checked = input === targetToggle;
      dispatchToggle(input);
    });
    button.classList.add("active-toggle");
    button.setAttribute("aria-pressed", "true");
    window.__shamonsoftProject.notify(`Solo: ${card.querySelector(".anim-title")?.textContent?.trim() || "effect"}`);
  }

  function wireRgbButton(button) {
    if (button.dataset.shamonsoftRgbWired === "true") return;
    button.dataset.shamonsoftRgbWired = "true";
    button.addEventListener("click", () => {
      const active = !button.classList.contains("active-toggle");
      button.classList.toggle("active-toggle", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function enhanceCard(card) {
    const effectId = card.dataset.effectId;
    const head = card.querySelector(":scope > .anim-head");
    const actions = head?.querySelector(":scope > .anim-head-actions");
    const title = head?.querySelector(".anim-title");
    const collapse = head?.querySelector(".collapse-btn");
    const toggle = actions?.querySelector(".toggle") || head?.querySelector(":scope > .toggle");
    if (!head || !actions || !title || !collapse || !toggle) return;

    let main = head.querySelector(":scope > .anim-head-main");
    if (!main) {
      main = document.createElement("div");
      main.className = "anim-head-main";
      head.insertBefore(main, actions);
    }
    main.append(title);
    head.insertBefore(collapse, main);
    head.classList.remove("shamonsoft-two-row-head");

    const stateLabel = actions.querySelector(".effect-toggle-label") || toggle.nextElementSibling?.classList.contains("effect-toggle-label") && toggle.nextElementSibling;
    let solo = actions.querySelector(".solo-btn");
    if (outputEffectIds.has(effectId)) {
      if (!solo) {
        solo = document.createElement("button");
        solo.className = "solo-btn";
        solo.type = "button";
        solo.textContent = "Solo";
        solo.title = "Temporarily display only this effect; click again to restore the other enabled effects.";
        solo.setAttribute("aria-pressed", "false");
        solo.addEventListener("click", () => toggleSolo(card, solo));
      }
    }

    let rgb = actions.querySelector(".randomize-btn");
    let mode = actions.querySelector(".rgb-mode-select");
    if (rgbEffectIds.has(effectId)) {
      if (!rgb) {
        rgb = document.createElement("button");
        rgb.className = "randomize-btn";
        rgb.type = "button";
        rgb.textContent = "RGB";
        rgb.setAttribute("aria-pressed", "false");
        wireRgbButton(rgb);
      }
      rgb.title = "Enable animated RGB color for this effect.";
      if (rgb.dataset.shamonsoftHistoryWired !== "true") {
        rgb.dataset.shamonsoftHistoryWired = "true";
        rgb.addEventListener("pointerdown", rememberBeforeChange, true);
      }
      if (!mode) {
        mode = document.createElement("select");
        mode.className = "rgb-mode-select";
        mode.setAttribute("aria-label", "RGB animation style");
        mode.title = "Cycle changes the whole effect together. Flow spreads moving colors across the effect.";
        mode.innerHTML = '<option value="cycle">Cycle</option><option value="flow" selected>Flow</option>';
      }
    }

    actions.querySelectorAll(":scope > .effect-action-row").forEach(row => row.remove());
    if (solo) actions.append(solo);
    if (rgb) actions.append(rgb);
    if (mode) actions.append(mode);
    actions.append(toggle);
    if (stateLabel) actions.append(stateLabel);
  }

  function reorderCards() {
    const order = [
      "main", "particles", "floorGrid", "sonicRunway", "proceduralScene", "lightBeams", "shockwave",
      "background", "shamonsoftOverlays", "shamonsoftPost", "audioRouter",
    ];
    order.forEach(id => {
      const card = rail.querySelector(`:scope > .anim-card[data-effect-id="${id}"]`);
      if (card) rail.appendChild(card);
    });
    rail.insertBefore(utility, rail.firstElementChild);
  }

  const undoStack = [];
  const redoStack = [];
  const captureState = () => ({
    project: window.__shamonsoftProject.snapshot(),
    rgb: Object.fromEntries([...rail.querySelectorAll(".anim-card[data-effect-id]")].map(card => [card.dataset.effectId, card.querySelector(".randomize-btn")?.classList.contains("active-toggle") || false])),
  });
  const signature = state => JSON.stringify({ controls: state.project.controls, layerOrder: state.project.layerOrder, rgb: state.rgb });

  function restoreState(state) {
    clearSolo(true);
    window.__shamonsoftProject.restore(state.project, false);
    for (const card of rail.querySelectorAll(".anim-card[data-effect-id]")) {
      const button = card.querySelector(".randomize-btn");
      if (!button || !(card.dataset.effectId in state.rgb)) continue;
      const active = Boolean(state.rgb[card.dataset.effectId]);
      button.classList.toggle("active-toggle", active);
      button.setAttribute("aria-pressed", String(active));
      if (card.dataset.effectId === "shamonsoftOverlays" && window.__shamonsoftOverlay?.state) window.__shamonsoftOverlay.state.rgb = active;
    }
  }

  function rememberBeforeChange() {
    const state = captureState();
    if (!undoStack.length || signature(undoStack.at(-1)) !== signature(state)) {
      undoStack.push(state);
      if (undoStack.length > 30) undoStack.shift();
    }
    redoStack.length = 0;
  }

  function undo() {
    const previous = undoStack.pop();
    if (!previous) return window.__shamonsoftProject.notify("Nothing to undo");
    redoStack.push(captureState());
    restoreState(previous);
    window.__shamonsoftProject.notify("Visual change undone");
  }

  function redo() {
    const next = redoStack.pop();
    if (!next) return window.__shamonsoftProject.notify("Nothing to redo");
    undoStack.push(captureState());
    restoreState(next);
    window.__shamonsoftProject.notify("Visual change restored");
  }

  utility.querySelector("#shamonsoft-undo").addEventListener("click", undo);
  utility.querySelector("#shamonsoft-redo").addEventListener("click", redo);
  document.addEventListener("pointerdown", event => {
    const control = event.target.closest(".anim-card:not(.shamonsoft-utility-card) input:not([type='file']), .anim-card:not(.shamonsoft-utility-card) select, .anim-card:not(.shamonsoft-utility-card) textarea");
    if (control) rememberBeforeChange();
  }, true);
  window.addEventListener("keydown", event => {
    if (event.ctrlKey && !event.shiftKey && event.key.toLowerCase() === "z") { event.preventDefault(); undo(); return; }
    if (event.ctrlKey && (event.key.toLowerCase() === "y" || (event.shiftKey && event.key.toLowerCase() === "z"))) { event.preventDefault(); redo(); return; }
    if (event.target.matches?.(".anim-card input, .anim-card select, .anim-card textarea") && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"].includes(event.key)) rememberBeforeChange();
  });

  function finishLayout() {
    rail.querySelectorAll(":scope > .anim-card[data-effect-id]").forEach(enhanceCard);
    reorderCards();
  }
  finishLayout();

  function visualControls() {
    return [...rail.querySelectorAll(":scope > .anim-card[data-effect-id] input:not([type='file']), :scope > .anim-card[data-effect-id] select, :scope > .anim-card[data-effect-id] textarea")];
  }

  function factoryControlKey(element) {
    if (element.id) return `id:${element.id}`;
    const card = element.closest(".anim-card[data-effect-id]");
    const effectId = card?.dataset.effectId || "effect";
    if (element === topToggle(card)) return `effect:${effectId}:enabled`;
    if (element.matches(".rgb-mode-select")) return `effect:${effectId}:rgb-mode`;
    if (element.matches(".main-effect-select")) return `effect:${effectId}:visualizer`;
    if (element.matches(".main-material-select")) return `effect:${effectId}:material`;
    const label = element.closest(".slider-cell, .shamonsoft-layer-row, .shamonsoft-procedural-control")
      ?.querySelector(".slider-label-row span, label")?.textContent?.trim().toLowerCase().replace(/\s+/g, "-");
    if (label) return `effect:${effectId}:control:${label}`;
    const dataEntry = Object.entries(element.dataset).find(([key]) => !key.startsWith("shamonsoft"));
    if (dataEntry) return `effect:${effectId}:data:${dataEntry[0]}:${dataEntry[1]}`;
    const cardControls = visualControls().filter(control => control.closest(".anim-card[data-effect-id]") === card);
    return `effect:${effectId}:control-${cardControls.indexOf(element)}`;
  }

  const factoryDefaults = visualControls().map(element => ({
    key: factoryControlKey(element),
    value: element.value,
    checked: element.type === "checkbox" || element.type === "radio" ? element.checked : undefined,
  }));
  const factoryRgb = Object.fromEntries([...rail.querySelectorAll(":scope > .anim-card[data-effect-id]")].map(card => [
    card.dataset.effectId,
    card.querySelector(".randomize-btn")?.classList.contains("active-toggle") || false,
  ]));

  function resetAllVisuals() {
    const confirmed = window.confirm("Reset every visual effect and control to its factory settings?\n\nMusic, playlist tracks, saved presets, and export settings will not be removed.");
    if (!confirmed) return;

    rememberBeforeChange();
    clearSolo(false);
    window.__shamonsoftLayerOrder?.reset?.();
    const orderedDefaults = [...factoryDefaults].sort((left, right) => Number(right.key.endsWith(":visualizer")) - Number(left.key.endsWith(":visualizer")));
    for (const state of orderedDefaults) {
      const element = visualControls().find(control => factoryControlKey(control) === state.key);
      if (!element) continue;
      if (typeof state.checked === "boolean") element.checked = state.checked;
      else element.value = state.value;
      dispatchToggle(element);
    }

    rail.querySelectorAll(":scope > .anim-card[data-effect-id]").forEach(card => {
      const rgb = card.querySelector(".randomize-btn");
      if (rgb) {
        const active = Boolean(factoryRgb[card.dataset.effectId]);
        rgb.classList.toggle("active-toggle", active);
        rgb.setAttribute("aria-pressed", String(active));
        if (card.dataset.effectId === "shamonsoftOverlays" && window.__shamonsoftOverlay?.state) window.__shamonsoftOverlay.state.rgb = active;
      }
      const shouldCollapse = true;
      card.classList.toggle("collapsed", shouldCollapse);
      const body = card.querySelector(":scope > .anim-body");
      if (body) body.hidden = false;
      const collapse = card.querySelector(":scope > .anim-head .collapse-btn");
      if (collapse) {
        collapse.textContent = shouldCollapse ? "▶" : "▼";
        collapse.setAttribute("aria-expanded", String(!shouldCollapse));
        collapse.setAttribute("aria-label", `${shouldCollapse ? "Expand" : "Collapse"} effect options`);
      }
    });
    redoStack.length = 0;
    window.__shamonsoftProject.notify("Visual settings reset to factory defaults");
  }

  utility.querySelector("#shamonsoft-reset-all").addEventListener("click", resetAllVisuals);
  requestAnimationFrame(finishLayout);
  window.__shamonsoftHistory = { undo, redo, resetAllVisuals, rememberBeforeChange, clear:()=>{undoStack.length=0;redoStack.length=0;clearSolo(false)} };
})();
