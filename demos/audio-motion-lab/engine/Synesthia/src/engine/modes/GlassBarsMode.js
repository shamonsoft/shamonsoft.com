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

function createBarPalette(hue, spread) {
  return {
    glassBase: hueColor(hue + spread * 10, 78, 57),
    glassAccent: hueColor(hue + 16 + spread * 24, 100, 76),
    glassCore: hueColor(hue - 4 + spread * 14, 96, 84),
    rimCool: hueColor(hue + 26 + spread * 18, 100, 80),
    rimWarm: hueColor(hue + 56 + spread * 12, 84, 74),
    metal: hueColor(hue + 20, 18, 78),
  };
}

export class GlassBarsMode {
  constructor(sceneRig, materialLibrary) {
    this.sceneRig = sceneRig;
    this.materialLibrary = materialLibrary;
    this.barCount = 40;
    this.heights = new Array(this.barCount).fill(2.4);
    this.targets = new Array(this.barCount).fill(2.4);
    this.entries = [];
    this.build();
  }

  build() {
    this.group = new THREE.Group();
    this.reflectionGroup = new THREE.Group();
    this.sceneRig.visualRoot.add(this.group);
    this.sceneRig.reflectionRoot.add(this.reflectionGroup);

    this.shellGeometry = new RoundedBoxGeometry(0.86, 1, 0.86, 10, 0.12);
    this.coreGeometry = new RoundedBoxGeometry(0.42, 1, 0.42, 8, 0.08);
    this.capGeometry = new THREE.CylinderGeometry(0.44, 0.48, 0.1, 28, 1, false);

    for (let index = 0; index < this.barCount; index += 1) {
      const shellMaterial = this.materialLibrary.createBarShellMaterial();
      const coreMaterial = this.materialLibrary.createBarCoreMaterial();
      const capMaterial = this.materialLibrary.createBarCapMaterial();
      const reflectionShellMaterial = this.materialLibrary.createReflectionMaterial();
      const reflectionCoreMaterial = this.materialLibrary.createReflectionCoreMaterial();

      const bar = new THREE.Group();
      const shell = new THREE.Mesh(this.shellGeometry, shellMaterial);
      const core = new THREE.Mesh(this.coreGeometry, coreMaterial);
      const cap = new THREE.Mesh(this.capGeometry, capMaterial);
      cap.rotation.x = Math.PI / 2;
      bar.add(shell, core, cap);
      this.group.add(bar);

      const reflectionBar = new THREE.Group();
      const reflectionShell = new THREE.Mesh(this.shellGeometry, reflectionShellMaterial);
      const reflectionCore = new THREE.Mesh(this.coreGeometry, reflectionCoreMaterial);
      const reflectionCap = new THREE.Mesh(this.capGeometry, capMaterial.clone());
      reflectionCap.rotation.x = Math.PI / 2;
      reflectionBar.add(reflectionShell, reflectionCore, reflectionCap);
      this.reflectionGroup.add(reflectionBar);

      this.entries.push({
        bar,
        shell,
        core,
        cap,
        reflectionBar,
        reflectionShell,
        reflectionCore,
        reflectionCap,
        shellMaterial,
        coreMaterial,
        capMaterial,
        reflectionShellMaterial,
        reflectionCoreMaterial,
        reflectionCapMaterial: reflectionCap.material,
      });
    }
  }

