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

function paletteForLayer(hue, layerIndex) {
  const offset = layerIndex * 18;
  return {
    shell: hueColor(hue + offset, 80, 58),
    accent: hueColor(hue + 18 + offset, 100, 76),
    core: hueColor(hue - 6 + offset * 0.4, 100, 84),
    warm: hueColor(hue + 52 + offset * 0.3, 82, 72),
  };
}

export class WavelengthProofMode {
  constructor(stage, materialSystem) {
    this.stage = stage;
    this.materialSystem = materialSystem;
    this.bandCount = 42;
    this.layerCount = 3;
    this.sampleCount = 30;
    this.rotation = 0;
    this.smoothed = Array.from({ length: this.layerCount }, () => new Array(this.sampleCount).fill(0));
    this.layers = [];

    this.group = new THREE.Group();
    this.reflectionGroup = new THREE.Group();
    this.stage.modeRoot.add(this.group);
    this.stage.reflectionRoot.add(this.reflectionGroup);

    this.build();
  }

  build() {
    for (let layerIndex = 0; layerIndex < this.layerCount; layerIndex += 1) {
      const shellMaterial = this.materialSystem.createGlassBodyMaterial();
      shellMaterial.transmission = 0.995;
      shellMaterial.thickness = 1.35 + layerIndex * 0.16;
      shellMaterial.roughness = 0.04;
      shellMaterial.iridescence = 0.94;

      const coreMaterial = this.materialSystem.createInnerGlowMaterial();
      coreMaterial.transmission = 0.72;
      coreMaterial.roughness = 0.14;

      const reflectionShellMaterial = this.materialSystem.createReflectionGlassMaterial();
      const reflectionCoreMaterial = this.materialSystem.createReflectionCoreMaterial();

      const shellMesh = new THREE.Mesh(new THREE.TubeGeometry(
        new THREE.LineCurve3(new THREE.Vector3(-6, 4, 0), new THREE.Vector3(6, 4, 0)),
        120,
        0.18,
        22,
        false,
      ), shellMaterial);

      const coreMesh = new THREE.Mesh(new THREE.TubeGeometry(
        new THREE.LineCurve3(new THREE.Vector3(-6, 4, 0), new THREE.Vector3(6, 4, 0)),
        120,
        0.07,
        14,
        false,
      ), coreMaterial);

      const reflectionShell = new THREE.Mesh(shellMesh.geometry.clone(), reflectionShellMaterial);
      const reflectionCore = new THREE.Mesh(coreMesh.geometry.clone(), reflectionCoreMaterial);

      const ribbon = new THREE.Group();
      ribbon.add(shellMesh, coreMesh);
      const reflectionRibbon = new THREE.Group();
      reflectionRibbon.add(reflectionShell, reflectionCore);

      this.group.add(ribbon);
      this.reflectionGroup.add(reflectionRibbon);
      this.layers.push({
        ribbon,
        reflectionRibbon,
        shellMesh,
        coreMesh,
        reflectionShell,
        reflectionCore,
        shellMaterial,
        coreMaterial,
        reflectionShellMaterial,
        reflectionCoreMaterial,
      });
    }
  }

  setActive(isActive) {
    this.group.visible = isActive;
    this.reflectionGroup.visible = isActive;
  }

  ensureSampleCount(count) {
    if (count === this.sampleCount) {
      return;
    }
    this.sampleCount = count;
    this.smoothed = Array.from({ length: this.layerCount }, (_, layerIndex) => {
      const previous = this.smoothed[layerIndex] ?? [];
      return Array.from({ length: count }, (_, sampleIndex) => previous[sampleIndex] ?? 0);
    });
  }

  rebuildLayerGeometry(layer, points, shellRadius, coreRadius) {
    const curve = new THREE.CatmullRomCurve3(points, false, "centripetal", 0.42);
    const segments = Math.max(160, points.length * 7);
    const shellGeometry = new THREE.TubeGeometry(curve, segments, shellRadius, 24, false);
    const coreGeometry = new THREE.TubeGeometry(curve, segments, coreRadius, 16, false);

    layer.shellMesh.geometry.dispose();
    layer.coreMesh.geometry.dispose();
    layer.reflectionShell.geometry.dispose();
    layer.reflectionCore.geometry.dispose();

    layer.shellMesh.geometry = shellGeometry;
    layer.coreMesh.geometry = coreGeometry;
    layer.reflectionShell.geometry = shellGeometry.clone();
    layer.reflectionCore.geometry = coreGeometry.clone();
  }

