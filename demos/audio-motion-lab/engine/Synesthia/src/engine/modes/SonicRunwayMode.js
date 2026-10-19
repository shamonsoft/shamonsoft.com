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

function createPalette(hue, travel) {
  return {
    shell: hueColor(hue + travel * 16, 78, 56),
    accent: hueColor(hue + 16 + travel * 24, 100, 74),
    core: hueColor(hue - 4 + travel * 10, 96, 84),
    metal: hueColor(hue + 18, 18, 78),
  };
}

export class SonicRunwayMode {
  constructor(sceneRig, materialLibrary) {
    this.sceneRig = sceneRig;
    this.materialLibrary = materialLibrary;
    this.barCount = 28;
    this.maxGateCount = 18;
    this.entries = [];
    this.build();
  }

  build() {
    this.group = new THREE.Group();
    this.reflectionGroup = new THREE.Group();
    this.sceneRig.visualRoot.add(this.group);
    this.sceneRig.reflectionRoot.add(this.reflectionGroup);

    for (let index = 0; index < this.maxGateCount; index += 1) {
      const gate = new THREE.Group();
      const reflectionGate = new THREE.Group();

      const shellMaterial = this.materialLibrary.createBarShellMaterial();
      shellMaterial.transmission = 0.99;
      shellMaterial.thickness = 1.9;
      shellMaterial.roughness = 0.045;
      shellMaterial.iridescence = 0.88;

      const coreMaterial = this.materialLibrary.createBarCoreMaterial();
      const capMaterial = this.materialLibrary.createBarCapMaterial();
      const reflectionShellMaterial = this.materialLibrary.createReflectionMaterial();
      const reflectionCoreMaterial = this.materialLibrary.createReflectionCoreMaterial();
      const reflectionCapMaterial = capMaterial.clone();

      const pieces = [];
      const reflectionPieces = [];
      const sideOffsets = [-1, 1];

      sideOffsets.forEach((side) => {
        const uprightShell = new THREE.Mesh(new THREE.BoxGeometry(0.42, 5.4, 0.54), shellMaterial);
        const uprightCore = new THREE.Mesh(new THREE.BoxGeometry(0.16, 5.1, 0.16), coreMaterial);
        const uprightCap = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.62), capMaterial);

        uprightShell.position.set(side * 2.9, 2.7, 0);
        uprightCore.position.copy(uprightShell.position);
        uprightCap.position.set(side * 2.9, 5.45, 0);
        gate.add(uprightShell, uprightCore, uprightCap);

        const reflectionUprightShell = new THREE.Mesh(uprightShell.geometry.clone(), reflectionShellMaterial);
        const reflectionUprightCore = new THREE.Mesh(uprightCore.geometry.clone(), reflectionCoreMaterial);
        const reflectionUprightCap = new THREE.Mesh(uprightCap.geometry.clone(), reflectionCapMaterial);
        reflectionUprightShell.position.copy(uprightShell.position);
        reflectionUprightCore.position.copy(uprightCore.position);
        reflectionUprightCap.position.copy(uprightCap.position);
        reflectionGate.add(reflectionUprightShell, reflectionUprightCore, reflectionUprightCap);

        pieces.push(uprightShell, uprightCore, uprightCap);
        reflectionPieces.push(reflectionUprightShell, reflectionUprightCore, reflectionUprightCap);
      });

      const archShell = new THREE.Mesh(new THREE.TorusGeometry(2.9, 0.24, 24, 96, Math.PI), shellMaterial);
      const archCore = new THREE.Mesh(new THREE.TorusGeometry(2.9, 0.08, 16, 72, Math.PI), coreMaterial);
      const archCap = new THREE.Mesh(new THREE.TorusGeometry(2.9, 0.06, 16, 72, Math.PI), capMaterial);
      archShell.rotation.z = Math.PI;
      archCore.rotation.z = Math.PI;
      archCap.rotation.z = Math.PI;
      archShell.position.y = 5.12;
      archCore.position.y = 5.12;
      archCap.position.y = 5.12;
      gate.add(archShell, archCore, archCap);

      const reflectionArchShell = new THREE.Mesh(archShell.geometry.clone(), reflectionShellMaterial);
      const reflectionArchCore = new THREE.Mesh(archCore.geometry.clone(), reflectionCoreMaterial);
      const reflectionArchCap = new THREE.Mesh(archCap.geometry.clone(), reflectionCapMaterial);
      reflectionArchShell.rotation.copy(archShell.rotation);
      reflectionArchCore.rotation.copy(archCore.rotation);
      reflectionArchCap.rotation.copy(archCap.rotation);
      reflectionArchShell.position.copy(archShell.position);
      reflectionArchCore.position.copy(archCore.position);
      reflectionArchCap.position.copy(archCap.position);
      reflectionGate.add(reflectionArchShell, reflectionArchCore, reflectionArchCap);

