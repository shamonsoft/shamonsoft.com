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

export class SceneRig {
  constructor(materialLibrary) {
    this.materialLibrary = materialLibrary;
    this.scene = new THREE.Scene();
    this.scene.background = materialLibrary.palette.background.clone();
    this.scene.fog = new THREE.FogExp2(materialLibrary.palette.fog.clone(), 0.028);

    this.camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 120);
    this.camera.position.set(0, 4.6, 20.8);
    this.camera.lookAt(0, 4.3, 0);

    this.root = new THREE.Group();
    this.stage = new THREE.Group();
    this.visualRoot = new THREE.Group();
    this.reflectionRoot = new THREE.Group();
    this.reflectionRoot.scale.y = -1;
    this.reflectionRoot.position.y = -0.08;
    this.atmosphere = new THREE.Group();

    this.scene.add(this.root);
    this.root.add(this.stage, this.atmosphere);
    this.stage.add(this.visualRoot, this.reflectionRoot);

    this.buildLights();
    this.buildEnvironment();
    this.buildHaze();
  }

  buildLights() {
    this.hemisphereLight = new THREE.HemisphereLight("#a4dcff", "#05070d", 0.42);
    this.keyLight = new THREE.SpotLight("#d7f8ff", 90, 80, Math.PI / 5.4, 0.38, 1.2);
    this.keyLight.position.set(0, 15, 14);
    this.keyLight.target.position.set(0, 4.2, 0);

    this.leftRim = new THREE.PointLight("#6a7dff", 26, 30, 2);
    this.leftRim.position.set(-7.8, 4.4, 5.2);
    this.rightRim = new THREE.PointLight("#74eaff", 28, 30, 2);
    this.rightRim.position.set(8.2, 5.1, 4.4);
    this.backLift = new THREE.PointLight("#88c8ff", 22, 34, 2);
    this.backLift.position.set(0, 5.6, -8);
    this.floorBounce = new THREE.PointLight("#88daff", 14, 22, 2);
    this.floorBounce.position.set(0, 1.2, 6.2);

    this.scene.add(
      this.hemisphereLight,
      this.keyLight,
      this.keyLight.target,
      this.leftRim,
      this.rightRim,
      this.backLift,
      this.floorBounce,
    );
  }

  buildEnvironment() {
    this.floorMaterial = this.materialLibrary.createFloorMaterial();
    this.floor = new THREE.Mesh(new THREE.CircleGeometry(18, 96), this.floorMaterial);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.set(0, 0, 0.9);
    this.stage.add(this.floor);

    this.floorGlowMaterial = this.materialLibrary.createFloorGlowMaterial();
    this.floorGlow = new THREE.Mesh(new THREE.PlaneGeometry(18, 7.5), this.floorGlowMaterial);
    this.floorGlow.rotation.x = -Math.PI / 2;
    this.floorGlow.position.set(0, 0.015, 1.4);
    this.stage.add(this.floorGlow);

    this.backplateMaterial = this.materialLibrary.createBackplateMaterial();
    this.backplate = new THREE.Mesh(new THREE.PlaneGeometry(28, 16), this.backplateMaterial);
    this.backplate.position.set(0, 6.5, -10.5);
    this.stage.add(this.backplate);

    this.leftBlade = new THREE.Mesh(
      new THREE.PlaneGeometry(4.8, 11),
      new THREE.MeshBasicMaterial({
        color: this.materialLibrary.palette.rimWarm.clone(),
        transparent: true,
        opacity: 0.05,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    );
    this.leftBlade.position.set(-8.2, 5.4, -4.6);
    this.leftBlade.rotation.y = 0.62;

    this.rightBlade = this.leftBlade.clone();
    this.rightBlade.material = this.leftBlade.material.clone();
    this.rightBlade.position.x = 8.2;
    this.rightBlade.rotation.y = -0.62;
    this.stage.add(this.leftBlade, this.rightBlade);
  }

  buildHaze() {
    const count = 120;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let index = 0; index < count; index += 1) {
      const i3 = index * 3;
      positions[i3] = THREE.MathUtils.randFloatSpread(22);
      positions[i3 + 1] = THREE.MathUtils.randFloat(1.2, 9.2);
      positions[i3 + 2] = THREE.MathUtils.randFloat(-18, 4);
      colors[i3] = 0.72 + Math.random() * 0.12;
      colors[i3 + 1] = 0.84 + Math.random() * 0.1;
      colors[i3 + 2] = 1;
      sizes[index] = 0.5 + Math.random() * 1.2;
    }

    this.hazeGeometry = new THREE.BufferGeometry();
    this.hazeGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.hazeGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    this.hazeGeometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
    this.hazeMaterial = this.materialLibrary.createHazeMaterial();
    this.haze = new THREE.Points(this.hazeGeometry, this.hazeMaterial);
    this.atmosphere.add(this.haze);
  }

  updateShared(audioFrame, controls, time) {
    const glow = normalize(controls.global?.glow, 65);
    const brightness = normalize(controls.global?.brightness, 70);
    const bloom = normalize(controls.global?.bloom, 90);
    const depth = normalize(controls.global?.depth, 60);
    const cameraMove = normalize(controls.global?.cameraMove, 50);
    const fov = 22 + normalize(controls.global?.fov, 60) * 18;
    const backgroundMode = resolveBackgroundMode(controls.background);
    const palette = this.materialLibrary.updatePalette(
      controls.background?.hue ?? 220,
      controls.global?.hueShift ?? 0,
    );

    if (backgroundMode === "white") {
      this.scene.background.set("#edf3fb");
      this.scene.fog.color.set("#dae4f0");
    } else if (backgroundMode === "black") {
      this.scene.background.set("#020307");
      this.scene.fog.color.set("#060911");
    } else {
      this.scene.background.copy(palette.background);
      this.scene.fog.color.copy(palette.fog);
    }

    this.scene.fog.density = 0.021 + bloom * 0.011;
    this.camera.fov = fov;
    this.camera.position.x = Math.sin(time * (0.14 + cameraMove * 0.12)) * (0.18 + cameraMove * 0.45);
    this.camera.position.y = 4.5 + Math.sin(time * 0.11) * 0.12 + audioFrame.overall * (0.18 + depth * 0.16);
    this.camera.position.z = 20.9 - depth * 2.2 - audioFrame.overall * 0.5;
    this.camera.lookAt(0, 4.15 + audioFrame.overall * 0.2, 0);
    this.camera.updateProjectionMatrix();

    this.hemisphereLight.intensity = 0.32 + brightness * 0.26;
    this.keyLight.intensity = 70 + brightness * 40 + audioFrame.overall * 18;
    this.leftRim.intensity = 16 + glow * 13 + audioFrame.mid * 10;
    this.rightRim.intensity = 18 + glow * 14 + audioFrame.high * 11;
    this.backLift.intensity = 16 + glow * 10 + audioFrame.beat * 30;
    this.floorBounce.intensity = 8 + brightness * 8 + audioFrame.bass * 10;

    this.keyLight.color.copy(palette.glassAccent);
    this.leftRim.color.copy(palette.rimWarm);
    this.rightRim.color.copy(palette.rimCool);
    this.backLift.color.copy(palette.glassCore);
    this.floorBounce.color.copy(palette.rimCool);

    this.floorMaterial.color.copy(palette.floorBase);
    this.floorMaterial.emissive.copy(palette.floorEdge);
    this.floorMaterial.emissiveIntensity = 0.08 + glow * 0.08 + audioFrame.overall * 0.08;

    this.floorGlowMaterial.color.copy(palette.glassAccent);
    this.floorGlowMaterial.opacity = 0.12 + glow * 0.16 + audioFrame.bass * 0.18;
    this.floorGlow.scale.set(1.02 + audioFrame.bass * 0.16, 0.96 + audioFrame.bass * 0.08, 1);

    this.backplateMaterial.color.copy(palette.horizon);
    this.backplateMaterial.emissive.copy(palette.rimCool);
    this.backplateMaterial.emissiveIntensity = 0.04 + glow * 0.06;
    this.backplateMaterial.opacity = 0.26 + bloom * 0.12;

    this.leftBlade.material.color.copy(palette.rimWarm);
    this.leftBlade.material.opacity = 0.03 + glow * 0.05 + audioFrame.beat * 0.06;
    this.rightBlade.material.color.copy(palette.rimCool);
    this.rightBlade.material.opacity = 0.03 + glow * 0.05 + audioFrame.overall * 0.04;

    const positions = this.hazeGeometry.attributes.position.array;
    for (let index = 0; index < positions.length; index += 3) {
      positions[index] += Math.sin(time * 0.12 + index * 0.71) * 0.0009;
      positions[index + 1] += Math.cos(time * 0.16 + index * 0.31) * 0.0008;
      positions[index + 2] += 0.01 + audioFrame.overall * 0.018;
      if (positions[index + 2] > 6) {
        positions[index + 2] = -18;
      }
    }
    this.hazeGeometry.attributes.position.needsUpdate = true;
    this.hazeMaterial.color.copy(palette.haze);
    this.hazeMaterial.opacity = 0.07 + glow * 0.09 + bloom * 0.06;
  }
}
