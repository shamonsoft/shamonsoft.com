import * as THREE from "../../vendor/three/three.module.js";

function normalize(value, fallback = 50) {
  const numeric = Number.isFinite(value) ? value : fallback;
  return Math.max(0, Math.min(1, numeric / 100));
}

function resolveBackgroundMode(background) {
  if (background?.white) {
    return "white";
  }
  if (background?.black) {
    return "black";
  }
  return "color";
}

export class PremiumStage {
  constructor(materialSystem) {
    this.materialSystem = materialSystem;
    this.scene = new THREE.Scene();
    this.scene.background = materialSystem.palette.background.clone();
    this.scene.fog = new THREE.FogExp2(materialSystem.palette.fog.clone(), 0.024);

    this.camera = new THREE.PerspectiveCamera(28, 16 / 9, 0.1, 140);
    this.camera.position.set(0, 4.8, 21.5);
    this.camera.lookAt(0, 4.3, 0);

    this.root = new THREE.Group();
    this.world = new THREE.Group();
    this.modeRoot = new THREE.Group();
    this.reflectionRoot = new THREE.Group();
    this.reflectionRoot.scale.y = -1;
    this.reflectionRoot.position.y = -0.05;
    this.atmosphereRoot = new THREE.Group();

    this.scene.add(this.root);
    this.root.add(this.world, this.atmosphereRoot);
    this.world.add(this.modeRoot, this.reflectionRoot);

    this.buildEnvironment();
    this.buildLights();
    this.buildAtmosphere();
  }

