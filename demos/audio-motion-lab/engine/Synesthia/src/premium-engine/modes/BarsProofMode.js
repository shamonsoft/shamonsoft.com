import * as THREE from "../../vendor/three/three.module.js";
import { RoundedBoxGeometry } from "../../vendor/three/addons/geometries/RoundedBoxGeometry.js";

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

export class BarsProofMode {
  constructor(stage, materialSystem) {
    this.stage = stage;
    this.materialSystem = materialSystem;
    this.bandCount = 36;
    this.heightState = new Array(this.bandCount).fill(2.2);
    this.targetState = new Array(this.bandCount).fill(2.2);
    this.entries = [];

    this.group = new THREE.Group();
    this.reflectionGroup = new THREE.Group();
    this.stage.modeRoot.add(this.group);
    this.stage.reflectionRoot.add(this.reflectionGroup);

    this.build();
  }

  build() {
    const shellGeometry = new RoundedBoxGeometry(0.9, 1, 0.9, 10, 0.16);
    const innerGeometry = new RoundedBoxGeometry(0.36, 1, 0.36, 8, 0.08);
    const capGeometry = new THREE.CylinderGeometry(0.5, 0.55, 0.12, 28, 1, false);
    const collarGeometry = new THREE.TorusGeometry(0.48, 0.04, 16, 40);

    for (let index = 0; index < this.bandCount; index += 1) {
      const shellMaterial = this.materialSystem.createGlassBodyMaterial();
      const innerMaterial = this.materialSystem.createInnerGlowMaterial();
      const capMaterial = this.materialSystem.createMetalMaterial();
      const reflectionShellMaterial = this.materialSystem.createReflectionGlassMaterial();
      const reflectionCoreMaterial = this.materialSystem.createReflectionCoreMaterial();
      const reflectionCapMaterial = this.materialSystem.createMetalMaterial();

      const bar = new THREE.Group();
      const shell = new THREE.Mesh(shellGeometry, shellMaterial);
      const core = new THREE.Mesh(innerGeometry, innerMaterial);
      const crown = new THREE.Mesh(capGeometry, capMaterial);
      const base = new THREE.Mesh(capGeometry, capMaterial.clone());
      const collar = new THREE.Mesh(collarGeometry, capMaterial.clone());
      const topGlow = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 14, 14),
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.22,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );

      crown.rotation.x = Math.PI / 2;
      base.rotation.x = Math.PI / 2;
      collar.rotation.x = Math.PI / 2;
      bar.add(shell, core, crown, base, collar, topGlow);
      this.group.add(bar);

      const reflectionBar = new THREE.Group();
      const reflectionShell = new THREE.Mesh(shellGeometry.clone(), reflectionShellMaterial);
      const reflectionCore = new THREE.Mesh(innerGeometry.clone(), reflectionCoreMaterial);
      const reflectionCrown = new THREE.Mesh(capGeometry.clone(), reflectionCapMaterial);
      const reflectionBase = new THREE.Mesh(capGeometry.clone(), reflectionCapMaterial.clone());
      const reflectionCollar = new THREE.Mesh(collarGeometry.clone(), reflectionCapMaterial.clone());
      reflectionCrown.rotation.x = Math.PI / 2;
      reflectionBase.rotation.x = Math.PI / 2;
      reflectionCollar.rotation.x = Math.PI / 2;
      reflectionBar.add(reflectionShell, reflectionCore, reflectionCrown, reflectionBase, reflectionCollar);
      this.reflectionGroup.add(reflectionBar);

