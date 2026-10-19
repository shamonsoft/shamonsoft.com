import * as THREE from "../../vendor/three/three.module.js";

function hueColor(hue, saturation, lightness) {
  const normalizedHue = ((hue % 360) + 360) % 360;
  return new THREE.Color(`hsl(${normalizedHue}, ${saturation}%, ${lightness}%)`);
}

function makeTexture(stops) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(128, 128, 6, 128, 128, 118);
  stops.forEach(([offset, color]) => gradient.addColorStop(offset, color));
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeBrushedMetalTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const context = canvas.getContext("2d");

  const base = context.createLinearGradient(0, 0, 1024, 1024);
  base.addColorStop(0, "#04070e");
  base.addColorStop(0.5, "#0a1018");
  base.addColorStop(1, "#050810");
  context.fillStyle = base;
  context.fillRect(0, 0, 1024, 1024);

  for (let index = 0; index < 3200; index += 1) {
    const y = Math.random() * 1024;
    const x = Math.random() * 1024;
    const width = 120 + Math.random() * 420;
    const alpha = 0.01 + Math.random() * 0.035;
    context.fillStyle = `rgba(180, 215, 255, ${alpha})`;
    context.fillRect(x, y, width, 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.3, 1.3);
  return texture;
}

export class PremiumMaterialSystem {
  constructor() {
    this.floorGlowTexture = makeTexture([
      [0, "rgba(255,255,255,0.95)"],
      [0.15, "rgba(170,235,255,0.4)"],
      [0.45, "rgba(88,112,255,0.08)"],
      [1, "rgba(0,0,0,0)"],
    ]);
    this.hazeTexture = makeTexture([
      [0, "rgba(255,255,255,1)"],
      [0.18, "rgba(188,234,255,0.4)"],
      [0.55, "rgba(100,150,255,0.06)"],
      [1, "rgba(0,0,0,0)"],
    ]);
    this.brushedMetalTexture = makeBrushedMetalTexture();
    this.palette = this.createPalette(220, 0);
  }

  createPalette(backgroundHue, hueShift = 0) {
    const hue = (backgroundHue + hueShift + 360) % 360;
    return {
      background: hueColor(hue + 12, 42, 5),
      fog: hueColor(hue + 16, 30, 8),
      horizon: hueColor(hue + 16, 50, 13),
      glassBody: hueColor(hue + 6, 78, 58),
      glassAccent: hueColor(hue + 18, 100, 76),
      glassCore: hueColor(hue - 6, 100, 84),
      metal: hueColor(hue + 18, 16, 78),
      metalEdge: hueColor(hue + 24, 40, 88),
      haze: hueColor(hue + 18, 96, 82),
      floor: hueColor(hue + 12, 24, 11),
      floorEdge: hueColor(hue + 20, 64, 36),
      warm: hueColor(hue + 54, 82, 74),
    };
  }

  updatePalette(backgroundHue, hueShift = 0) {
    this.palette = this.createPalette(backgroundHue, hueShift);
    return this.palette;
  }

  createFloorMaterial() {
    return new THREE.MeshPhysicalMaterial({
      color: this.palette.floor.clone(),
      map: this.brushedMetalTexture,
      metalness: 0.92,
      roughness: 0.18,
      envMapIntensity: 1.45,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      emissive: this.palette.floorEdge.clone(),
      emissiveMap: this.brushedMetalTexture,
      emissiveIntensity: 0.14,
    });
  }

