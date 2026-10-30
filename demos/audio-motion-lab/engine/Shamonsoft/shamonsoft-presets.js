(() => {
  const STORAGE_KEY = "shamonsoft-val-user-presets-v1";
  const grid = document.getElementById("presets-grid");
  const saveButton = document.getElementById("save-preset-button");
  const exportButton = document.getElementById("export-presets-button");
  const importButton = document.getElementById("import-presets-button");
  const importInput = document.getElementById("import-presets-input");
  if (!grid || !saveButton || !window.__shamonsoftProject) return;

  const VISUAL_EFFECTS = new Set([
    "background", "main", "floorGrid", "sonicRunway", "particles", "lightBeams", "shockwave",
    "proceduralScene", "shamonsoftOverlays", "shamonsoftPost",
    "audioRouter",
  ]);
  const VISUAL_CONTROL_IDS = new Set([
    "background-enabled", "background-brightness-slider", "background-hue-slider", "bg-color", "bg-black", "bg-white", "custom-bg-enabled", "custom-bg-fit",
  ]);

  let selectedId = "";
  let presets = [];
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    presets = Array.isArray(stored) ? stored.filter(item => item && item.id && item.project) : [];
  } catch {
    presets = [];
  }

  function notify(message) {
    window.__shamonsoftProject.notify?.(message);
  }

  function makeId() {
    return globalThis.crypto?.randomUUID?.() || `preset-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function uniqueName(requested, exceptId = "", collection = presets) {
    const base = requested.trim().replace(/\s+/g, " ").slice(0, 64) || "Untitled Preset";
    let result = base;
    let suffix = 2;
    while (collection.some(preset => preset.id !== exceptId && String(preset.name || "").toLowerCase() === result.toLowerCase())) {
      const ending = ` ${suffix++}`;
      result = `${base.slice(0, 64 - ending.length)}${ending}`;
    }
    return result;
  }

  function persist(next) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      presets = next;
      return true;
    } catch {
      notify("Preset could not be saved. Local storage may be full.");
      return false;
    }
  }

  function isVisualControl(key) {
    if (key.startsWith("global:")) return true;
    if (key.startsWith("id:")) return VISUAL_CONTROL_IDS.has(key.slice(3));
    if (!key.startsWith("effect:")) return false;
    return VISUAL_EFFECTS.has(key.split(":")[1]);
  }

  function sceneOnly(project) {
    const scene = structuredClone(project);
    scene.controls = Object.fromEntries(Object.entries(scene.controls || {}).filter(([key]) => isVisualControl(key)));
    return scene;
  }

  function captureRgb() {
    const rgb = {};
    document.querySelectorAll(".anim-card[data-effect-id]").forEach(card => {
      const button = card.querySelector(".randomize-btn");
      if (button) rgb[card.dataset.effectId] = button.classList.contains("active-toggle");
    });
    return rgb;
  }

  function applyRgb(rgb) {
    if (!rgb || typeof rgb !== "object") return;
    document.querySelectorAll(".anim-card[data-effect-id]").forEach(card => {
      const button = card.querySelector(".randomize-btn");
      if (!button || !(card.dataset.effectId in rgb)) return;
      const active = Boolean(rgb[card.dataset.effectId]);
      button.classList.toggle("active-toggle", active);
      button.setAttribute("aria-pressed", String(active));
      if (card.dataset.effectId === "shamonsoftOverlays" && window.__shamonsoftOverlay?.state) {
        window.__shamonsoftOverlay.state.rgb = active;
      }
    });
  }

  function captureMeta() {
    const hue = Number(document.getElementById("background-hue-slider")?.value || 220);
    const visualizer = document.querySelector('[data-effect-id="main"] .main-effect-select')?.value || "Visualizer";
    const material = document.querySelector('[data-effect-id="main"] .main-material-select')?.value || "";
    return { hue: Number.isFinite(hue) ? hue : 220, visualizer, material };
  }

  function createDialog({ title, message = "", initial = "", confirmText, needsName = false, danger = false }) {
    return new Promise(resolve => {
      const backdrop = document.createElement("div");
      backdrop.className = "preset-dialog-backdrop";
      const dialog = document.createElement("div");
      dialog.className = "preset-dialog";
      dialog.setAttribute("role", "dialog");
      dialog.setAttribute("aria-modal", "true");

      const heading = document.createElement("div");
      heading.className = "preset-dialog-title";
      heading.textContent = title;
      dialog.appendChild(heading);

      if (message) {
        const copy = document.createElement("div");
        copy.className = "preset-dialog-copy";
        copy.textContent = message;
        dialog.appendChild(copy);
      }

      let input = null;
      let error = null;
      if (needsName) {
        input = document.createElement("input");
        input.className = "preset-dialog-input";
        input.type = "text";
        input.maxLength = 64;
        input.value = initial;
        input.placeholder = "Preset name";
        input.setAttribute("aria-label", "Preset name");
        error = document.createElement("div");
        error.className = "preset-dialog-error";
        error.textContent = "Enter a name for this preset.";
        dialog.append(input, error);
      }

      const actions = document.createElement("div");
      actions.className = "preset-dialog-actions";
      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.textContent = "Cancel";
      const confirm = document.createElement("button");
      confirm.type = "button";
      confirm.className = danger ? "danger" : "primary";
      confirm.textContent = confirmText;
      actions.append(cancel, confirm);
      dialog.appendChild(actions);
      backdrop.appendChild(dialog);
      document.body.appendChild(backdrop);

      const close = value => {
        document.removeEventListener("keydown", onKeydown, true);
        backdrop.remove();
        resolve(value);
      };
      const accept = () => {
        if (!needsName) return close(true);
        const value = input.value.trim().replace(/\s+/g, " ");
        if (!value) {
          error.classList.add("show");
          input.focus();
          return;
        }
        close(value);
      };
      const onKeydown = event => {
        if (event.key === "Escape") {
          event.preventDefault();
          close(null);
        } else if (event.key === "Enter") {
          event.preventDefault();
          accept();
        }
      };

      cancel.addEventListener("click", () => close(null));
      confirm.addEventListener("click", accept);
      backdrop.addEventListener("mousedown", event => { if (event.target === backdrop) close(null); });
      document.addEventListener("keydown", onKeydown, true);
      requestAnimationFrame(() => {
        if (input) {
          input.focus();
          input.select();
        } else {
          confirm.focus();
        }
      });
    });
  }

  async function savePreset() {
    const entered = await createDialog({
      title: "Save Current Preset",
      message: "Name this visual setup so you can return to it later.",
      confirmText: "Save Preset",
      needsName: true,
      initial: `Preset ${presets.length + 1}`,
    });
    if (!entered) return;

    const name = uniqueName(entered);
    const preset = {
      id: makeId(),
      name,
      createdAt: new Date().toISOString(),
      project: sceneOnly(window.__shamonsoftProject.snapshot()),
      rgb: captureRgb(),
      meta: captureMeta(),
    };
    if (!persist([...presets, preset])) return;
    selectedId = preset.id;
    render();
    requestAnimationFrame(() => grid.querySelector(`[data-preset-id="${CSS.escape(preset.id)}"]`)?.scrollIntoView({ block: "nearest", inline: "end" }));
    notify(`Saved preset: ${name}`);
  }

  async function loadPreset(preset) {
    if (!preset?.project) return;
    try {
      const project = sceneOnly(preset.project);
      window.__shamonsoftProject.restore(project, false);
      await new Promise(resolve => requestAnimationFrame(resolve));
      window.__shamonsoftProject.restore(project, false);
      const rgb = { ...(preset.rgb || {}) };
      const legacyRunway = Object.entries(project.controls || {}).some(([key, state]) => key.startsWith("effect:main:") && state?.value === "Sonic Runway");
      if (legacyRunway) rgb.sonicRunway = Boolean(rgb.main);
      else if (!("sonicRunway" in rgb)) rgb.sonicRunway = false;
      applyRgb(rgb);
      selectedId = preset.id;
      render();
      notify(`Loaded preset: ${preset.name}`);
    } catch {
      notify("This preset could not be loaded.");
    }
  }

  async function renamePreset(preset) {
    const entered = await createDialog({
      title: "Rename Preset",
      confirmText: "Rename",
      needsName: true,
      initial: preset.name,
    });
    if (!entered) return;
    const name = uniqueName(entered, preset.id);
    if (!persist(presets.map(item => item.id === preset.id ? { ...item, name } : item))) return;
    render();
    notify(`Renamed preset: ${name}`);
  }

  async function deletePreset(preset) {
    const confirmed = await createDialog({
      title: "Delete Preset?",
      message: `“${preset.name}” will be permanently removed.`,
      confirmText: "Delete",
      danger: true,
    });
    if (!confirmed) return;
    if (!persist(presets.filter(item => item.id !== preset.id))) return;
    if (selectedId === preset.id) selectedId = "";
    render();
    notify("Preset deleted");
  }

  function exportPresets() { notify('Feature locked in demo'); }

  async function importPresets(file) {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const incoming = Array.isArray(parsed) ? parsed : parsed?.presets;
      if (!Array.isArray(incoming)) throw new Error("Preset list missing");
      const valid = incoming.filter(item => item && typeof item.name === "string" && item.project?.schema === "shamonsoft-project-v1" && item.project.controls);
      if (valid.length === 0) throw new Error("No compatible presets");

      for(const item of valid)window.__shamonsoftProject.validate(item.project);
      const merged = [...presets];
      for (const item of valid) {
        const imported = structuredClone(item);
        imported.id = makeId();
        imported.name = uniqueName(imported.name, "", merged);
        imported.importedAt = new Date().toISOString();
        merged.push(imported);
      }
      if (!persist(merged)) return;
      selectedId = "";
      render();
      notify(`Imported ${valid.length} preset${valid.length === 1 ? "" : "s"}.`);
    } catch {
      notify("That file does not contain compatible ShamonSoft presets.");
    } finally {
      importInput.value = "";
    }
  }

  function makeAction(label, symbol, action) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "preset-card-action";
    button.setAttribute("aria-label", label);
    button.title = label;
    button.textContent = symbol;
    button.addEventListener("click", event => {
      event.stopPropagation();
      action();
    });
    return button;
  }

  function makeCard(preset) {
    const card = document.createElement("div");
    card.className = "preset-card user-preset-card";
    card.classList.toggle("selected", preset.id === selectedId);
    card.dataset.presetId = preset.id;
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", `Load preset ${preset.name}`);
    card.title = `Load preset: ${preset.name}`;

    const meta = preset.meta || {};
    const hue = Number.isFinite(Number(meta.hue)) ? Number(meta.hue) : 220;
    const thumb = document.createElement("div");
    thumb.className = "preset-thumb user-preset-thumb";
    thumb.style.setProperty("--preset-hue", String(hue));
    thumb.style.setProperty("--preset-accent-hue", String((hue + 105) % 360));

    const visualizer = document.createElement("span");
    visualizer.className = "preset-visualizer-name";
    visualizer.textContent = meta.visualizer || "Visual Scene";
    const actions = document.createElement("div");
    actions.className = "preset-card-actions";
    actions.append(
      makeAction(`Rename ${preset.name}`, "✎", () => renamePreset(preset)),
      makeAction(`Delete ${preset.name}`, "×", () => deletePreset(preset)),
    );
    thumb.append(visualizer, actions);

    const name = document.createElement("div");
    name.className = "preset-name";
    name.textContent = preset.name;
    card.append(thumb, name);

    card.addEventListener("click", () => loadPreset(preset));
    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        loadPreset(preset);
      }
    });
    return card;
  }

  function render() {
    grid.classList.toggle("empty", presets.length === 0);
    grid.replaceChildren();
    if (presets.length === 0) {
      const empty = document.createElement("div");
      empty.className = "preset-empty-state";
      const title = document.createElement("strong");
      title.textContent = "No presets saved yet";
      const copy = document.createElement("span");
      copy.textContent = "Build a look, then choose Save Preset.";
      empty.append(title, copy);
      grid.appendChild(empty);
      return;
    }
    presets.forEach(preset => grid.appendChild(makeCard(preset)));
  }

  saveButton.addEventListener("click", savePreset);
  saveButton.title = "Save the current visual setup as a reusable named preset.";
  exportButton?.addEventListener("click", exportPresets);
  importButton?.addEventListener("click", () => importInput?.click());
  importInput?.addEventListener("change", () => importPresets(importInput.files?.[0]));
  render();
  window.__shamonsoftPresetLibrary = {
    count: () => presets.length,
    save: savePreset,
    load: id => loadPreset(presets.find(preset => preset.id === id)),
    export: exportPresets,
    import: importPresets,
  };
})();