      this.entries.push({
        bar,
        shell,
        core,
        crown,
        base,
        collar,
        topGlow,
        reflectionBar,
        reflectionShell,
        reflectionCore,
        reflectionCrown,
        reflectionBase,
        reflectionCollar,
        shellMaterial,
        innerMaterial,
        capMaterial,
        reflectionShellMaterial,
        reflectionCoreMaterial,
        reflectionCapMaterial,
      });
    }
  }

  setActive(isActive) {
    this.group.visible = isActive;
    this.reflectionGroup.visible = isActive;
  }

  update(time, deltaTime, audioFrame, controls) {
    const mode = controls.mode ?? {};
    const modeName = controls.modeName ?? "Bars";
    const materialName = controls.materialName ?? "Glass Bubble";
    const hue = Number.isFinite(mode.hue) ? mode.hue : 220;
    const intensity = baselineRange(mode.intensity, 1.0, 0.3, 2.1);
    const glow = baselineRange(mode.glow, 0.95, 0.12, 1.7);
    const amount = Math.max(12, Math.min(this.bandCount, Math.round(baselineRange(mode.amount, 24, 12, this.bandCount))));
    const thickness = baselineRange(mode.thickness, 0.95, 0.34, 1.85);
    const spacing = baselineRange(mode.spacing, 0.92, 0.52, 1.7);
    const scale = baselineRange(mode.scale, 1.0, 0.72, 1.22);
    const motion = baselineRange(mode.motion, 0.24, 0.02, 0.7);
    const rotation = normalize(mode.rotate, 0);
    const beatResponse = 5.4 + normalize(controls.global?.beatResponse, 80) * 6.4;
    const depth = 0.65 + normalize(controls.global?.depth, 60) * 1.45;
    const contrast = 0.92 + normalize(controls.global?.contrast, 50) * 0.7;
    const equalizerWall = modeName === "Equalizer Wall";
    const gridWave = modeName === "Grid Wave";
    const randomize = Boolean(controls.randomize?.main);

    this.group.rotation.y = THREE.MathUtils.damp(this.group.rotation.y, (rotation - 0.5) * 0.28, 4.2, deltaTime);
    this.reflectionGroup.rotation.y = this.group.rotation.y;

    for (let index = 0; index < this.bandCount; index += 1) {
      const entry = this.entries[index];
      const visible = index < amount;
      entry.bar.visible = visible;
      entry.reflectionBar.visible = visible;
      if (!visible) {
        continue;
      }

      const fraction = amount <= 1 ? 0.5 : index / (amount - 1);
      const centerDistance = Math.abs(fraction - 0.5) * 2;
      const bandIndex = Math.round(fraction * Math.max(0, audioFrame.bands.length - 1));
      const band = audioFrame.bands[bandIndex] ?? 0;
      const neighbors = [
        audioFrame.bands[Math.max(0, bandIndex - 1)] ?? band,
        band,
        audioFrame.bands[Math.min(audioFrame.bands.length - 1, bandIndex + 1)] ?? band,
      ];
      const localEnergy = (neighbors[0] + neighbors[1] + neighbors[2]) / 3;
      const shapedEnergy = Math.pow(localEnergy * intensity * contrast + audioFrame.beat * 0.18, 0.9);
      const sculptBias = Math.sin(fraction * Math.PI * 2.4) * 0.4 + Math.sin(fraction * Math.PI * 6.1) * 0.12;

      this.targetState[index] = Math.max(
        1.8,
        2.3
        + sculptBias
        + audioFrame.overall * 1.6
        + shapedEnergy * 11.6
        + audioFrame.bass * (1.2 - centerDistance * 0.5),
      );
      this.heightState[index] = THREE.MathUtils.damp(this.heightState[index], this.targetState[index], beatResponse, deltaTime);

      const x = ((index - (amount - 1) / 2) * 1.08 * spacing) * scale;
      const z = equalizerWall
        ? -0.6 - centerDistance * 0.4
        : gridWave
          ? -centerDistance * depth * 0.8 - Math.sin(fraction * Math.PI * 4 + time * 0.8) * 0.6
          : -centerDistance * depth - Math.pow(centerDistance, 1.75) * 2.3;
      const height = this.heightState[index] * scale;
      const widthScale = thickness * (equalizerWall ? 0.72 : 1.02 - centerDistance * 0.16);
      const depthScale = widthScale * (0.82 + audioFrame.overall * 0.08);
      const drift = equalizerWall
        ? 0
        : Math.sin(time * (0.42 + motion * 0.65) + index * 0.22) * (0.02 + motion * 0.05);
      const yaw = equalizerWall
        ? 0
        : (x === 0 ? 0 : Math.sign(x) * (0.035 + centerDistance * 0.03)) + Math.sin(time * 0.18 + fraction * 3) * 0.01;

      const hueOffset = (1 - centerDistance) * 20 + index * 1.1 + (randomize ? time * 36 : 0);
      const shellColor = hueColor(hue + hueOffset, 80, 58);
      const accentColor = hueColor(hue + 18 + hueOffset, 100, 76);
      const coreColor = hueColor(hue - 6 + hueOffset * 0.45, 100, 84);
      const metalColor = hueColor(hue + 18, 16, 78);

      entry.bar.position.set(x, height * 0.5 + drift, z);
      entry.bar.rotation.set(0, yaw, 0);
      entry.shell.scale.set(widthScale, height, depthScale);
      entry.core.scale.set(widthScale * 0.42, height * 0.94, depthScale * 0.42);
      entry.crown.position.set(0, height * 0.5 + 0.05, 0);
      entry.crown.scale.set(widthScale, 1, depthScale);
      entry.base.position.set(0, -height * 0.5 - 0.04, 0);
      entry.base.scale.set(widthScale * 1.02, 1, depthScale * 1.02);
      entry.collar.position.set(0, height * 0.18, 0);
      entry.collar.scale.set(widthScale * 0.98, widthScale * 0.98, depthScale * 0.98);
      entry.topGlow.position.set(0, height * 0.5 - 0.08, 0);
      entry.topGlow.scale.setScalar(0.8 + glow * 0.5 + shapedEnergy * 0.35);

      entry.reflectionBar.position.set(x, height * 0.5 + 0.04, z);
      entry.reflectionBar.rotation.copy(entry.bar.rotation);
      entry.reflectionShell.scale.copy(entry.shell.scale);
      entry.reflectionCore.scale.copy(entry.core.scale);
      entry.reflectionCrown.position.copy(entry.crown.position);
      entry.reflectionCrown.scale.copy(entry.crown.scale);
      entry.reflectionBase.position.copy(entry.base.position);
      entry.reflectionBase.scale.copy(entry.base.scale);
      entry.reflectionCollar.position.copy(entry.collar.position);
      entry.reflectionCollar.scale.copy(entry.collar.scale);

      this.materialSystem.applySurfaceProfile(materialName, {
        shellMaterial: entry.shellMaterial,
        coreMaterial: entry.innerMaterial,
        reflectionShellMaterial: entry.reflectionShellMaterial,
        reflectionCoreMaterial: entry.reflectionCoreMaterial,
        metalMaterials: [entry.capMaterial],
        reflectionMetalMaterials: [entry.reflectionCapMaterial],
      }, {
        shellColor,
        accentColor,
        coreColor,
        metalColor,
      }, glow, shapedEnergy);

      entry.topGlow.material.color.copy(accentColor);
      entry.topGlow.material.opacity = 0.12 + glow * 0.16 + shapedEnergy * 0.08;
    }
  }
}
