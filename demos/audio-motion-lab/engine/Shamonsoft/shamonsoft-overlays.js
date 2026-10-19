(() => {
  const state = {
    enabled: true,
    rgb: false,
    text: "",
    subtitle: "",
    font: "Segoe UI",
    weight: "700",
    align: "center",
    color: "#ffffff",
    accent: "#62dcff",
    size: 64,
    subtitleSize: 28,
    x: 50,
    y: 82,
    opacity: 100,
    rotation: 0,
    outline: 0,
    shadow: 45,
    box: 0,
    animation: "none",
    logoEnabled: false,
    logoDataUrl: "",
    logoName: "",
    logoX: 88,
    logoY: 12,
    logoSize: 18,
    logoOpacity: 85,
    logoRotation: 0,
    logoBlend: "source-over",
    order: "logo-text",
    position: "post",
    guides: false,
  };

  const logoImage = new Image();
  logoImage.decoding = "async";

  function row(label, control) {
    return `<div class="shamonsoft-layer-row shamonsoft-overlay-row"><label>${label}</label>${control}</div>`;
  }

  function range(label, key, min, max, value, step = 1) {
    return row(label, `<input data-overlay="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"><output data-overlay-output="${key}">${value}</output>`);
  }

  function installControls() {
    const card = document.createElement("section");
    card.className = "anim-card collapsed shamonsoft-overlay-card";
    card.dataset.effectId = "shamonsoftOverlays";
    card.innerHTML = `
      <div class="anim-head">
        <div class="anim-title">Text & overlays</div>
        <div class="anim-head-actions"><button class="randomize-btn" type="button" aria-label="RGB randomize" aria-pressed="false">RGB</button><button class="collapse-btn" type="button" aria-expanded="false">▸</button><label class="toggle"><input data-overlay="enabled" type="checkbox"><span></span></label></div>
      </div>
      <div class="anim-body shamonsoft-layer-stack">
        ${row("Title", `<input data-overlay="text" type="text" maxlength="120" placeholder="Add a title or artist name">`)}
        ${row("Subtitle", `<input data-overlay="subtitle" type="text" maxlength="180" placeholder="Track title, caption, or credit">`)}
        ${row("Font", `<select data-overlay="font"><option>Segoe UI</option><option>Arial</option><option>Georgia</option><option>Impact</option><option>Trebuchet MS</option><option>Courier New</option></select>`)}
        ${row("Weight / align", `<span class="shamonsoft-inline-controls"><select data-overlay="weight"><option value="400">Regular</option><option value="600">Semibold</option><option value="700" selected>Bold</option><option value="900">Black</option></select><select data-overlay="align"><option value="left">Left</option><option value="center" selected>Center</option><option value="right">Right</option></select></span>`)}
        ${row("Colors", `<span class="shamonsoft-inline-controls shamonsoft-color-pair"><input data-overlay="color" type="color" value="#ffffff" title="Title color"><input data-overlay="accent" type="color" value="#62dcff" title="Subtitle color"></span>`)}
        ${range("Title size", "size", 12, 480, 64)}
        ${range("Subtitle size", "subtitleSize", 8, 240, 28)}
        ${range("Horizontal", "x", 0, 100, 50)}
        ${range("Vertical", "y", 0, 100, 82)}
        ${range("Opacity", "opacity", 0, 100, 100)}
        ${range("Rotation", "rotation", -180, 180, 0)}
        ${range("Outline", "outline", 0, 16, 0)}
        ${range("Shadow / glow", "shadow", 0, 100, 45)}
        ${range("Background box", "box", 0, 100, 0)}
        ${row("Text animation", `<select data-overlay="animation"><option value="none">None</option><option value="fade">Fade In/Out</option><option value="pulse">Audio Pulse</option><option value="float">Gentle Float</option><option value="type">Typewriter</option><option value="slide">Slide & fade</option><option value="sway">Slow sway</option><option value="breathe">Breathe</option><option value="sweep">Light sweep</option></select>`)}
        <div class="shamonsoft-subsection-title">IMAGE / LOGO LAYER</div>
        ${row("Image", `<span class="shamonsoft-inline-controls shamonsoft-button-pair"><input id="shamonsoft-overlay-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" hidden><button id="shamonsoft-overlay-browse" class="tiny-btn text-btn" type="button">Browse</button><button id="shamonsoft-overlay-clear" class="tiny-btn text-btn" type="button">Clear</button></span>`)}
        <div id="shamonsoft-overlay-filename" class="shamonsoft-overlay-filename">No image loaded</div>
        ${row("Show image", `<label class="toggle"><input data-overlay="logoEnabled" type="checkbox"><span></span></label>`)}
        ${range("Image X", "logoX", 0, 100, 88)}
        ${range("Image Y", "logoY", 0, 100, 12)}
        ${range("Image size", "logoSize", 2, 100, 18)}
        ${range("Image opacity", "logoOpacity", 0, 100, 85)}
        ${range("Image rotation", "logoRotation", -180, 180, 0)}
        ${row("Image blend", `<select data-overlay="logoBlend"><option value="source-over">Normal</option><option value="screen">Screen</option><option value="lighter">Add</option><option value="multiply">Multiply</option><option value="overlay">Overlay</option><option value="soft-light">Soft Light</option><option value="difference">Difference</option></select>`)}
        <div class="shamonsoft-subsection-title">LAYER OPTIONS</div>
        ${row("Layer order", `<select data-overlay="order"><option value="logo-text">Image below text</option><option value="text-logo">Image above text</option></select>`)}
        ${row("FX position", `<select data-overlay="position"><option value="post">Above post effects</option><option value="pre">Inside post effects</option></select>`)}
        ${row("Safe-area guides", `<label class="toggle"><input data-overlay="guides" type="checkbox"><span></span></label>`)}
      </div>`;
    document.getElementById("left-rail")?.appendChild(card);

    const body = card.querySelector(".anim-body");
    body.hidden = true;
    const collapse = card.querySelector(".collapse-btn");
    const rgb = card.querySelector(".randomize-btn");
    rgb.addEventListener("click", () => {
      state.rgb = !state.rgb;
      rgb.classList.toggle("active-toggle", state.rgb);
      rgb.setAttribute("aria-pressed", String(state.rgb));
    });
    collapse.addEventListener("click", () => {
      card.classList.toggle("collapsed");
      const collapsed = card.classList.contains("collapsed");
      body.hidden = collapsed;
      collapse.textContent = collapsed ? "▸" : "▾";
      collapse.setAttribute("aria-expanded", String(!collapsed));
    });

    card.querySelectorAll("[data-overlay]").forEach(control => {
      const key = control.dataset.overlay;
      const update = () => {
        state[key] = control.type === "checkbox" ? control.checked : control.type === "range" ? Number(control.value) : control.value;
        const output = card.querySelector(`[data-overlay-output="${key}"]`);
        if (output) output.value = control.value;
      };
      control.addEventListener("input", update);
      control.addEventListener("change", update);
      update();
    });

    const file = card.querySelector("#shamonsoft-overlay-file");
    const filename = card.querySelector("#shamonsoft-overlay-filename");
    card.querySelector("#shamonsoft-overlay-browse").addEventListener("click", () => file.click());
    card.querySelector("#shamonsoft-overlay-clear").addEventListener("click", () => {
      state.logoDataUrl = "";
      state.logoName = "";
      logoImage.removeAttribute("src");
      filename.textContent = "No image loaded";
      file.value = "";
    });
    file.addEventListener("change", () => {
      const selected = file.files?.[0];
      if (!selected) return;
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        state.logoDataUrl = String(reader.result || "");
        state.logoName = selected.name;
        logoImage.src = state.logoDataUrl;
        filename.textContent = selected.name;
      });
      reader.readAsDataURL(selected);
    });
    return card;
  }

  const card = installControls();
  const textSegments = new Map();
  const segmenter = typeof Intl.Segmenter === "function" ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;

  function glyphs(text) {
    if (!textSegments.has(text)) {
      if (textSegments.size > 8) textSegments.clear();
      textSegments.set(text, segmenter ? Array.from(segmenter.segment(text), item => item.segment) : Array.from(text));
    }
    return textSegments.get(text);
  }

  function typeCycle() {
    return Math.max(3, Math.max(glyphs(state.text).length / 7, glyphs(state.subtitle).length / 7 + .25) + 2);
  }

  function animationOpacity(time, energy) {
    if (state.animation === "slide") {
      const phase = time % 8;
      const smooth = value => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };
      return smooth(phase / .9) * smooth((8 - phase) / 1.1);
    }
    if (state.animation === "fade") return .5 - .5 * Math.cos(time * Math.PI / 4);
    if (state.animation === "pulse") return .75 + Math.min(.25, energy * .8);
    if (state.animation === "type") {
      const remaining = typeCycle() - time % typeCycle();
      const fade = Math.min(1, remaining / .35);
      return fade * fade * (3 - 2 * fade);
    }
    return 1;
  }

  function textForTime(text, time) {
    if (state.animation !== "type" || !text) return text;
    const letters = glyphs(text);
    const count = Math.max(0, Math.min(letters.length, Math.floor(time * 7)));
    return letters.slice(0, count).join("");
  }

  function drawText(ctx, width, height, energy, time) {
    if (!state.text && !state.subtitle) return;
    const x = width * state.x / 100;
    const safetyFactor = window.__shamonsoftMotionSafety?.animationFactor?.() ?? 1;
    const floatOffset = state.animation === "float" ? Math.sin(time * .8 * safetyFactor) * height * .012 * safetyFactor : 0;
    const y = height * state.y / 100 + floatOffset;
    const scale = Math.min(width / 1920, height / 1080);
    const titleSize = Math.max(6, state.size * scale);
    const subtitleSize = Math.max(5, state.subtitleSize * scale);
    const typeTime = state.animation === "type" ? time % typeCycle() : time;
    const title = textForTime(state.text, typeTime);
    const subtitle = textForTime(state.subtitle, Math.max(0, typeTime - .25));
    const rgbMode = card.querySelector(".rgb-mode-select")?.value || "flow";
    const rgbHue = (time * 36 * safetyFactor) % 360;
    const titleColor = state.rgb ? `hsl(${rgbHue} 100% 72%)` : state.color;
    const accentColor = state.rgb ? `hsl(${(rgbHue + (rgbMode === "flow" ? 120 : 18)) % 360} 100% 72%)` : state.accent;

    ctx.save();
    ctx.translate(x, y);
    if (state.animation === "slide") {
      const phase = time % 8;
      const entry = Math.max(0, Math.min(1, phase / .9));
      const exit = Math.max(0, Math.min(1, (8 - phase) / 1.1));
      ctx.translate(width * .035 * (1 - entry) ** 3 - width * .025 * (1 - exit) ** 3, 0);
    }
    const sway = state.animation === "sway" ? Math.sin(time * .65 * safetyFactor) * 2 * safetyFactor : 0;
    ctx.rotate((state.rotation + sway) * Math.PI / 180);
    if (state.animation === "breathe") {
      const breathing = 1 + Math.sin(time * .8 * safetyFactor) * .045 * safetyFactor;
      ctx.scale(breathing, breathing);
    }
    ctx.globalAlpha = state.opacity / 100 * animationOpacity(time, energy);
    ctx.textAlign = state.align;
    ctx.textBaseline = "alphabetic";
    ctx.lineJoin = "round";
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = state.shadow / 100 * 40 * scale;
    ctx.font = `${state.weight} ${titleSize}px "${state.font}"`;
    const titleWidth = ctx.measureText(state.text || " ").width;
    ctx.font = `600 ${subtitleSize}px "${state.font}"`;
    const subtitleWidth = ctx.measureText(state.subtitle || " ").width;
    // Keep the final line's anchor and backplate still while characters reveal.
    const titleX = state.animation === "type" ? (state.align === "center" ? -titleWidth / 2 : state.align === "right" ? -titleWidth : 0) : 0;
    const subtitleX = state.animation === "type" ? (state.align === "center" ? -subtitleWidth / 2 : state.align === "right" ? -subtitleWidth : 0) : 0;
    if (state.animation === "type") ctx.textAlign = "left";
    const boxWidth = Math.max(titleWidth, subtitleWidth) + 52 * scale;
    const boxHeight = titleSize + subtitleSize + 38 * scale;
    const boxX = state.align === "left" ? -20 * scale : state.align === "right" ? -boxWidth + 20 * scale : -boxWidth / 2;
    let titlePaint = titleColor;
    let accentPaint = accentColor;
    if (state.rgb && rgbMode === "flow") {
      const flow = ctx.createLinearGradient(boxX, 0, boxX + boxWidth, 0);
      flow.addColorStop(0, `hsl(${rgbHue} 100% 72%)`);
      flow.addColorStop(.33, `hsl(${(rgbHue + 120) % 360} 100% 72%)`);
      flow.addColorStop(.66, `hsl(${(rgbHue + 240) % 360} 100% 72%)`);
      flow.addColorStop(1, `hsl(${rgbHue} 100% 72%)`);
      titlePaint = accentPaint = flow;
    }
    if (state.animation === "sweep") {
      const position = .15 + (.5 - .5 * Math.cos(time * .8)) * .7;
      const sweep = color => {
        const paint = ctx.createLinearGradient(boxX, 0, boxX + boxWidth, 0);
        paint.addColorStop(0, color);
        paint.addColorStop(Math.max(0, position - .14), color);
        paint.addColorStop(position, "#ffffff");
        paint.addColorStop(Math.min(1, position + .14), color);
        paint.addColorStop(1, color);
        return paint;
      };
      titlePaint = sweep(titleColor); accentPaint = sweep(accentColor);
    }
    if (state.box > 0) {
      ctx.save();
      ctx.shadowBlur = 0;
      ctx.globalAlpha *= state.box / 100 * .82;
      ctx.fillStyle = "#050814";
      ctx.beginPath();
      ctx.roundRect(boxX, -titleSize - 18 * scale, boxWidth, boxHeight, 8 * scale);
      ctx.fill();
      ctx.restore();
    }
    ctx.font = `${state.weight} ${titleSize}px "${state.font}"`;
    if (state.outline > 0) {
      ctx.lineWidth = state.outline * scale;
      ctx.strokeStyle = "rgba(0,0,0,.9)";
      ctx.strokeText(title, titleX, 0);
    }
    ctx.fillStyle = titlePaint;
    ctx.fillText(title, titleX, 0);
    ctx.font = `600 ${subtitleSize}px "${state.font}"`;
    ctx.fillStyle = accentPaint;
    ctx.fillText(subtitle, subtitleX, subtitleSize + 12 * scale);
    ctx.restore();
  }

  function drawLogo(ctx, width, height, time) {
    if (!state.logoEnabled || !state.logoDataUrl || !logoImage.complete || !logoImage.naturalWidth) return;
    const maxWidth = width * state.logoSize / 100;
    const maxHeight = height * state.logoSize / 100;
    const ratio = Math.min(maxWidth / logoImage.naturalWidth, maxHeight / logoImage.naturalHeight);
    const drawWidth = logoImage.naturalWidth * ratio;
    const drawHeight = logoImage.naturalHeight * ratio;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.translate(width * state.logoX / 100, height * state.logoY / 100);
    ctx.rotate(state.logoRotation * Math.PI / 180);
    ctx.globalAlpha = state.logoOpacity / 100;
    ctx.globalCompositeOperation = state.logoBlend;
    if (state.rgb) {
      const safetyFactor = window.__shamonsoftMotionSafety?.animationFactor?.() ?? 1;
      ctx.filter = `hue-rotate(${(time * 36 * safetyFactor) % 360}deg) saturate(1.35)`;
    }
    ctx.drawImage(logoImage, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();
  }

  function drawGuides(ctx, width, height) {
    if (!state.guides) return;
    ctx.save();
    ctx.setLineDash([10, 8]);
    ctx.lineWidth = Math.max(1, width / 1200);
    ctx.strokeStyle = "rgba(98,220,255,.8)";
    ctx.strokeRect(width * .05, height * .05, width * .9, height * .9);
    ctx.strokeStyle = "rgba(190,126,255,.72)";
    ctx.strokeRect(width * .1, height * .1, width * .8, height * .8);
    ctx.restore();
  }

  function draw(ctx, width, height, energy = 0, time = performance.now() / 1000) {
    if (!state.enabled) return;
    if (state.order === "text-logo") {
      drawText(ctx, width, height, energy, time);
      drawLogo(ctx, width, height, time);
    } else {
      drawLogo(ctx, width, height, time);
      drawText(ctx, width, height, energy, time);
    }
    drawGuides(ctx, width, height);
  }

  function serialize() {
    return { ...state };
  }

  function restore(saved) {
    if (!saved || typeof saved !== "object") return;
    Object.assign(state, saved);
    card.querySelectorAll("[data-overlay]").forEach(control => {
      const key = control.dataset.overlay;
      if (!(key in state)) return;
      if (control.type === "checkbox") control.checked = Boolean(state[key]);
      else control.value = String(state[key]);
      control.dispatchEvent(new Event("input", { bubbles: true }));
    });
    if (state.logoDataUrl) logoImage.src = state.logoDataUrl;
    const rgb = card.querySelector(".randomize-btn");
    rgb.classList.toggle("active-toggle", Boolean(state.rgb));
    rgb.setAttribute("aria-pressed", String(Boolean(state.rgb)));
    card.querySelector("#shamonsoft-overlay-filename").textContent = state.logoName || "Embedded project image";
  }

  window.__shamonsoftOverlay = { state, draw, serialize, restore };
})();
