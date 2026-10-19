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

function createPalette(hue, offset = 0) {
  return {
    shell: hueColor(hue + offset, 78, 58),
    accent: hueColor(hue + 18 + offset, 100, 76),
    core: hueColor(hue - 4 + offset * 0.4, 96, 84),
    warm: hueColor(hue + 48 + offset * 0.35, 84, 72),
  };
}

export class GlassWavelengthMode {
  constructor(sceneRig, materialLibrary) {
    this.sceneRig = sceneRig;
    this.materialLibrary = materialLibrary;
    this.barCount = 48;
    this.layerCount = 3;
    this.sampleCount = 30;
    this.rotation = 0;
    this.smoothed = Array.from({ length: this.layerCount }, () => new Array(this.sampleCount).fill(0));
    this.layers = [];
    this.build();
  }

  build() {
    this.group = new THREE.Group();
    this.reflectionGroup = new THREE.Group();
    this.sceneRig.visualRoot.add(this.group);
    this.sceneRig.reflectionRoot.add(this.reflectionGroup);

    for (let index = 0; index < this.layerCount; index += 1) {
      const shellMaterial = this.materialLibrary.createBarShellMaterial();
      shellMaterial.roughness = 0.04;
      shellMaterial.transmission = 0.99;
      shellMaterial.thickness = 1.2;
      shellMaterial.iridescence = 0.92;

      const coreMaterial = this.materialLibrary.createBarCoreMaterial();
      coreMaterial.transmission = 0.62;
      coreMaterial.roughness = 0.18;

      const reflectionShellMaterial = this.materialLibrary.createReflectionMaterial();
      const reflectionCoreMaterial = this.materialLibrary.createReflectionCoreMaterial();

      const shellMesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(
        new THREE.Vector3(-5, 4, 0),
        new THREE.Vector3(5, 4, 0),
      ), 64, 0.18, 24, false), shellMaterial);
      const coreMesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(
        new THREE.Vector3(-5, 4, 0),
        new THREE.Vector3(5, 4, 0),
      ), 64, 0.072, 16, false), coreMaterial);

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

  replaceGeometry(layer, points, shellRadius, coreRadius) {
    const curve = new THREE.CatmullRomCurve3(points, false, "centripetal", 0.42);
    const segments = Math.max(140, points.length * 8);
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

  update(audioFrame, controls, time, dt) {
    const mode = controls.mode ?? {};
    const hue = Number.isFinite(mode.hue) ? mode.hue : 220;
    const intensity = baselineRange(mode.intensity, 0.92, 0.3, 1.75);
    const glow = baselineRange(mode.glow, 0.9, 0.16, 1.6);
    const density = Math.round(baselineRange(mode.density, 30, 16, 42));
    const spread = baselineRange(mode.spread, 1.0, 0.66, 1.55);
    const scale = baselineRange(mode.scale, 1.0, 0.78, 1.26);
    const shape = baselineRange(mode.shape, 1.0, 0.55, 1.75);
    const motion = baselineRange(mode.motion, 0.38, 0.04, 0.9);
    const rotate = normalize(mode.rotate, 0);
    const randomize = Boolean(controls.randomize?.main);

    this.ensureSampleCount(density);

    this.rotation = THREE.MathUtils.damp(this.rotation, (rotate - 0.5) * 0.65, 4.2, dt);
    this.group.rotation.y = this.rotation;
    this.reflectionGroup.rotation.y = this.rotation;

    const width = 12 * spread * scale;
    const amplitude = 1.9 * intensity * scale;
    const verticalOffsets = [-0.62, 0, 0.62];
    const depthOffsets = [-0.48, 0, 0.48];

    for (let layerIndex = 0; layerIndex < this.layerCount; layerIndex += 1) {
      const layer = this.layers[layerIndex];
      const points = [];
      const localMotion = motion * (0.8 + layerIndex * 0.18);
      const response = audioFrame.active ? (6.5 + layerIndex * 1.2) : 8.8;

      for (let sampleIndex = 0; sampleIndex < density; sampleIndex += 1) {
        const position = density <= 1 ? 0 : sampleIndex / (density - 1);
        const bandIndex = Math.round(position * Math.max(0, audioFrame.bands.length - 1));
        const band = audioFrame.bands[bandIndex] ?? 0;
        const target = band * intensity * (layerIndex === 1 ? 1.1 : 0.82);
        this.smoothed[layerIndex][sampleIndex] = THREE.MathUtils.damp(
          this.smoothed[layerIndex][sampleIndex],
          target,
          response,
          dt,
        );

        const x = THREE.MathUtils.lerp(-width * 0.5, width * 0.5, position);
        const carrierA = Math.sin(position * Math.PI * (2.4 + layerIndex * 0.36) + time * localMotion * 1.1 + layerIndex * 0.8);
        const carrierB = Math.cos(position * Math.PI * (5.2 + layerIndex * 0.52) - time * localMotion * 0.8 + layerIndex * 1.4);
        const lift = this.smoothed[layerIndex][sampleIndex] * amplitude * (carrierA * 0.72 + carrierB * 0.28);
        const shimmer = Math.sin(time * 0.32 + position * Math.PI * 7.5 + layerIndex) * (0.08 + audioFrame.high * 0.12);
        const y = 4.15 + verticalOffsets[layerIndex] + lift + shimmer;
        const z = depthOffsets[layerIndex] + Math.sin(position * Math.PI * 3.2 + time * localMotion * 0.72 + layerIndex) * 0.16 * shape;
        points.push(new THREE.Vector3(x, y, z));
      }

      const shellRadius = (0.14 + layerIndex * 0.03 + glow * 0.015) * scale;
      const coreRadius = shellRadius * 0.44;
      this.replaceGeometry(layer, points, shellRadius, coreRadius);

      const palette = createPalette(randomize ? hue + layerIndex * 90 + time * 18 : hue, layerIndex * 14);
      layer.shellMaterial.color.copy(palette.shell);
      layer.shellMaterial.emissive.copy(palette.accent);
      layer.shellMaterial.emissiveIntensity = 0.16 + glow * 0.42 + audioFrame.overall * 0.14;
      layer.shellMaterial.attenuationColor = palette.core;
      layer.shellMaterial.specularColor = palette.accent;
      layer.shellMaterial.iridescence = 0.72 + audioFrame.high * 0.22;

      layer.coreMaterial.color.copy(palette.core);
      layer.coreMaterial.emissive.copy(palette.accent);
      layer.coreMaterial.emissiveIntensity = 0.28 + glow * 0.48 + audioFrame.overall * 0.18;

      layer.reflectionShellMaterial.color.copy(palette.shell);
      layer.reflectionShellMaterial.emissive.copy(palette.accent);
      layer.reflectionShellMaterial.emissiveIntensity = 0.04 + glow * 0.08;
      layer.reflectionShellMaterial.attenuationColor = palette.core;
      layer.reflectionShellMaterial.specularColor = palette.accent;
      layer.reflectionShellMaterial.opacity = 0.09 + glow * 0.08;

      layer.reflectionCoreMaterial.color.copy(palette.core);
      layer.reflectionCoreMaterial.opacity = 0.05 + glow * 0.06;
    }
  }
}
