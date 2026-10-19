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

export class LatticeFieldMode {
  constructor(stage, materialSystem) {
    this.stage = stage;
    this.materialSystem = materialSystem;
    this.bandCount = 30;
    this.entries = [];
    this.gridSize = 6;
    this.group = new THREE.Group();
    this.reflectionGroup = new THREE.Group();
    this.stage.modeRoot.add(this.group);
    this.stage.reflectionRoot.add(this.reflectionGroup);
    this.build();
  }

  build() {
    const shellGeometry = new THREE.BoxGeometry(0.32, 0.32, 0.32);
    const coreGeometry = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    for (let x = 0; x < this.gridSize; x += 1) {
      for (let y = 0; y < this.gridSize; y += 1) {
        const shellMaterial = this.materialSystem.createGlassBodyMaterial();
        const coreMaterial = this.materialSystem.createInnerGlowMaterial();
        const metalMaterial = this.materialSystem.createMetalMaterial();
        const reflectionShellMaterial = this.materialSystem.createReflectionGlassMaterial();
        const reflectionCoreMaterial = this.materialSystem.createReflectionCoreMaterial();
        const reflectionMetalMaterial = this.materialSystem.createMetalMaterial();
        const node = new THREE.Group();
        const shell = new THREE.Mesh(shellGeometry, shellMaterial);
        const core = new THREE.Mesh(coreGeometry, coreMaterial);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.02, 8, 24), metalMaterial);
        ring.rotation.x = Math.PI / 2;
        node.add(shell, core, ring);
        this.group.add(node);
        const reflectionNode = new THREE.Group();
        const rShell = new THREE.Mesh(shellGeometry.clone(), reflectionShellMaterial);
        const rCore = new THREE.Mesh(coreGeometry.clone(), reflectionCoreMaterial);
        const rRing = new THREE.Mesh(ring.geometry.clone(), reflectionMetalMaterial);
        rRing.rotation.x = Math.PI / 2;
        reflectionNode.add(rShell, rCore, rRing);
        this.reflectionGroup.add(reflectionNode);
        this.entries.push({
          node,
          reflectionNode,
          shellMaterial,
          coreMaterial,
          reflectionShellMaterial,
          reflectionCoreMaterial,
          metalMaterials: [metalMaterial],
          reflectionMetalMaterials: [reflectionMetalMaterial],
          gridX: x,
          gridY: y,
        });
      }
    }
  }

  setActive(isActive) {
    this.group.visible = isActive;
    this.reflectionGroup.visible = isActive;
  }

  update(time, deltaTime, audioFrame, controls) {
    const mode = controls.mode ?? {};
    const materialName = controls.materialName ?? "Glass Bubble";
    const hue = Number.isFinite(mode.hue) ? mode.hue : 220;
    const intensity = baselineRange(mode.intensity, 0.9, 0.26, 1.8);
    const glow = baselineRange(mode.glow, 0.9, 0.16, 1.55);
    const density = Math.round(baselineRange(mode.density, this.gridSize, 4, this.gridSize));
    const height = baselineRange(mode.height, 1.0, 0.4, 2.0);
    const spread = baselineRange(mode.spread, 1.0, 0.6, 1.6);
    const depth = baselineRange(mode.depth, 1.0, 0.5, 1.8);
    const motion = baselineRange(mode.motion, 0.36, 0.04, 0.92);
    const rotate = normalize(mode.rotate, 0);

    this.group.rotation.y = THREE.MathUtils.damp(this.group.rotation.y, (rotate - 0.5) * 0.5, 3.4, deltaTime);
    this.reflectionGroup.rotation.y = this.group.rotation.y;

    const visibleGrid = Math.max(3, Math.min(this.gridSize, density));
    for (const entry of this.entries) {
      const visible = entry.gridX < visibleGrid && entry.gridY < visibleGrid;
      entry.node.visible = visible;
      entry.reflectionNode.visible = visible;
      if (!visible) continue;

      const nx = visibleGrid <= 1 ? 0 : entry.gridX / (visibleGrid - 1);
      const ny = visibleGrid <= 1 ? 0 : entry.gridY / (visibleGrid - 1);
      const bandIndex = Math.round(((nx + ny) * 0.5) * Math.max(0, audioFrame.bands.length - 1));
      const band = audioFrame.bands[bandIndex] ?? audioFrame.overall;
      const energy = band * intensity + audioFrame.beat * 0.18;
      const x = (entry.gridX - (visibleGrid - 1) / 2) * 1.25 * spread;
      const z = (entry.gridY - (visibleGrid - 1) / 2) * 1.05 * depth - 2.2;
      const y = 2.7 + Math.sin(time * (0.8 + motion) + nx * 4 + ny * 3) * 1.1 * height + energy * 2.6;
      const scale = 0.72 + energy * 0.65;
      entry.node.position.set(x, y, z);
      entry.reflectionNode.position.copy(entry.node.position);
      entry.node.rotation.set(time * 0.4 + nx, time * 0.5 + ny, time * 0.3);
      entry.reflectionNode.rotation.copy(entry.node.rotation);
      entry.node.scale.setScalar(scale);
      entry.reflectionNode.scale.copy(entry.node.scale);

      const hueOffset = (nx * 90) + (ny * 70);
      const shellColor = hueColor(hue + hueOffset, 80, 58);
      const accentColor = hueColor(hue + 18 + hueOffset, 100, 76);
      const coreColor = hueColor(hue - 6 + hueOffset * 0.35, 100, 84);
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
