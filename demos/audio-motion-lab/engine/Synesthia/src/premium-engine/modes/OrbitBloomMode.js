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

export class OrbitBloomMode {
  constructor(stage, materialSystem) {
    this.stage = stage;
    this.materialSystem = materialSystem;
    this.bandCount = 32;
    this.maxOrbs = 24;
    this.entries = [];
    this.group = new THREE.Group();
    this.reflectionGroup = new THREE.Group();
    this.stage.modeRoot.add(this.group);
    this.stage.reflectionRoot.add(this.reflectionGroup);
    this.build();
  }

  build() {
    const shellGeometry = new THREE.IcosahedronGeometry(0.26, 1);
    const coreGeometry = new THREE.IcosahedronGeometry(0.1, 0);
    const petalGeometry = new THREE.SphereGeometry(0.24, 12, 12);

    for (let index = 0; index < this.maxOrbs; index += 1) {
      const shellMaterial = this.materialSystem.createGlassBodyMaterial();
      const coreMaterial = this.materialSystem.createInnerGlowMaterial();
      const metalMaterial = this.materialSystem.createMetalMaterial();
      const reflectionShellMaterial = this.materialSystem.createReflectionGlassMaterial();
      const reflectionCoreMaterial = this.materialSystem.createReflectionCoreMaterial();
      const reflectionMetalMaterial = this.materialSystem.createMetalMaterial();

      const body = new THREE.Group();
      const shell = new THREE.Mesh(shellGeometry, shellMaterial);
      const core = new THREE.Mesh(coreGeometry, coreMaterial);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.03, 12, 32), metalMaterial);
      ring.rotation.x = Math.PI / 2;
      body.add(shell, core, ring);
      this.group.add(body);

      const reflectionBody = new THREE.Group();
      const rShell = new THREE.Mesh(shellGeometry.clone(), reflectionShellMaterial);
      const rCore = new THREE.Mesh(coreGeometry.clone(), reflectionCoreMaterial);
      const rRing = new THREE.Mesh(ring.geometry.clone(), reflectionMetalMaterial);
      rRing.rotation.x = Math.PI / 2;
      reflectionBody.add(rShell, rCore, rRing);
      this.reflectionGroup.add(reflectionBody);

      this.entries.push({
        body,
        reflectionBody,
        shell,
        core,
        ring,
        reflectionShell: rShell,
        reflectionCore: rCore,
        reflectionRing: rRing,
        shellMaterial,
        coreMaterial,
        reflectionShellMaterial,
        reflectionCoreMaterial,
        metalMaterials: [metalMaterial],
        reflectionMetalMaterials: [reflectionMetalMaterial],
        orbitSeed: index * 0.61,
      });
    }
  }

  setActive(isActive) {
    this.group.visible = isActive;
    this.reflectionGroup.visible = isActive;
  }

  update(time, deltaTime, audioFrame, controls) {
    const mode = controls.mode ?? {};
    const modeName = controls.modeName ?? "Orbit";
    const materialName = controls.materialName ?? "Glass Bubble";
    const hue = Number.isFinite(mode.hue) ? mode.hue : 220;
    const intensity = baselineRange(mode.intensity, 0.92, 0.26, 1.8);
    const glow = baselineRange(mode.glow, 0.9, 0.16, 1.6);
    const amount = Math.max(6, Math.min(this.maxOrbs, Math.round(baselineRange(mode.amount, 14, 6, this.maxOrbs))));
    const size = baselineRange(mode.size, 1.0, 0.5, 2.0);
    const spread = baselineRange(mode.spread, 1.0, 0.55, 1.7);
    const speed = baselineRange(mode.speed, 0.9, 0.12, 2.1);
    const depth = baselineRange(mode.depth, 1.0, 0.5, 1.8);
    const motion = baselineRange(mode.motion, 0.38, 0.04, 1.0);
    const isPetals = modeName === "Petals";
    const isStarburst = modeName === "Starburst";
    const isConstellation = modeName === "Constellation";

    for (let index = 0; index < this.maxOrbs; index += 1) {
      const entry = this.entries[index];
      const visible = index < amount;
      entry.body.visible = visible;
      entry.reflectionBody.visible = visible;
      if (!visible) continue;

      const layer = index / Math.max(1, amount - 1);
      const angle = time * (0.5 + speed * 0.5) + entry.orbitSeed;
      const bandIndex = Math.round(layer * Math.max(0, audioFrame.bands.length - 1));
      const band = audioFrame.bands[bandIndex] ?? audioFrame.overall;
      const energy = band * intensity + audioFrame.beat * 0.2;
      const radius = (2.2 + layer * 4.4) * spread + energy * 0.8;
      const burst = isStarburst ? Math.sin(time * (1 + motion) + index) * 0.8 : 0;
      const x = Math.cos(angle * (isConstellation ? 0.6 : 1.0) + burst) * radius;
      const z = Math.sin(angle + layer * 1.2) * radius * 0.46 * depth;
      const y = 4.2 + Math.sin(angle * (isPetals ? 2.2 : 1.1)) * (1.2 + motion * 1.2) + band * 2.4;
      const scale = (0.6 + size * 0.28 + energy * 0.42) * (isPetals ? 1.2 : 1);

      entry.body.position.set(x, y, z);
      entry.reflectionBody.position.copy(entry.body.position);
      entry.body.rotation.set(angle * 0.5, angle * 0.7, angle * 0.35);
      entry.reflectionBody.rotation.copy(entry.body.rotation);
      entry.body.scale.setScalar(scale);
      entry.reflectionBody.scale.copy(entry.body.scale);

      const hueOffset = layer * 140 + (isStarburst ? index * 4 : 0);
      const shellColor = hueColor(hue + hueOffset, 80, 58);
      const accentColor = hueColor(hue + 18 + hueOffset, 100, 76);
      const coreColor = hueColor(hue - 6 + hueOffset * 0.4, 100, 84);
      const metalColor = hueColor(hue + 18, 16, 78);
      this.materialSystem.applySurfaceProfile(materialName, entry, {
        shellColor,
        accentColor,
        coreColor,
        metalColor,
      }, glow, energy);
    }
  }
}
