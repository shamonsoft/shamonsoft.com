(() => {
  const history = [];

  const toast = document.createElement("div");
  toast.className = "shamonsoft-toast";
  document.body.appendChild(toast);
  let toastTimer = 0;

  function notify(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 1800);
  }

  function stableControls() {
    return [...document.querySelectorAll("input, select, textarea")].filter((element) => {
      if (element.type === "file") return false;
      if (element.closest(".shamonsoft-toolbar")) return false;
      if (element.closest("[data-project-control='false']")) return false;
      return true;
    });
  }

  function controlKey(element, index) {
    if (element.id) return `id:${element.id}`;
    const card = element.closest(".anim-card");
    if (card) {
      const label = element.closest(".slider-cell")?.querySelector(".slider-label-row span")?.textContent?.trim() || "control";
      return `effect:${card.dataset.effectId}:${label}:${index}`;
    }
    const setting = element.closest(".global-setting-card")?.querySelector(".global-setting-label")?.textContent?.trim();
    if (setting) return `global:${setting}`;
    return `control:${index}`;
  }

  function snapshot() {
    const controls = {};
    stableControls().forEach((element, index) => {
      controls[controlKey(element, index)] = {
        value: element.value,
        checked: element.type === "checkbox" ? element.checked : undefined,
      };
    });
    return {
      schema: "shamonsoft-project-v1",
      product: "Audio Motion Lab",
      savedAt: new Date().toISOString(),
      overlays: window.__shamonsoftOverlay?.serialize?.() || null,
      layerOrder: window.__shamonsoftLayerOrder?.serialize?.(),
      layerOrderVersion: 3,
      controls,
    };
  }

  function dispatch(element) {
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function resolveSavedControl(key, controls) {
    if (key === "effect:sonicRunway:wireframe") return null;
    const current = stableControls();
    const exact = current.find((element, index) => controlKey(element, index) === key);

    // Older snapshots include the control's page-wide index. Cards added during
    // startup can shift that index between launches, so fall back to the stable
    // position of the control inside its own effect card.
    const match = /^effect:([^:]+):([^:]+):\d+$/.exec(key);
    if (!match) return exact || null;
    const effectId = match[1];
    // Sonic Runway's simplified schema removed controls. Match its
    // surviving named fields, never restore obsolete fields by old position.
    if (match[2] !== "control") {
      const label = match[2] === "Lighting strength" ? "Brightness" : match[2];
      if (effectId === "sonicRunway" && ["Walls", "Lighting", "Detail", "Density", "Drift", "Shift", "Shimmer", "Wireframe"].includes(label)) return null;
      return current.find(element => element.closest(".anim-card")?.dataset.effectId === effectId
        && element.closest(".slider-cell")?.querySelector(".slider-label-row span")?.textContent?.trim() === label) || null;
    }
    const savedKeys = Object.keys(controls).filter(savedKey => savedKey.startsWith(`effect:${effectId}:`));
    // Never trust a page-wide index for an unlabeled card control: removing
    // Background's checkbox shifts indices and can otherwise match a toggle
    // to the neighboring selector. Card-local order is the stable fallback.
    const localIndex = savedKeys.indexOf(key);
    if (localIndex < 0) return null;
    const card = [...document.querySelectorAll(".anim-card[data-effect-id]")]
      .find(candidate => candidate.dataset.effectId === effectId);
    if (!card) return null;
    return current.filter(element => element.closest(".anim-card") === card)[localIndex] || null;
  }

  function applySettings(project) {
    if (!project || project.schema !== "shamonsoft-project-v1" || !project.controls) {
      throw new Error("This is not a compatible ShamonSoft project file.");
    }
    window.__shamonsoftLayerOrder?.restore?.(project.layerOrder, project.layerOrderVersion);
    // Old controls used inverse transparency. Convert keys and values once,
    // without changing the actual appearance of existing projects/presets.
    const opacityControls = {};
    for (const [key, state] of Object.entries(project.controls)) {
      const inverse = key.includes(":Transparency:") || key === "id:shamonsoft-procedural-transparency";
      const nextKey = key.replace(":Transparency:", ":Opacity:").replace("id:shamonsoft-procedural-transparency", "id:shamonsoft-procedural-opacity");
      opacityControls[nextKey] = inverse ? { ...state, value: String(100 - Math.max(0, Math.min(100, Number(state.value) || 0))) } : state;
    }
    if (project.controls["id:bg-black"]?.checked) {
      opacityControls["id:background-enabled"] = { ...opacityControls["id:background-enabled"], checked: false };
    }
    project = { ...project, controls: opacityControls };
    if (!("id:shamonsoft-procedural-opacity" in project.controls)) {
      const opacity = document.getElementById("shamonsoft-procedural-opacity");
      if (opacity) { opacity.value = "25"; dispatch(opacity); }
    }
    // Retired Constellation scenes retain compatible Orbit controls instead
    // of leaving the visualizer selector on an unavailable blank option.
    project = { ...project, controls: Object.fromEntries(Object.entries(project.controls).map(([key, state]) =>
      [key, key.startsWith("effect:main:") && state?.value === "Constellation" ? { ...state, value: "Orbit" } : state])) };
    // Sonic Runway moved from the main selector to its own layer. Translate
    // old presets before resolving indexed controls; never feed their tunnel
    // values into Bars or leave an unavailable select value blank.
    const legacyMain = Object.entries(project.controls).filter(([key]) => key.startsWith("effect:main:"));
    const legacyRunway = legacyMain.some(([, state]) => state?.value === "Sonic Runway");
    if (legacyRunway) {
      const migrated = { ...project.controls };
      legacyMain.forEach(([key]) => delete migrated[key]);
      const legacyValue = label => legacyMain.find(([key]) => key.split(":")[2] === label)?.[1]?.value;
      const wasEnabled = legacyMain.find(([, state]) => typeof state?.checked === "boolean")?.[1]?.checked ?? true;
      const aliases = { Hue: "Hue", Response: "Intensity", Glow: "Glow", Size: "Spacing", Depth: "Depth",
        Density: "Amount", Thickness: "Width", Speed: "Speed", Drift: "Motion", Opacity: "Opacity" };
      stableControls().forEach((element, index) => {
        const effect = element.closest(".anim-card")?.dataset.effectId;
        if (effect !== "main" && effect !== "sonicRunway") return;
        const key = controlKey(element, index);
        const label = element.closest(".slider-cell")?.querySelector(".slider-label-row span")?.textContent?.trim();
        const defaultValue = element.tagName === "SELECT"
          ? ([...element.options].find(option => option.defaultSelected) || element.options[0])?.value
          : element.defaultValue;
        const mapped = effect === "sonicRunway" ? legacyValue(aliases[label]) : undefined;
        migrated[key] = { value: mapped ?? defaultValue, checked: element.type === "checkbox" ? (effect === "sonicRunway" && wasEnabled) : undefined };
        if (effect === "sonicRunway" && label === "Floor") migrated[key].value = "None";
        if (effect === "sonicRunway" && element.matches(".rgb-mode-select")) {
          migrated[key].value = legacyMain.find(([, state]) => state?.value === "cycle" || state?.value === "flow")?.[1]?.value || "flow";
        }
      });
      project = { ...project, controls: migrated };
    }
    if (!Object.keys(project.controls).some(key => key.startsWith("effect:sonicRunway:"))) {
      const enabled = document.querySelector("[data-effect-id='sonicRunway'] .toggle input");
      if (enabled) { enabled.checked = false; dispatch(enabled); }
    }
    const restorePriority = key => {
      if (key.startsWith("effect:main:")) return 2;
      return 1;
    };
    const orderedControls = Object.entries(project.controls)
      .map((entry, index) => ({ entry, index, priority: restorePriority(entry[0]) }))
      .sort((a, b) => a.priority - b.priority || a.index - b.index)
      .map(item => item.entry);

    for (const [key, state] of orderedControls) {
      // Resolve each element immediately because changing a visualizer or scene
      // can rebuild the controls that follow it during this same restore pass.
      const element = resolveSavedControl(key, project.controls);
      if (!element) continue;
      if (element.type === "checkbox" && typeof state.checked === "boolean") element.checked = state.checked;
      if (state.value != null) {
        element.value = element.matches(".main-effect-select") && state.value === "Waveform"
          ? "Ribbons"
          : state.value;
      }
      dispatch(element);
    }
    // Presets created before Background gained its own enable switch assumed
    // that the configured background was always active.
    const backgroundEnabled = document.getElementById("background-enabled");
    if (backgroundEnabled && !("id:background-enabled" in project.controls)) {
      backgroundEnabled.checked = false;
      dispatch(backgroundEnabled);
    }
    if (project.overlays) window.__shamonsoftOverlay?.restore?.(project.overlays);

  }

  function seeded(seed) {
    let state = seed >>> 0;
    return () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  function randomizeScene() {
    history.push(snapshot());
    if (history.length > 20) history.shift();
    const seedInput = document.getElementById("shamonsoft-seed");
    const seed = Number(seedInput.value) || Math.floor(Math.random() * 2147483647);
    seedInput.value = String(seed);
    const random = seeded(seed);

    const scope = document.getElementById("shamonsoft-random-scope")?.value || "all";
    const matchesScope = input => {
      if (input.closest("[data-random-lock='true']")) return false;
      const text = (input.closest(".slider-cell, .global-setting-card, .shamonsoft-layer-row, .shamonsoft-procedural-control")?.textContent || "").toLowerCase();
      if (scope === "colors") return /hue|satur|vibr|palette|color|brightness|glow|bloom/.test(text);
      if (scope === "motion") return /speed|motion|drift|rotate|zoom|pulse|turbulence|wind|gravity|drag|trail/.test(text);
      if (scope === "audio") return Boolean(input.closest("[data-effect-id='audioRouter']")) || /react|beat|gain|attack|release|threshold/.test(text);
      if (scope === "current") return Boolean(input.closest("[data-effect-id='main']"));
      return true;
    };
    document.querySelectorAll(".anim-card input[type='range'], .global-setting-card input[type='range']").forEach((input) => {
      if (!matchesScope(input)) return;
      const min = Number(input.min || 0);
      const max = Number(input.max || 100);
      input.value = String(Math.round(min + random() * (max - min)));
      dispatch(input);
    });
    document.querySelectorAll(".anim-card select").forEach((select) => {
      if (!matchesScope(select)) return;
      if (select.options.length > 0) {
        select.selectedIndex = Math.floor(random() * select.options.length);
        dispatch(select);
      }
    });
    notify(`Randomized ${scope} with seed ${seed}`);
  }

  function undoRandomize() {
    const previous = history.pop();
    if (!previous) return notify("Nothing to undo");
    restore(previous, false);
    notify("Randomization undone");
  }



  window.__shamonsoftNativeExportStatus = (message, isError = false) => {
    notify(message);
    const status = document.getElementById("record-status");
    if (status) {
      status.textContent = message;
      status.style.color = isError ? "#ff7085" : "";
    }
  };

  function validate(project) {
    if(!project||project.schema!=="shamonsoft-project-v1"||!project.controls||typeof project.controls!=="object"||Array.isArray(project.controls))throw new Error("This is not a compatible AML settings file.");
    const next=structuredClone(project); if(next.controls["id:export-length-select"]) next.controls["id:export-length-select"].value=String(Math.min(60,Number(next.controls["id:export-length-select"].value)||60)); const entries=Object.entries(next.controls);
    if(entries.length>10000)throw new Error("The settings file has too many controls.");
    for(const [key,value] of entries){if(!value||typeof value!=="object"||Array.isArray(value)||key.length>500)throw new Error("Invalid project control: "+key);if(value.value!=null&&!["string","number","boolean"].includes(typeof value.value))throw new Error("Invalid control value.");if(typeof value.value==="number"&&!Number.isFinite(value.value))throw new Error("Invalid numeric control.");if(value.checked!=null&&typeof value.checked!=="boolean")throw new Error("Invalid toggle value.")}
    if(next.layerOrder!=null&&(!Array.isArray(next.layerOrder)||next.layerOrder.some(x=>typeof x!=="string")))throw new Error("Invalid layer order.");
    if(next.overlays!=null){if(typeof next.overlays!=="object"||Array.isArray(next.overlays))throw new Error("Invalid overlay settings.");for(const [key,value] of Object.entries(next.overlays)){if(["__proto__","constructor","prototype"].includes(key)||value!=null&&!["string","number","boolean"].includes(typeof value)||typeof value==="number"&&!Number.isFinite(value))throw new Error("Invalid overlay value.")}if(next.overlays.logoDataUrl&&!/^data:image\//i.test(next.overlays.logoDataUrl))throw new Error("The overlay image is missing or invalid.")}
    return next;
  }
  function restore(project, remember = true) {
    const next=validate(project),previous=snapshot();
    try{applySettings(next)}catch(error){try{applySettings(previous)}catch{}throw error}
    if(remember)window.__amlProject?.changed();
  }
  window.__shamonsoftProject = { snapshot, restore, validate, notify };

  document.addEventListener("dblclick", event => {
    const group = event.target.closest(".slider-cell, .global-setting-card, .shamonsoft-layer-row, .shamonsoft-procedural-control");
    if (!group || !group.querySelector("input, select")) return;
    const locked = group.dataset.randomLock === "true";
    group.dataset.randomLock = String(!locked);
    group.classList.toggle("shamonsoft-locked", !locked);
    notify(!locked ? "Parameter locked" : "Parameter unlocked");
  });
})();
