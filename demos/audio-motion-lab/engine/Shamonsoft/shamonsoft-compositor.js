(() => {
  const preview = document.querySelector(".preview-art");
  if (!preview) return;

  const canvas = document.createElement("canvas");
  canvas.className = "shamonsoft-compositor-canvas";
  preview.appendChild(canvas);
  const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
  const buffer = document.createElement("canvas");
  const bufferCtx = buffer.getContext("2d", { alpha: true });
  const mixBuffer = document.createElement("canvas");
  const mixCtx = mixBuffer.getContext("2d", { alpha: true });
  const freezeBuffer = document.createElement("canvas");
  const freezeCtx = freezeBuffer.getContext("2d", { alpha: true });
  const pixelBuffer = document.createElement("canvas");
  const pixelCtx = pixelBuffer.getContext("2d", { alpha: true });
  const channelBuffer = document.createElement("canvas");
  const channelCtx = channelBuffer.getContext("2d", { alpha: true });
  const chromaticBuffer = document.createElement("canvas");
  const chromaticCtx = chromaticBuffer.getContext("2d", { alpha: true });
  const posterizeLut = new Uint8Array(256);
  let posterizeLevels = 0;
  let captureWidth = 0;
  let captureHeight = 0;
  let frozen = false;
  let analyserValues = null;
  let previousFrameTime = 0;
  let elapsedTime = 0;
  let motionTime = 0;
  let smoothedEnergy = 0;

  const settings = {
    mirror: "none",
    feedback: 0,
    chromatic: 0,
    scanlines: 0,
    grain: 0,
    vignette: 0.22,
    beatFlash: 0,
    hue: 0,
    brightness: 1,
    saturation: 1,
    contrast: 1,
    blur: 0,
    pixelate: 0,
    glitch: 0,
    posterize: 0,
    threshold: 0,
    bloom: 0,
    bloomShape: "none",
    colorShiftSpeed: 0,
    sourceOpacity: 1,
    sourceBlend: "source-over",
    backgroundOpacity: 1,
    backgroundBlend: "source-over",
    backgroundBlur: 0,
    backgroundPosition: "back",
    mask: "none",
  };

  function makeRange(label, key, value, max = 100) {
    return `<div class="shamonsoft-layer-row"><label>${label}</label><input data-post="${key}" type="range" min="0" max="${max}" value="${value}"></div>`;
  }

  function installControls() {
    const card = document.createElement("section");
    card.className = "anim-card collapsed";
    card.dataset.effectId = "shamonsoftPost";
    card.innerHTML = `
      <div class="anim-head">
        <div class="anim-title">Compositor & Post FX</div>
        <div class="anim-head-actions"><button class="collapse-btn" type="button" aria-expanded="false">▸</button><label class="toggle"><input type="checkbox"><span></span></label></div>
      </div>
      <div class="anim-body shamonsoft-layer-stack">
        <div class="shamonsoft-layer-row"><label>Mirror system</label><select data-post="mirror">
          <option value="none">None</option><option value="horizontal">Horizontal</option><option value="vertical">Vertical</option><option value="quad">Quad Mirror</option><option value="kaleidoscope6">Kaleidoscope 6</option><option value="kaleidoscope8">Kaleidoscope 8</option>
        </select></div>
        ${makeRange("Feedback trails", "feedback", 0, 96)}
        ${makeRange("Chromatic aberration", "chromatic", 0)}
        ${makeRange("Scanlines", "scanlines", 0)}
        ${makeRange("Film grain", "grain", 0)}
        ${makeRange("Vignette", "vignette", 22)}
        ${makeRange("Beat flash", "beatFlash", 0)}
        ${makeRange("Hue rotation", "hue", 0, 360)}
      </div>`;
    document.getElementById("left-rail")?.appendChild(card);
    const body = card.querySelector(".anim-body");
    body.hidden = true;
    const collapse = card.querySelector(".collapse-btn");
    const enabled = card.querySelector(".toggle input");
    collapse.addEventListener("click", () => {
      card.classList.toggle("collapsed");
      const isCollapsed = card.classList.contains("collapsed");
      body.hidden = isCollapsed;
      collapse.textContent = isCollapsed ? "▸" : "▾";
      collapse.setAttribute("aria-expanded", String(!isCollapsed));
    });
    card.querySelectorAll("[data-post]").forEach(control => {
      const key = control.dataset.post;
      const update = () => settings[key] = control.tagName === "SELECT" ? control.value : Number(control.value) / (key === "hue" ? 1 : 100);
      control.addEventListener("input", update);
      control.addEventListener("change", update);
      update();
    });
    return () => enabled.checked;
  }

  const isEnabled = installControls();

  function resize(source) {
    const scale = window.__shamonsoftPerformance?.renderScale || 1;
    const width = captureWidth || Math.max(1, Math.round((source.width || preview.clientWidth) * scale));
    const height = captureHeight || Math.max(1, Math.round((source.height || preview.clientHeight) * scale));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = buffer.width = mixBuffer.width = width;
      canvas.height = buffer.height = mixBuffer.height = height;
      ctx.imageSmoothingQuality = bufferCtx.imageSmoothingQuality = mixCtx.imageSmoothingQuality = "high";
    }
  }

  function audioEnergy() {
    try {
      const shared = window.__shamonsoftAudioRouter?.signals?.()?.overall;
      if (Number.isFinite(shared)) return Math.max(0, Math.min(1, shared));
      if (typeof analyser === "undefined" || !analyser) return 0;
      if (!analyserValues || analyserValues.length !== analyser.frequencyBinCount)
        analyserValues = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(analyserValues);
      let total = 0;
      const count = Math.min(analyserValues.length, 256);
      for (let i = 0; i < count; i++) total += analyserValues[i];
      return total / Math.max(1, count * 255);
    } catch {
      return 0;
    }
  }

  function drawMirror(source, mode, width, height) {
    const sourceWidth = source.width || width;
    const sourceHeight = source.height || height;
    if (mode === "none") {
      ctx.drawImage(source, 0, 0, width, height);
      return;
    }
    if (mode === "horizontal") {
      ctx.drawImage(source, 0, 0, sourceWidth / 2, sourceHeight, 0, 0, width / 2, height);
      ctx.save(); ctx.translate(width, 0); ctx.scale(-1, 1);
      ctx.drawImage(source, 0, 0, sourceWidth / 2, sourceHeight, 0, 0, width / 2, height); ctx.restore();
      return;
    }
    if (mode === "vertical") {
      ctx.drawImage(source, 0, 0, sourceWidth, sourceHeight / 2, 0, 0, width, height / 2);
      ctx.save(); ctx.translate(0, height); ctx.scale(1, -1);
      ctx.drawImage(source, 0, 0, sourceWidth, sourceHeight / 2, 0, 0, width, height / 2); ctx.restore();
      return;
    }
    if (mode === "quad") {
      const halfW = width / 2, halfH = height / 2;
      for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) {
        ctx.save(); ctx.translate(x ? width : 0, y ? height : 0); ctx.scale(x ? -1 : 1, y ? -1 : 1);
        ctx.drawImage(source, 0, 0, sourceWidth / 2, sourceHeight / 2, 0, 0, halfW, halfH); ctx.restore();
      }
      return;
    }

    const slices = mode === "kaleidoscope8" ? 8 : 6;
    const radius = Math.hypot(width, height) / 2;
    const coverScale = radius * 2 / Math.min(sourceWidth, sourceHeight);
    const drawWidth = sourceWidth * coverScale, drawHeight = sourceHeight * coverScale;
    for (let i = 0; i < slices; i++) {
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.rotate((i / slices) * Math.PI * 2);
      if (i % 2) ctx.scale(1, -1);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, radius, -Math.PI / slices, Math.PI / slices); ctx.closePath(); ctx.clip();
      ctx.drawImage(source, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      ctx.restore();
    }
  }

  function drawBackgroundMedia(width, height, targetContext = ctx) {
    const ctx = targetContext;
    const image = document.getElementById("custom-bg-image-layer");
    const video = document.getElementById("custom-bg-video-layer");
    const enabled = document.getElementById("custom-bg-enabled")?.checked;
    const fit = document.getElementById("custom-bg-fit")?.value || "cover";
    const media = video && !video.hidden && video.readyState >= 2 ? video : image && image.complete && image.naturalWidth ? image : null;
    if (!enabled || !media) return;
    const sourceWidth = media.videoWidth || media.naturalWidth || width;
    const sourceHeight = media.videoHeight || media.naturalHeight || height;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.globalAlpha = settings.backgroundOpacity;
    ctx.globalCompositeOperation = settings.backgroundBlend;
    ctx.filter = settings.backgroundBlur > 0 ? `blur(${settings.backgroundBlur}px)` : "none";
    if (fit === "tile" && media === image) {
      const pattern = ctx.createPattern(image, "repeat");
      if (pattern) { ctx.fillStyle = pattern; ctx.fillRect(0, 0, width, height); }
    } else if (fit === "fill") ctx.drawImage(media, 0, 0, width, height);
    else if (fit === "none") ctx.drawImage(media, (width - sourceWidth) / 2, (height - sourceHeight) / 2);
    else {
      const scale = fit === "contain" ? Math.min(width / sourceWidth, height / sourceHeight) : Math.max(width / sourceWidth, height / sourceHeight);
      const drawWidth = sourceWidth * scale, drawHeight = sourceHeight * scale;
      ctx.drawImage(media, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
    }
    ctx.restore();
  }

  function applySourceMask(width, height) {
    if (settings.mask === "none") return;
    ctx.beginPath();
    if (settings.mask === "circle") ctx.arc(width / 2, height / 2, Math.min(width, height) * .42, 0, Math.PI * 2);
    else if (settings.mask === "diamond") { ctx.moveTo(width / 2, height * .06); ctx.lineTo(width * .94, height / 2); ctx.lineTo(width / 2, height * .94); ctx.lineTo(width * .06, height / 2); ctx.closePath(); }
    else if (settings.mask === "cinema") ctx.rect(width * .04, height * .14, width * .92, height * .72);
    else if (settings.mask === "vertical") ctx.rect(width * .24, 0, width * .52, height);
    else if (settings.mask === "horizontal") ctx.rect(0, height * .24, width, height * .52);
    ctx.clip();
  }

  function postEffects(width, height, energy) {
    if (settings.pixelate > .001) {
      const block = Math.max(1, Math.round(1 + settings.pixelate * 42));
      const pixelWidth = Math.max(2, Math.round(width / block));
      const pixelHeight = Math.max(2, Math.round(height / block));
      if (pixelBuffer.width !== pixelWidth) pixelBuffer.width = pixelWidth;
      if (pixelBuffer.height !== pixelHeight) pixelBuffer.height = pixelHeight;
      pixelCtx.imageSmoothingEnabled = true;
      pixelCtx.clearRect(0, 0, pixelBuffer.width, pixelBuffer.height);
      pixelCtx.drawImage(canvas, 0, 0, pixelBuffer.width, pixelBuffer.height);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(pixelBuffer, 0, 0, width, height);
      ctx.restore();
    }
    const glitchTick = Math.floor(motionTime * 24);
    if (settings.glitch > .001 && glitchTick % Math.max(1, Math.round(7 - settings.glitch * 6)) === 0) {
      bufferCtx.clearRect(0, 0, width, height);
      bufferCtx.drawImage(canvas, 0, 0);
      const slices = Math.round(2 + settings.glitch * 18);
      const noise = seed => { const value = Math.sin(seed * 127.1 + glitchTick * 311.7) * 43758.5453; return value - Math.floor(value); };
      ctx.save();
      for (let index = 0; index < slices; index++) {
        const y = Math.floor(noise(index * 3 + 1) * height);
        const sliceHeight = Math.min(height - y, 2 + noise(index * 3 + 2) * height * .045);
        const offset = (noise(index * 3 + 3) - .5) * width * settings.glitch * .12;
        ctx.clearRect(0, y, width, sliceHeight);
        ctx.drawImage(buffer, 0, y, width, sliceHeight, offset, y, width, sliceHeight);
        ctx.drawImage(buffer, 0, y, width, sliceHeight, offset + (offset > 0 ? -width : width), y, width, sliceHeight);
      }
      ctx.restore();
    }
    if (settings.posterize > .001 || settings.threshold > .001) {
      try {
        const pixels = ctx.getImageData(0, 0, width, height);
        const data = pixels.data;
        const levels = Math.max(2, Math.round(10 - settings.posterize * 8));
        if (levels !== posterizeLevels) {
          const step = 255 / Math.max(1, levels - 1);
          for (let value = 0; value < 256; value++) posterizeLut[value] = Math.round(Math.round(value / step) * step);
          posterizeLevels = levels;
        }
        const threshold = 48 + settings.threshold * 176;
        for (let index = 0; index < data.length; index += 4) {
          if (settings.posterize > .001) {
            data[index] = posterizeLut[data[index]];
            data[index + 1] = posterizeLut[data[index + 1]];
            data[index + 2] = posterizeLut[data[index + 2]];
          }
          if (settings.threshold > .001) {
            const light = data[index] * .2126 + data[index + 1] * .7152 + data[index + 2] * .0722;
            const target = light >= threshold ? 255 : 0;
            const mix = settings.threshold;
            data[index] += (target - data[index]) * mix;
            data[index + 1] += (target - data[index + 1]) * mix;
            data[index + 2] += (target - data[index + 2]) * mix;
          }
        }
        ctx.putImageData(pixels, 0, 0);
      } catch { }
    }
    if (settings.chromatic > 0.001) {
      bufferCtx.clearRect(0, 0, width, height);
      bufferCtx.drawImage(canvas, 0, 0);
      if (channelBuffer.width !== width || channelBuffer.height !== height) {
        channelBuffer.width = chromaticBuffer.width = width;
        channelBuffer.height = chromaticBuffer.height = height;
      }
      chromaticCtx.clearRect(0, 0, width, height);
      chromaticCtx.globalCompositeOperation = "lighter";
      const offset = settings.chromatic * Math.min(width, height) * .015;
      // Separate red/cyan light instead of doubling the entire image into white haze.
      for (const [color, shift] of [["#ff0000", offset], ["#00ffff", -offset]]) {
        channelCtx.clearRect(0, 0, width, height);
        channelCtx.globalCompositeOperation = "source-over";
        channelCtx.drawImage(buffer, shift, 0);
        channelCtx.globalCompositeOperation = "multiply";
        channelCtx.fillStyle = color;
        channelCtx.fillRect(0, 0, width, height);
        channelCtx.globalCompositeOperation = "destination-in";
        channelCtx.drawImage(buffer, shift, 0);
        chromaticCtx.drawImage(channelBuffer, 0, 0);
      }
      channelCtx.globalCompositeOperation = "source-over";
      ctx.save();
      ctx.globalCompositeOperation = "source-atop";
      ctx.globalAlpha = settings.chromatic * .65;
      ctx.drawImage(chromaticBuffer, 0, 0);
      ctx.restore();
    }
    if (settings.scanlines > 0.001) {
      ctx.save(); ctx.globalCompositeOperation = "source-atop"; ctx.globalAlpha = settings.scanlines * .38; ctx.fillStyle = "#000";
      for (let y = 0; y < height; y += 4) ctx.fillRect(0, y, width, 1);
      ctx.restore();
    }
    if (settings.grain > 0.001) {
      ctx.save(); ctx.globalCompositeOperation = "source-atop"; ctx.globalAlpha = settings.grain * .22;
      const dots = Math.round(300 + settings.grain * 1700);
      for (let i = 0; i < dots; i++) {
        const shade = Math.random() > .5 ? 255 : 0;
        ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
        ctx.fillRect(Math.random() * width, Math.random() * height, 1, 1);
      }
      ctx.restore();
    }
    if (settings.vignette > 0.001) {
      ctx.save();
      ctx.globalCompositeOperation = "source-atop";
      const gradient = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * .18, width / 2, height / 2, Math.max(width, height) * .68);
      gradient.addColorStop(0, "rgba(0,0,0,0)"); gradient.addColorStop(1, `rgba(0,0,0,${Math.min(.9, settings.vignette)})`);
      ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
    const beatFlash = window.__shamonsoftMotionSafety?.enabled?.() ? Math.min(settings.beatFlash, .12) : settings.beatFlash;
    const beatAccent = window.__shamonsoftAudioRouter?.signals?.().beat ?? energy;
    if (beatFlash > 0.001 && beatAccent > .03) {
      ctx.save(); ctx.globalCompositeOperation = "source-atop"; ctx.globalAlpha = beatFlash * Math.pow(beatAccent, 2) * .35;
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, width, height); ctx.restore();
    }
    drawBloomStamp(width, height, energy);
  }

  function drawBloomStamp(width, height, energy) {
    if (!settings.bloomShape || settings.bloomShape === "none" || settings.bloom <= .001) return;
    const amount = Math.min(1, Math.max(0, settings.bloom) * (.35 + energy * .9));
    const x = width * (.5 + Math.sin(motionTime * .48) * .12);
    const y = height * (.42 + Math.cos(motionTime * .36) * .08);
    const radius = Math.min(width, height) * (.12 + amount * .24);
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = amount * .5;
    const routedHue = window.__shamonsoftAudioRouter?.value?.("Post Hue", settings.hue) ?? settings.hue;
    const hue = (routedHue + motionTime * settings.colorShiftSpeed * 1.2) % 360;
    const tint = (alpha, shift = 0, lightness = 72) => `hsla(${(hue + shift) % 360},92%,${lightness}%,${alpha})`;
    ctx.strokeStyle = tint(.9);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = radius * .16;
    ctx.lineWidth = Math.max(1, radius * .018);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (["soft", "hard", "halo", "bokeh", "lens"].includes(settings.bloomShape)) {
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      if (settings.bloomShape === "halo") {
        gradient.addColorStop(0, tint(0));
        gradient.addColorStop(.50, tint(0));
        gradient.addColorStop(.67, tint(.65, 12));
        gradient.addColorStop(.73, "rgba(255,255,255,.85)");
        gradient.addColorStop(.81, tint(.28, -18));
      } else {
        gradient.addColorStop(0, "rgba(255,255,255,.88)");
        gradient.addColorStop(settings.bloomShape === "hard" ? .24 : .08, tint(.74));
        gradient.addColorStop(.42, tint(.24, 14));
        gradient.addColorStop(.72, tint(.06, 28));
      }
      gradient.addColorStop(1, tint(0, 28));
      ctx.fillStyle = gradient;
      if (settings.bloomShape === "lens") {
        ctx.translate(x, y); ctx.scale(1.65, .24); ctx.translate(-x, -y);
      }
      ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
      if (settings.bloomShape === "bokeh") {
        ctx.shadowBlur = radius * .035;
        for (let i = 0; i < 8; i++) {
          const phase = i * 2.39996 + motionTime * (.025 + i * .004);
          const distance = radius * (.34 + i * .075);
          ctx.fillStyle = tint(.08, i * 13);
          ctx.strokeStyle = tint(.32, i * 13);
          ctx.beginPath();
          ctx.arc(x + Math.cos(phase) * distance, y + Math.sin(phase) * distance * .7, radius * (.045 + i * .009), 0, Math.PI * 2);
          ctx.fill(); ctx.stroke();
        }
      }
    } else if (["ring", "prism"].includes(settings.bloomShape)) {
      const count = settings.bloomShape === "prism" ? 4 : 3;
      for (let i = 1; i <= count; i++) {
        ctx.strokeStyle = tint(.8 - i * .13, i * 26);
        ctx.lineWidth = Math.max(.75, radius * (.018 - i * .002));
        ctx.beginPath();
        const ringRadius = radius * i / count;
        if (settings.bloomShape === "prism") {
          for (let point = 0; point < 6; point++) {
            const angle = point * Math.PI / 3 + motionTime * .045 + i * .06;
            const px = x + Math.cos(angle) * ringRadius, py = y + Math.sin(angle) * ringRadius;
            if (point === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.closePath();
        } else ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else {
      const rays = settings.bloomShape === "sunburst" ? 20 : settings.bloomShape === "sparkle" ? 8 : settings.bloomShape === "cross" ? 4 : 12;
      for (let i = 0; i < rays; i++) {
        const angle = i * Math.PI * 2 / rays;
        const length = radius * (i % 2 ? .58 : 1);
        const endX = x + Math.cos(angle) * length, endY = y + Math.sin(angle) * length;
        const ray = ctx.createLinearGradient(x, y, endX, endY);
        ray.addColorStop(0, "rgba(255,255,255,.86)");
        ray.addColorStop(.25, tint(.64));
        ray.addColorStop(1, tint(0, 18));
        ctx.strokeStyle = ray;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(endX, endY); ctx.stroke();
      }
    }
    ctx.restore();
  }

  function frame(timestamp) {
    const now = Number.isFinite(timestamp) ? timestamp : performance.now();
    const dt = previousFrameTime ? Math.max(.001, Math.min(.05, (now - previousFrameTime) / 1000)) : 1 / 60;
    previousFrameTime = now;
    const procedural = document.getElementById("glcanvas");
    const visualizer = document.querySelector("#preview-3d canvas");
    const visualizerActive = Boolean(visualizer && visualizer.dataset.active !== "false");
    const layerOrdered = visualizerActive && visualizer.dataset.layerOrdered === "true";
    const proceduralActive = procedural?.dataset.active === "true";
    const activeLayers = [
      visualizerActive ? visualizer : null,
      proceduralActive && !layerOrdered ? procedural : null,
    ].filter(Boolean);
    const overlayState = window.__shamonsoftOverlay?.state;
    const overlayActive = Boolean(overlayState?.enabled && (overlayState.text || overlayState.subtitle
      || (overlayState.logoEnabled && overlayState.logoDataUrl) || overlayState.guides));
    const reference = activeLayers[0] || ((overlayActive || captureWidth) ? visualizer || procedural || canvas : null);
    if (!reference) {
      [visualizer, procedural].filter(Boolean).forEach(layer => { layer.style.visibility = ""; });
      if (canvas.width && canvas.height) ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.style.display = "none";
      requestAnimationFrame(frame);
      return;
    }
    const heldWidth = canvas.width, heldHeight = canvas.height;
    if (frozen && heldWidth && heldHeight) {
      freezeBuffer.width = heldWidth; freezeBuffer.height = heldHeight;
      freezeCtx.clearRect(0, 0, heldWidth, heldHeight);
      freezeCtx.drawImage(canvas, 0, 0);
    }
    resize(reference);
    const width = canvas.width, height = canvas.height;
    [visualizer, procedural].filter(Boolean).forEach(layer => { layer.style.visibility = "hidden"; });
    canvas.style.display = "block";
    if (frozen) {
      if (heldWidth && heldHeight && (width !== heldWidth || height !== heldHeight)) ctx.drawImage(freezeBuffer, 0, 0, width, height);
      requestAnimationFrame(frame); return;
    }
    elapsedTime += dt;
    motionTime += dt * (window.__shamonsoftMotionSafety?.animationFactor?.() ?? 1);
    const targetEnergy = audioEnergy();
    smoothedEnergy += (targetEnergy - smoothedEnergy) * (1 - Math.exp(-dt / (targetEnergy > smoothedEnergy ? .045 : .22)));
    const energy = smoothedEnergy;

    // Text/image overlays are independent layers, not visualizer decorations.
    // Use a transparent source when only an overlay is enabled.
    if (!activeLayers.length) mixCtx.clearRect(0, 0, width, height);
    let source = activeLayers[0] || mixBuffer;
    const proceduralOpacity = window.__shamonsoftSceneCatalog?.opacity?.() ?? .25;
    if (activeLayers.length > 1 || (proceduralActive && !layerOrdered && proceduralOpacity < 1)) {
      mixCtx.clearRect(0, 0, width, height);
      mixCtx.globalAlpha = 1;
      mixCtx.globalCompositeOperation = "source-over";
      if (visualizerActive) mixCtx.drawImage(visualizer, 0, 0, width, height);
      if (proceduralActive) {
        mixCtx.globalCompositeOperation = visualizerActive ? "screen" : "source-over";
        mixCtx.globalAlpha = (visualizerActive ? .74 : 1) * proceduralOpacity;
        mixCtx.drawImage(procedural, 0, 0, width, height);
      }
      mixCtx.globalAlpha = 1;
      mixCtx.globalCompositeOperation = "source-over";
      source = mixBuffer;
    }

    if (!isEnabled()) {
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(source, 0, 0, width, height);
      window.__shamonsoftVideoOverlay?.draw?.(ctx, width, height);
      if (!layerOrdered) window.__shamonsoftOverlay?.draw?.(ctx, width, height, energy, elapsedTime);
      requestAnimationFrame(frame);
      return;
    }

    const routedFeedback = Math.max(0, Math.min(.96, (window.__shamonsoftAudioRouter?.value?.("Post Feedback", settings.feedback * 100) ?? settings.feedback * 100) / 100));
    if (routedFeedback > .001) {
      bufferCtx.clearRect(0, 0, width, height); bufferCtx.drawImage(canvas, 0, 0);
      ctx.clearRect(0, 0, width, height); ctx.globalAlpha = Math.pow(routedFeedback * .94, dt * 60);
      const zoom = Math.pow(1 + routedFeedback * .008, dt * 60);
      ctx.drawImage(buffer, -(width * (zoom - 1)) / 2, -(height * (zoom - 1)) / 2, width * zoom, height * zoom);
      ctx.globalAlpha = 1 - Math.pow(routedFeedback * .46, dt * 60);
    } else {
      ctx.clearRect(0, 0, width, height); ctx.globalAlpha = 1;
    }
    if (!layerOrdered && settings.backgroundPosition === "back") drawBackgroundMedia(width, height);
    const routedHue = window.__shamonsoftAudioRouter?.value?.("Post Hue", settings.hue) ?? settings.hue;
    const animatedHue = routedHue + motionTime * settings.colorShiftSpeed;
    ctx.save();
    applySourceMask(width, height);
    ctx.globalAlpha *= settings.sourceOpacity;
    ctx.globalCompositeOperation = settings.sourceBlend;
    ctx.filter = `brightness(${settings.brightness}) saturate(${settings.saturation}) contrast(${settings.contrast}) blur(${settings.blur}px) hue-rotate(${animatedHue}deg)`;
    drawMirror(source, settings.mirror, width, height);
    ctx.restore();
    ctx.filter = "none"; ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    if (!layerOrdered && settings.backgroundPosition === "front") drawBackgroundMedia(width, height);
    if (!layerOrdered && window.__shamonsoftOverlay?.state?.position === "pre") window.__shamonsoftOverlay.draw(ctx, width, height, energy, elapsedTime);
    postEffects(width, height, energy);
    window.__shamonsoftVideoOverlay?.draw?.(ctx, width, height);
    if (!layerOrdered && window.__shamonsoftOverlay?.state?.position !== "pre") window.__shamonsoftOverlay?.draw?.(ctx, width, height, energy, elapsedTime);
    requestAnimationFrame(frame);
  }

  async function snapshot() { throw new Error('Feature locked in demo'); }

  function setCaptureSize(width, height) {
    captureWidth = Number.isFinite(Number(width)) ? Math.max(64, Math.min(7680, Math.round(Number(width)))) : 0;
    captureHeight = Number.isFinite(Number(height)) ? Math.max(64, Math.min(7680, Math.round(Number(height)))) : 0;
    if (window.__shamonsoftPerformance)
      window.__shamonsoftPerformance.captureActive = Boolean(captureWidth && captureHeight);
    if (captureWidth && captureHeight) { resize(canvas); canvas.style.display = "block"; }
  }

  function setFrozen(value) { frozen = Boolean(value); return frozen; }
  function toggleFrozen() { return setFrozen(!frozen); }

  window.__shamonsoftCompositor = { canvas, settings, snapshot, setCaptureSize, captureSize: () => ({ width: captureWidth, height: captureHeight }), setFrozen, toggleFrozen, isFrozen: () => frozen,
    drawBackgroundMedia: (output, width, height) => drawBackgroundMedia(width, height, output) };
  requestAnimationFrame(frame);
})();