      this.group.add(gate);
      this.reflectionGroup.add(reflectionGate);
      this.entries.push({
        gate,
        reflectionGate,
        shellMaterial,
        coreMaterial,
        capMaterial,
        reflectionShellMaterial,
        reflectionCoreMaterial,
        reflectionCapMaterial,
      });
    }
  }

  update(audioFrame, controls, time, dt) {
    const mode = controls.mode ?? {};
    const hue = Number.isFinite(mode.hue) ? mode.hue : 220;
    const intensity = baselineRange(mode.intensity, 0.88, 0.22, 1.7);
    const glow = baselineRange(mode.glow, 0.9, 0.16, 1.55);
    const amount = Math.max(4, Math.min(this.maxGateCount, Math.round(baselineRange(mode.amount, 11, 4, this.maxGateCount))));
    const width = baselineRange(mode.width, 1.0, 0.42, 1.9);
    const spacing = baselineRange(mode.spacing, 1.0, 0.58, 1.72);
    const speed = baselineRange(mode.speed, 0.82, 0.16, 2.2);
    const depth = baselineRange(mode.depth, 1.0, 0.46, 1.9);
    const motion = baselineRange(mode.motion, 0.38, 0.04, 1.1);
    const randomize = Boolean(controls.randomize?.main);

    this.group.rotation.y = THREE.MathUtils.damp(this.group.rotation.y, Math.sin(time * 0.12) * 0.08 * motion, 2.8, dt);
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
      const beatPush = audioFrame.beat * (0.2 + depthCurve * 0.4);
      const energy = band * intensity + beatPush;

      const gateDepth = -farDepth + travel * (farDepth + 8);
      const gateScale = 0.16 + depthCurve * 2.9;
      const laneSway = Math.sin(time * (0.65 + motion * 0.52) + progress * 5.4) * 0.24 * motion;
      const pulseLift = 0.05 + depthCurve * 0.12 + energy * 0.08;

      entry.gate.position.set(laneSway, pulseLift, gateDepth);
      entry.gate.scale.set(gateScale * width, gateScale * (1 + energy * 0.08), gateScale);
      entry.gate.rotation.y = laneSway * 0.08;

      entry.reflectionGate.position.copy(entry.gate.position);
      entry.reflectionGate.scale.copy(entry.gate.scale);
      entry.reflectionGate.rotation.copy(entry.gate.rotation);

      const palette = createPalette(randomize ? hue + travel * 180 + time * 22 : hue, travel);
      entry.shellMaterial.color.copy(palette.shell);
      entry.shellMaterial.emissive.copy(palette.accent);
      entry.shellMaterial.emissiveIntensity = 0.16 + glow * 0.42 + energy * 0.2;
      entry.shellMaterial.attenuationColor = palette.core;
      entry.shellMaterial.specularColor = palette.accent;

      entry.coreMaterial.color.copy(palette.core);
      entry.coreMaterial.emissive.copy(palette.accent);
      entry.coreMaterial.emissiveIntensity = 0.26 + glow * 0.34 + energy * 0.22;

      entry.capMaterial.color.copy(palette.metal);
      entry.capMaterial.emissive.copy(palette.accent);
      entry.capMaterial.emissiveIntensity = 0.03 + glow * 0.06;

      entry.reflectionShellMaterial.color.copy(palette.shell);
      entry.reflectionShellMaterial.emissive.copy(palette.accent);
      entry.reflectionShellMaterial.emissiveIntensity = 0.03 + glow * 0.06;
      entry.reflectionShellMaterial.attenuationColor = palette.core;
      entry.reflectionShellMaterial.specularColor = palette.accent;
      entry.reflectionShellMaterial.opacity = 0.08 + glow * 0.06;

      entry.reflectionCoreMaterial.color.copy(palette.core);
      entry.reflectionCoreMaterial.opacity = 0.04 + glow * 0.04;

      entry.reflectionCapMaterial.color.copy(palette.metal);
      entry.reflectionCapMaterial.emissive.copy(palette.accent);
      entry.reflectionCapMaterial.emissiveIntensity = 0.01 + glow * 0.02;
    }
  }
}