  buildEnvironment() {
    this.floorMaterial = this.materialSystem.createFloorMaterial();
    this.floor = new THREE.Mesh(new THREE.CircleGeometry(20, 112), this.floorMaterial);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.set(0, 0, 1.2);
    this.world.add(this.floor);

    this.floorGlowMaterial = this.materialSystem.createFloorGlowMaterial();
    this.floorGlow = new THREE.Mesh(new THREE.PlaneGeometry(18, 8.5), this.floorGlowMaterial);
    this.floorGlow.rotation.x = -Math.PI / 2;
    this.floorGlow.position.set(0, 0.015, 1.6);
    this.world.add(this.floorGlow);

    this.backdropMaterial = this.materialSystem.createBackdropMaterial();
    this.backdrop = new THREE.Mesh(new THREE.PlaneGeometry(30, 18), this.backdropMaterial);
    this.backdrop.position.set(0, 6.4, -11.5);
    this.world.add(this.backdrop);

    this.leftPanel = new THREE.Mesh(
      new THREE.PlaneGeometry(6.5, 12),
      new THREE.MeshBasicMaterial({
        color: this.materialSystem.palette.warm.clone(),
        transparent: true,
        opacity: 0.045,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    );
    this.leftPanel.position.set(-8.6, 5.2, -3.2);
    this.leftPanel.rotation.y = 0.58;

    this.rightPanel = this.leftPanel.clone();
    this.rightPanel.material = this.leftPanel.material.clone();
    this.rightPanel.position.x = 8.6;
    this.rightPanel.rotation.y = -0.58;
    this.world.add(this.leftPanel, this.rightPanel);
  }

  buildLights() {
    this.hemi = new THREE.HemisphereLight("#a4daff", "#04070d", 0.4);
    this.key = new THREE.SpotLight("#d9faff", 110, 90, Math.PI / 5.2, 0.42, 1.15);
    this.key.position.set(0, 15, 14);
    this.key.target.position.set(0, 4.4, 0);
    this.leftRim = new THREE.PointLight("#7280ff", 30, 36, 2);
    this.leftRim.position.set(-8, 4.5, 5.6);
    this.rightRim = new THREE.PointLight("#75edff", 32, 36, 2);
    this.rightRim.position.set(8.4, 5.3, 4.6);
    this.backLight = new THREE.PointLight("#94cfff", 24, 38, 2);
    this.backLight.position.set(0, 6.2, -9.2);
    this.floorLight = new THREE.PointLight("#85dbff", 12, 24, 2);
    this.floorLight.position.set(0, 1.1, 7.2);
    this.scene.add(this.hemi, this.key, this.key.target, this.leftRim, this.rightRim, this.backLight, this.floorLight);
  }

  buildAtmosphere() {
    const count = 140;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let index = 0; index < count; index += 1) {
      const i3 = index * 3;
      positions[i3] = THREE.MathUtils.randFloatSpread(24);
      positions[i3 + 1] = THREE.MathUtils.randFloat(1.5, 10.5);
      positions[i3 + 2] = THREE.MathUtils.randFloat(-20, 6);
      colors[i3] = 0.8;
      colors[i3 + 1] = 0.9 + Math.random() * 0.08;
      colors[i3 + 2] = 1;
    }

    this.hazeGeometry = new THREE.BufferGeometry();
    this.hazeGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.hazeGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    this.hazeMaterial = this.materialSystem.createHazeMaterial();
    this.haze = new THREE.Points(this.hazeGeometry, this.hazeMaterial);
    this.atmosphereRoot.add(this.haze);
  }

  update(time, audioFrame, controls) {
    const palette = this.materialSystem.updatePalette(
      controls.background?.hue ?? 220,
      controls.global?.hueShift ?? 0,
    );

    const glow = normalize(controls.global?.glow, 65);
    const brightness = normalize(controls.global?.brightness, 70);
    const bloom = normalize(controls.global?.bloom, 90);
    const depth = normalize(controls.global?.depth, 60);
    const cameraMove = normalize(controls.global?.cameraMove, 50);
    const backgroundMode = resolveBackgroundMode(controls.background);

    if (backgroundMode === "white") {
      this.scene.background.set("#edf3fb");
      this.scene.fog.color.set("#d9e4ef");
    } else if (backgroundMode === "black") {
      this.scene.background.set("#010308");
      this.scene.fog.color.set("#050812");
    } else {
      this.scene.background.copy(palette.background);
      this.scene.fog.color.copy(palette.fog);
    }
    this.scene.fog.density = 0.02 + bloom * 0.012;

    this.camera.position.x = Math.sin(time * (0.12 + cameraMove * 0.1)) * (0.25 + cameraMove * 0.5);
    this.camera.position.y = 4.8 + Math.sin(time * 0.08) * 0.16 + audioFrame.overall * 0.2;
    this.camera.position.z = 21.6 - depth * 2.4 - audioFrame.overall * 0.45;
    this.camera.lookAt(0, 4.2 + audioFrame.overall * 0.25, 0);

    this.hemi.intensity = 0.34 + brightness * 0.24;
    this.key.intensity = 78 + brightness * 42 + audioFrame.overall * 24;
    this.leftRim.intensity = 18 + glow * 14 + audioFrame.lowMid * 12;
    this.rightRim.intensity = 20 + glow * 15 + audioFrame.highMid * 12;
    this.backLight.intensity = 18 + glow * 12 + audioFrame.beat * 32;
    this.floorLight.intensity = 8 + brightness * 7 + audioFrame.bass * 12;

    this.key.color.copy(palette.glassAccent);
    this.leftRim.color.copy(palette.warm);
    this.rightRim.color.copy(palette.glassAccent);
    this.backLight.color.copy(palette.glassCore);
    this.floorLight.color.copy(palette.glassAccent);

    this.floorMaterial.color.copy(palette.floor);
    this.floorMaterial.emissive.copy(palette.floorEdge);
    this.floorMaterial.emissiveIntensity = 0.08 + glow * 0.09 + audioFrame.overall * 0.06;
    this.floorGlowMaterial.color.copy(palette.glassAccent);
    this.floorGlowMaterial.opacity = 0.1 + glow * 0.16 + audioFrame.bass * 0.18;
    this.floorGlow.scale.set(1.05 + audioFrame.bass * 0.14, 1 + audioFrame.bass * 0.08, 1);

    this.backdropMaterial.color.copy(palette.horizon);
    this.backdropMaterial.emissive.copy(palette.glassAccent);
    this.backdropMaterial.emissiveIntensity = 0.04 + glow * 0.04;
    this.backdropMaterial.opacity = 0.24 + bloom * 0.14;

    this.leftPanel.material.color.copy(palette.warm);
    this.leftPanel.material.opacity = 0.025 + glow * 0.05 + audioFrame.beat * 0.08;
    this.rightPanel.material.color.copy(palette.glassAccent);
    this.rightPanel.material.opacity = 0.025 + glow * 0.05 + audioFrame.overall * 0.05;

    const positions = this.hazeGeometry.attributes.position.array;
    for (let index = 0; index < positions.length; index += 3) {
      positions[index] += Math.sin(time * 0.11 + index * 0.42) * 0.001;
      positions[index + 1] += Math.cos(time * 0.08 + index * 0.37) * 0.0008;
      positions[index + 2] += 0.012 + audioFrame.overall * 0.018;
      if (positions[index + 2] > 8) {
        positions[index + 2] = -20;
      }
    }
    this.hazeGeometry.attributes.position.needsUpdate = true;
    this.hazeMaterial.color.copy(palette.haze);
    this.hazeMaterial.opacity = 0.08 + glow * 0.09 + bloom * 0.05;
  }
}
