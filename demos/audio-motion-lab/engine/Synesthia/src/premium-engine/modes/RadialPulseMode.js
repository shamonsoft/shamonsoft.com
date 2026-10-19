import * as THREE from "../../vendor/three/three.module.js";

function normalize(value, fallback = 50) {
  const numeric = Number.isFinite(value) ? value : fallback;
  return Math.max(0, Math.min(1, numeric / 100));
}
function baselineRange(value, baseline, min, max) {
  const numeric = Number.isFinite(value) ? value : 50;
  if (numeric <= 50) {
    return THREE.MathUtils.lerp(min, baseline, numeric / 50);
  }
  return THREE.MathUtils.lerp(baseline, max, (numeric - 50) / 50);
}
function hueColor(hue, saturation, lightness) {
  return new THREE.Color(`hsl(${((hue % 360) + 360) % 360}, ${saturation}%, ${lightness}%)`);
}

export class RadialPulseMode {
  constructor(stage, materialSystem) {
    this.stage = stage;
    this.materialSystem = materialSystem;
    this.bandCount = 36;
    this.layerCount = 5;
    this.layers = [];
    this.group = new THREE.Group();
    this.reflectionGroup = new THREE.Group();
    this.stage.modeRoot.add(this.group);
    this.stage.reflectionRoot.add(this.reflectionGroup);
    this.build();
  }

  build() {
    for (let index = 0; index < this.layerCount; index += 1) {
      const shellMaterial = this.materialSystem.createGlassBodyMaterial();
      const coreMaterial = this.materialSystem.createInnerGlowMaterial();
      const metalMaterial = this.materialSystem.createMetalMaterial();
      const reflectionShellMaterial = this.materialSystem.createReflectionGlassMaterial();
      const reflectionCoreMaterial = this.materialSystem.createReflectionCoreMaterial();
      const reflectionMetalMaterial = this.materialSystem.createMetalMaterial();

      const ring = new THREE.Group();
      const shell = new THREE.Mesh(new THREE.TorusGeometry(2 + index * 0.85, 0.16, 22, 120), shellMaterial);
      const core = new THREE.Mesh(new THREE.TorusGeometry(2 + index * 0.85, 0.055, 16, 80), coreMaterial);
      const crown = new THREE.Mesh(new THREE.TorusGeometry(2 + index * 0.85, 0.035, 12, 64), metalMaterial);
      ring.add(shell, core, crown);

      const reflectionRing = new THREE.Group();
      const rShell = new THREE.Mesh(shell.geometry.clone(), reflectionShellMaterial);
      const rCore = new THREE.Mesh(core.geometry.clone(), reflectionCoreMaterial);
      const rCrown = new THREE.Mesh(crown.geometry.clone(), reflectionMetalMaterial);
      reflectionRing.add(rShell, rCore, rCrown);

      this.group.add(ring);
      this.reflectionGroup.add(reflectionRing);
      this.layers.push({
        ring,
        reflectionRing,
        shell,
        core,
        crown,
        reflectionShell: rShell,
        reflectionCore: rCore,
        reflectionCrown: rCrown,
        shellMaterial,
        coreMaterial,
        reflectionShellMaterial,
        reflectionCoreMaterial,
        metalMaterials: [metalMaterial],
        reflectionMetalMaterials: [reflectionMetalMaterial],
      });
    }
  }

  setActive(isActive) {
    this.group.visible = isActive;
    this.reflectionGroup.visible = isActive;
  }

  update(time, deltaTime, audioFrame, controls) {
    const mode = controls.mode ?? {};
    const modeName = controls.modeName ?? "Rings";
    const materialName = controls.materialName ?? "Glass Bubble";
    const hue = Number.isFinite(mode.hue) ? mode.hue : 220;
    const intensity = baselineRange(mode.intensity, 0.95, 0.28, 1.8);
    const glow = baselineRange(mode.glow, 0.9, 0.16, 1.65);
    const amount = Math.max(2, Math.min(this.layerCount, Math.round(baselineRange(mode.amount, 4, 2, this.layerCount))));
    const width = baselineRange(mode.width, 1.0, 0.5, 1.8);
    const spread = baselineRange(mode.spread, 1.0, 0.6, 1.6);
    const depth = baselineRange(mode.depth, 1.0, 0.5, 1.8);
    const motion = baselineRange(mode.motion, 0.34, 0.04, 0.9);
    const rotate = normalize(mode.rotate, 0);
    const isVortex = modeName === "Vortex";
    const isMandala = modeName === "Mandala";
    const isKaleido = modeName === "Kaleidoscope";
    const isRadar = modeName === "Radar Sweep";
    const isSpectrumRing = modeName === "Spectrum Ring";

    this.group.rotation.z = THREE.MathUtils.damp(this.group.rotation.z, (rotate - 0.5) * 0.8, 3.4, deltaTime);
    this.reflectionGroup.rotation.z = this.group.rotation.z;

    for (let index = 0; index < this.layerCount; index += 1) {
      const layer = this.layers[index];
      const visible = index < amount;
      layer.ring.visible = visible;
      layer.reflectionRing.visible = visible;
      if (!visible) continue;

      const bandIndex = Math.round((index / Math.max(1, amount - 1)) * Math.max(0, audioFrame.bands.length - 1));
      const band = audioFrame.bands[bandIndex] ?? audioFrame.overall;
      const energy = band * intensity + audioFrame.beat * 0.25;
      const radiusScale = 1 + energy * 0.22 + (isVortex ? Math.sin(time * 1.2 + index) * 0.08 : 0);
      const z = -index * 0.2 * depth + (isVortex ? -index * 0.5 : 0);
      const y = 4 + Math.sin(time * (0.6 + motion) + index) * 0.08 * (isMandala ? 1.5 : 0.7);
      layer.ring.position.set(0, y, z);
      layer.reflectionRing.position.copy(layer.ring.position);
      layer.ring.rotation.x = isKaleido ? Math.sin(time * 0.6 + index) * 0.4 : Math.PI / 2;
      layer.reflectionRing.rotation.copy(layer.ring.rotation);
      layer.ring.rotation.y = isRadar ? time * (0.4 + motion) + index * 0.3 : (isVortex ? time * (0.6 + motion) * (index % 2 === 0 ? 1 : -1) : time * 0.16 * (index + 1));
      layer.reflectionRing.rotation.y = layer.ring.rotation.y;
      const scaleX = radiusScale * spread;
      const scaleY = radiusScale * (isSpectrumRing ? 0.68 + audioFrame.overall * 0.18 : 1);
      const scaleZ = radiusScale * width;
      layer.ring.scale.set(scaleX, scaleY, scaleZ);
      layer.reflectionRing.scale.copy(layer.ring.scale);

      const hueOffset = index * 18 + (isSpectrumRing ? bandIndex * 2.4 : 0);
      const shellColor = hueColor(hue + hueOffset, 80, 58);
      const accentColor = hueColor(hue + 18 + hueOffset, 100, 76);
      const coreColor = hueColor(hue - 6 + hueOffset * 0.4, 100, 84);
      const metalColor = hueColor(hue + 18, 16, 78);
      this.materialSystem.applySurfaceProfile(materialName, layer, {
        shellColor,
        accentColor,
        coreColor,
        metalColor,
      }, glow, energy);
    }
  }
}
