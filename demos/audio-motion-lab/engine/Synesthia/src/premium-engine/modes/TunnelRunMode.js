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

export class TunnelRunMode {
  constructor(stage, materialSystem) {
    this.stage = stage;
    this.materialSystem = materialSystem;
    this.bandCount = 28;
    this.maxGateCount = 18;
    this.entries = [];
    this.group = new THREE.Group();
    this.reflectionGroup = new THREE.Group();
    this.stage.modeRoot.add(this.group);
    this.stage.reflectionRoot.add(this.reflectionGroup);
    this.build();
  }

  build() {
    for (let index = 0; index < this.maxGateCount; index += 1) {
      const gate = new THREE.Group();
      const reflectionGate = new THREE.Group();
      const shellMaterial = this.materialSystem.createGlassBodyMaterial();
      const coreMaterial = this.materialSystem.createInnerGlowMaterial();
      const metalMaterial = this.materialSystem.createMetalMaterial();
      const reflectionShellMaterial = this.materialSystem.createReflectionGlassMaterial();
      const reflectionCoreMaterial = this.materialSystem.createReflectionCoreMaterial();
      const reflectionMetalMaterial = this.materialSystem.createMetalMaterial();

      const pieces = [];
      const reflectionPieces = [];

      [-1, 1].forEach((side) => {
        const uprightShell = new THREE.Mesh(new THREE.BoxGeometry(0.38, 5.2, 0.52), shellMaterial);
        const uprightCore = new THREE.Mesh(new THREE.BoxGeometry(0.14, 4.9, 0.14), coreMaterial);
        const uprightCap = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.16, 0.58), metalMaterial);
        uprightShell.position.set(side * 2.8, 2.6, 0);
        uprightCore.position.copy(uprightShell.position);
        uprightCap.position.set(side * 2.8, 5.28, 0);
        gate.add(uprightShell, uprightCore, uprightCap);

        const rShell = new THREE.Mesh(uprightShell.geometry.clone(), reflectionShellMaterial);
        const rCore = new THREE.Mesh(uprightCore.geometry.clone(), reflectionCoreMaterial);
        const rCap = new THREE.Mesh(uprightCap.geometry.clone(), reflectionMetalMaterial);
        rShell.position.copy(uprightShell.position);
        rCore.position.copy(uprightCore.position);
        rCap.position.copy(uprightCap.position);
        reflectionGate.add(rShell, rCore, rCap);
        pieces.push(uprightShell, uprightCore, uprightCap);
        reflectionPieces.push(rShell, rCore, rCap);
      });

      const archShell = new THREE.Mesh(new THREE.TorusGeometry(2.8, 0.22, 22, 92, Math.PI), shellMaterial);
      const archCore = new THREE.Mesh(new THREE.TorusGeometry(2.8, 0.08, 16, 72, Math.PI), coreMaterial);
      const archMetal = new THREE.Mesh(new THREE.TorusGeometry(2.8, 0.05, 12, 60, Math.PI), metalMaterial);
      archShell.rotation.z = Math.PI;
      archCore.rotation.z = Math.PI;
      archMetal.rotation.z = Math.PI;
      archShell.position.y = 4.96;
      archCore.position.y = 4.96;
      archMetal.position.y = 4.96;
      gate.add(archShell, archCore, archMetal);

      const rArchShell = new THREE.Mesh(archShell.geometry.clone(), reflectionShellMaterial);
      const rArchCore = new THREE.Mesh(archCore.geometry.clone(), reflectionCoreMaterial);
      const rArchMetal = new THREE.Mesh(archMetal.geometry.clone(), reflectionMetalMaterial);
      rArchShell.rotation.copy(archShell.rotation);
      rArchCore.rotation.copy(archCore.rotation);
      rArchMetal.rotation.copy(archMetal.rotation);
      rArchShell.position.copy(archShell.position);
      rArchCore.position.copy(archCore.position);
      rArchMetal.position.copy(archMetal.position);
      reflectionGate.add(rArchShell, rArchCore, rArchMetal);

      this.group.add(gate);
      this.reflectionGroup.add(reflectionGate);
      this.entries.push({
        gate,
        reflectionGate,
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
    const modeName = controls.modeName ?? "Tunnel";
    const materialName = controls.materialName ?? "Glass Bubble";
    const hue = Number.isFinite(mode.hue) ? mode.hue : 220;
    const intensity = baselineRange(mode.intensity, 0.9, 0.24, 1.8);
    const glow = baselineRange(mode.glow, 0.9, 0.16, 1.55);
    const amount = Math.max(4, Math.min(this.maxGateCount, Math.round(baselineRange(mode.amount, 11, 4, this.maxGateCount))));
    const width = baselineRange(mode.width, 1.0, 0.45, 1.95);
    const spacing = baselineRange(mode.spacing, 1.0, 0.56, 1.75);
    const speed = baselineRange(mode.speed, 0.86, 0.16, 2.3);
    const depth = baselineRange(mode.depth, 1.0, 0.52, 1.9);
    const motion = baselineRange(mode.motion, 0.38, 0.04, 1.12);
    const spiralFactor = modeName === "Spiral" ? 1 : 0;
    const runwayFactor = modeName === "Sonic Runway" ? 1 : 0;

    this.group.rotation.y = THREE.MathUtils.damp(this.group.rotation.y, Math.sin(time * 0.1) * 0.08 * motion, 2.8, deltaTime);
    this.reflectionGroup.rotation.y = this.group.rotation.y;

    const farDepth = 30 * spacing * depth;
    const travelRate = 0.06 + speed * 0.14;
    for (let index = 0; index < this.maxGateCount; index += 1) {
      const entry = this.entries[index];
      const visible = index < amount;
      entry.gate.visible = visible;
      entry.reflectionGate.visible = visible;
      if (!visible) {
        continue;
      }

      const progress = amount <= 1 ? 0 : index / (amount - 1);
      const travel = (time * travelRate + progress) % 1;
      const depthCurve = Math.pow(travel, 1.9);
      const bandIndex = Math.round(travel * Math.max(0, audioFrame.bands.length - 1));
      const band = audioFrame.bands[bandIndex] ?? audioFrame.overall;
      const energy = band * intensity + audioFrame.beat * (0.26 + depthCurve * 0.42);
      const z = -farDepth + travel * (farDepth + 8);
      const scale = 0.18 + depthCurve * 3.0;
      const helical = spiralFactor ? Math.sin(travel * Math.PI * 4 + time * 0.8) * (1.1 + motion * 0.8) : 0;
      const sway = Math.sin(time * (0.62 + motion * 0.52) + progress * 5.2) * 0.22 * motion;
      const x = helical + sway;
      const y = 0.05 + depthCurve * 0.12 + energy * 0.08 + (runwayFactor ? Math.sin(time * 1.4 - progress * 8) * 0.08 : 0);

      entry.gate.position.set(x, y, z);
      entry.gate.scale.set(scale * width, scale * (1 + energy * 0.08), scale);
      entry.gate.rotation.y = helical * 0.08;
      entry.reflectionGate.position.copy(entry.gate.position);
      entry.reflectionGate.scale.copy(entry.gate.scale);
      entry.reflectionGate.rotation.copy(entry.gate.rotation);

      const hueOffset = travel * 180 + (spiralFactor ? 40 : 0) + (runwayFactor ? 18 : 0);
      const shellColor = hueColor(hue + hueOffset, 78, 58);
      const accentColor = hueColor(hue + 18 + hueOffset, 100, 76);
      const coreColor = hueColor(hue - 6 + hueOffset * 0.3, 100, 84);
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