  update(audioFrame, controls, time, dt) {
    const mode = controls.mode ?? {};
    const visualHue = Number.isFinite(mode.hue) ? mode.hue : 220;
    const intensity = baselineRange(mode.intensity, 1.0, 0.32, 2.1);
    const glow = baselineRange(mode.glow, 0.95, 0.12, 1.8);
    const amount = Math.max(12, Math.min(this.barCount, Math.round(baselineRange(mode.amount, 26, 12, this.barCount))));
    const thickness = baselineRange(mode.thickness, 0.92, 0.3, 1.9);
    const spacing = baselineRange(mode.spacing, 0.96, 0.48, 1.68);
    const scale = baselineRange(mode.scale, 0.96, 0.68, 1.24);
    const motion = baselineRange(mode.motion, 0.3, 0.05, 0.82);
    const rotate = normalize(mode.rotate, 0);
    const depth = 0.4 + normalize(controls.global?.depth, 60) * 1.2;
    const beatResponse = 4.6 + normalize(controls.global?.beatResponse, 80) * 7.0;
    const contrast = 0.94 + normalize(controls.global?.contrast, 50) * 0.72;
    const randomize = Boolean(controls.randomize?.main);

    this.group.rotation.y = THREE.MathUtils.damp(this.group.rotation.y, (rotate - 0.5) * 0.4, 4.8, dt);
    this.reflectionGroup.rotation.y = this.group.rotation.y;

    for (let index = 0; index < this.barCount; index += 1) {
      const entry = this.entries[index];
      const visible = index < amount;
      entry.bar.visible = visible;
      entry.reflectionBar.visible = visible;
      if (!visible) {
        continue;
      }

      const position = amount <= 1 ? 0.5 : index / (amount - 1);
      const centerDistance = Math.abs(position - 0.5) * 2;
      const bandIndex = Math.round(position * Math.max(0, audioFrame.bands.length - 1));
      const band = audioFrame.bands[bandIndex] ?? 0;
      const leftNeighbor = audioFrame.bands[Math.max(0, bandIndex - 1)] ?? band;
      const rightNeighbor = audioFrame.bands[Math.min(audioFrame.bands.length - 1, bandIndex + 1)] ?? band;
      const localAverage = (band + leftNeighbor + rightNeighbor) / 3;
      const lateralPulse = Math.sin(position * Math.PI * 3 + time * (0.5 + motion * 0.7)) * 0.18;
      const shapedEnergy = Math.pow(localAverage * intensity * contrast + audioFrame.beat * 0.18, 0.92);
      const targetHeight =
        1.9
        + Math.sin(position * Math.PI * 2.5) * 0.35
        + audioFrame.overall * 1.2
        + shapedEnergy * 10.8;

      this.targets[index] = Math.max(1.65, targetHeight);
      this.heights[index] = THREE.MathUtils.damp(this.heights[index], this.targets[index], beatResponse, dt);

      const x = ((index - (amount - 1) / 2) * 1.04 * spacing) * scale;
      const z = -centerDistance * depth - Math.pow(centerDistance, 1.75) * 1.8;
      const height = this.heights[index] * scale;
      const widthScale = thickness * (0.94 + (1 - centerDistance) * 0.2);
      const depthScale = thickness * (0.76 + audioFrame.overall * 0.1);
      const yOffset = Math.sin(time * (0.38 + motion * 0.54) + index * 0.24) * (0.03 + motion * 0.05);
      const lean = x === 0 ? 0 : Math.sign(x) * (0.025 + centerDistance * 0.035);
      const palette = createBarPalette(
        randomize ? visualHue + position * 180 + time * 20 : visualHue,
        1 - centerDistance,
      );

      entry.bar.position.set(x, height * 0.5 + yOffset, z + lateralPulse * 0.08);
      entry.bar.rotation.set(0, lean, 0);
      entry.shell.scale.set(widthScale, height, depthScale);
      entry.core.scale.set(widthScale * 0.48, height * 0.92, depthScale * 0.48);
      entry.cap.position.set(0, height * 0.5 + 0.03, 0);
      entry.cap.scale.set(widthScale * 0.94, 1, depthScale * 0.94);

      entry.reflectionBar.position.set(x, height * 0.5 + 0.03, z + lateralPulse * 0.08);
      entry.reflectionBar.rotation.copy(entry.bar.rotation);
      entry.reflectionShell.scale.copy(entry.shell.scale);
      entry.reflectionCore.scale.copy(entry.core.scale);
      entry.reflectionCap.position.copy(entry.cap.position);
      entry.reflectionCap.scale.copy(entry.cap.scale);

      const edgeMix = Math.min(1, 0.16 + shapedEnergy * 0.58 + audioFrame.beat * 0.4);
      const shellColor = palette.glassBase.clone().lerp(palette.glassAccent, edgeMix * 0.52);
      const accentColor = palette.glassAccent.clone().lerp(palette.rimCool, edgeMix * 0.7);
      const coreColor = palette.glassCore.clone().lerp(palette.rimWarm, edgeMix * 0.4);
      const metalColor = palette.metal.clone().lerp(palette.rimCool, edgeMix * 0.14);

      entry.shellMaterial.color.copy(shellColor);
      entry.shellMaterial.emissive.copy(accentColor);
      entry.shellMaterial.emissiveIntensity = 0.18 + glow * 0.58 + shapedEnergy * 0.42;
      entry.shellMaterial.attenuationColor = coreColor;
      entry.shellMaterial.specularColor = accentColor;
      entry.shellMaterial.thickness = 1.5 + widthScale * 0.8 + shapedEnergy * 0.6;
      entry.shellMaterial.iridescence = 0.46 + edgeMix * 0.42;
      entry.shellMaterial.opacity = 0.88;

      entry.coreMaterial.color.copy(coreColor);
      entry.coreMaterial.emissive.copy(accentColor);
      entry.coreMaterial.emissiveIntensity = 0.42 + glow * 0.54 + shapedEnergy * 0.32;
      entry.coreMaterial.opacity = 0.96;

      entry.capMaterial.color.copy(metalColor);
      entry.capMaterial.emissive.copy(accentColor);
      entry.capMaterial.emissiveIntensity = 0.04 + glow * 0.08;

      entry.reflectionShellMaterial.color.copy(shellColor);
      entry.reflectionShellMaterial.emissive.copy(accentColor);
      entry.reflectionShellMaterial.emissiveIntensity = 0.03 + glow * 0.08;
      entry.reflectionShellMaterial.attenuationColor = coreColor;
      entry.reflectionShellMaterial.specularColor = accentColor;
      entry.reflectionShellMaterial.opacity = 0.08 + glow * 0.08 + shapedEnergy * 0.04;

      entry.reflectionCoreMaterial.color.copy(coreColor);
      entry.reflectionCoreMaterial.opacity = 0.04 + glow * 0.06;

      entry.reflectionCapMaterial.color.copy(metalColor);
      entry.reflectionCapMaterial.emissive.copy(accentColor);
      entry.reflectionCapMaterial.emissiveIntensity = 0.01 + glow * 0.02;
    }
  }
}