  createFloorGlowMaterial() {
    return new THREE.MeshBasicMaterial({
      map: this.floorGlowTexture,
      color: this.palette.glassAccent.clone(),
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }

  createBackdropMaterial() {
    return new THREE.MeshPhysicalMaterial({
      color: this.palette.horizon.clone(),
      metalness: 0.14,
      roughness: 0.42,
      envMapIntensity: 1.12,
      emissive: this.palette.glassAccent.clone(),
      emissiveIntensity: 0.05,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
    });
  }

  createHazeMaterial() {
    return new THREE.PointsMaterial({
      map: this.hazeTexture,
      size: 0.8,
      color: this.palette.haze.clone(),
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      sizeAttenuation: true,
    });
  }

  createGlassBodyMaterial() {
    return new THREE.MeshPhysicalMaterial({
      color: this.palette.glassBody.clone(),
      emissive: this.palette.glassAccent.clone(),
      emissiveIntensity: 0.18,
      metalness: 0.02,
      roughness: 0.05,
      transmission: 0.99,
      ior: 1.17,
      thickness: 2.6,
      attenuationDistance: 2.6,
      attenuationColor: this.palette.glassCore.clone(),
      transparent: true,
      opacity: 0.92,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
      iridescence: 0.92,
      iridescenceIOR: 1.15,
      iridescenceThicknessRange: [180, 520],
      specularIntensity: 1,
      specularColor: this.palette.glassAccent.clone(),
      envMapIntensity: 1.75,
    });
  }

  createInnerGlowMaterial() {
    return new THREE.MeshPhysicalMaterial({
      color: this.palette.glassCore.clone(),
      emissive: this.palette.glassAccent.clone(),
      emissiveIntensity: 0.58,
      metalness: 0.01,
      roughness: 0.16,
      transmission: 0.62,
      ior: 1.08,
      thickness: 1.0,
      transparent: true,
      opacity: 0.98,
      clearcoat: 0.5,
      clearcoatRoughness: 0.08,
      envMapIntensity: 1.2,
    });
  }

  createMetalMaterial() {
    return new THREE.MeshPhysicalMaterial({
      color: this.palette.metal.clone(),
      emissive: this.palette.metalEdge.clone(),
      emissiveIntensity: 0.04,
      metalness: 1,
      roughness: 0.18,
      envMapIntensity: 1.85,
      clearcoat: 0.68,
      clearcoatRoughness: 0.06,
    });
  }

  createReflectionGlassMaterial() {
    return new THREE.MeshPhysicalMaterial({
      color: this.palette.glassBody.clone(),
      emissive: this.palette.glassAccent.clone(),
      emissiveIntensity: 0.04,
      metalness: 0.03,
      roughness: 0.12,
      transmission: 0.78,
      ior: 1.12,
      thickness: 1.6,
      attenuationDistance: 1.6,
      attenuationColor: this.palette.glassCore.clone(),
      transparent: true,
      opacity: 0.16,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      iridescence: 0.3,
      iridescenceIOR: 1.1,
      iridescenceThicknessRange: [120, 320],
      specularColor: this.palette.glassAccent.clone(),
      envMapIntensity: 1.1,
    });
  }

  createReflectionCoreMaterial() {
    return new THREE.MeshBasicMaterial({
      color: this.palette.glassCore.clone(),
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }

  normalizeMaterialName(name) {
    return (name ?? "Glass Bubble").toLowerCase();
  }

  applySurfaceProfile(materialName, materials, colors, glow, energy) {
    const kind = this.normalizeMaterialName(materialName);
    const shell = materials.shellMaterial;
    const core = materials.coreMaterial;
    const shellReflection = materials.reflectionShellMaterial;
    const reflectionCore = materials.reflectionCoreMaterial;
    const metalMaterials = materials.metalMaterials ?? [];
    const reflectionMetalMaterials = materials.reflectionMetalMaterials ?? [];

    if (kind.includes("chrome")) {
      const chromeColor = colors.metalColor.clone().lerp(colors.accentColor, 0.08 + energy * 0.06);
      const chromeHighlight = colors.accentColor.clone().lerp(new THREE.Color("#f6fbff"), 0.58);
      shell.color.copy(chromeColor);
      shell.emissive.copy(chromeHighlight);
      shell.emissiveIntensity = 0.02 + glow * 0.04 + energy * 0.03;
      shell.metalness = 1;
      shell.roughness = 0.07;
      shell.transmission = 0;
      shell.opacity = 1;
      shell.thickness = 0;
      shell.attenuationDistance = 0.1;
      shell.attenuationColor.copy(chromeHighlight);
      shell.clearcoat = 1;
      shell.clearcoatRoughness = 0.03;
      shell.iridescence = 0;
      shell.envMapIntensity = 2.25;
      shell.specularColor.copy(new THREE.Color("#ffffff"));

      core.color.copy(chromeColor.clone().lerp(chromeHighlight, 0.16));
      core.emissive.copy(chromeHighlight);
      core.emissiveIntensity = 0.01 + energy * 0.03;
      core.metalness = 1;
      core.roughness = 0.1;
      core.transmission = 0;
      core.opacity = 1;
      core.envMapIntensity = 2;

      shellReflection.color.copy(chromeColor);
      shellReflection.emissive.copy(chromeHighlight);
      shellReflection.emissiveIntensity = 0.01 + glow * 0.02;
      shellReflection.metalness = 1;
      shellReflection.roughness = 0.14;
      shellReflection.transmission = 0;
      shellReflection.opacity = 0.12;
      shellReflection.thickness = 0;
      shellReflection.iridescence = 0;
      shellReflection.envMapIntensity = 1.35;
      shellReflection.specularColor.copy(new THREE.Color("#ffffff"));
      shellReflection.attenuationColor.copy(chromeHighlight);

      reflectionCore.color.copy(chromeHighlight);
      reflectionCore.opacity = 0.02 + glow * 0.02;

      metalMaterials.forEach((material) => {
        material.color.copy(chromeColor);
        material.emissive.copy(chromeHighlight);
        material.emissiveIntensity = 0.02 + glow * 0.03;
        material.metalness = 1;
        material.roughness = 0.05;
        material.envMapIntensity = 2.35;
        material.clearcoat = 1;
        material.clearcoatRoughness = 0.03;
      });
      reflectionMetalMaterials.forEach((material) => {
        material.color.copy(chromeColor);
        material.emissive.copy(chromeHighlight);
        material.emissiveIntensity = 0.01;
        material.metalness = 1;
        material.roughness = 0.1;
        material.envMapIntensity = 1.5;
        material.clearcoat = 1;
        material.clearcoatRoughness = 0.04;
      });
      return;
    }

    shell.color.copy(colors.shellColor);
    shell.emissive.copy(colors.accentColor);
    shell.emissiveIntensity = 0.14 + glow * 0.54 + energy * 0.34;
    shell.metalness = 0.02;
    shell.roughness = 0.05;
    shell.transmission = 0.99;
    shell.opacity = 0.92;
    shell.thickness = 2.4;
    shell.attenuationDistance = 2.4;
    shell.attenuationColor.copy(colors.coreColor);
    shell.clearcoat = 1;
    shell.clearcoatRoughness = 0.03;
    shell.iridescence = 0.72 + energy * 0.2;
    shell.envMapIntensity = 1.75;
    shell.specularColor.copy(colors.accentColor);

    core.color.copy(colors.coreColor);
    core.emissive.copy(colors.accentColor);
    core.emissiveIntensity = 0.38 + glow * 0.5 + energy * 0.2;
    core.metalness = 0.01;
    core.roughness = 0.16;
    core.transmission = 0.62;
    core.opacity = 0.98;
    core.envMapIntensity = 1.2;

    shellReflection.color.copy(colors.shellColor);
    shellReflection.emissive.copy(colors.accentColor);
    shellReflection.emissiveIntensity = 0.02 + glow * 0.06;
    shellReflection.metalness = 0.03;
    shellReflection.roughness = 0.12;
    shellReflection.transmission = 0.78;
    shellReflection.opacity = 0.08 + glow * 0.06 + energy * 0.04;
    shellReflection.thickness = 1.6;
    shellReflection.attenuationDistance = 1.6;
    shellReflection.attenuationColor.copy(colors.coreColor);
    shellReflection.iridescence = 0.3;
    shellReflection.envMapIntensity = 1.1;
    shellReflection.specularColor.copy(colors.accentColor);

    reflectionCore.color.copy(colors.coreColor);
    reflectionCore.opacity = 0.05 + glow * 0.05;

    metalMaterials.forEach((material) => {
      material.color.copy(colors.metalColor);
      material.emissive.copy(colors.accentColor);
      material.emissiveIntensity = 0.02 + glow * 0.05;
      material.metalness = 1;
      material.roughness = 0.18;
      material.envMapIntensity = 1.85;
      material.clearcoat = 0.68;
      material.clearcoatRoughness = 0.06;
    });
    reflectionMetalMaterials.forEach((material) => {
      material.color.copy(colors.metalColor);
      material.emissive.copy(colors.accentColor);
      material.emissiveIntensity = 0.01 + glow * 0.02;
      material.metalness = 1;
      material.roughness = 0.1;
      material.envMapIntensity = 1.4;
      material.clearcoat = 0.8;
      material.clearcoatRoughness = 0.05;
    });
  }
}
