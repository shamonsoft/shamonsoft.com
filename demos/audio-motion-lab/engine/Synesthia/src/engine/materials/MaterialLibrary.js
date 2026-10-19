import * as THREE from "../../vendor/three/three.module.js";

function hueColor(hue, saturation, lightness) {
  const normalizedHue = ((hue % 360) + 360) % 360;
  return new THREE.Color(`hsl(${normalizedHue}, ${saturation}%, ${lightness}%)`);
}

function makeRadialTexture(stops) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(128, 128, 6, 128, 128, 112);

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

  const gradient = context.createLinearGradient(0, 0, 1024, 1024);
  gradient.addColorStop(0, "#05070d");
  gradient.addColorStop(0.35, "#0a0f17");
  gradient.addColorStop(0.7, "#060912");
  gradient.addColorStop(1, "#03050a");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 1024, 1024);

  for (let index = 0; index < 2200; index += 1) {
    const y = Math.random() * 1024;
    const alpha = 0.012 + Math.random() * 0.04;
    const width = 120 + Math.random() * 440;
    context.fillStyle = `rgba(190, 220, 255, ${alpha})`;
    context.fillRect(Math.random() * 1024 - 80, y, width, 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.4, 1.4);
  return texture;
}

export class MaterialLibrary {
  constructor() {
    this.floorGlowTexture = makeRadialTexture([
      [0, "rgba(255,255,255,0.9)"],
      [0.18, "rgba(168,238,255,0.4)"],
      [0.58, "rgba(80,132,255,0.08)"],
      [1, "rgba(0,0,0,0)"],
    ]);
    this.hazeTexture = makeRadialTexture([
      [0, "rgba(255,255,255,0.95)"],
      [0.2, "rgba(180,230,255,0.4)"],
      [0.55, "rgba(110,160,255,0.08)"],
      [1, "rgba(0,0,0,0)"],
    ]);
    this.brushedMetalTexture = makeBrushedMetalTexture();
    this.palette = this.createPalette(220, 0);
  }

  createPalette(backgroundHue, hueShift = 0) {
    const hue = (backgroundHue + hueShift + 360) % 360;
    return {
      background: hueColor(hue + 14, 46, 5),
      fog: hueColor(hue + 18, 32, 7),
      horizon: hueColor(hue + 10, 58, 12),
      floorBase: hueColor(hue + 12, 34, 10),
      floorEdge: hueColor(hue + 22, 64, 34),
      glassBase: hueColor(hue + 4, 76, 54),
      glassAccent: hueColor(hue + 16, 92, 72),
      glassCore: hueColor(hue - 6, 100, 82),
      rimCool: hueColor(hue + 32, 100, 76),
      rimWarm: hueColor(hue + 56, 84, 70),
      metal: hueColor(hue + 18, 18, 76),
      haze: hueColor(hue + 18, 92, 78),
      shadowTint: hueColor(hue + 18, 42, 12),
    };
  }

  updatePalette(backgroundHue, hueShift = 0) {
    this.palette = this.createPalette(backgroundHue, hueShift);
    return this.palette;
  }

  createFloorMaterial() {
    return new THREE.MeshPhysicalMaterial({
      color: this.palette.floorBase.clone(),
      metalness: 0.92,
      roughness: 0.22,
      map: this.brushedMetalTexture,
      envMapIntensity: 1.35,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      emissive: this.palette.floorEdge.clone(),
      emissiveMap: this.brushedMetalTexture,
      emissiveIntensity: 0.16,
    });
  }

  createFloorGlowMaterial() {
    return new THREE.MeshBasicMaterial({
      map: this.floorGlowTexture,
      color: this.palette.glassAccent.clone(),
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }

  createBackplateMaterial() {
    return new THREE.MeshPhysicalMaterial({
      color: this.palette.horizon.clone(),
      metalness: 0.18,
      roughness: 0.46,
      envMapIntensity: 1.1,
      transparent: true,
      opacity: 0.46,
      emissive: this.palette.rimCool.clone(),
      emissiveIntensity: 0.08,
      side: THREE.DoubleSide,
    });
  }

  createHazeMaterial() {
    return new THREE.PointsMaterial({
      map: this.hazeTexture,
      size: 0.68,
      color: this.palette.haze.clone(),
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      vertexColors: true,
    });
  }

  createBarShellMaterial() {
    return new THREE.MeshPhysicalMaterial({
      color: this.palette.glassBase.clone(),
      emissive: this.palette.glassAccent.clone(),
      emissiveIntensity: 0.44,
      metalness: 0.04,
      roughness: 0.06,
      transmission: 0.98,
      ior: 1.16,
      thickness: 2.2,
      attenuationDistance: 2.8,
      attenuationColor: this.palette.glassCore.clone(),
      transparent: true,
      opacity: 0.92,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      iridescence: 0.78,
      iridescenceIOR: 1.16,
      iridescenceThicknessRange: [180, 480],
      specularIntensity: 1,
      specularColor: this.palette.rimCool.clone(),
      envMapIntensity: 1.5,
    });
  }

  createBarCoreMaterial() {
    return new THREE.MeshPhysicalMaterial({
      color: this.palette.glassCore.clone(),
      emissive: this.palette.glassAccent.clone(),
      emissiveIntensity: 0.7,
      metalness: 0.02,
      roughness: 0.14,
      transmission: 0.46,
      ior: 1.08,
      thickness: 0.9,
      transparent: true,
      opacity: 0.98,
      clearcoat: 0.56,
      clearcoatRoughness: 0.08,
      envMapIntensity: 1.24,
    });
  }

  createBarCapMaterial() {
    return new THREE.MeshPhysicalMaterial({
      color: this.palette.metal.clone(),
      emissive: this.palette.rimCool.clone(),
      emissiveIntensity: 0.12,
      metalness: 1,
      roughness: 0.22,
      envMapIntensity: 1.7,
    });
  }

  createReflectionMaterial() {
    return new THREE.MeshPhysicalMaterial({
      color: this.palette.glassBase.clone(),
      emissive: this.palette.glassAccent.clone(),
      emissiveIntensity: 0.08,
      metalness: 0.06,
      roughness: 0.16,
      transmission: 0.68,
      ior: 1.12,
      thickness: 1.4,
      transparent: true,
      opacity: 0.2,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      iridescence: 0.35,
      iridescenceIOR: 1.12,
      iridescenceThicknessRange: [160, 340],
      specularColor: this.palette.rimCool.clone(),
      envMapIntensity: 1.1,
    });
  }

  createReflectionCoreMaterial() {
    return new THREE.MeshBasicMaterial({
      color: this.palette.glassCore.clone(),
      transparent: true,
      opacity: 0.1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }
}