  update(time, deltaTime, audioFrame, controls) {
    const mode = controls.mode ?? {};
    const modeName = controls.modeName ?? "Wavelength";
    const materialName = controls.materialName ?? "Glass Bubble";
    const hue = Number.isFinite(mode.hue) ? mode.hue : 220;
    const intensity = baselineRange(mode.intensity, 0.95, 0.28, 1.8);
    const glow = baselineRange(mode.glow, 0.9, 0.16, 1.65);
    const density = Math.round(baselineRange(mode.density, 30, 16, 42));
    const shape = baselineRange(mode.shape, 1.0, 0.55, 1.75);
    const spread = baselineRange(mode.spread, 1.0, 0.68, 1.55);
    const scale = baselineRange(mode.scale, 1.0, 0.78, 1.24);
    const motion = baselineRange(mode.motion, 0.34, 0.05, 0.92);
    const rotate = normalize(mode.rotate, 0);
    const contrast = 0.94 + normalize(controls.global?.contrast, 50) * 0.7;
    const randomize = Boolean(controls.randomize?.main);
    const isWaveform = modeName === "Waveform";
    const isRibbons = modeName === "Ribbons";
    const isLiquid = modeName === "Liquid Pulse";
    const isNebula = modeName === "Nebula";

    this.ensureSampleCount(density);
    this.rotation = THREE.MathUtils.damp(this.rotation, (rotate - 0.5) * 0.6, 4.0, deltaTime);
    this.group.rotation.y = this.rotation;
    this.reflectionGroup.rotation.y = this.rotation;

    const width = (isWaveform ? 13.6 : 11.2) * spread * scale * (0.96 + audioFrame.bass * 0.24);
    const amplitude = (isLiquid ? 2.9 : isNebula ? 2.55 : 2.35) * intensity * scale;
    const yOffsets = [-0.7, 0, 0.7];
    const zOffsets = [-0.5, 0, 0.5];
    const waveDrive = 0.8 + motion * 2.4 + audioFrame.overall * 1.1;
    const beatKick = audioFrame.beat * (0.55 + motion * 0.35);

    for (let layerIndex = 0; layerIndex < this.layerCount; layerIndex += 1) {
      const layer = this.layers[layerIndex];
      const response = audioFrame.active ? (6.4 + layerIndex * 1.1) : 8.2;
      const localMotion = motion * (0.86 + layerIndex * 0.16);
      const points = [];

      for (let sampleIndex = 0; sampleIndex < density; sampleIndex += 1) {
        const position = density <= 1 ? 0 : sampleIndex / (density - 1);
        const bandIndex = Math.round(position * Math.max(0, audioFrame.bands.length - 1));
        const band = audioFrame.bands[bandIndex] ?? 0;
        const neighbor = audioFrame.bands[Math.min(audioFrame.bands.length - 1, bandIndex + 1)] ?? band;
        const mixed = THREE.MathUtils.lerp(band, neighbor, 0.35);
        const target = mixed * intensity * (layerIndex === 1 ? 1.08 : 0.84);
        this.smoothed[layerIndex][sampleIndex] = THREE.MathUtils.damp(
          this.smoothed[layerIndex][sampleIndex],
          target,
          response,
          deltaTime,
        );

        const x = THREE.MathUtils.lerp(-width * 0.5, width * 0.5, position);
        const travel = time * waveDrive * (1 + layerIndex * 0.06);
        const carrierA = Math.sin(position * Math.PI * (2.2 + layerIndex * 0.28) - travel * 1.15 + layerIndex * 0.85);
        const carrierB = Math.cos(position * Math.PI * (5.6 + layerIndex * 0.54) + travel * 0.68 + layerIndex * 1.2);
        const crest = Math.sin(position * Math.PI * (1.1 + audioFrame.bass * 0.7) - travel * 0.42);
        const sculpt = carrierA * 0.54 + carrierB * 0.22 + crest * 0.24;
        const audioLift = this.smoothed[layerIndex][sampleIndex] * amplitude * contrast;
        const beatLift = beatKick * (0.3 + (1 - Math.abs(position - 0.5) * 2) * 0.5);
        const lift = audioLift * sculpt + beatLift;
        const shimmer = Math.sin(time * 0.45 + position * Math.PI * 10.4 + layerIndex) * (0.04 + audioFrame.treble * 0.08);
        const y = 4.15 + yOffsets[layerIndex] + lift + shimmer + (isNebula ? Math.cos(time * 0.32 + position * 9 + layerIndex) * 0.22 : 0);
        const lateralFold = Math.sin(position * Math.PI * (2.8 + layerIndex * 0.36) + travel * 0.52) * 0.22 * shape * (isRibbons ? 1.35 : 1);
        const depthPulse = (this.smoothed[layerIndex][sampleIndex] * 0.18 + audioFrame.highMid * 0.12) * shape * (isLiquid ? 1.35 : 1);
        const z = zOffsets[layerIndex] + lateralFold + depthPulse;
        points.push(new THREE.Vector3(x, y, z));
      }

      const shellRadius = (0.15 + layerIndex * 0.032 + glow * 0.016 + audioFrame.bass * 0.018) * scale * (isWaveform ? 0.72 : isRibbons ? 0.84 : 1);
      const coreRadius = shellRadius * 0.44;
      this.rebuildLayerGeometry(layer, points, shellRadius, coreRadius);

      const palette = paletteForLayer(
        randomize ? hue + layerIndex * 42 + time * 42 : hue,
        layerIndex,
      );
      this.materialSystem.applySurfaceProfile(materialName, {
        shellMaterial: layer.shellMaterial,
        coreMaterial: layer.coreMaterial,
        reflectionShellMaterial: layer.reflectionShellMaterial,
        reflectionCoreMaterial: layer.reflectionCoreMaterial,
        metalMaterials: [],
        reflectionMetalMaterials: [],
      }, {
        shellColor: palette.shell,
        accentColor: palette.accent,
        coreColor: palette.core,
        metalColor: palette.warm,
      }, glow, audioFrame.overall + audioFrame.beat * 0.5);
    }
  }
}
