(function () {
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function sliderPercent(value, fallback = 50) {
    return clamp((value ?? fallback) / 100, 0, 1);
  }

  // Opacity belongs to the material inside a shape. Its outline is
  // painted separately so 0% leaves a visible shell instead of fading out.
  function interiorOpacity(value) {
    return sliderPercent(value, 100);
  }

  function centered(value, fallback = 50) {
    return clamp(((value ?? fallback) - 50) / 50, -1, 1);
  }

  function baselineRange(value, baseline, min, max) {
    const numeric = value ?? 50;
    if (numeric <= 50) {
      return lerp(min, baseline, numeric / 50);
    }
    return lerp(baseline, max, (numeric - 50) / 50);
  }

  // Preserve the accepted midpoint while giving creative controls real reach.
  // Hue and opacity keep their physical endpoints; counts stay bounded.
  function visualRange(key, value, baseline, min, max) {
    if (["amount", "bars", "count", "density"].includes(key)) {
      return baselineRange(value, baseline, min === 0 ? 0 : Math.max(3, min * 0.55), max * 1.5);
    }
    if (!["spread", "spacing", "scale", "size", "width", "height", "depth", "shape", "thickness", "intensity", "motion", "speed", "glow"].includes(key)) {
      return baselineRange(value, baseline, min, max);
    }
    if (min > max) return baselineRange(value, baseline, min * 1.5, Math.max(2, max * 0.5));
    const low = ["motion", "speed", "glow", "intensity", "height"].includes(key) ? 0 : Math.max(0.08, min * 0.25);
    const high = key === "thickness" ? Math.min(1.35, max * 1.45) : baseline + (max - baseline) * 3;
    return baselineRange(value, baseline, low, high);
  }

  function screenRadius(value, baseline, width) {
    const t = sliderPercent(value, 50);
    return t <= 0.5 ? lerp(baseline * 0.12, baseline, t * 2)
      : lerp(baseline, Math.max(baseline, width * 0.56), (t - 0.5) * 2);
  }

  function wrapHue(value) {
    return ((value % 360) + 360) % 360;
  }

  function animatedRgbHue(controls, effectId, baseHue, flowOffset, frameOffset) {
    if (!controls.randomize?.[effectId]) return baseHue;
    const mode = controls.rgbModes?.[effectId] || "flow";
    const safetyFactor = window.__shamonsoftMotionSafety?.animationFactor?.() ?? 1;
    return baseHue + (mode === "flow" ? flowOffset : 0) + frameOffset * safetyFactor;
  }

  function resolveBackgroundMode(background) {
    if (background?.white) {
      return "white";
    }
    if (background?.black) {
      return "black";
    }
    return "color";
  }

  function normalizeEffectName(name) {
    return String(name || "").trim().toLowerCase();
  }

  const EFFECT_MODE_MAP = {
    "bars": "glassBars",
    "ribbons": "glassWavelength",
    "tunnel": "sonicRunway",
    "sonic runway": "sonicRunway",
    "rings": "radialPulse",
    "spectrum ring": "radialPulse",
    "kaleidoscope": "radialPulse",
    "mandala": "radialPulse",
    "vortex": "radialPulse",
    "radar sweep": "radialPulse",
    "orbit": "orbitBloom",
    "petals": "orbitBloom",
    "starburst": "orbitBloom",
    "constellation": "orbitBloom",
    "lattice": "latticeField",
    "nebula": "orbitBloom",
    "spiral": "sonicRunway",
    "waveform": "glassWavelength",
    "equalizer wall": "glassBars",
    "liquid pulse": "radialPulse",
    "grid wave": "latticeField",
  };

  function resolveMainMode(name) {
    const normalized = normalizeEffectName(name);
    if (EFFECT_MODE_MAP[normalized]) {
      return { id: EFFECT_MODE_MAP[normalized], variant: normalized };
    }
    if (normalized.includes("runway") || normalized.includes("tunnel")) {
      return { id: "sonicRunway", variant: normalized };
    }
    if (normalized.includes("ring") || normalized.includes("radar") || normalized.includes("mandala") || normalized.includes("vortex")) {
      return { id: "radialPulse", variant: normalized };
    }
    if (normalized.includes("orbit") || normalized.includes("petal") || normalized.includes("star") || normalized.includes("constellation")) {
      return { id: "orbitBloom", variant: normalized };
    }
    if (normalized.includes("lattice")) {
      return { id: "latticeField", variant: normalized };
    }
    if (normalized.includes("ribbon")) {
      return { id: "glassWavelength", variant: normalized };
    }
    return { id: "glassBars", variant: normalized };
  }

  function resolveMaterialKind(name) {
    const normalized = String(name || "").trim().toLowerCase();
    if (normalized.includes("chrome")) {
      return "chrome";
    }
    if (normalized.includes("glass")) {
      return "glass";
    }
    return "solid";
  }

  function accentHue(materialName, baseHue, shift = 0) {
    if (resolveMaterialKind(materialName) === "chrome") {
      return wrapHue(210 + shift * 0.18);
    }
    return wrapHue(baseHue + shift);
  }

  function alphaForMaterial(materialName, glassAlpha, chromeAlpha) {
    return resolveMaterialKind(materialName) === "chrome" ? chromeAlpha : glassAlpha;
  }

  function effectValue(controls, effectId, key, fallback) {
    return controls.effectValues?.[effectId]?.[key] ?? fallback;
  }

  function buildParticlePath(ctx, shape, size) {
    const radius = size * 0.5;
    ctx.beginPath();
    switch (shape) {
      case "Cube":
      case "Square":
        ctx.rect(-radius, -radius, size, size);
        break;
      case "Diamond":
        ctx.moveTo(0, -radius);
        ctx.lineTo(radius, 0);
        ctx.lineTo(0, radius);
        ctx.lineTo(-radius, 0);
        ctx.closePath();
        break;
      case "Triangle":
        ctx.moveTo(0, -radius);
        ctx.lineTo(radius, radius);
        ctx.lineTo(-radius, radius);
        ctx.closePath();
        break;
      case "Hex":
        buildPolygonPath(ctx, 6, radius);
        break;
      case "Octagon":
        buildPolygonPath(ctx, 8, radius);
        break;
      case "Star":
        for (let index = 0; index < 10; index += 1) {
          const angle = -Math.PI / 2 + (index / 10) * Math.PI * 2;
          const length = index % 2 === 0 ? radius : radius * 0.42;
          const x = Math.cos(angle) * length;
          const y = Math.sin(angle) * length;
          if (index === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();
        break;
      case "Cross":
      case "Plus":
        ctx.moveTo(-radius * 0.22, -radius);
        ctx.lineTo(radius * 0.22, -radius);
        ctx.lineTo(radius * 0.22, -radius * 0.22);
        ctx.lineTo(radius, -radius * 0.22);
        ctx.lineTo(radius, radius * 0.22);
        ctx.lineTo(radius * 0.22, radius * 0.22);
        ctx.lineTo(radius * 0.22, radius);
        ctx.lineTo(-radius * 0.22, radius);
        ctx.lineTo(-radius * 0.22, radius * 0.22);
        ctx.lineTo(-radius, radius * 0.22);
        ctx.lineTo(-radius, -radius * 0.22);
        ctx.lineTo(-radius * 0.22, -radius * 0.22);
        ctx.closePath();
        break;
      case "X": {
        // Rotate the cross's vertices, not the context: each material pass
        // must retain the same local coordinates and lighting.
        const arm = radius * 0.22, c = Math.SQRT1_2;
        const points = [[-arm,-radius],[arm,-radius],[arm,-arm],[radius,-arm],
          [radius,arm],[arm,arm],[arm,radius],[-arm,radius],
          [-arm,arm],[-radius,arm],[-radius,-arm],[-arm,-arm]];
        points.forEach(([x,y],index) => {
          const rx = (x-y)*c, ry = (x+y)*c;
          if (index === 0) ctx.moveTo(rx,ry); else ctx.lineTo(rx,ry);
        });
        ctx.closePath();
        break;
      }
      case "Spark":
        for (let index = 0; index < 8; index += 1) {
          const angle = -Math.PI / 2 + index * Math.PI / 4;
          const length = index % 2 === 0 ? radius : radius * 0.18;
          const x = Math.cos(angle)*length, y = Math.sin(angle)*length;
          if (index === 0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
        }
        ctx.closePath();
        break;
      case "Line":
        // A closed slim glass rod, so fill, clipping and opacity still work.
        ctx.rect(-radius * 0.16, -radius, size * 0.16, size);
        break;
      case "Shard":
        ctx.moveTo(-radius * 0.18, -radius);
        ctx.lineTo(radius * 0.52, -radius * 0.12);
        ctx.lineTo(radius * 0.12, radius);
        ctx.lineTo(-radius * 0.48, radius * 0.18);
        ctx.closePath();
        break;
      case "Ring":
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        break;
      default:
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        break;
    }
  }

  function buildPolygonPath(ctx, sides, radius) {
    for (let index = 0; index < sides; index += 1) {
      const angle = -Math.PI / 2 + (index / sides) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
  }

  function renderParticleShape(ctx, shape, x, y, size, hue, tilt, bodyOpacity = 1) {
    const radius = size * 0.5;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);

    const bodyGradient = ctx.createLinearGradient(-radius, -radius, radius, radius);
    bodyGradient.addColorStop(0, `hsla(${wrapHue(hue - 16)}, 100%, 96%, 0.78)`);
    bodyGradient.addColorStop(0.34, `hsla(${wrapHue(hue - 2)}, 96%, 80%, 0.34)`);
    bodyGradient.addColorStop(0.68, `hsla(${wrapHue(hue + 10)}, 92%, 62%, 0.18)`);
    bodyGradient.addColorStop(1, `hsla(${wrapHue(hue + 18)}, 96%, 56%, 0.08)`);

    if (shape === "Ring") {
      const points = Array.from({ length: 72 }, (_, i) => ({ x: Math.cos(i / 72 * TAU) * radius * 0.9, y: Math.sin(i / 72 * TAU) * radius * 0.9 }));
      ribbonSurface(ctx, points, size * 0.13, hue, "Glass Bubble", bodyOpacity, 0, true);
      ctx.restore();
      return;
    }

    buildParticlePath(ctx, shape, size);
    ctx.fillStyle = bodyGradient;
    ctx.globalAlpha = bodyOpacity;
    ctx.fill();

    buildParticlePath(ctx, shape, size);
    ctx.clip();

    const colorWash = ctx.createRadialGradient(-radius * 0.24, -radius * 0.3, radius * 0.08, 0, 0, radius * 1.2);
    colorWash.addColorStop(0, `hsla(${wrapHue(hue - 14)}, 100%, 98%, 0.52)`);
    colorWash.addColorStop(0.36, `hsla(${wrapHue(hue + 4)}, 96%, 76%, 0.18)`);
    colorWash.addColorStop(1, `hsla(${wrapHue(hue + 16)}, 92%, 54%, 0)`);
    ctx.fillStyle = colorWash;
    ctx.fillRect(-radius * 1.2, -radius * 1.2, size * 2.4, size * 2.4);

    const refractionBand = ctx.createLinearGradient(-radius * 0.95, -radius * 0.9, radius * 0.7, radius * 0.9);
    refractionBand.addColorStop(0, "rgba(255,255,255,0.48)");
    refractionBand.addColorStop(0.18, "rgba(255,255,255,0.16)");
    refractionBand.addColorStop(0.55, "rgba(255,255,255,0.04)");
    refractionBand.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = refractionBand;
    ctx.fillRect(-radius, -radius, size * 1.65, size * 1.65);

    const bottomTint = ctx.createLinearGradient(0, radius * 0.05, 0, radius);
    bottomTint.addColorStop(0, "rgba(255,255,255,0)");
    bottomTint.addColorStop(1, `hsla(${wrapHue(hue + 10)}, 100%, 58%, 0.16)`);
    ctx.fillStyle = bottomTint;
    ctx.fillRect(-radius, -radius, size * 2, size * 2);

    ctx.restore();
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);

    buildParticlePath(ctx, shape, size);
    ctx.lineWidth = Math.max(1, size * 0.042);
    ctx.strokeStyle = `hsla(${wrapHue(hue + 6)}, 100%, 96%, 0.86)`;
    ctx.stroke();

    buildParticlePath(ctx, shape, size * 0.82);
    ctx.lineWidth = Math.max(0.8, size * 0.024);
    ctx.strokeStyle = `hsla(${wrapHue(hue - 12)}, 100%, 92%, 0.26)`;
    ctx.stroke();

    const highlightGradient = ctx.createLinearGradient(-radius * 0.72, -radius * 0.78, radius * 0.28, radius * 0.38);
    highlightGradient.addColorStop(0, "rgba(255,255,255,0.68)");
    highlightGradient.addColorStop(0.32, "rgba(255,255,255,0.18)");
    highlightGradient.addColorStop(1, "rgba(255,255,255,0)");
    buildParticlePath(ctx, shape, size * 0.62);
    ctx.fillStyle = highlightGradient;
    ctx.globalAlpha = bodyOpacity;
    ctx.fill();

    const hotSpotGradient = ctx.createRadialGradient(-radius * 0.2, -radius * 0.26, 0, -radius * 0.2, -radius * 0.26, radius * 0.36);
    hotSpotGradient.addColorStop(0, "rgba(255,255,255,0.58)");
    hotSpotGradient.addColorStop(0.45, "rgba(255,255,255,0.12)");
    hotSpotGradient.addColorStop(1, "rgba(255,255,255,0)");
    buildParticlePath(ctx, shape, size * 0.34);
    ctx.fillStyle = hotSpotGradient;
    ctx.fill();

    ctx.restore();
  }

  const particleSpriteCache = new Map();
  function cachedParticleSprite(shape, hue, trail = false, bodyOpacity = 1) {
    const hueBucket = Math.round(wrapHue(hue) / 12) * 12;
    const opacityBucket = Math.round(bodyOpacity * 100);
    const key = `${trail ? "trail" : "main"}|${shape}|${hueBucket}|${opacityBucket}`;
    let sprite = particleSpriteCache.get(key);
    if (sprite) return sprite;
    // Evict incrementally; clearing a populated cache caused periodic RGB hitches.
    if (particleSpriteCache.size >= 240) particleSpriteCache.delete(particleSpriteCache.keys().next().value);
    const baseSize = 96;
    sprite = document.createElement("canvas");
    sprite.width = sprite.height = 144;
    sprite._baseSize = baseSize;
    const spriteContext = sprite.getContext("2d");
    if (trail) renderParticleTrailShape(spriteContext, shape, 72, 72, baseSize, hueBucket, 0, 1, bodyOpacity);
    else renderParticleShape(spriteContext, shape, 72, 72, baseSize, hueBucket, 0, bodyOpacity);
    particleSpriteCache.set(key, sprite);
    return sprite;
  }

  function drawParticleShape(ctx, shape, x, y, size, hue, tilt, bodyOpacity = 1) {
    const sprite = cachedParticleSprite(shape, hue, false, bodyOpacity);
    const scale = size / sprite._baseSize;
    const drawSize = sprite.width * scale;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);
    ctx.drawImage(sprite, -drawSize * .5, -drawSize * .5, drawSize, drawSize);
    ctx.restore();
  }

  function renderParticleTrailShape(ctx, shape, x, y, size, hue, tilt, alpha, bodyOpacity = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);
    ctx.globalAlpha = alpha;
    buildParticlePath(ctx, shape, size);
    if (shape === "Ring") {
      ctx.lineWidth = Math.max(1, size * 0.12);
      ctx.strokeStyle = `hsla(${wrapHue(hue)}, 100%, 82%, 0.72)`;
      ctx.stroke();
    } else {
      ctx.fillStyle = `hsla(${wrapHue(hue)}, 96%, 68%, 0.52)`;
      ctx.globalAlpha = alpha * bodyOpacity;
      ctx.fill();
      ctx.globalAlpha = alpha;
      ctx.lineWidth = Math.max(0.7, size * 0.045);
      ctx.strokeStyle = `hsla(${wrapHue(hue - 8)}, 100%, 94%, 0.58)`;
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawParticleTrailShape(ctx, shape, x, y, size, hue, tilt, alpha, bodyOpacity = 1) {
    const sprite = cachedParticleSprite(shape, hue, true, bodyOpacity);
    const scale = size / sprite._baseSize;
    const drawSize = sprite.width * scale;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(x, y);
    ctx.rotate(tilt);
    ctx.drawImage(sprite, -drawSize * .5, -drawSize * .5, drawSize, drawSize);
    ctx.restore();
  }

  function quadraticPoint(x0, y0, cx, cy, x1, y1, t) {
    const mt = 1 - t;
    return {
      x: mt * mt * x0 + 2 * mt * t * cx + t * t * x1,
      y: mt * mt * y0 + 2 * mt * t * cy + t * t * y1,
    };
  }

  function quadraticTangent(x0, y0, cx, cy, x1, y1, t) {
    return {
      x: 2 * (1 - t) * (cx - x0) + 2 * t * (x1 - cx),
      y: 2 * (1 - t) * (cy - y0) + 2 * t * (y1 - cy),
    };
  }

  function drawGlassRunwayTube(ctx, startX, startY, controlX, controlY, endX, endY, thickness, primaryHue, edgeHue, glowAmount, bodyOpacity = 1) {
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const glowStroke = ctx.createLinearGradient(startX, controlY, endX, endY);
    glowStroke.addColorStop(0, `hsla(${edgeHue}, 100%, 84%, ${0.04 + glowAmount * 0.06})`);
    glowStroke.addColorStop(0.5, `hsla(${primaryHue}, 100%, 78%, ${0.07 + glowAmount * 0.08})`);
    glowStroke.addColorStop(1, `hsla(${edgeHue}, 100%, 72%, ${0.04 + glowAmount * 0.04})`);
    ctx.strokeStyle = glowStroke;
    ctx.globalAlpha *= bodyOpacity;
    ctx.lineWidth = thickness * 1.75;
    ctx.shadowBlur = 10 + glowAmount * 16 + thickness * 0.28;
    ctx.shadowColor = `hsla(${edgeHue}, 100%, 74%, ${0.12 + glowAmount * 0.12})`;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(controlX, controlY, endX, endY);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const bodyStroke = ctx.createLinearGradient(startX, controlY, endX, endY);
    bodyStroke.addColorStop(0, `hsla(${wrapHue(primaryHue - 12)}, 100%, 98%, 0.42)`);
    bodyStroke.addColorStop(0.16, `hsla(${wrapHue(primaryHue - 4)}, 96%, 88%, 0.14)`);
    bodyStroke.addColorStop(0.52, `hsla(${wrapHue(primaryHue + 4)}, 94%, 72%, 0.05)`);
    bodyStroke.addColorStop(1, `hsla(${wrapHue(edgeHue + 4)}, 100%, 84%, 0.22)`);
    ctx.strokeStyle = bodyStroke;
    ctx.globalAlpha *= bodyOpacity;
    ctx.lineWidth = thickness * 1.36;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(controlX, controlY, endX, endY);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const highlightStroke = ctx.createLinearGradient(startX, controlY, endX, endY);
    highlightStroke.addColorStop(0, "rgba(255,255,255,0.9)");
    highlightStroke.addColorStop(0.14, "rgba(255,255,255,0.28)");
    highlightStroke.addColorStop(0.42, "rgba(255,255,255,0.08)");
    highlightStroke.addColorStop(1, "rgba(255,255,255,0)");
    ctx.strokeStyle = highlightStroke;
    ctx.lineWidth = Math.max(1, thickness * 0.18);
    ctx.beginPath();
    ctx.moveTo(startX - thickness * 0.1, startY);
    ctx.quadraticCurveTo(controlX - thickness * 0.22, controlY - thickness * 0.42, endX - thickness * 0.18, endY);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const innerCore = ctx.createLinearGradient(startX, controlY, endX, endY);
    innerCore.addColorStop(0, `hsla(${wrapHue(edgeHue - 8)}, 100%, 96%, 0.18)`);
    innerCore.addColorStop(0.2, `hsla(${wrapHue(primaryHue)}, 100%, 90%, 0.08)`);
    innerCore.addColorStop(0.6, `hsla(${wrapHue(primaryHue + 6)}, 100%, 74%, 0.02)`);
    innerCore.addColorStop(1, "rgba(255,255,255,0)");
    ctx.strokeStyle = innerCore;
    ctx.globalAlpha *= bodyOpacity;
    ctx.lineWidth = Math.max(0.8, thickness * 0.08);
    ctx.beginPath();
    ctx.moveTo(startX + thickness * 0.02, startY);
    ctx.quadraticCurveTo(controlX + thickness * 0.04, controlY, endX + thickness * 0.02, endY);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = `hsla(${edgeHue}, 100%, 97%, 0.72)`;
    ctx.lineWidth = Math.max(0.8, thickness * 0.06);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(controlX, controlY, endX, endY);
    ctx.stroke();
    ctx.restore();
  }

  function drawPolishedStroke(ctx, tracePath, width, bodyStyle, rimStyle, highlightStyle, glowStyle, glowAmount = 1, bodyOpacity = 1) {
    const bodyWidth = Math.max(1.8, width);
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    tracePath();
    ctx.globalAlpha = 0.28 * bodyOpacity;
    ctx.strokeStyle = glowStyle;
    ctx.shadowColor = glowStyle;
    ctx.shadowBlur = 10 + glowAmount * 16;
    ctx.lineWidth = bodyWidth * 1.9;
    ctx.stroke();

    tracePath();
    ctx.globalAlpha = 0.96 * bodyOpacity;
    ctx.shadowBlur = 5 + glowAmount * 8;
    ctx.strokeStyle = bodyStyle;
    ctx.lineWidth = bodyWidth;
    ctx.stroke();

    tracePath();
    ctx.globalAlpha = 0.92;
    ctx.shadowBlur = 0;
    ctx.strokeStyle = rimStyle;
    ctx.lineWidth = Math.max(1, bodyWidth * 0.28);
    ctx.stroke();

    tracePath();
    ctx.globalAlpha = 0.58;
    ctx.strokeStyle = highlightStyle;
    ctx.lineWidth = Math.max(0.7, bodyWidth * 0.1);
    ctx.stroke();
    ctx.restore();
  }

  function drawPolishedOrb(ctx, x, y, radius, hue, materialName, glowAmount = 1, alpha = 1, bodyOpacity = 1) {
    const materialKind = resolveMaterialKind(materialName);
    const chrome = materialKind === "chrome";
    const glass = materialKind === "glass";
    const size = Math.max(0.85, radius);
    ctx.save();
    ctx.globalAlpha = alpha;

    const bloom = ctx.createRadialGradient(x, y, size * 0.15, x, y, size * 2.8);
    bloom.addColorStop(0, chrome
      ? "rgba(246,250,255,0.56)"
      : `hsla(${hue}, 100%, 82%, 0.62)`);
    bloom.addColorStop(0.34, chrome
      ? "rgba(176,195,220,0.18)"
      : `hsla(${hue + 10}, 96%, 64%, 0.2)`);
    bloom.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = bloom;
    ctx.globalAlpha = alpha * bodyOpacity * clamp(glowAmount, 0, 1);
    ctx.fillRect(x - size * 3, y - size * 3, size * 6, size * 6);

    const body = ctx.createRadialGradient(x - size * 0.3, y - size * 0.34, size * 0.05, x, y, size);
    if (chrome) {
      body.addColorStop(0, "rgba(255,255,255,0.99)");
      body.addColorStop(0.28, "rgba(202,216,235,0.98)");
      body.addColorStop(0.62, "rgba(75,91,116,0.98)");
      body.addColorStop(1, "rgba(22,30,45,0.99)");
    } else if (glass) {
      body.addColorStop(0, "rgba(255,255,255,0.86)");
      body.addColorStop(0.24, `hsla(${hue - 8}, 100%, 94%, 0.5)`);
      body.addColorStop(0.58, `hsla(${hue + 8}, 100%, 72%, 0.14)`);
      body.addColorStop(1, `hsla(${hue + 18}, 100%, 88%, 0.34)`);
    } else {
      body.addColorStop(0, `hsla(${hue - 10}, 100%, 96%, 0.99)`);
      body.addColorStop(0.28, `hsla(${hue}, 98%, 72%, 0.98)`);
      body.addColorStop(0.65, `hsla(${hue + 10}, 92%, 43%, 0.98)`);
      body.addColorStop(1, `hsla(${hue + 18}, 90%, 23%, 0.99)`);
    }
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = body;
    ctx.globalAlpha = alpha * bodyOpacity;
    ctx.shadowBlur = glowAmount * 10;
    ctx.shadowColor = chrome ? "rgba(210,226,248,0.34)" : `hsla(${hue}, 100%, 70%, 0.46)`;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = chrome ? "rgba(248,251,255,0.92)" : `hsla(${hue - 6}, 100%, 92%, 0.9)`;
    ctx.lineWidth = Math.max(0.55, size * 0.065);
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(x - size * 0.28, y - size * 0.32, size * 0.24, size * 0.13, -0.55, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.globalAlpha = alpha * bodyOpacity;
    ctx.fill();
    ctx.restore();
  }

  // Shared geometry keeps color, body transmission and edge lighting independent.
  const TAU = Math.PI * 2;
  function smoothUnit(value) {
    const t = clamp(value, 0, 1);
    return t * t * (3 - 2 * t);
  }
  function spectrumAt(levels, position) {
    if (!levels.length) return 0;
    const sample = clamp(position, 0, 1) * (levels.length - 1);
    const index = Math.floor(sample);
    return lerp(levels[index] || 0, levels[Math.min(index + 1, levels.length - 1)] || 0, sample - index);
  }
  function periodicSpectrum(levels, turn) {
    // Low frequencies meet at both ends; no discontinuity at the circular seam.
    const t = ((turn % 1) + 1) % 1;
    return spectrumAt(levels, 1 - Math.abs(t * 2 - 1));
  }
  function seededUnit(index, salt = 0) {
    const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453123;
    return value - Math.floor(value);
  }
  function traceSmooth(ctx, points, closed = false) {
    ctx.beginPath();
    if (!points.length) return;
    ctx.moveTo(points[0].x, points[0].y);
    const count = points.length;
    const at = index => points[closed ? (index + count) % count : clamp(index, 0, count - 1)];
    for (let i = 0; i < count - (closed ? 0 : 1); i += 1) {
      const a = at(i - 1), b = at(i), c = at(i + 1), d = at(i + 2);
      ctx.bezierCurveTo(b.x + (c.x - a.x) / 6, b.y + (c.y - a.y) / 6,
        c.x - (d.x - b.x) / 6, c.y - (d.y - b.y) / 6, c.x, c.y);
    }
    if (closed) ctx.closePath();
  }
  function materialColor(material, hue, lightness, alpha = 1) {
    const chrome = resolveMaterialKind(material) === "chrome";
    return `hsla(${wrapHue(chrome ? 215 + (hue - 220) * 0.055 : hue)}, ${chrome ? 9 : 88}%, ${lightness}%, ${clamp(alpha, 0, 1)})`;
  }
  function ribbonSurface(ctx, points, width, hue, material, opacity, glow = 0, closed = false) {
    if (points.length < 2) return;
    const left = [], right = [];
    const n = points.length;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < n; i += 1) {
      const point = points[i];
      const before = points[closed ? (i + n - 1) % n : Math.max(0, i - 1)];
      const after = points[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
      const dx = after.x - before.x, dy = after.y - before.y;
      const inverse = 1 / Math.max(0.001, Math.hypot(dx, dy));
      const half = Math.max(0.5, (point.width ?? width) * 0.5);
      const nx = -dy * inverse * half, ny = dx * inverse * half;
      left.push({ x: point.x + nx, y: point.y + ny });
      right.push({ x: point.x - nx, y: point.y - ny });
      minX = Math.min(minX, point.x - half); maxX = Math.max(maxX, point.x + half);
      minY = Math.min(minY, point.y - half); maxY = Math.max(maxY, point.y + half);
    }
    ctx.save();
    const inheritedAlpha = ctx.globalAlpha;
    const glass = resolveMaterialKind(material) === "glass";
    const fill = ctx.createLinearGradient(minX, minY, maxX + 0.001, maxY + 0.001);
    fill.addColorStop(0, materialColor(material, hue - 10, 78, glass ? 0.62 : 1));
    fill.addColorStop(0.34, materialColor(material, hue, 47, glass ? 0.19 : 1));
    fill.addColorStop(0.65, materialColor(material, hue + 12, 33, glass ? 0.1 : 1));
    fill.addColorStop(1, materialColor(material, hue + 24, 67, glass ? 0.52 : 1));
    // Fill both rails as one polygon. Only the interior and its bloom lose alpha.
    ctx.beginPath();
    ctx.moveTo(left[0].x, left[0].y);
    for (let i = 1; i < n; i += 1) ctx.lineTo(left[i].x, left[i].y);
    if (closed) ctx.lineTo(left[0].x, left[0].y);
    if (closed) ctx.moveTo(right[n - 1].x, right[n - 1].y);
    else ctx.lineTo(right[n - 1].x, right[n - 1].y);
    for (let i = n - 2; i >= 0; i -= 1) ctx.lineTo(right[i].x, right[i].y);
    ctx.closePath();
    ctx.globalAlpha = inheritedAlpha * opacity;
    ctx.fillStyle = fill;
    ctx.shadowBlur = Math.min(22, Math.max(0, glow) * 12);
    ctx.shadowColor = materialColor(material, hue, 59, 0.42);
    ctx.fill("evenodd");
    ctx.shadowBlur = 0;
    ctx.globalAlpha = inheritedAlpha;
    ctx.lineWidth = Math.max(0.7, Math.min(1.35, width * 0.09));
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    traceSmooth(ctx, left, closed);
    ctx.strokeStyle = materialColor(material, hue - 6, 88, 0.82);
    ctx.stroke();
    traceSmooth(ctx, right, closed);
    ctx.strokeStyle = materialColor(material, hue + 18, 69, 0.58);
    ctx.stroke();
    if (!closed) {
      ctx.beginPath();
      ctx.moveTo(left[0].x, left[0].y); ctx.lineTo(right[0].x, right[0].y);
      ctx.moveTo(left[n - 1].x, left[n - 1].y); ctx.lineTo(right[n - 1].x, right[n - 1].y);
      ctx.stroke();
    }
    ctx.restore();
  }
  function membraneSurface(ctx, points, hue, material, opacity, glow = 0, edgeWidth = 1) {
    if (points.length < 3) return;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of points) {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    }
    const glass = resolveMaterialKind(material) === "glass";
    ctx.save();
    const alpha = ctx.globalAlpha;
    const fill = ctx.createLinearGradient(minX, minY, maxX + 0.001, maxY + 0.001);
    fill.addColorStop(0, materialColor(material, hue - 8, 80, glass ? 0.55 : 1));
    fill.addColorStop(0.33, materialColor(material, hue, 51, glass ? 0.22 : 1));
    fill.addColorStop(0.72, materialColor(material, hue + 16, 29, glass ? 0.09 : 1));
    fill.addColorStop(1, materialColor(material, hue + 24, 61, glass ? 0.44 : 1));
    traceSmooth(ctx, points, true);
    ctx.globalAlpha = alpha * opacity;
    ctx.fillStyle = fill;
    ctx.shadowBlur = Math.min(22, glow * 12);
    ctx.shadowColor = materialColor(material, hue, 55, 0.42);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = materialColor(material, hue - 5, 86, 0.76);
    ctx.lineWidth = Math.max(0.65, edgeWidth);
    ctx.stroke();
    ctx.restore();
  }

  class FallbackGlassBarsRenderer {
    constructor(options) {
      this.container = options.container;
      this.getBandLevels = options.getBandLevels;
      this.getIsActive = options.getIsActive;
      this.getControls = options.getControls;
      this.canvas = document.createElement("canvas");
      this.canvas.style.position = "absolute";
      this.canvas.style.inset = "0";
      this.canvas.style.width = "100%";
      this.canvas.style.height = "100%";
      this.canvas.style.display = "block";
      this.container.replaceChildren(this.canvas);
      this.context = this.canvas.getContext("2d");
      this.visualLayer = document.createElement("canvas");
      this.visualContext = this.visualLayer.getContext("2d");
      this.barCount = 64;
      this.heights = new Array(this.barCount).fill(0.28);
      this.rotationAngle = 0;
      this.animationFrame = 0;
      this.renderedFrames = 0;
      this.deltaSeconds = 1 / 60;
      this.frameStep = 1;
      this.lastFrameTime = null;
      this.motionPhases = new Map();
      this.maxParticles = 160;
      this.particles = Array.from({ length: this.maxParticles }, (_, index) => ({
        phase: seededUnit(index, 11) * Math.PI * 2,
        orbitX: 0.28 + seededUnit(index, 12) * 0.72,
        orbitY: -0.62 + seededUnit(index, 13) * 1.24,
        drift: seededUnit(index, 14) * Math.PI * 2,
        speed: 0.35 + seededUnit(index, 15) * 0.9,
        spin: (index % 2 === 0 ? 1 : -1) * (0.16 + seededUnit(index, 16) * 0.7),
        x: 0,
        y: 0,
        initialized: false,
      }));
      this.shockwaves = Array.from({ length: 18 }, () => ({
        active: false,
        age: 0,
        duration: 1,
        xNorm: 0,
        yNorm: 0,
        hueOffset: 0,
        strength: 0,
      }));
      this.lastShockBeat = 0;
      this.lastShockSpawnAt = -999;
      this.lastShockBass = 0;
      this.shockEnergyFloor = 0;
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(this.container);
      this.resize();
      this.tick = this.tick.bind(this);
      this.frameHandle = requestAnimationFrame(this.tick);
    }

    resize() {
      const quality = window.__shamonsoftPerformance?.captureActive
        ? 1
        : Math.max(0.5, Math.min(1.25, window.__shamonsoftPerformance?.renderScale || 1));
      const dpr = Math.max(0.5, Math.min(window.devicePixelRatio || 1, 1.5) * quality);
      const width = Math.max(1, this.container.clientWidth);
      const height = Math.max(1, this.container.clientHeight);
      this.canvas.width = Math.round(width * dpr);
      this.canvas.height = Math.round(height * dpr);
      this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.visualLayer.width = this.canvas.width;
      this.visualLayer.height = this.canvas.height;
      this.visualContext.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.width = width;
      this.height = height;
      this.renderScale = quality;
      this.canvas.dataset.active = this.canvas.dataset.active || "false";
    }

    destroy() {
      this.runwayGpu?.destroy?.();
      if (this.frameHandle) {
        cancelAnimationFrame(this.frameHandle);
      }
      this.resizeObserver.disconnect();
    }

    advanceMotionPhase(key, amount, isMoving = true) {
      const current = this.motionPhases.get(key) || 0;
      if (!isMoving) {
        return current;
      }
      const safety = window.__shamonsoftMotionSafety?.animationFactor?.() ?? 1;
      const next = current + Math.max(0, Number(amount) || 0) * this.frameStep * safety;
      this.motionPhases.set(key, next);
      return next;
    }

    drawBackground(hue, useCustomBackground, backgroundMode, brightnessValue = 65, hueSpread = 8, enabled = true, clearCustom = true) {
      const ctx = this.context;
      const brightness = sliderPercent(brightnessValue, 65);
      if (!useCustomBackground) {
        const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
        if (backgroundMode === "white") {
          gradient.addColorStop(0, "rgba(247, 250, 255, 1)");
          gradient.addColorStop(1, "rgba(233, 239, 249, 1)");
        } else if (backgroundMode === "black") {
          gradient.addColorStop(0, "#000000");
          gradient.addColorStop(1, "#000000");
        } else {
          gradient.addColorStop(0, `hsl(${hue}, 58%, ${3 + brightness * 30}%)`);
          gradient.addColorStop(1, `hsl(${hue + hueSpread}, 55%, ${2 + brightness * 18}%)`);
        }
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.width, this.height);
      } else if (clearCustom) {
        ctx.clearRect(0, 0, this.width, this.height);
      }

      if (!enabled || backgroundMode === "black") {
        return;
      }

      const bloom = ctx.createRadialGradient(
        this.width * 0.5,
        this.height * 0.52,
        0,
        this.width * 0.5,
        this.height * 0.52,
        this.width * 0.34,
      );
      const bloomAlpha = backgroundMode === "white" ? 0.1 : (useCustomBackground ? 0.11 : 0.12 + brightness * 0.36);
      const bloomLightness = backgroundMode === "white" ? 72 : 22 + brightness * 48;
      bloom.addColorStop(0, `hsla(${hue + hueSpread * 0.5}, 80%, ${bloomLightness}%, ${bloomAlpha})`);
      bloom.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = bloom;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    drawFloor(hue, glowStrength, useCustomBackground, backgroundMode, levels, controls) {
      const ctx = this.context;
      if (!controls.effects?.floorGrid) {
        return;
      }

      const gridHue = Number.isFinite(effectValue(controls, "floorGrid", "hue", hue))
        ? Number(effectValue(controls, "floorGrid", "hue", hue))
        : hue;
      const intensity = sliderPercent(effectValue(controls, "floorGrid", "intensity", 50), 50);
      const localGlow = sliderPercent(effectValue(controls, "floorGrid", "glow", 50), 50);
      const height = sliderPercent(effectValue(controls, "floorGrid", "height", 50), 50);
      const density = sliderPercent(effectValue(controls, "floorGrid", "density", 50), 50);
      const speed = sliderPercent(effectValue(controls, "floorGrid", "speed", 50), 50);
      const wave = sliderPercent(effectValue(controls, "floorGrid", "wave", 50), 50);
      const depth = sliderPercent(effectValue(controls, "floorGrid", "depth", 50), 50);
      const motion = sliderPercent(effectValue(controls, "floorGrid", "motion", 50), 50);
      const horizon = lerp(this.height * 0.86, this.height * 0.53, height);
      const floorTop = Math.min(this.height * 0.92, horizon + this.height * 0.045);
      const floorGradient = ctx.createLinearGradient(0, floorTop, 0, this.height);
      if (backgroundMode === "white") {
        floorGradient.addColorStop(0, useCustomBackground ? "rgba(240, 244, 252, 0.34)" : "rgba(240, 244, 252, 0.94)");
        floorGradient.addColorStop(1, useCustomBackground ? "rgba(225, 232, 244, 0.58)" : "rgba(225, 232, 244, 1)");
      } else if (backgroundMode === "black") {
        floorGradient.addColorStop(0, useCustomBackground ? "rgba(6, 7, 12, 0.42)" : "rgba(6, 7, 12, 0.96)");
        floorGradient.addColorStop(1, useCustomBackground ? "rgba(2, 3, 6, 0.72)" : "rgba(2, 3, 6, 1)");
      } else {
        floorGradient.addColorStop(0, useCustomBackground ? "rgba(8, 10, 24, 0.44)" : "rgba(8, 10, 24, 0.96)");
        floorGradient.addColorStop(1, useCustomBackground ? "rgba(2, 4, 10, 0.72)" : "rgba(2, 4, 10, 1)");
      }
      ctx.fillStyle = floorGradient;
      ctx.fillRect(0, floorTop, this.width, this.height - floorTop);
      const average = levels.reduce((sum, value) => sum + value, 0) / Math.max(1, levels.length);
      const beat = this.audioFeatures?.beat || 0;
      const phaseKey = "floor-grid:surface";
      const phase = this.advanceMotionPhase(phaseKey, speed * 0.035, speed > 0.001) % TAU;
      this.motionPhases.set(phaseKey, phase);
      const waveHeight = this.height * 0.16 * wave * (0.2 + height * 0.8) * (0.2 + intensity * 0.8);
      const columns = Math.round(8 + density * 34);
      const rows = Math.round(8 + density * 28);
      // Both grid directions sample ONE projected surface. Independent endpoint
      // and row waves previously broke the intersections as phases diverged.
      const project = (u, z) => {
        const p = z * z;
        const taper = lerp(0.025, 0.25, depth) + p * (1 - lerp(0.025, 0.25, depth));
        const displacement = Math.sin(phase - z * 7 + u * 2.5) * 0.65
          + Math.sin(phase * 2 + z * 4 + u * 4) * 0.35;
        return { x: this.width * 0.5 + u * this.width * 0.5 * taper,
          y: lerp(horizon, this.height + 3, p) - displacement * waveHeight * motion * Math.sin(z * Math.PI)
            - beat * waveHeight * 0.12 * Math.sin(z * Math.PI) };
      };
      ctx.save();
      ctx.beginPath(); ctx.rect(0, horizon - waveHeight, this.width, this.height - horizon + waveHeight); ctx.clip();
      const lightness = backgroundMode === "white" ? 45 : 64;
      const alpha = intensity * (0.36 + average * 0.08);
      const color = animatedRgbHue(controls, "floorGrid", gridHue, 0, this.animationFrame * 0.7);
      ctx.lineWidth = 0.45 + intensity * 1.9;
      ctx.shadowBlur = localGlow * 18;
      ctx.shadowColor = `hsla(${color}, 95%, ${lightness}%, ${localGlow * 0.6})`;
      ctx.strokeStyle = `hsla(${color}, 95%, ${lightness}%, ${alpha})`;
      for (let col = -columns; col <= columns; col += 1) {
        ctx.beginPath();
        const u = col / columns * 2;
        for (let j = 0; j <= 48; j += 1) {
          const p = project(u, j / 48);
          if (j === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }
      for (let row = 0; row <= rows; row += 1) {
        ctx.beginPath();
        for (let j = 0; j <= 64; j += 1) {
          const p = project(-2 + j / 64 * 4, row / rows);
          if (j === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    response(key, target, attack = 0.045, release = 0.24) {
      this.responses ??= new Map();
      const previous = this.responses.get(key) ?? target;
      const tau = target > previous ? attack : release;
      const value = lerp(previous, target, 1 - Math.exp(-this.deltaSeconds / Math.max(0.008, tau)));
      this.responses.set(key, value);
      return value;
    }

    visualStyle(controls) {
      const mode = controls.mode || {};
      return {
        mode, variant: normalizeEffectName(controls.modeName), material: controls.materialName,
        hue: Number.isFinite(mode.hue) ? mode.hue : 220,
        opacity: interiorOpacity(mode.opacity),
        glow: visualRange("glow", mode.glow, 0.72, 0, 1.5) * sliderPercent(controls.global?.glow, 65) / 0.65,
        intensity: visualRange("intensity", mode.intensity, 1, 0.2, 1.85),
        motion: visualRange("motion", mode.motion, 0.45, 0, 1.2),
        unit: Math.min(this.width, this.height), cx: this.width * 0.5, cy: this.height * 0.49,
        bass: this.audioFeatures?.bass || 0, mid: this.audioFeatures?.mid || 0,
        high: this.audioFeatures?.high || 0, beat: this.audioFeatures?.beat || 0,
      };
    }

    visualHue(controls, base, offset = 0, rate = 0.18) {
      return accentHue(controls.materialName,
        animatedRgbHue(controls, "main", base, offset * 3, this.animationFrame * rate), offset);
    }

    floorRotation(value, variant) {
      const amount = sliderPercent(value, 0);
      const key = `floor-rotation:${variant}`;
      if (amount <= 0) {
        this.motionPhases.set(key, 0);
        return 0;
      }
      const angle = this.advanceMotionPhase(key, amount * 0.018) % TAU;
      this.motionPhases.set(key, angle);
      return angle;
    }

    drawBars(levels, controls) {
      const s = this.visualStyle(controls), m = s.mode, ctx = this.context;
      if (s.variant === "bars") return this.drawPolishedBars(levels, controls);
      const count = Math.round(baselineRange(m.amount ?? m.bars, 24, 10, 48));
      const scale = visualRange("scale", m.scale, 1, 0.58, 1.18);
      const span = this.width * visualRange("spacing", m.spacing, 0.74, 0.45, 0.91) * scale;
      const cell = span / count;
      const barWidth = Math.max(2, cell * visualRange("thickness", m.thickness, 0.7, 0.28, 0.92));
      const baseY = this.height * 0.8;
      const maxHeight = this.height * 0.57 * scale;
      const yaw = this.floorRotation(m.rotate, s.variant);
      const glass = resolveMaterialKind(s.material) === "glass";
      const items = [];
      for (let i = 0; i < count; i += 1) {
        const t = (i + 0.5) / count;
        const raw = spectrumAt(levels, t);
        const energy = this.response(`bar:${s.variant}:${i}`, Math.pow(raw, 0.83), 0.046 - s.motion * 0.018, 0.3 - s.motion * 0.13);
        const height = Math.max(9 * scale, maxHeight * clamp(0.065 + energy * s.intensity * 0.9, 0, 1.08));
        const floorX = (t - 0.5) * span;
        const x = s.cx + floorX * Math.cos(yaw) - barWidth / 2;
        const yBase = baseY + floorX * Math.sin(yaw) * 0.15;
        const hue = this.visualHue(controls, s.hue, (t - 0.5) * 38);
        items.push({ x, y: yBase - height, base: yBase, height, hue, energy, t });
      }
      for (const b of items) {
        if (s.variant === "equalizer wall") {
          const rows = Math.round(visualRange("thickness", m.thickness, 22, 34, 12));
          const step = maxHeight / rows;
          for (let row = 0; row < rows; row += 1) {
            const activation = clamp((b.height / maxHeight) * rows - row, 0, 1);
            if (activation < 0.01) continue;
            const y = b.base - (row + 1) * step;
            const rowHue = b.hue - row / rows * 24;
            ctx.save();
            ctx.globalAlpha = 0.38 + activation * 0.62;
            const fill = materialColor(s.material, rowHue, 45 + row / rows * 16, glass ? 0.32 : 1);
            roundRect(ctx, b.x, y, barWidth, Math.max(1, step - 2), Math.min(2, barWidth * 0.14));
            ctx.save(); ctx.globalAlpha *= s.opacity;
            ctx.fillStyle = fill;
            ctx.shadowBlur = row === Math.floor(b.height / maxHeight * rows) - 1 ? s.glow * 5 : 0;
            ctx.shadowColor = materialColor(s.material, rowHue, 55, 0.3);
            ctx.fill(); ctx.restore();
            ctx.strokeStyle = materialColor(s.material, rowHue - 6, 84, 0.65);
            ctx.lineWidth = 0.7; ctx.stroke(); ctx.restore();
          }
          continue;
        }
        const fill = ctx.createLinearGradient(b.x, b.y, b.x + barWidth, b.base);
        fill.addColorStop(0, materialColor(s.material, b.hue - 8, 77, glass ? 0.55 : 1));
        fill.addColorStop(0.16, materialColor(s.material, b.hue, 57, glass ? 0.26 : 1));
        fill.addColorStop(0.65, materialColor(s.material, b.hue + 10, 36, glass ? 0.1 : 1));
        fill.addColorStop(1, materialColor(s.material, b.hue + 17, 22, glass ? 0.27 : 1));
        ctx.save();
        roundRect(ctx, b.x, b.y, barWidth, b.height, Math.min(3.5, barWidth * 0.17));
        ctx.globalAlpha = s.opacity;
        ctx.fillStyle = fill;
        ctx.shadowColor = materialColor(s.material, b.hue, 55, 0.33);
        ctx.shadowBlur = s.glow * (4 + b.energy * 5);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        const edge = ctx.createLinearGradient(b.x, b.y, b.x + barWidth, b.base);
        edge.addColorStop(0, materialColor(s.material, b.hue - 7, 91, 0.94));
        edge.addColorStop(0.3, materialColor(s.material, b.hue, 74, 0.72));
        edge.addColorStop(1, materialColor(s.material, b.hue + 18, 57, 0.52));
        ctx.strokeStyle = edge; ctx.lineWidth = 1; ctx.stroke();
        // The highlight is clipped inside the original silhouette: no extruded faces.
        ctx.clip(); ctx.globalAlpha = s.opacity;
        const sheen = ctx.createLinearGradient(b.x, 0, b.x + barWidth, 0);
        sheen.addColorStop(0, "rgba(255,255,255,0)");
        sheen.addColorStop(0.2, "rgba(255,255,255,0.18)");
        sheen.addColorStop(0.42, "rgba(255,255,255,0)");
        sheen.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = sheen; ctx.fillRect(b.x, b.y, barWidth, b.height);
        ctx.restore();
      }
    }

    drawPolishedBars(levels, controls) {
      const ctx = this.context;
      const mode = controls.mode || {};
      const bodyOpacity = interiorOpacity(mode.opacity);
      const variant = normalizeEffectName(controls.modeName);
      const materialName = controls.materialName;
      const intensity = visualRange("intensity", mode.intensity, 0.88, 0.5, 2.45);
      const formationScale = visualRange("scale", mode.scale, 0.92, 0.68, 1.12);
      const thickness = visualRange("thickness", mode.thickness, 0.68, 0.3, 0.92);
      const spacingBias = visualRange("spacing", mode.spacing, 0.72, 0.46, 0.9);
      const motion = visualRange("motion", mode.motion, 0.6825, 0.18, 1.08);
      const amountValue = mode.amount ?? mode.bars;
      const activeBarCount = Math.max(5, Math.min(48, Math.round(visualRange("amount", amountValue, 17, 10, 32))));
      const localGlow = visualRange("glow", mode.glow, 0.9, 0.18, 1.5);
      const rotateAmount = sliderPercent(mode.rotate, 0);
      const rotateSpeed = rotateAmount * 0.86;
      const beatLift = (controls.global?.beatResponse ?? 80) / 100;
      const baseY = this.height * 0.84;
      const formationWidth = this.width * spacingBias * formationScale;
      const barSpacing = formationWidth / Math.max(1, activeBarCount - 1);
      const barWidth = Math.max(3, barSpacing * thickness);
      const maxHeight = this.height * 0.64;
      const glowStrength = clamp((controls.global.glow ?? 65) / 100, 0, 1);
      const hue = Number.isFinite(mode.hue) ? mode.hue : 220;
      const randomizeColors = Boolean(controls.randomize?.main);
      const sceneCenter = this.width * 0.5;
      const isActive = this.getIsActive();
      const liftPhase = this.advanceMotionPhase(`bars:${variant}:lift`, 0.015 * (0.7 + motion * 1.8), isActive);
      const driftPhase = this.advanceMotionPhase(`bars:${variant}:drift`, 0.015 * (0.38 + motion * 0.9), isActive);
      const yaw = this.floorRotation(mode.rotate, variant);

      const drawItems = [];

      for (let index = 0; index < activeBarCount; index += 1) {
        const sampleIndex = Math.round((index / Math.max(1, activeBarCount - 1)) * Math.max(0, levels.length - 1));
        const level = levels[sampleIndex] ?? 0;
        const indexRatio = index / Math.max(1, activeBarCount - 1);
        const idleWave = 0.18;
        const motionLift = isActive
          ? Math.sin(liftPhase + indexRatio * Math.PI * (1.6 + motion * 2.2)) * 0.08 * motion
          : 0;
        const target = idleWave + level * intensity * (0.74 + motion * 0.18) + motionLift + (isActive ? 0 : 0.04);
        this.heights[index] = this.response(`polished-bars:${variant}:${index}`, target, 0.05, 0.22);

        const center = indexRatio - 0.5;
        const rawX = (index - (activeBarCount - 1) * 0.5) * barSpacing
          + (isActive ? Math.sin(driftPhase + index * 0.42) * this.width * 0.004 * motion : 0);
        const spinX = rawX * Math.cos(yaw);
        const spinZ = rawX * Math.sin(yaw);
        const perspective = 1 + (spinZ / Math.max(1, this.width)) * 0.7;
        const projectedWidth = Math.max(3, barWidth * perspective);
        const x = sceneCenter + spinX - projectedWidth * 0.5;
        const itemBaseY = baseY + spinZ * 0.15;
        const barHeight = Math.max(46 * formationScale / 0.92, this.heights[index] * maxHeight * formationScale) * perspective;
        const topY = itemBaseY - barHeight - Math.abs(center) * 10;
        const sideMix = index < activeBarCount / 2 ? Math.abs(center) * 2 : 1 - Math.abs(center) * 2;
        const animatedHue = animatedRgbHue(controls, "main", hue, indexRatio * 240, this.animationFrame * 1.4);
        const primaryHue = accentHue(materialName, animatedHue, sideMix * 16);
        const edgeHue = accentHue(materialName, animatedHue, 10 + sideMix * 12);
        const energy = clamp(level * intensity + beatLift * 0.08, 0, 2.4);

        drawItems.push({
          spinZ,
          x,
          topY,
          projectedWidth,
          barHeight,
          baseY: itemBaseY,
          primaryHue,
          edgeHue,
          energy,
          center,
        });
      }

      drawItems.sort((a, b) => a.spinZ - b.spinZ);

      if (variant === "equalizer wall") {
        const rowCount = Math.max(7, Math.round(visualRange("thickness", mode.thickness, 12, 18, 7)));
        const wallHeight = maxHeight * formationScale * 0.86;
        const rowGap = Math.max(2, wallHeight * 0.008);
        const cellHeight = Math.max(3, (wallHeight - rowGap * (rowCount - 1)) / rowCount);
        for (const item of drawItems) {
          const litRows = Math.max(1, Math.round(clamp(item.barHeight / Math.max(1, maxHeight * formationScale), 0, 1) * rowCount));
          const cellWidth = Math.max(5, item.projectedWidth * 0.92);
          for (let row = 0; row < rowCount; row += 1) {
            const cellY = item.baseY - (row + 1) * cellHeight - row * rowGap;
            const isLit = row < litRows;
            const rowRatio = row / Math.max(1, rowCount - 1);
            const rowHue = accentHue(materialName, item.primaryHue, rowRatio * 22);
            const gradient = ctx.createLinearGradient(item.x, cellY, item.x + cellWidth, cellY + cellHeight);
            if (resolveMaterialKind(materialName) === "chrome") {
              gradient.addColorStop(0, `hsla(${rowHue}, 8%, 98%, ${isLit ? 0.86 : 0.08})`);
              gradient.addColorStop(0.52, `hsla(${rowHue}, 12%, 56%, ${isLit ? 0.42 : 0.035})`);
              gradient.addColorStop(1, `hsla(${rowHue}, 8%, 88%, ${isLit ? 0.68 : 0.06})`);
            } else {
              gradient.addColorStop(0, `hsla(${rowHue}, 100%, 90%, ${isLit ? 0.9 : 0.08})`);
              gradient.addColorStop(0.52, `hsla(${rowHue}, 96%, 58%, ${isLit ? 0.5 : 0.04})`);
              gradient.addColorStop(1, `hsla(${rowHue + 10}, 100%, 72%, ${isLit ? 0.72 : 0.06})`);
            }
            ctx.save();
            ctx.shadowBlur = isLit ? 6 + glowStrength * 12 + localGlow * 8 : 0;
            ctx.shadowColor = resolveMaterialKind(materialName) === "chrome"
              ? `hsla(${rowHue}, 8%, 94%, 0.28)`
              : `hsla(${rowHue}, 100%, 70%, 0.42)`;
            roundRect(ctx, item.x, cellY, cellWidth, cellHeight, Math.min(4, cellHeight * 0.34));
            ctx.fillStyle = gradient;
            ctx.globalAlpha = bodyOpacity;
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.strokeStyle = resolveMaterialKind(materialName) === "chrome"
              ? `hsla(${rowHue}, 8%, 98%, ${isLit ? 0.74 : 0.1})`
              : `hsla(${rowHue}, 100%, 90%, ${isLit ? 0.78 : 0.12})`;
            ctx.lineWidth = isLit ? 1 : 0.6;
            ctx.stroke();
            ctx.restore();
          }
        }
        return;
      }

      // Draw one glass surface, then mirror that exact surface. Shell and
      // interior are separate, so clearing the middle cannot erase the glass.
      this.barGlassSurface ??= document.createElement("canvas");
      this.barGlassReflection ??= document.createElement("canvas");
      for (const item of drawItems) {
        const { x, topY, projectedWidth: w, barHeight: h, primaryHue: hue } = item;
        const chrome = resolveMaterialKind(materialName) === "chrome";
        const sat = chrome ? 10 : 100;
        const rimHue = hue - 26;
        const pad = 8;
        const pixelScale = 2;
        const surface = this.barGlassSurface;
        const sw = Math.ceil((w + pad * 2) * pixelScale);
        const sh = Math.ceil((h + pad * 2) * pixelScale);
        if (surface.width !== sw || surface.height !== sh) {
          surface.width = sw;
          surface.height = sh;
        }
        const g = surface.getContext("2d");
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.clearRect(0, 0, sw, sh);
        g.scale(pixelScale, pixelScale);
        g.translate(pad, pad);
        const r = Math.min(5, Math.max(2, w * 0.075));
        const glow = clamp(glowStrength * localGlow, 0, 1.5);

        // Rich opaque blue body, with smooth illumination rather than stripes.
        g.save();
        roundRect(g, 0, 0, w, h, r);
        g.clip();
        g.globalAlpha = bodyOpacity;
        const body = g.createLinearGradient(0, 0, w, h * 0.25);
        body.addColorStop(0, `hsl(${rimHue}, ${sat}%, 58%)`);
        body.addColorStop(0.24, `hsl(${hue - 8}, ${sat}%, 48%)`);
        body.addColorStop(0.65, `hsl(${hue}, ${sat}%, 36%)`);
        body.addColorStop(1, `hsl(${hue + 3}, ${sat}%, 22%)`);
        g.fillStyle = body;
        g.fillRect(0, 0, w, h);
        const lighting = g.createLinearGradient(0, 0, 0, h);
        lighting.addColorStop(0, `hsla(${rimHue}, ${sat}%, 80%, 0.24)`);
        lighting.addColorStop(0.22, `hsla(${rimHue}, ${sat}%, 65%, 0.025)`);
        lighting.addColorStop(0.7, `hsla(${hue}, ${sat}%, 10%, 0.08)`);
        lighting.addColorStop(1, `hsla(${hue}, ${sat}%, 8%, 0.28)`);
        g.fillStyle = lighting;
        g.fillRect(0, 0, w, h);
        g.restore();

        // Permanent refractive bevel hugs the perimeter, not the center.
        g.save();
        roundRect(g, 0, 0, w, h, r);
        g.clip();
        const bevelWidth = Math.min(w * 0.24, 10);
        const bevel = g.createLinearGradient(0, 0, bevelWidth, 0);
        bevel.addColorStop(0, `hsla(${rimHue}, ${sat}%, 55%, 0.88)`);
        bevel.addColorStop(0.22, `hsla(${rimHue}, ${sat}%, 72%, 0.64)`);
        bevel.addColorStop(0.54, `hsla(${rimHue}, ${sat}%, 56%, 0.25)`);
        bevel.addColorStop(1, `hsla(${rimHue}, ${sat}%, 48%, 0)`);
        g.fillStyle = bevel;
        g.fillRect(0, 0, bevelWidth, h);
        const right = g.createLinearGradient(w - bevelWidth * 0.65, 0, w, 0);
        right.addColorStop(0, `hsla(${rimHue}, ${sat}%, 50%, 0)`);
        right.addColorStop(1, `hsla(${rimHue}, ${sat}%, 65%, 0.36)`);
        g.fillStyle = right;
        g.fillRect(w - bevelWidth * 0.65, 0, bevelWidth * 0.65, h);
        const bottom = g.createLinearGradient(0, h - bevelWidth, 0, h);
        bottom.addColorStop(0, `hsla(${rimHue}, ${sat}%, 55%, 0)`);
        bottom.addColorStop(1, `hsla(${rimHue}, ${sat}%, 64%, 0.3)`);
        g.fillStyle = bottom;
        g.fillRect(0, h - bevelWidth, w, bevelWidth);
        g.restore();

        // Colored luminous rim plus localized top-left specular lighting.
        g.save();
        g.lineWidth = Math.min(1.5, Math.max(0.85, w * 0.023));
        g.shadowColor = `hsla(${rimHue}, ${sat}%, 58%, 0.8)`;
        g.shadowBlur = 2 + glow * 3;
        const rim = g.createLinearGradient(0, 0, w, h);
        rim.addColorStop(0, `hsla(${rimHue}, ${sat}%, 91%, 0.98)`);
        rim.addColorStop(0.18, `hsla(${rimHue}, ${sat}%, 78%, 0.94)`);
        rim.addColorStop(0.65, `hsla(${hue - 12}, ${sat}%, 66%, 0.82)`);
        rim.addColorStop(1, `hsla(${rimHue}, ${sat}%, 85%, 0.92)`);
        g.strokeStyle = rim;
        roundRect(g, 0.65, 0.65, w - 1.3, h - 1.3, r);
        g.stroke();
        g.shadowBlur = 0;
        const specular = g.createLinearGradient(0, 0, 0, h);
        specular.addColorStop(0, `hsla(${rimHue}, ${sat}%, 96%, 0.94)`);
        specular.addColorStop(0.18, `hsla(${rimHue}, ${sat}%, 89%, 0.75)`);
        specular.addColorStop(0.68, `hsla(${rimHue}, ${sat}%, 72%, 0.26)`);
        specular.addColorStop(1, `hsla(${rimHue}, ${sat}%, 67%, 0.04)`);
        g.fillStyle = specular;
        roundRect(g, Math.max(2, w * 0.085), 4, Math.max(0.9, w * 0.023), Math.max(1, h - 9), 0.6);
        g.fill();
        g.strokeStyle = `hsla(${rimHue}, ${sat}%, 96%, 0.78)`;
        g.lineWidth = 0.8;
        g.beginPath();
        g.moveTo(r + 1, 1.3);
        g.lineTo(w - r - 1, 1.3);
        g.stroke();
        g.restore();

        ctx.save();
        ctx.shadowBlur = 0;
        ctx.drawImage(surface, x - pad, topY - pad, sw / pixelScale, sh / pixelScale);
        ctx.restore();

        // Mirror the finished shell AND body, then multiply by a floor fade.
        // Masking happens on a private surface, never on the scene canvas.
        const reflection = this.barGlassReflection;
        if (reflection.width !== sw || reflection.height !== sh) {
          reflection.width = sw;
          reflection.height = sh;
        }
        const f = reflection.getContext("2d");
        f.setTransform(1, 0, 0, 1, 0, 0);
        f.clearRect(0, 0, sw, sh);
        f.save();
        f.translate(0, sh);
        f.scale(1, -1);
        f.drawImage(surface, 0, 0);
        f.restore();
        f.globalCompositeOperation = "destination-in";
        const fade = f.createLinearGradient(0, pad * pixelScale, 0, (pad + h * 0.86) * pixelScale);
        fade.addColorStop(0, "rgba(0,0,0,0.26)");
        fade.addColorStop(0.22, "rgba(0,0,0,0.15)");
        fade.addColorStop(0.6, "rgba(0,0,0,0.035)");
        fade.addColorStop(1, "rgba(0,0,0,0)");
        f.fillStyle = fade;
        f.fillRect(0, 0, sw, sh);
        f.globalCompositeOperation = "source-over";
        ctx.save();
        ctx.shadowBlur = 0;
        ctx.drawImage(reflection, x - pad, topY + h + 4 - pad, sw / pixelScale, sh / pixelScale);
        ctx.restore();
      }
    }

    drawWavelength(levels, controls) {
      const s = this.visualStyle(controls), m = s.mode, ctx = this.context;
      const spread = visualRange("spread", m.spread, 1, 0.58, 1.35);
      const scale = visualRange("scale", m.scale, 1, 0.6, 1.4);
      const shape = visualRange("shape", m.shape, 1, 0.35, 1.85);
      const samples = Math.round(visualRange("density", m.density, 88, 48, 144));
      const span = this.width * 0.76 * spread * scale;
      const phase = this.advanceMotionPhase("ribbons:flow", 0.009 * (0.15 + s.motion));
      const spin = this.floorRotation(m.rotate, s.variant);
      const layers = 5;
      const waveform = window.__shamonsoftAudioAnalysis?.read?.().waveform;
      for (let layer = 0; layer < layers; layer += 1) {
        const layerT = layer / (layers - 1), points = [];
        const hue = this.visualHue(controls, s.hue, (layerT - 0.5) * 54);
        for (let i = 0; i < samples; i += 1) {
          const t = i / (samples - 1), envelope = Math.pow(Math.sin(Math.PI * t), 0.72);
          const level = spectrumAt(levels, t);
          const audioWave = waveform?.length ? waveform[Math.min(waveform.length - 1, Math.floor(t * waveform.length))] : 0;
          const carrier = Math.sin(t * TAU * (0.85 + shape * 0.3) - phase + layer * 0.6);
          const overtone = Math.sin(t * TAU * 2.2 + phase * 0.66 + layer * 0.75);
          const lift = this.height * 0.17 * scale * envelope;
          const y = s.cy + (layerT - 0.5) * this.height * 0.045
            + lift * (carrier * (0.19 + s.bass * s.intensity * 0.72)
              + overtone * (0.09 + level * s.intensity * 0.29)
              + (s.variant === "waveform" ? audioWave * 0.9 : audioWave * 0.08 * s.intensity));
          const rawX = (t - 0.5) * span;
          const floorDepth = rawX * Math.sin(spin);
          const perspective = 1 + floorDepth / Math.max(1, this.width) * 0.65;
          points.push({ x: s.cx + rawX * Math.cos(spin), y: s.cy + (y - s.cy) * perspective + floorDepth * 0.15,
            width: Math.max(1.3, s.unit * 0.013 * shape * (0.14 + envelope * (0.7 + layerT * 0.4))) });
        }
        ctx.save(); ctx.globalAlpha = 0.45 + layerT * 0.5;
        ribbonSurface(ctx, points, s.unit * 0.011, hue, s.material, s.opacity, s.glow * 0.6);
        ctx.restore();
      }
    }

    drawRadialPulse(levels, controls) {
      const s = this.visualStyle(controls), m = s.mode, ctx = this.context;
      const spread = visualRange("spread", m.spread, 1, 0.5, 1.5);
      const depth = visualRange("depth", m.depth, 1, 0.3, 1.7);
      const width = visualRange("width", m.width, 1, 0.3, 2);
      const amount = Math.round(visualRange("amount", m.amount, 8, 3, 16));
      const radius = screenRadius(m.spread, s.unit * 0.32, this.width);
      const phase = this.advanceMotionPhase(`radial:${s.variant}:flow`, 0.007 * (0.12 + s.motion));
      const rotation = this.floorRotation(m.rotate, s.variant);
      const baseHue = this.visualHue(controls, s.hue);
      if (s.variant === "spectrum ring") {
        const count = Math.round(visualRange("amount", m.amount, 72, 32, 128));
        const inner = radius * (0.53 + s.bass * s.intensity * 0.035);
        for (let i = 0; i < count; i += 1) {
          const t = i / count, angle = t * TAU + rotation + phase * s.motion * 0.15 - Math.PI / 2;
          const level = periodicSpectrum(levels, t);
          const extent = radius * (0.055 + Math.pow(level, 0.85) * s.intensity * 0.53);
          const points = [inner, inner + extent].map(r => ({ x: s.cx + Math.cos(angle) * r, y: s.cy + Math.sin(angle) * r * (0.84 + depth * 0.16) }));
          const spokeWidth = Math.min(inner * TAU / count * 0.67, s.unit * 0.005 * width);
          ribbonSurface(ctx, points, Math.max(1.5, spokeWidth), this.visualHue(controls, s.hue, Math.cos(t * TAU) * 22), s.material, s.opacity, s.glow * 0.42);
        }
        return;
      }
      if (s.variant === "radar sweep") {
        const sweep = this.advanceMotionPhase("radar:sweep", 0.014 * (0.3 + s.motion)) + rotation;
        for (let ring = 1; ring <= 4; ring += 1) {
          const ringRadius = radius * Math.pow(ring / 4, 0.65 + depth * 0.35);
          const points = Array.from({ length: 96 }, (_, i) => ({ x: s.cx + Math.cos(i / 96 * TAU) * ringRadius, y: s.cy + Math.sin(i / 96 * TAU) * ringRadius }));
          ctx.save(); ctx.globalAlpha = 0.26 + ring * 0.045;
          ribbonSurface(ctx, points, 1.4 * width, baseHue, s.material, s.opacity, 0, true); ctx.restore();
        }
        // Angular persistence trail fades smoothly behind the leading sweep.
        for (let segment = 35; segment >= 0; segment -= 1) {
          const a = sweep - segment * 0.022;
          ctx.save(); ctx.globalAlpha = s.opacity * Math.pow(1 - segment / 36, 2) * 0.065;
          ctx.fillStyle = materialColor(s.material, baseHue, 61);
          ctx.beginPath(); ctx.moveTo(s.cx, s.cy); ctx.arc(s.cx, s.cy, radius, a - 0.024, a); ctx.closePath(); ctx.fill(); ctx.restore();
        }
        ribbonSurface(ctx, [{ x: s.cx, y: s.cy }, { x: s.cx + Math.cos(sweep) * radius, y: s.cy + Math.sin(sweep) * radius }], 2 * width, baseHue - 10, s.material, s.opacity, s.glow * 0.6);
        for (let i = 0; i < amount * 2; i += 1) {
          const angle = seededUnit(i, 1) * TAU;
          const r = radius * (0.24 + seededUnit(i, 2) * 0.68);
          const since = ((sweep - angle) % TAU + TAU) % TAU;
          const echo = Math.exp(-since * 1.9);
          const level = spectrumAt(levels, seededUnit(i, 3));
          drawPolishedOrb(ctx, s.cx + Math.cos(angle) * r, s.cy + Math.sin(angle) * r,
            1.5 + (echo + level * s.intensity) * 3, baseHue + i * 1.5, s.material, s.glow * echo, 0.15 + echo * 0.85, s.opacity);
        }
        return;
      }
      if (s.variant === "vortex") {
        const arms = Math.max(2, Math.round(amount * 0.45));
        for (let arm = 0; arm < arms; arm += 1) {
          const points = [];
          for (let i = 0; i < 136; i += 1) {
            const t = i / 135, audio = spectrumAt(levels, t);
            const angle = arm / arms * TAU + rotation - phase * 1.7 + t * TAU * (1.3 + depth * 0.4);
            const r = radius * (0.075 + t * 0.92) * (1 + audio * s.intensity * 0.065);
            points.push({ x: s.cx + Math.cos(angle) * r, y: s.cy + Math.sin(angle) * r,
              width: Math.max(1, s.unit * 0.012 * width * Math.sin(t * Math.PI) * (0.6 + audio * 0.5)) });
          }
          ribbonSurface(ctx, points, s.unit * 0.01 * width, this.visualHue(controls, s.hue, arm / arms * 38), s.material, s.opacity, s.glow * 0.65);
        }
        return;
      }
      if (s.variant === "liquid pulse") {
        // One cohesive liquid-glass body, not stacked rainbow discs.
        const lobes = Math.round(visualRange("amount", m.amount, 4, 2, 8));
        const liquidPhase = phase * 1.4;
        const pulse = this.response("liquid:breathing", 1 + s.bass * s.intensity * 0.12 + s.beat * 0.05, 0.06, 0.32);
        const contour = (fraction, shift = 0) => {
          const points = [];
          for (let i = 0; i < 192; i += 1) {
            const a = i / 192 * TAU;
            const audio = periodicSpectrum(levels, i / 192);
            const swell = Math.sin(a * lobes + liquidPhase + shift) * 0.065
              + Math.sin(a * (lobes + 1) - liquidPhase * 2 + shift) * 0.028;
            const r = radius * fraction * pulse * (1 + swell * Math.min(3, depth) + audio * s.intensity * 0.035);
            points.push({ x: s.cx + Math.cos(a + rotation) * r,
              y: s.cy + Math.sin(a + rotation) * r * 0.88 });
          }
          return points;
        };
        const surface = contour(0.88);
        membraneSurface(ctx, surface, baseHue, s.material, s.opacity, s.glow * 0.7, Math.max(0.75, width));
        ctx.save();
        traceSmooth(ctx, surface, true); ctx.clip();
        const shine = ctx.createRadialGradient(s.cx - radius * 0.28, s.cy - radius * 0.35, 0, s.cx, s.cy, radius);
        shine.addColorStop(0, materialColor(s.material, baseHue - 18, 96, 0.38 * s.opacity));
        shine.addColorStop(0.3, materialColor(s.material, baseHue - 10, 78, 0.14 * s.opacity));
        shine.addColorStop(1, materialColor(s.material, baseHue, 50, 0));
        ctx.fillStyle = shine;
        ctx.fillRect(s.cx - radius * 1.5, s.cy - radius * 1.5, radius * 3, radius * 3);
        // Closely related refractive contours suggest flowing volume.
        for (let layer = 0; layer < 3; layer += 1) {
          ctx.globalAlpha = 0.1 + s.opacity * 0.12;
          ribbonSurface(ctx, contour(0.5 + layer * 0.13, layer * 0.7), Math.max(0.65, width * 0.7),
            baseHue - 12 + layer * 5, s.material, 0, s.glow * 0.12, true);
        }
        ctx.restore();
        return;
      }

      const liquid = s.variant === "liquid pulse";
      const mandala = s.variant === "mandala";
      const kaleido = s.variant === "kaleidoscope";
      const count = liquid ? Math.min(7, amount) : amount;
      // Draw back-to-front: the center retains breathing room and readable color.
      for (let ring = count - 1; ring >= 0; ring -= 1) {
        const t = ring / Math.max(1, count - 1);
        const symmetry = mandala ? 8 : kaleido ? 6 : liquid ? 3 : 2;
        const base = radius * (0.25 + t * 0.65) * (1 + s.bass * s.intensity * 0.07);
        const points = [];
        for (let i = 0; i < 192; i += 1) {
          const turn = i / 192, a = turn * TAU;
          const fold = 0.5 - Math.cos(a * symmetry) * 0.5;
          const band = spectrumAt(levels, mandala || kaleido ? fold : 1 - Math.abs(turn * 2 - 1));
          const phaseOffset = phase * (ring % 2 ? -1 : 1) + t * 1.4;
          const lobe = mandala ? Math.cos(a * 8 + phaseOffset) * 0.17 + Math.cos(a * 16 - phaseOffset) * 0.032
            : kaleido ? Math.cos(a * 6 + phaseOffset) * 0.2 + Math.cos(a * 12 + phaseOffset) * 0.055
            : liquid ? Math.sin(a * 3 + phaseOffset) * 0.095 + Math.sin(a * 5 - phaseOffset * 0.7) * 0.043
            : Math.sin(a * 2 + phaseOffset) * 0.014;
          const r = base * (1 + lobe * depth + band * s.intensity * (liquid ? 0.12 : 0.075));
          const angle = a + rotation;
          points.push({ x: s.cx + Math.cos(angle) * r, y: s.cy + Math.sin(angle) * r });
        }
        const hue = this.visualHue(controls, s.hue, (t - 0.5) * 48);
        ctx.save(); ctx.globalAlpha = 0.95 - t * 0.27;
        if (liquid) {
          // Nested membranes make Liquid Pulse visibly different from the ring family.
          membraneSurface(ctx, points, hue, s.material, s.opacity, s.glow * 0.5, width);
        } else {
          ribbonSurface(ctx, points, s.unit * (mandala || kaleido ? 0.006 : 0.005) * width * (1.25 - t * 0.4), hue, s.material, s.opacity, s.glow * 0.48, true);
        }
        ctx.restore();
      }
    }

    drawOrbitBloom(levels, controls) {
      const s = this.visualStyle(controls), m = s.mode, ctx = this.context;
      const amount = Math.round(visualRange("amount", m.amount, s.variant === "constellation" ? 32 : 14, 6, 48));
      const size = visualRange("size", m.size, 1, 0.3, 1.9);
      const spread = visualRange("spread", m.spread, 1, 0.5, 1.5);
      const depth = visualRange("depth", m.depth, 1, 0.35, 1.75);
      const speed = visualRange("speed", m.speed, 0.7, 0, 2);
      const phase = this.advanceMotionPhase(`${s.variant}:orbit`, 0.008 * speed);
      const flow = this.advanceMotionPhase(`${s.variant}:shape`, 0.005 * s.motion);
      const radius = screenRadius(m.spread, s.unit * 0.34, this.width);
      if (s.variant === "starburst") {
        const count = Math.max(18, amount);
        for (let i = 0; i < count; i += 1) {
          const t = i / count, band = periodicSpectrum(levels, t);
          const a = t * TAU + phase * 0.22;
          const length = radius * clamp(0.32 + band * s.intensity * 0.62 + s.beat * 0.13, 0.1, 1.2) * Math.sqrt(size);
          const points = [];
          for (let j = 0; j <= 12; j += 1) {
            const u = j / 12, r = radius * 0.08 + length * u;
            const twist = a + Math.sin(u * Math.PI) * Math.sin(flow + i * 0.3) * s.motion * 0.1;
            points.push({ x: s.cx + Math.cos(twist) * r, y: s.cy + Math.sin(twist) * r * (0.77 + depth * 0.23),
              width: Math.max(0.7, s.unit * 0.009 * (0.3 + band) * Math.sin(u * Math.PI) * size) });
          }
          ribbonSurface(ctx, points, s.unit * 0.006, this.visualHue(controls, s.hue, Math.sin(t * TAU) * 26), s.material, s.opacity, s.glow * (0.4 + s.beat * 0.3));
        }
        return;
      }
      if (s.variant === "petals") {
        const count = Math.max(6, Math.min(24, amount));
        for (let tier = 1; tier >= 0; tier -= 1) {
          for (let i = 0; i < count; i += 1) {
            const t = i / count, band = periodicSpectrum(levels, t);
            const angle = t * TAU + phase * (tier ? -0.26 : 0.34) + tier * Math.PI / count
              + Math.sin(flow + t * TAU * 2) * s.motion * 0.035;
            const length = radius * (tier ? 0.95 : 0.68) * Math.sqrt(size) * (0.7 + band * s.intensity * 0.24 + s.bass * 0.09);
            const petalWidth = length * (0.19 + depth * 0.07);
            const points = [];
            for (let j = 0; j < 48; j += 1) {
              const a = j / 48 * TAU;
              const along = (1 - Math.cos(a)) * 0.5;
              const px = radius * 0.06 + length * along;
              const py = Math.sin(a) * Math.pow(Math.sin(Math.PI * along), 0.6) * petalWidth;
              points.push({ x: s.cx + Math.cos(angle) * px - Math.sin(angle) * py, y: s.cy + Math.sin(angle) * px + Math.cos(angle) * py });
            }
            ctx.save(); ctx.globalAlpha = tier ? 0.6 : 0.94;
            membraneSurface(ctx, points, this.visualHue(controls, s.hue, tier * 22 + Math.cos(t * TAU) * 12), s.material, s.opacity, s.glow * 0.5); ctx.restore();
          }
        }
        return;
      }
      if (s.variant === "nebula") {
        // Broad, overlapping gas filaments with small stars; no generic orbit beads.
        const clouds = Math.max(5, Math.min(16, Math.round(amount * 0.5)));
        for (let cloud = clouds - 1; cloud >= 0; cloud -= 1) {
          const t = cloud / clouds, points = [];
          for (let j = 0; j < 112; j += 1) {
            const u = j / 111, a = u * TAU * 1.25 + t * TAU + phase * 0.3;
            const band = spectrumAt(levels, u);
            const r = radius * (0.16 + u * 0.71) * (1 + Math.sin(a * 3 - flow + cloud) * 0.06 * depth);
            const z = Math.sin(a + cloud * 0.4);
            points.push({ x: s.cx + Math.cos(a) * r * 1.13, y: s.cy + Math.sin(a) * r * (0.54 + depth * 0.12) + z * radius * 0.05,
              width: Math.max(1, s.unit * 0.035 * size * Math.pow(Math.sin(u * Math.PI), 1.1) * (0.6 + band * s.intensity)) });
          }
          ctx.save(); ctx.globalAlpha = 0.15 + (1 - t) * 0.12;
          ribbonSurface(ctx, points, s.unit * 0.018, this.visualHue(controls, s.hue, t * 52 - 18), s.material, s.opacity, s.glow * 0.5);
          ctx.restore();
        }
      }
      const nodes = [];
      const count = s.variant === "nebula" ? Math.max(24, amount) : amount;
      for (let i = 0; i < count; i += 1) {
        const t = i / count, band = spectrumAt(levels, seededUnit(i, 4));
        let x, y, z;
        if (s.variant === "orbit") {
          const lane = i % 3;
          const a = phase * (0.65 + lane * 0.13) + t * TAU;
          const inclination = lane * 0.74 - 0.74 + Math.sin(flow + lane) * s.motion * 0.16;
          const r = radius * (0.62 + lane * 0.14);
          const px = Math.cos(a) * r, py = Math.sin(a) * r * 0.3 * depth;
          x = Math.cos(inclination) * px - Math.sin(inclination) * py;
          y = Math.sin(inclination) * px + Math.cos(inclination) * py;
          z = Math.sin(a);
        } else {
          const a = seededUnit(i, 9) * TAU + phase * 0.12;
          const r = Math.sqrt(seededUnit(i, 5)) * radius;
          z = Math.sin(seededUnit(i, 8) * TAU + flow);
          x = Math.cos(a) * r * 1.12 + Math.sin(flow + i) * radius * s.motion * 0.035;
          y = Math.sin(a) * r * 0.88 + z * radius * 0.035 * depth;
        }
        nodes.push({ x: s.cx + x, y: s.cy + y, z, band, index: i,
          radius: Math.max(1.1, s.unit * (s.variant === "orbit" ? 0.007 : 0.0022) * size * (1 + z * 0.22 + band * s.intensity * 0.6)) });
      }
      if (s.variant === "orbit") {
        for (let lane = 0; lane < 3; lane += 1) {
          const inclination = lane * 0.74 - 0.74 + Math.sin(flow + lane) * s.motion * 0.16, r = radius * (0.62 + lane * 0.14);
          const points = Array.from({ length: 144 }, (_, i) => {
            const a = i / 144 * TAU, x = Math.cos(a) * r, y = Math.sin(a) * r * 0.3 * depth;
            return { x: s.cx + Math.cos(inclination) * x - Math.sin(inclination) * y, y: s.cy + Math.sin(inclination) * x + Math.cos(inclination) * y };
          });
          ctx.save(); ctx.globalAlpha = 0.34;
          ribbonSurface(ctx, points, 1.6, this.visualHue(controls, s.hue, lane * 16), s.material, s.opacity, 0, true); ctx.restore();
        }
      }
      if (s.variant === "constellation") {
        const reach = radius * 0.53;
        ctx.save(); ctx.lineWidth = 0.8;
        for (let i = 0; i < nodes.length; i += 1) {
          for (let j = i + 1; j < nodes.length; j += 1) {
            const a = nodes[i], b = nodes[j], distance = Math.hypot(a.x - b.x, a.y - b.y);
            if (distance >= reach) continue;
            const alpha = Math.pow(1 - distance / reach, 2) * (0.24 + (a.band + b.band) * s.intensity * 0.23);
            ctx.strokeStyle = materialColor(s.material, this.visualHue(controls, s.hue, 12), 73, alpha);
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        ctx.restore();
      }
      nodes.sort((a, b) => a.z - b.z);
      for (const node of nodes) {
        drawPolishedOrb(ctx, node.x, node.y, node.radius, this.visualHue(controls, s.hue, seededUnit(node.index, 6) * 40 - 20), s.material,
          s.glow * (0.25 + node.band * 0.4), 0.5 + (node.z + 1) * 0.22, s.opacity);
      }
    }

    drawLatticeField(levels, controls) {
      const s = this.visualStyle(controls), m = s.mode, ctx = this.context;
      const density = Math.round(visualRange("density", m.density, 17, 8, 26));
      const height = visualRange("height", m.height, 1, 0.2, 1.8);
      const spread = visualRange("spread", m.spread, 1, 0.55, 1.3);
      const depth = visualRange("depth", m.depth, 1, 0.35, 1.75);
      const phase = this.advanceMotionPhase(`${s.variant}:waves`, 0.012 * s.motion);
      const rotation = this.floorRotation(m.rotate, s.variant);
      const gridWave = s.variant === "grid wave";
      const rows = Math.round(density * 0.68), cols = density;
      const nodes = [];
      for (let row = 0; row < rows; row += 1) {
        const z = row / (rows - 1), perspective = 0.35 + Math.pow(z, 0.8 + depth * 0.55) * 0.65;
        const line = [];
        for (let col = 0; col < cols; col += 1) {
          const u = col / (cols - 1), nx = (u - 0.5) * 2;
          const band = spectrumAt(levels, u);
          const radial = Math.hypot(nx, (z - 0.5) * 1.3);
          const wave = Math.sin(nx * 4.4 + phase - z * 5) * 0.52 + Math.cos(radial * 8 - phase * 1.2) * 0.3;
          const lift = s.unit * 0.1 * height * perspective * (wave * (0.24 + s.bass * s.intensity * 0.3) + band * s.intensity * 0.7);
          const worldX = nx;
          const worldZ = (z - 0.5) * 1.4;
          const turnedX = worldX * Math.cos(rotation) - worldZ * Math.sin(rotation);
          const turnedZ = worldX * Math.sin(rotation) * 0.7 + worldZ * Math.cos(rotation);
          const floorDepth = 0.5 + turnedZ / 1.4;
          const projectedScale = clamp(0.35 + floorDepth * 0.65, 0.18, 1.12);
          line.push({ x: s.cx + turnedX * this.width * 0.41 * spread * projectedScale,
            y: this.height * (0.34 + floorDepth * 0.48) - lift * projectedScale / perspective,
            perspective: projectedScale, band, z: floorDepth });
        }
        nodes.push(line);
      }
      // The connected surface belongs to Grid Wave; Lattice keeps raised prisms.
      if (gridWave) {
        for (let row = 0; row < rows - 1; row += 1) {
          for (let col = 0; col < cols - 1; col += 1) {
            const a = nodes[row][col], b = nodes[row][col + 1], c = nodes[row + 1][col + 1], d = nodes[row + 1][col];
            ctx.save(); ctx.globalAlpha = s.opacity * (0.025 + a.band * s.intensity * 0.09);
            ctx.fillStyle = materialColor(s.material, this.visualHue(controls, s.hue, a.z * 28), 54);
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath(); ctx.fill(); ctx.restore();
          }
        }
        for (let row = 0; row < rows; row += 1) {
          ctx.save(); ctx.globalAlpha = 0.22 + nodes[row][0].perspective * 0.62;
          ribbonSurface(ctx, nodes[row], 1.1 + nodes[row][0].perspective * 0.7, this.visualHue(controls, s.hue, row / rows * 32), s.material, s.opacity, s.glow * 0.35); ctx.restore();
        }
        for (let col = 0; col < cols; col += 1) {
          ctx.save(); ctx.globalAlpha = 0.42;
          ribbonSurface(ctx, nodes.map(line => line[col]), 1.1, this.visualHue(controls, s.hue, col / cols * 18), s.material, s.opacity, 0); ctx.restore();
        }
        return;
      }
      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const p = nodes[row][col];
          const width = Math.max(2, this.width * 0.52 / cols * p.perspective * spread);
          const towerHeight = s.unit * 0.14 * height * p.perspective * (0.12 + p.band * s.intensity * 0.9);
          const bevel = width * 0.22 * depth;
          const hue = this.visualHue(controls, s.hue, p.z * 20 + col / cols * 22 - 20);
          ctx.save(); ctx.globalAlpha = 0.36 + p.perspective * 0.64;
          const points = [{ x: p.x - width / 2, y: p.y }, { x: p.x - width / 2, y: p.y - towerHeight },
            { x: p.x, y: p.y - towerHeight - bevel }, { x: p.x + width / 2, y: p.y - towerHeight }, { x: p.x + width / 2, y: p.y }];
          // All interior faces share alpha. No leftover opaque caps at 100%.
          membraneSurface(ctx, points, hue, s.material, s.opacity, row === rows - 1 ? s.glow * 0.4 : 0);
          ctx.restore();
        }
      }
    }

    drawSonicRunway(levels, controls) {
      const s = this.visualStyle(controls), m = s.mode, ctx = this.context;
      const count = Math.round(visualRange("amount", m.amount, 16, 6, 28));
      const width = visualRange("width", m.width, 1, 0.28, 1.9);
      const spacing = visualRange("spacing", m.spacing, 1, 0.55, 1.7);
      const speed = visualRange("speed", m.speed, 0.7, 0, 2.2);
      const depth = visualRange("depth", m.depth, 1, 0.4, 1.7);
      const travel = this.advanceMotionPhase(`${s.variant}:travel`, (s.variant === "spiral" ? 0.006 : 0.026) * speed * (1 + s.bass * s.intensity * 0.2), this.getIsActive());
      const sway = this.advanceMotionPhase(`${s.variant}:sway`, 0.004 * s.motion, this.getIsActive());
      if (s.variant === "spiral") {
        const strands = Math.max(2, Math.min(6, Math.round(count / 5)));
        for (let strand = 0; strand < strands; strand += 1) {
          const points = [];
          for (let i = 0; i < 196; i += 1) {
            const t = i / 195, band = spectrumAt(levels, t);
            const angle = strand / strands * TAU + travel * 2 + t * TAU * (1.8 + depth * 0.75);
            const r = s.unit * (0.055 + t * 0.36 / Math.sqrt(spacing)) * (1 + band * s.intensity * 0.055
              + Math.sin(angle * 2 + sway) * s.motion * 0.025);
            points.push({ x: s.cx + Math.cos(angle) * r, y: s.cy + Math.sin(angle) * r * (0.76 + depth * 0.12),
              width: Math.max(1.2, s.unit * 0.009 * width * (0.25 + t * 0.75)) });
          }
          ribbonSurface(ctx, points, s.unit * 0.008 * width, this.visualHue(controls, s.hue, strand / strands * 42 - 16), s.material, s.opacity, s.glow * 0.58);
        }
        return;
      }
      const gates = [];
      for (let i = 0; i < count; i += 1) {
        const progress = ((i / count + travel / count) % 1 + 1) % 1;
        const z = 0.22 + (1 - progress) * 5.8 * depth;
        const perspective = 1 / z;
        // Both ends of the recycling interval are invisible; no near-plane pop.
        const fade = smoothUnit(progress / 0.13) * smoothUnit((1 - progress) / 0.1);
        gates.push({ progress, perspective, fade, index: i });
      }
      gates.sort((a, b) => a.perspective - b.perspective);
      for (const gate of gates) {
        if (gate.fade < 0.002) continue;
        const p = gate.perspective, band = spectrumAt(levels, 1 - gate.progress);
        const cx = s.cx + Math.sin(sway + (1 - gate.progress) * 2.4) * this.width * 0.035 * s.motion;
        const cy = this.height * 0.48 + Math.cos(sway * 0.7 + gate.progress * 2) * this.height * 0.018 * s.motion;
        const hue = this.visualHue(controls, s.hue, (1 - gate.progress) * 44 - 14);
        const points = [];
        if (s.variant === "tunnel") {
          const r = s.unit * 0.3 * p * spacing * (1 + band * s.intensity * 0.055);
          const twist = Math.sin(sway * 0.65 + (1 - gate.progress) * 2.2) * 0.13 * s.motion;
          for (let j = 0; j < 160; j += 1) {
            const angle = j / 160 * TAU + twist;
            const organic = 1 + Math.sin(angle * 4 + sway) * 0.025 * s.motion;
            points.push({ x: cx + Math.cos(angle) * r * organic * 1.15, y: cy + Math.sin(angle) * r * organic });
          }
        } else {
          const half = this.width * 0.26 * p * spacing;
          const tall = this.height * 0.48 * p * (1 + band * s.intensity * 0.07);
          const base = this.height * (0.49 + 0.3 * p);
          for (let j = 0; j <= 96; j += 1) {
            const angle = Math.PI - j / 96 * Math.PI;
            points.push({ x: cx + Math.cos(angle) * half, y: base - Math.sin(angle) * tall });
          }
        }
        ctx.save(); ctx.globalAlpha = gate.fade * clamp(0.12 + p * 0.64, 0, 1);
        ribbonSurface(ctx, points, Math.max(1.2, s.unit * 0.009 * width * p), hue, s.material, s.opacity, s.glow * Math.min(1, p) * 0.62, s.variant === "tunnel");
        ctx.restore();
      }
    }

    runwayThemeAtlas(hue, flow = false) {
      const colorHue = wrapHue(hue);
      const key = "glass:" + colorHue + ":" + flow;
      let cache = this.runwayThemeCache;
      if (!cache) {
        const create = () => { const canvas = document.createElement("canvas"); canvas.width = canvas.height = 768; return canvas; };
        cache = this.runwayThemeCache = { body: create(), key: "" };
      }
      if (cache.key === key) return cache;
      cache.key = key;
      const body = cache.body.getContext("2d"), width = 768;
      body.clearRect(0, 0, width, width);
      const color = light => "hsl(" + colorHue + ",95%," + light + "%)";
      const base = flow ? body.createLinearGradient(0, 0, 0, width) : body.createLinearGradient(0, 0, width, 0);
      if (flow) {
        // Three complete depth cycles over 30 units: seamless cached texture.
        // Animation uses the existing color filter, not per-frame repainting.
        for (let i = 0; i <= 36; i++) base.addColorStop(i / 36, `hsl(${colorHue + i * 30},95%,21%)`);
      } else {
        base.addColorStop(0, color(18)); base.addColorStop(.5, color(23)); base.addColorStop(1, color(18));
      }
      body.fillStyle = base; body.fillRect(0, 0, width, width);
      // Smooth polished glass only. Structural frames are painted separately.
      return cache;
    }

    drawRunwayTextureTriangle(texture, source, target, alpha) {
      if (alpha < .002) return;
      const ctx = this.context;
      const [a, b, c] = target;
      const area = Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x));
      if (area < 1) return;
      if (Math.max(a.x, b.x, c.x) < 0 || Math.min(a.x, b.x, c.x) > this.width
        || Math.max(a.y, b.y, c.y) < 0 || Math.min(a.y, b.y, c.y) > this.height) return;
      const [p, q, r] = source;
      const determinant = (q.x - p.x) * (r.y - p.y) - (r.x - p.x) * (q.y - p.y);
      if (Math.abs(determinant) < .001) return;
      const m11 = ((b.x - a.x) * (r.y - p.y) - (c.x - a.x) * (q.y - p.y)) / determinant;
      const m21 = ((c.x - a.x) * (q.x - p.x) - (b.x - a.x) * (r.x - p.x)) / determinant;
      const m12 = ((b.y - a.y) * (r.y - p.y) - (c.y - a.y) * (q.y - p.y)) / determinant;
      const m22 = ((c.y - a.y) * (q.x - p.x) - (b.y - a.y) * (r.x - p.x)) / determinant;
      const left = Math.max(0, Math.floor(Math.min(p.x, q.x, r.x)));
      const top = Math.max(0, Math.floor(Math.min(p.y, q.y, r.y)));
      const width = Math.min(texture.width, Math.ceil(Math.max(p.x, q.x, r.x))) - left;
      const height = Math.min(texture.height, Math.ceil(Math.max(p.y, q.y, r.y))) - top;
      if (width <= 0 || height <= 0) return;
      ctx.save(); ctx.globalAlpha *= alpha;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.closePath(); ctx.clip();
      ctx.transform(m11, m12, m21, m22, a.x - m11 * p.x - m21 * p.y, a.y - m12 * p.x - m22 * p.y);
      ctx.drawImage(texture, left, top, width, height, left, top, width, height);
      ctx.restore();
    }

    drawRunwayTunnel(levels, controls) {
      const ctx = this.context, unit = Math.min(this.width, this.height);
      const value = (key, fallback = 50) => effectValue(controls, "sonicRunway", key, fallback);
      const percent = (key, fallback = 50) => sliderPercent(value(key, fallback), fallback);
      const size = baselineRange(percent("size") * 100, 1, .18, 2.8);
      const depth = baselineRange(percent("depth") * 100, 1, .3, 2.5);
      const speed = baselineRange(percent("speed") * 100, 1, 0, 2.8);
      const thickness = baselineRange(percent("thickness") * 100, 2, .6, 7);
      const response = percent("response") * 1.8;
      const glow = percent("glow"), twist = clamp((Number(value("twist", 0)) || 0) / 100, -1, 1);
      const opacity = interiorOpacity(value("opacity", 65));
      const shape = value("shape", "Octagon"), walls = "Glass", floor = value("floor", "Runway");
      const floorGeometry = ({ Triangle: [.48, .55], Diamond: [.55, .45], Pentagon: [.55, .58],
        Hexagon: [.65, .65], Octagon: [.7, .68], Star: [.35, .4], Round: [.65, .82], Oval: [.65, 1.05] })[shape] || [.8, .9];
      const baseHue = Number.isFinite(Number(value("hue", 220))) ? Number(value("hue", 220)) : 220;
      const moving = this.getIsActive();
      const distance = this.advanceMotionPhase("runway-continuous:travel", .03 * speed, moving);
      const flow = Boolean(controls.randomize?.sonicRunway && controls.rgbModes?.sonicRunway === "flow");
      const hue = flow ? baseHue : animatedRgbHue(controls, "sonicRunway", baseHue, 0, this.animationFrame * .16);
      // Elapsed-time color motion continues without audio, like existing RGB
      // animation, and Freeze stops it through the shared render-loop guard.
      const flowPhase = this.advanceMotionPhase("runway-rgb:flow", .004 * (.6 + speed * .4), flow) % 1;
      this.motionPhases.set("runway-rgb:flow", flowPhase);
      const wireframe = walls === "Wireframe", textured = !wireframe;
      let atlas = null;
      const cross = [];
      if (shape === "Rectangle") {
        cross.push({ x: -1.15, y: -.9 }, { x: 1.15, y: -.9 }, { x: 1.15, y: .85 }, { x: -1.15, y: .85 });
      } else if (shape === "Rounded rectangle") {
        const centers = [{ x: .91, y: -.66 }, { x: .91, y: .61 }, { x: -.91, y: .61 }, { x: -.91, y: -.66 }];
        for (let corner = 0; corner < 4; corner++) for (let n = 0; n <= 4; n++) {
          const angle = -Math.PI / 2 + corner * Math.PI / 2 + n / 4 * Math.PI / 2;
          cross.push({ x: centers[corner].x + Math.cos(angle) * .24, y: centers[corner].y + Math.sin(angle) * .24 });
        }
      } else if (shape === "Arch") {
        for (let i = 0; i <= 20; i++) {
          const angle = Math.PI - i / 20 * Math.PI;
          cross.push({ x: Math.cos(angle) * 1.15, y: .8 - Math.sin(angle) * 1.85 });
        }
      } else {
        const sides = ({ Triangle: 3, Diamond: 4, Pentagon: 5, Hexagon: 6, Octagon: 8, Star: 10 })[shape] || 24;
        for (let i = 0; i < sides; i++) {
          const angle = i / sides * TAU + (shape === "Hexagon" ? Math.PI / 6 : sides < 10 || shape === "Star" ? -Math.PI / 2 : 0);
          const r = shape === "Star" && i % 2 ? .7 : 1;
          cross.push({ x: Math.cos(angle) * (shape === "Oval" ? 1.5 : 1.15) * r, y: Math.sin(angle) * r });
        }
      }
      // Fit the floor to the actual wall intersections at its height; a
      // narrower guessed width left it looking like a floating platform.
      const floorEdges = [];
      for (let j = 0; j < cross.length; j++) {
        const a = cross[j], b = cross[(j + 1) % cross.length], y = floorGeometry[0];
        if (Math.abs(a.y - b.y) < .00001) {
          if (Math.abs(a.y - y) < .00001) floorEdges.push(a.x, b.x);
        } else if (y >= Math.min(a.y, b.y) && y <= Math.max(a.y, b.y)) {
          floorEdges.push(a.x + (b.x - a.x) * (y - a.y) / (b.y - a.y));
        }
      }
      if (floorEdges.length >= 2) floorGeometry[1] = Math.max(.08, Math.min(-Math.min(...floorEdges), Math.max(...floorEdges)));
      const far = 5 + depth * 12, spacing = 1;
      const brightness = percent("brightness", 65);
      const targetAudio = (this.audioFeatures?.bass || 0) * response;
      this.runwayAudio ??= targetAudio;
      this.runwayAudio += (targetAudio - this.runwayAudio) * (1 - Math.exp(-this.deltaSeconds / .18));
      if (!this.runwayGpuFailed && window.__shamonsoftRunwayGlass) {
        try {
          this.runwayGpu ||= new window.__shamonsoftRunwayGlass();
          const rendered = this.runwayGpu.draw({ cross, width: this.width, height: this.height, far, size,
            distance, twist, floor, floorGeometry, hue, opacity, thickness, glow, brightness,
            flow, flowPhase, wireframe, audio: this.runwayAudio, spacing });
          if (rendered) { ctx.drawImage(this.runwayGpu.canvas, 0, 0, this.width, this.height); return; }
          throw new Error("Tunnel GPU surface unavailable");
        } catch {
          this.runwayGpu?.destroy?.(); this.runwayGpu = null; this.runwayGpuFailed = true;
          window.__shamonsoftProject?.notify?.("Tunnel GPU rendering unavailable; using compatible rendering");
        }
      }
      atlas = textured ? this.runwayThemeAtlas(flow ? 0 : hue, flow) : null;
      // Camera is INSIDE the tunnel. A fixed clipping section extends the
      // walls beyond the viewport; visible approaching sections never fade.
      const near = .009;
      // Keep gate spacing stable: changing it with measured FPS made the
      // moving structure jump. Fine, sub-pixel work is culled instead.
      const count = Math.ceil(far / spacing), period = 30;
      const locations = [{ z: near, gate: false }, { z: far, gate: false }];
      const phase = ((distance % spacing) + spacing) % spacing;
      for (let i = 1; i <= count; i++) {
        const z = i * spacing - phase;
        if (z > near + .001 && z < far - .001) locations.push({ z, gate: true });
      }
      // Split at mural wrap boundaries so no triangle samples across a seam.
      const materialTravel = distance;
      for (let cycle = Math.floor((near + materialTravel) / period) + 1; cycle * period - materialTravel < far; cycle++) {
        locations.push({ z: cycle * period - materialTravel, gate: false });
      }
      locations.sort((a, b) => b.z - a.z);
      // Canvas texture transforms are affine. Add a few invisible projection
      // slices near the camera so a large depth ratio cannot stretch one
      // triangle across an entire wall. These are not new decorative tiles.
      for (let i = locations.length - 2; i >= 0; i--) {
        const farZ = locations[i].z, nearZ = locations[i + 1].z;
        const extra = [];
        for (let z = nearZ * 1.65; z < farZ * .98; z *= 1.65) extra.push({ z, gate: false });
        if (extra.length) locations.splice(i + 1, 0, ...extra.reverse());
      }
      const sections = locations.map(location => {
        const t = location.z / far;
        const radius = unit * .48 * size * (1 + this.runwayAudio * .025) / location.z;
        const cx = this.width * .5, cy = this.height * .46;
        const turn = t * Math.PI * twist, cos = Math.cos(turn), sin = Math.sin(turn);
        const project = point => ({ x: cx + (point.x * cos - point.y * sin) * radius,
          y: cy + (point.x * sin + point.y * cos) * radius });
        return { ...location, t, project, points: cross.map(project), v: ((location.z + materialTravel) % period + period) % period / period };
      });
      const path = points => { ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y); };
      const sideAccent = point => point.x / Math.max(Math.hypot(point.x, point.y), .001) * 21.6;
      const hueAt = (ring, point) => hue + (flow ? ring.z * 36 + flowPhase * 360 + sideAccent(point) : 0);
      const lineColor = (a, b, firstHue, lastHue, saturation, light, alpha) => {
        const color = h => `hsla(${h},${saturation}%,${light}%,${alpha})`;
        if (!flow) return color(hue);
        const gradient = ctx.createLinearGradient(a.x, a.y, b.x + .00001, b.y + .00001);
        gradient.addColorStop(0, color(firstHue)); gradient.addColorStop(1, color(lastHue));
        return gradient;
      };
      ctx.save(); ctx.globalCompositeOperation = "source-over"; ctx.lineJoin = "round"; ctx.lineCap = "round";
      const lightingBrightness = .25 + brightness * .75;
      ctx.globalAlpha = 1;
      ctx.filter = `brightness(${lightingBrightness})`;
      for (let i = 0; i < sections.length; i++) {
        const ring = sections[i], next = sections[i + 1];
        const fog = .32 + .68 * (1 - smoothUnit(ring.t));
        if (next && atlas) {
          let farV = ring.v, nearV = next.v;
          if (farV < nearV - .00001) farV = 1;
          for (let j = 0; j < cross.length; j++) {
            const k = (j + 1) % cross.length;
            const points = [ring.points[j], ring.points[k], next.points[k], next.points[j]];
            const uv = [{ x: j / cross.length * 768, y: farV * 768 }, { x: (j + 1) / cross.length * 768, y: farV * 768 },
              { x: (j + 1) / cross.length * 768, y: nearV * 768 }, { x: j / cross.length * 768, y: nearV * 768 }];
            for (const indices of [[0, 1, 2], [0, 2, 3]]) {
              const source = indices.map(n => uv[n]), target = indices.map(n => points[n]);
              // Depth/lighting shade the material, not its opacity.
              // The atlas already supplies (z + distance) * 36. Cancel its
              // panel travel and add the independent, continuous Flow phase.
              const midpoint = { x: (cross[j].x + cross[k].x) * .5, y: (cross[j].y + cross[k].y) * .5 };
              const flowRotation = flow ? `hue-rotate(${hue + flowPhase * 360 - distance * 36 + sideAccent(midpoint)}deg) ` : "";
              ctx.filter = flowRotation + `brightness(${lightingBrightness * fog})`;
              this.drawRunwayTextureTriangle(atlas.body, source, target, opacity);
              ctx.filter = `brightness(${lightingBrightness})`;
            }
          }
        }
        if (next && wireframe) {
          for (let j = 0; j < cross.length; j++) if (cross.length <= 8 || j % 4 === 0) {
            path([ring.points[j], next.points[j]]);
            ctx.lineWidth = Math.max(.6, thickness * .45 / Math.max(near, next.z));
            ctx.strokeStyle = lineColor(ring.points[j], next.points[j], hueAt(ring, cross[j]), hueAt(next, cross[j]), 90, 62, fog * .5); ctx.stroke();
          }
        }
        if (next && floor !== "None") {
          const leftFar = ring.project({ x: -floorGeometry[1], y: floorGeometry[0] });
          const rightFar = ring.project({ x: floorGeometry[1], y: floorGeometry[0] });
          const leftNear = next.project({ x: -floorGeometry[1], y: floorGeometry[0] });
          const rightNear = next.project({ x: floorGeometry[1], y: floorGeometry[0] });
          // A neutral reflective floor, independent of wall hue and alpha.
          const reflection = ctx.createLinearGradient(leftNear.x, leftNear.y, rightNear.x + .001, rightNear.y + .001);
          reflection.addColorStop(0, "hsl(0,0%,14%)");
          reflection.addColorStop(.25, `hsl(0,0%,${14 + fog * 9}%)`);
          reflection.addColorStop(.5, "hsl(0,0%,11%)");
          reflection.addColorStop(.75, `hsl(0,0%,${14 + fog * 9}%)`);
          reflection.addColorStop(1, "hsl(0,0%,14%)");
          if (floor === "Obsidian" || floor === "Brushed metal") {
            const polished = ctx.createLinearGradient(leftNear.x, leftNear.y, rightNear.x + .001, rightNear.y + .001);
            const base = floor === "Obsidian" ? 3 : 18;
            for (const [position, lift] of [[0, 0], [.22, 14], [.5, 2], [.78, 14], [1, 0]])
              polished.addColorStop(position, `hsl(0,0%,${base + lift * fog}%)`);
            ctx.fillStyle = polished;
          } else ctx.fillStyle = reflection;
          path([leftFar, rightFar, rightNear, leftNear]); ctx.closePath();
          ctx.fill();
          if (floor === "Stone tiles") {
            const row = Math.floor(ring.z + distance);
            const offset = ((row % 2) + 2) % 2 * .5;
            for (let tile = -1; tile < 4; tile++) {
              const x0 = Math.max(-1, (tile + offset) * .5 - 1), x1 = Math.min(1, (tile + offset + 1) * .5 - 1);
              if (x1 <= x0) continue;
              const a = { x: x0 * floorGeometry[1], y: floorGeometry[0] }, b = { x: x1 * floorGeometry[1], y: floorGeometry[0] };
              path([ring.project(a), ring.project(b), next.project(b), next.project(a)]); ctx.closePath();
              ctx.fillStyle = `hsl(0,0%,${(tile + row) % 2 ? 18 : 25}%)`; ctx.fill();
              ctx.lineWidth = Math.max(.6, thickness * .2 / Math.max(near, next.z));
              ctx.strokeStyle = "rgba(12,12,12,.85)"; ctx.stroke();
            }
          }
          if (floor === "Ribbed deck") {
            for (let rib = 1; rib < 4; rib++) {
              const t = rib / 4;
              const a = { x: lerp(leftFar.x, leftNear.x, t), y: lerp(leftFar.y, leftNear.y, t) };
              const b = { x: lerp(rightFar.x, rightNear.x, t), y: lerp(rightFar.y, rightNear.y, t) };
              path([a, b]); ctx.lineWidth = Math.max(.7, thickness * .5 / Math.max(near, ring.z));
              ctx.strokeStyle = "rgba(12,12,12,.9)"; ctx.stroke();
              ctx.lineWidth *= .35; ctx.strokeStyle = `rgba(145,145,145,${fog * .55})`; ctx.stroke();
            }
          }
          const lanes = floor === "Grid" ? [-1, -.5, 0, .5, 1]
            : floor === "Brushed metal" ? [-1, -.75, -.5, -.25, 0, .25, .5, .75, 1] : [-1, 1];
          for (const lane of lanes) {
            path([ring.project({ x: lane * floorGeometry[1], y: floorGeometry[0] }),
              next.project({ x: lane * floorGeometry[1], y: floorGeometry[0] })]);
            ctx.lineWidth = Math.max(.6, thickness * .25 / Math.max(near, next.z));
            ctx.strokeStyle = "rgba(113,113,113," + fog * .45 + ")"; ctx.stroke();
          }
        }
        if (!ring.gate) continue;
        const width = Math.max(.65, thickness / Math.max(near, ring.z));
        const strokeGate = (strokeWidth, saturation, light, alpha) => {
          ctx.lineWidth = strokeWidth;
          if (!flow) {
            path(ring.points); ctx.closePath();
            ctx.strokeStyle = `hsla(${hue},${saturation}%,${light}%,${alpha})`; ctx.stroke();
          } else for (let j = 0; j < cross.length; j++) {
            const k = (j + 1) % cross.length;
            path([ring.points[j], ring.points[k]]);
            ctx.strokeStyle = lineColor(ring.points[j], ring.points[k], hueAt(ring, cross[j]), hueAt(ring, cross[k]), saturation, light, alpha); ctx.stroke();
          }
        };
        if (glow > .001) strokeGate(width * (2 + glow * 2), 95, 55, fog * glow * .12);
        strokeGate(width, 92, 61, fog * .8);
        if (floor !== "None" && floor !== "Obsidian") {
          path([ring.project({ x: -floorGeometry[1], y: floorGeometry[0] }), ring.project({ x: floorGeometry[1], y: floorGeometry[0] })]);
          ctx.lineWidth = Math.max(.6, width * .4);
          ctx.strokeStyle = "rgba(9,9,9,.9)"; ctx.stroke();
          ctx.lineWidth = Math.max(.6, width * .15);
          ctx.strokeStyle = "rgba(94,94,94," + fog * .4 + ")"; ctx.stroke();
        }
      }
      ctx.restore();
    }

    drawParticles(levels, controls) {
      const ctx = this.context;
      const bodyOpacity = interiorOpacity(effectValue(controls, "particles", "opacity", 100));
      const particleAmount = effectValue(controls, "particles", "amount", effectValue(controls, "particles", "count", 50));
      const requestedAmount = Math.round(baselineRange(particleAmount, 84, 0, 160));
      const loadFactor = window.__shamonsoftPerformance?.captureActive
        ? 1
        : Math.max(0.55, Math.min(1, window.__shamonsoftPerformance?.loadFactor || 1));
      const amount = requestedAmount <= 24 ? requestedAmount : Math.max(24, Math.round(requestedAmount * loadFactor));
      const spread = visualRange("spread", effectValue(controls, "particles", "spread", 50), 1.0, 0.38, 1.9);
      const speed = visualRange("speed", effectValue(controls, "particles", "speed", 50), 0.72, 0.05, 2.2);
      const intensity = sliderPercent(effectValue(controls, "particles", "intensity", 50), 50);
      const beatExpand = sliderPercent(effectValue(controls, "particles", "beatexpand", 50), 50);
      const size = visualRange("size", effectValue(controls, "particles", "size", 50), 18, 2, 96);
      const hue = Number.isFinite(effectValue(controls, "particles", "hue", 220))
        ? Number(effectValue(controls, "particles", "hue", 220))
        : 220;
      const randomizeColors = Boolean(controls.randomize?.particles);
      const shape = effectValue(controls, "particles", "shape", "Orb");
      const centerX = this.width * 0.5;
      const centerY = this.height * 0.5;
      const pulse = (levels.reduce((sum, value) => sum + value, 0) / Math.max(1, levels.length)) * intensity;
      const beat = (this.audioFeatures?.beat || 0) * beatExpand;
      const verticalReach = this.height * 0.22 * spread;
      const horizontalReach = this.width * 0.28 * spread;
      const orbitPhase = this.advanceMotionPhase("particles:orbit", 0.011 * (0.65 + speed * 1.15));
      const driftPhase = this.advanceMotionPhase("particles:drift", 0.011 * 0.38 * (0.3 + speed));

      for (let index = 0; index < amount; index += 1) {
        const layer = index / Math.max(1, amount - 1);
        const particle = this.particles[index];
        const level = levels[Math.round(layer * Math.max(0, levels.length - 1))] ?? 0;
        const localReact = level * intensity;
        const angle = particle.phase + orbitPhase * particle.speed;
        const drift = particle.drift + driftPhase;
        const targetX = centerX
          + Math.cos(angle) * horizontalReach * particle.orbitX
          + Math.sin(drift * 1.8) * this.width * 0.022 * spread;
        const targetY = centerY
          + particle.orbitY * verticalReach
          + Math.sin(angle * 1.45 + particle.phase) * this.height * 0.032 * 0.85
          + Math.cos(drift * 1.25) * this.height * 0.018 * spread;
        const baseSize = Math.max(1.2, size * (0.18 + layer * 0.62));
        const expand = 1 + beat * (0.28 + localReact * 0.42) + localReact * 0.36;
        const pxSize = Math.max(1.4, baseSize * expand);
        const primaryHue = wrapHue(animatedRgbHue(controls, "particles", hue, layer * 240, this.animationFrame * 1.6) + layer * 18);
        const tilt = angle * particle.spin;
        const motionSmoothing = 1 - Math.pow(1 - clamp(0.14 + (1 - speed / 2.2) * 0.16, 0.1, 0.26), this.frameStep);

        if (!particle.initialized) {
          particle.x = targetX;
          particle.y = targetY;
          particle.initialized = true;
        } else {
          particle.x = lerp(particle.x, targetX, motionSmoothing);
          particle.y = lerp(particle.y, targetY, motionSmoothing);
        }

        drawParticleShape(ctx, shape, particle.x, particle.y, pxSize, primaryHue, tilt, bodyOpacity);
      }
    }

    drawLightBeams(levels, controls) {
      const ctx = this.context;
      const count = Math.max(2, Math.round(visualRange("count", effectValue(controls, "lightBeams", "count", 50), 9, 2, 18)));
      const beamWidth = visualRange("width", effectValue(controls, "lightBeams", "width", 50), this.width * 0.03, this.width * 0.008, this.width * 0.07);
      const randomAmount = visualRange("random", effectValue(controls, "lightBeams", "random", 50), 0.18, 0.0, 0.58);
      const spread = visualRange("spread", effectValue(controls, "lightBeams", "spread", 50), 1.0, 0.45, 1.7);
      const angleAmount = centered(effectValue(controls, "lightBeams", "angle", 50), 50);
      const speed = visualRange("speed", effectValue(controls, "lightBeams", "speed", 50), 0.65, 0.08, 1.8);
      const glow = visualRange("glow", effectValue(controls, "lightBeams", "glow", 50), 0.5, 0.08, 0.9);
      const intensity = sliderPercent(effectValue(controls, "lightBeams", "intensity", 50), 50);
      const hue = Number.isFinite(effectValue(controls, "lightBeams", "hue", 220))
        ? Number(effectValue(controls, "lightBeams", "hue", 220))
        : 220;
      const randomizeColors = Boolean(controls.randomize?.lightBeams);
      const centerX = this.width * 0.5;
      const mountY = 0;
      const floorY = this.height * 0.84;
      const huePhase = this.animationFrame * 0.003;
      const mountPhase = this.advanceMotionPhase("light-beams:mount", 0.01 * (0.22 + speed * 0.42));
      const panPhase = this.advanceMotionPhase("light-beams:pan", 0.01 * (0.62 + speed * 1.05));
      const average = levels.reduce((sum, value) => sum + value, 0) / Math.max(1, levels.length);
      const beat = this.audioFeatures?.beat || 0;
      const totalWidth = this.width * 0.6 * spread;

      for (let index = 0; index < count; index += 1) {
        const t = count === 1 ? 0.5 : index / (count - 1);
        const centeredT = t - 0.5;
        const level = levels[Math.round(t * Math.max(0, levels.length - 1))] ?? average;
        const audioReact = average * 0.45 + level * 0.55;
        const beamHue = wrapHue(animatedRgbHue(controls, "lightBeams", hue, index * 42, this.animationFrame * 1.25) + centeredT * 18 + Math.sin(huePhase + index) * 4);
        const mountX = centerX
          + centeredT * totalWidth
          + Math.sin(mountPhase + index * 1.37) * this.width * 0.014 * spread;
        const pan = Math.sin(panPhase + index * 0.72) * 0.52;
        const seededOffset = Math.sin(index * 12.9898 + 4.1414) * 43758.5453;
        const normalizedOffset = (seededOffset - Math.floor(seededOffset)) * 2 - 1;
        const tilt = angleAmount * 0.46 + normalizedOffset * randomAmount + pan * 0.18;
        const beamReach = Math.max(1, floorY - mountY);
        const endX = mountX + Math.sin(tilt) * beamReach * 0.56;
        const endY = floorY;
        const localWidth = beamWidth * (0.84 + audioReact * intensity * 0.08 + beat * intensity * 0.26);
        const taper = 1.12 + glow * 0.2;

        ctx.save();
        ctx.globalCompositeOperation = "lighter";

        const outerGradient = ctx.createLinearGradient(mountX, mountY, endX, endY);
        outerGradient.addColorStop(0, `hsla(${beamHue + 8}, 100%, 84%, 0)`);
        outerGradient.addColorStop(0.18, `hsla(${beamHue + 2}, 100%, 82%, ${0.02 + glow * 0.02})`);
        outerGradient.addColorStop(0.56, `hsla(${beamHue}, 100%, 80%, ${0.052 + glow * 0.038})`);
        outerGradient.addColorStop(0.94, `hsla(${beamHue - 4}, 100%, 74%, ${0.018 + intensity * 0.022})`);
        outerGradient.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = outerGradient;
        ctx.beginPath();
        ctx.moveTo(mountX - localWidth * 0.12, mountY);
        ctx.quadraticCurveTo(mountX - localWidth * 0.08, mountY + beamReach * 0.24, endX - localWidth * taper, endY);
        ctx.lineTo(endX + localWidth * taper, endY);
        ctx.quadraticCurveTo(mountX + localWidth * 0.08, mountY + beamReach * 0.24, mountX + localWidth * 0.12, mountY);
        ctx.closePath();
        ctx.fill();

        const floorBloom = ctx.createRadialGradient(endX, endY, 0, endX, endY, localWidth * (2.6 + glow * 1.4));
        floorBloom.addColorStop(0, `hsla(${beamHue + 4}, 100%, 88%, ${0.06 + glow * 0.04 + intensity * beat * 0.06})`);
        floorBloom.addColorStop(0.45, `hsla(${beamHue - 2}, 100%, 70%, ${0.025 + glow * 0.02})`);
        floorBloom.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = floorBloom;
        ctx.fillRect(
          endX - localWidth * 4.5,
          endY - localWidth * 4.5,
          localWidth * 9,
          localWidth * 9,
        );

        ctx.restore();
      }
    }

    drawShockwaves(levels, controls) {
      const ctx = this.context;
      const size = visualRange("size", effectValue(controls, "shockwave", "size", 50), 1.05, 0.42, 3.8);
      const width = visualRange("width", effectValue(controls, "shockwave", "width", 50), 1.0, 0.28, 2.8);
      const speed = visualRange("speed", effectValue(controls, "shockwave", "speed", 50), 0.72, 0.08, 2.6);
      const fade = visualRange("fade", effectValue(controls, "shockwave", "fade", 50), 0.72, 0.16, 1.55);
      const glow = visualRange("glow", effectValue(controls, "shockwave", "glow", 50), 0.7, 0.08, 1.8);
      const hue = Number.isFinite(effectValue(controls, "shockwave", "hue", 220))
        ? Number(effectValue(controls, "shockwave", "hue", 220))
        : 220;
      const randomizeColors = Boolean(controls.randomize?.shockwave);
      const intensity = sliderPercent(effectValue(controls, "shockwave", "intensity", 50), 50);
      const scatter = visualRange("scatter", effectValue(controls, "shockwave", "scatter", 50), 0.46, 0.08, 1.0);
      const depth = visualRange("depth", effectValue(controls, "shockwave", "depth", 50), 0.92, 0.18, 2.1);
      const beat = Math.max(...levels, 0);
      const bassWindow = Math.max(1, Math.min(5, Math.ceil(levels.length * 0.18)));
      let bass = 0;
      for (let index = 0; index < bassWindow; index += 1) {
        bass += levels[index] || 0;
      }
      bass /= bassWindow;
      const average = levels.reduce((sum, value) => sum + value, 0) / Math.max(1, levels.length);
      const time = this.animationFrame / 60;
      this.shockEnergyFloor = lerp(this.shockEnergyFloor, bass, 1 - Math.pow(1 - (bass > this.shockEnergyFloor ? 0.12 : 0.025), this.frameStep));
      const dynamicThreshold = this.shockEnergyFloor + (0.095 - intensity * 0.03);
      const triggerThreshold = Math.max(0.2, 0.375 - intensity * 0.085, dynamicThreshold);
      const impulseThreshold = 0.044 - intensity * 0.016;
      const cooldown = Math.max(0.26, 0.98 - intensity * 0.46);
      const canSpawn = (time - this.lastShockSpawnAt) >= cooldown;
      const bassImpulse = bass - this.lastShockBass;
      const beatImpulse = beat - this.lastShockBeat;
      const risingEnergy = bass > triggerThreshold && bassImpulse > impulseThreshold && beatImpulse > impulseThreshold * 0.45;
      const signal = this.audioFeatures;
      const newOnset = signal && signal.beatCounter !== this.lastShockOnset && signal.beat > 0.15;
      if (signal) this.lastShockOnset = signal.beatCounter;

      if (canSpawn && (signal?.beatCounter !== undefined ? newOnset : risingEnergy)) {
        const slot = this.shockwaves.find((entry) => !entry.active) ?? this.shockwaves[0];
        slot.active = true;
        slot.age = 0;
        slot.duration = 0.96 + (1.18 - speed) * 0.42;
        slot.xNorm = (Math.sin(time * 0.9 + beat * 7.4) * 0.5 + Math.sin(time * 0.31 + average * 10.2) * 0.5) * 0.5;
        slot.yNorm = (Math.cos(time * 0.47 + beat * 5.6) * 0.5 + Math.sin(time * 0.22 + average * 8.8) * 0.5) * 0.34;
        slot.hueOffset = randomizeColors
          ? (animatedRgbHue(controls, "shockwave", 0, this.shockwaves.indexOf(slot) * 38, this.animationFrame * 3.6) % 360)
          : (Math.sin(time * 0.7 + average * 8) * 0.5 + 0.5) * 42;
        slot.strength = Math.max(0.25, beat * 0.8 + average * 0.45) * (0.42 + intensity * 1.1);
        this.lastShockSpawnAt = time;
      }
      this.lastShockBeat = beat;
      this.lastShockBass = bass;

      for (const shockwave of this.shockwaves) {
        if (!shockwave.active) {
          continue;
        }

        shockwave.age += this.deltaSeconds * (0.65 + speed * 0.9);
        const life = shockwave.age / Math.max(0.001, shockwave.duration);
        if (life >= 1) {
          shockwave.active = false;
          continue;
        }

        const zTravel = 1 - Math.pow(1 - life, 1.4);
        const perspective = 0.12 + zTravel * 1.9 * depth;
        const radiusX = this.width * 0.1 * size * perspective;
        const radiusY = this.height * 0.055 * size * perspective;
        const ringWidth = Math.max(1.4, this.width * 0.0028 * width * perspective);
        const alpha = smoothUnit(life / 0.055) * Math.max(0, (1 - life) ** (1.15 + fade * 1.4)) * (0.18 + shockwave.strength * 0.42);
        const centerX = this.width * (0.5 + shockwave.xNorm * scatter);
        const centerY = this.height * (0.56 + shockwave.yNorm * scatter - zTravel * 0.28);
        const ringHue = wrapHue(hue + shockwave.hueOffset);

        ctx.save();
        ctx.globalCompositeOperation = "lighter";

        const outerGlow = ctx.createRadialGradient(centerX, centerY, radiusX * 0.55, centerX, centerY, radiusX * 1.22);
        outerGlow.addColorStop(0, "rgba(255,255,255,0)");
        outerGlow.addColorStop(0.68, `hsla(${ringHue + 4}, 100%, 80%, ${alpha * (0.3 + glow * 0.28)})`);
        outerGlow.addColorStop(1, "rgba(255,255,255,0)");
        ctx.strokeStyle = outerGlow;
        ctx.lineWidth = ringWidth * (2 + glow * 0.9);
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
        ctx.stroke();

        const ringGradient = ctx.createLinearGradient(centerX - radiusX, centerY - radiusY, centerX + radiusX, centerY + radiusY);
        ringGradient.addColorStop(0, `hsla(${ringHue - 12}, 100%, 92%, ${alpha * 0.8})`);
        ringGradient.addColorStop(0.45, `hsla(${ringHue + 4}, 100%, 82%, ${alpha})`);
        ringGradient.addColorStop(1, `hsla(${ringHue + 14}, 100%, 76%, ${alpha * 0.72})`);
        ctx.strokeStyle = ringGradient;
        ctx.lineWidth = ringWidth;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
      }
    }

    tick(timestamp) {
      const now = Number.isFinite(timestamp) ? timestamp : performance.now();
      this.deltaSeconds = this.lastFrameTime === null ? 1 / 60 : clamp((now - this.lastFrameTime) / 1000, 0.001, 0.05);
      this.lastFrameTime = now;
      this.frameStep = this.deltaSeconds * 60;
      if (window.__shamonsoftCompositor?.isFrozen?.()) {
        this.frameHandle = requestAnimationFrame(this.tick);
        return;
      }
      const controls = this.getControls();
      const customOrder = Boolean(window.__shamonsoftLayerOrder?.isCustom?.());
      const procedural = document.getElementById("glcanvas");
      const overlayState = window.__shamonsoftOverlay?.state;
      const externalContent = customOrder && (procedural?.dataset.active === "true"
        || Boolean(overlayState?.enabled && (overlayState.text || overlayState.subtitle
          || (overlayState.logoEnabled && overlayState.logoDataUrl) || overlayState.guides)));
      const renderedEffectIds = ["main", "background", "floorGrid", "sonicRunway", "particles", "lightBeams", "shockwave"];
      const hasVisualContent = externalContent || Boolean(controls.background?.enabled)
        || renderedEffectIds.some(effectId => Boolean(controls.effects?.[effectId]));
      this.canvas.dataset.active = String(hasVisualContent);
      this.canvas.dataset.layerOrdered = String(customOrder);
      if (!hasVisualContent && !window.__shamonsoftPerformance?.captureActive) {
        if (!this.idleCleared) {
          this.context.clearRect(0, 0, this.width, this.height);
          this.visualContext.clearRect(0, 0, this.width, this.height);
          this.idleCleared = true;
        }
        this.frameHandle = requestAnimationFrame(this.tick);
        return;
      }
      this.idleCleared = false;
      if (this.renderedFrames % 30 === 0) {
        const nextScale = window.__shamonsoftPerformance?.captureActive
          ? 1
          : Math.max(0.5, Math.min(1.25, window.__shamonsoftPerformance?.renderScale || 1));
        if (Math.abs(nextScale - (this.renderScale || 1)) >= 0.05) this.resize();
      }
      const levels = this.getBandLevels(this.barCount);
      this.audioFeatures = window.__shamonsoftAudioRouter?.signals?.() || {
        bass: spectrumAt(levels, 0.15), mid: spectrumAt(levels, 0.5), high: spectrumAt(levels, 0.85), beat: 0,
      };
      // Zero is a valid hue (the left edge of the color spectrum), so only
      // fall back when the value is actually absent.
      const baseHue = controls.background.hue ?? 220;
      const backgroundBrightness = controls.background.brightness ?? 65;
      const glowStrength = clamp((controls.global.glow ?? 65) / 100, 0, 1);
      const backgroundEnabled = controls.effects?.background !== false && controls.background.enabled !== false;
      const backgroundRgb = backgroundEnabled && Boolean(controls.randomize?.background);
      const backgroundRgbMode = controls.rgbModes?.background || "flow";
      const hue = animatedRgbHue(controls, "background", baseHue, 0, this.animationFrame * 0.65);
      const backgroundHueSpread = backgroundRgb && backgroundRgbMode === "flow" ? 120 : 8;
      const useCustomBackground = backgroundEnabled && Boolean(controls.background.customEnabled);
      const backgroundMode = backgroundEnabled ? resolveBackgroundMode(controls.background) : "black";
      const mainMode = resolveMainMode(controls.modeName);
      const mainEnabled = controls.effects?.main !== false;

      const drawMain = () => {
        if (!mainEnabled) return;
        const outputContext = this.context;
        const layerContext = this.visualContext;
        layerContext.clearRect(0, 0, this.width, this.height);
        layerContext.save();
        // Each formation rotates in its own surface geometry. The finished
        // picture is never spun, and floor-standing bars remain upright.
        this.context = layerContext;
        try {
          if (mainMode.id === "glassWavelength") {
            this.drawWavelength(levels, controls);
          } else if (mainMode.id === "sonicRunway") {
            this.drawSonicRunway(levels, controls);
          } else if (mainMode.id === "radialPulse") {
            this.drawRadialPulse(levels, controls);
          } else if (mainMode.id === "orbitBloom") {
            this.drawOrbitBloom(levels, controls);
          } else if (mainMode.id === "latticeField") {
            this.drawLatticeField(levels, controls);
          } else {
            this.drawBars(levels, controls);
          }
        } finally {
          layerContext.restore();
          this.context = outputContext;
        }

        outputContext.save();
        outputContext.globalCompositeOperation = "source-over";
        outputContext.globalAlpha = 1;
        outputContext.filter = "none";
        outputContext.drawImage(this.visualLayer, 0, 0, this.visualLayer.width, this.visualLayer.height, 0, 0, this.width, this.height);
        outputContext.restore();
      };
      if (customOrder) {
        // Compose once in the existing canvas: no extra full-size layer buffers
        // and no second effect update that could advance animation phases twice.
        const ctx = this.context;
        ctx.clearRect(0, 0, this.width, this.height);
        for (const id of window.__shamonsoftLayerOrder.serialize()) {
          ctx.save();
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = "source-over";
          ctx.filter = "none";
          try {
            if (id === "background" && backgroundEnabled) {
              if (useCustomBackground) window.__shamonsoftCompositor?.drawBackgroundMedia?.(ctx, this.width, this.height);
              this.drawBackground(hue, useCustomBackground, backgroundMode, backgroundBrightness, backgroundHueSpread, true, false);
            } else if (id === "floorGrid") this.drawFloor(hue, glowStrength, useCustomBackground, backgroundMode, levels, controls);
            else if (id === "sonicRunway" && controls.effects?.sonicRunway) this.drawRunwayTunnel(levels, controls);
            else if (id === "main") drawMain();
            else if (id === "particles" && controls.effects?.particles) this.drawParticles(levels, controls);
            else if (id === "lightBeams" && controls.effects?.lightBeams) this.drawLightBeams(levels, controls);
            else if (id === "shockwave" && controls.effects?.shockwave) this.drawShockwaves(levels, controls);
            else if (id === "proceduralScene" && procedural?.dataset.active === "true") {
              ctx.globalAlpha = window.__shamonsoftSceneCatalog?.opacity?.() ?? .25;
              ctx.drawImage(procedural, 0, 0, this.width, this.height);
            } else if (id === "shamonsoftOverlays") {
              const energy = ((this.audioFeatures.bass || 0) + (this.audioFeatures.mid || 0) + (this.audioFeatures.high || 0)) / 3;
              window.__shamonsoftOverlay?.draw?.(ctx, this.width, this.height, energy, now / 1000);
            }
          } finally { ctx.restore(); }
        }
      } else {
        // Preserve the accepted composition and blending when order is unchanged.
        this.drawBackground(hue, useCustomBackground, backgroundMode, backgroundBrightness, backgroundHueSpread, backgroundEnabled);
        this.drawFloor(hue, glowStrength, useCustomBackground, backgroundMode, levels, controls);
        if (controls.effects?.sonicRunway) this.drawRunwayTunnel(levels, controls);
        drawMain();
        if (controls.effects?.particles) this.drawParticles(levels, controls);
        if (controls.effects?.lightBeams) this.drawLightBeams(levels, controls);
        if (controls.effects?.shockwave) this.drawShockwaves(levels, controls);
      }
      this.animationFrame += this.frameStep;
      this.renderedFrames += 1;

      this.frameHandle = requestAnimationFrame(this.tick);
    }
  }

  function roundRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  window.startFallbackVisualizer = function startFallbackVisualizer(options) {
    if (window.__fallbackVisualizer) {
      window.__fallbackVisualizer.destroy();
    }

    window.__fallbackVisualizer = new FallbackGlassBarsRenderer(options);
    document.documentElement.dataset.visualEngine = "fallback";
    return window.__fallbackVisualizer;
  };
}());
