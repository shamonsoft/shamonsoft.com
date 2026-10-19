import * as THREE from "../../vendor/three/three.module.js";
import { RoundedBoxGeometry } from "../../vendor/three/addons/geometries/RoundedBoxGeometry.js";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalize(value, fallback = 50) {
  return clamp((value ?? fallback) / 100, 0, 1);
}

function baselineRange(value, baseline, min, max) {
  const numeric = value ?? 50;
  if (numeric <= 50) {
    return THREE.MathUtils.lerp(min, baseline, numeric / 50);
  }
  return THREE.MathUtils.lerp(baseline, max, (numeric - 50) / 50);
}

function hueColor(hue, saturation, lightness) {
  return new THREE.Color(`hsl(${((hue % 360) + 360) % 360}, ${saturation}%, ${lightness}%)`);
}

function buildShape(kind) {
  switch (kind) {
    case "Cube":
      return new RoundedBoxGeometry(0.34, 0.34, 0.34, 4, 0.06);
    case "Square":
      return new RoundedBoxGeometry(0.4, 0.4, 0.08, 2, 0.02);
    case "Line":
      return new RoundedBoxGeometry(0.07, 0.44, 0.08, 2, 0.02);
    case "X":
      return new THREE.ExtrudeGeometry(buildCrossShape(), {
        depth: 0.12,
        bevelEnabled: false,
      }).center().rotateZ(Math.PI / 4);
    case "Spark":
      return new THREE.ExtrudeGeometry(buildStarShape(4, 0.26 * 0.18), {
        depth: 0.12,
        bevelEnabled: false,
      }).center();
    case "Diamond":
      return new THREE.OctahedronGeometry(0.21, 0);
    case "Triangle":
      return new THREE.TetrahedronGeometry(0.22, 0);
    case "Hex":
      return new THREE.CylinderGeometry(0.2, 0.2, 0.18, 6, 1, false);
    case "Octagon":
      return new THREE.CylinderGeometry(0.2, 0.2, 0.18, 8, 1, false);
    case "Star":
      return new THREE.ExtrudeGeometry(buildStarShape(), {
        depth: 0.12,
        bevelEnabled: false,
      }).center();
    case "Cross":
    case "Plus":
      return new THREE.ExtrudeGeometry(buildCrossShape(), {
        depth: 0.12,
        bevelEnabled: false,
      }).center();
    case "Shard":
      return new THREE.ExtrudeGeometry(buildShardShape(), {
        depth: 0.12,
        bevelEnabled: false,
      }).center();
    case "Ring":
      return new THREE.TorusGeometry(0.18, 0.05, 18, 48);
    case "Orb":
    default:
      return new THREE.IcosahedronGeometry(0.22, 2);
  }
}

function buildStarShape(tips = 5, inner = 0.11) {
  const shape = new THREE.Shape();
  const outer = 0.26;
  for (let index = 0; index < tips * 2; index += 1) {
    const angle = -Math.PI / 2 + (index / (tips * 2)) * Math.PI * 2;
    const radius = index % 2 === 0 ? outer : inner;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (index === 0) {
      shape.moveTo(x, y);
    } else {
      shape.lineTo(x, y);
    }
  }
  shape.closePath();
  return shape;
}

function buildCrossShape() {
  const shape = new THREE.Shape();
  const w = 0.08;
  const h = 0.26;
  shape.moveTo(-w, -h);
  shape.lineTo(w, -h);
  shape.lineTo(w, -w);
  shape.lineTo(h, -w);
  shape.lineTo(h, w);
  shape.lineTo(w, w);
  shape.lineTo(w, h);
  shape.lineTo(-w, h);
  shape.lineTo(-w, w);
  shape.lineTo(-h, w);
  shape.lineTo(-h, -w);
  shape.lineTo(-w, -w);
  shape.closePath();
  return shape;
}

function buildShardShape() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.08, -0.26);
  shape.lineTo(0.2, -0.04);
  shape.lineTo(0.06, 0.26);
  shape.lineTo(-0.2, 0.08);
  shape.closePath();
  return shape;
}

export class ParticleFieldEffect {
  constructor(sceneRig, materialLibrary) {
    this.sceneRig = sceneRig;
    this.materialLibrary = materialLibrary;
    this.maxParticles = 160;
    this.maxTrailSegments = 6;
    this.currentShape = null;
    this.group = new THREE.Group();
    this.sceneRig.stage.add(this.group);
    this.dummy = new THREE.Object3D();
    this.particles = Array.from({ length: this.maxParticles }, () => ({
      orbit: 2.2 + Math.random() * 5.8,
      lift: -2.5 + Math.random() * 5.4,
      speed: 0.25 + Math.random() * 0.8,
      phase: Math.random() * Math.PI * 2,
      drift: Math.random() * Math.PI * 2,
      current: new THREE.Vector3(),
      target: new THREE.Vector3(),
      currentSize: 0,
      history: Array.from({ length: this.maxTrailSegments }, () => new THREE.Vector3()),
    }));
    this.buildMeshes("Orb");
  }

  clearMeshes() {
    this.group.clear();
    this.meshes?.forEach((mesh) => {
      mesh.geometry?.dispose?.();
      mesh.material?.dispose?.();
    });
    this.meshes = [];
  }

  buildMeshes(shape) {
    this.clearMeshes();
    this.currentShape = shape;

    const geometry = buildShape(shape);
    geometry.computeVertexNormals();

    const outerMaterial = this.materialLibrary.createGlassMaterial();
    outerMaterial.vertexColors = true;
    outerMaterial.depthWrite = false;
    outerMaterial.side = THREE.DoubleSide;
    outerMaterial.opacity = 0.76;
    outerMaterial.transmission = 0.92;
    outerMaterial.thickness = 1.4;
    outerMaterial.roughness = 0.03;
    outerMaterial.clearcoat = 1;
    outerMaterial.clearcoatRoughness = 0.02;

    const shellMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      vertexColors: true,
    });

    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      vertexColors: true,
    });

    const trailOuterMaterial = outerMaterial.clone();
    trailOuterMaterial.opacity = 0.28;
    trailOuterMaterial.transmission = 0.8;
    trailOuterMaterial.thickness = 0.8;

    const trailShellMaterial = shellMaterial.clone();
    trailShellMaterial.opacity = 0.1;

    const trailCoreMaterial = coreMaterial.clone();
    trailCoreMaterial.opacity = 0.24;

    this.outerMesh = new THREE.InstancedMesh(geometry, outerMaterial, this.maxParticles);
    this.shellMesh = new THREE.InstancedMesh(geometry.clone(), shellMaterial, this.maxParticles);
    this.coreMesh = new THREE.InstancedMesh(geometry.clone(), coreMaterial, this.maxParticles);

    const trailCount = this.maxParticles * this.maxTrailSegments;
    this.trailOuterMesh = new THREE.InstancedMesh(geometry.clone(), trailOuterMaterial, trailCount);
    this.trailShellMesh = new THREE.InstancedMesh(geometry.clone(), trailShellMaterial, trailCount);
    this.trailCoreMesh = new THREE.InstancedMesh(geometry.clone(), trailCoreMaterial, trailCount);

    this.meshes = [
      this.outerMesh,
      this.shellMesh,
      this.coreMesh,
      this.trailOuterMesh,
      this.trailShellMesh,
      this.trailCoreMesh,
    ];

    this.meshes.forEach((mesh) => {
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.group.add(mesh);
    });
  }

  setInstance(mesh, index, position, scale, rotation, color, scaleX = scale, scaleY = scale, scaleZ = scale) {
    this.dummy.position.copy(position);
    this.dummy.rotation.set(rotation.x, rotation.y, rotation.z);
    this.dummy.scale.set(scaleX, scaleY, scaleZ);
    this.dummy.updateMatrix();
    mesh.setMatrixAt(index, this.dummy.matrix);
    mesh.setColorAt(index, color);
  }

  update(audioFrame, controls, time, dt = 1 / 60) {
    const enabled = Boolean(controls.effects?.particles);
    this.group.visible = enabled;
    if (!enabled) {
      return;
    }

    const settings = controls.effectValues?.particles ?? {};
    const randomizeColors = Boolean(controls.randomize?.particles);
    const particleAmountControl = settings.amount ?? settings.count;
    const amount = Math.round(baselineRange(particleAmountControl, 84, 0, this.maxParticles));
    const spread = baselineRange(settings.spread, 1.0, 0.38, 1.9);
    const speed = baselineRange(settings.speed, 0.72, 0.02, 2.2);
    const tails = baselineRange(settings.tails, 0.34, 0.0, 1.0);
    const intensity = normalize(settings.intensity, 50);
    const beatExpand = normalize(settings.beatexpand, 50);
    const shape = settings.shape || "Orb";
    const size = baselineRange(settings.size, 16, 2, 72);
    const hue = Number.isFinite(settings.hue) ? Number(settings.hue) : 220;
    const pulse = audioFrame.overall * intensity;
    const beatPulse = audioFrame.beat * beatExpand;
    const baseColor = hueColor(hue, 82, 58);
    const accentColor = hueColor(hue + 12, 100, 76);
    const coreColor = hueColor(hue - 4, 100, 86);
    const trailSegments = Math.max(0, Math.round(tails * this.maxTrailSegments));

    if (shape !== this.currentShape) {
      this.buildMeshes(shape);
    }

    this.outerMesh.count = amount;
    this.shellMesh.count = amount;
    this.coreMesh.count = amount;
    this.trailOuterMesh.count = amount * trailSegments;
    this.trailShellMesh.count = amount * trailSegments;
    this.trailCoreMesh.count = amount * trailSegments;

    for (let index = 0; index < amount; index += 1) {
      const particle = this.particles[index];
      const layer = amount <= 1 ? 0 : index / (amount - 1);
      const bandIndex = Math.round(layer * Math.max(0, audioFrame.bands.length - 1));
      const band = audioFrame.bands[bandIndex] ?? 0;
      const localReact = band * intensity * 1.7;
      const angle = particle.phase + time * particle.speed * (0.55 + speed * 0.92);
      const radius = (particle.orbit * spread) + pulse * 0.8;
      const x = Math.cos(angle + Math.sin(index * 0.73) * speed * 0.24) * radius;
      const z = Math.sin(angle) * radius * 0.46 - 0.4 - layer * 1.45;
      const verticalBand = (particle.lift * spread * 1.35)
        + Math.sin(time * (0.82 + speed * 0.42) + particle.phase) * (0.36 + spread * 0.58)
        + localReact * 0.84;
      const y = 3.28 + verticalBand;

      particle.target.set(x, y, z);
      particle.current.lerp(particle.target, 1 - Math.exp(-Math.max(0.001, dt) * 7.5));

      particle.history[0].copy(particle.current);
      for (let segment = 1; segment < this.maxTrailSegments; segment += 1) {
        const catchup = 0.22 - segment * 0.022 + (1 - tails) * 0.05;
        particle.history[segment].lerp(particle.history[segment - 1], clamp(catchup, 0.05, 0.26));
      }

      const baseSize = size * (0.0018 + layer * 0.0062 + pulse * 0.0008);
      const targetSize = Math.max(0.03, baseSize * (1 + beatPulse * (0.18 + localReact * 0.16)));
      particle.currentSize = THREE.MathUtils.lerp(
        particle.currentSize || targetSize,
        targetSize,
        1 - Math.exp(-Math.max(0.001, dt) * 10.0),
      );

      const colorBaseHue = randomizeColors ? (hue + layer * 260 + time * 92) : hue;
      const localBaseColor = hueColor(colorBaseHue, 82, 58);
      const localAccentColor = hueColor(colorBaseHue + 12, 100, 76);
      const localCoreColor = hueColor(colorBaseHue - 4, 100, 86);
      const particleColor = localBaseColor.clone().lerp(localAccentColor, layer * 0.72 + pulse * 0.18);
      const shellColor = localAccentColor.clone().lerp(localCoreColor, 0.45 + localReact * 0.2);
      const innerColor = localCoreColor.clone().lerp(localAccentColor, localReact * 0.12);

      const rotation = new THREE.Euler(
        angle * 0.44 + particle.drift * 0.22,
        angle * 0.62 + particle.phase * 0.3,
        angle * 0.38 + particle.drift * 0.16,
      );

      this.setInstance(this.shellMesh, index, particle.current, particle.currentSize * 1.12, rotation, shellColor);
      this.setInstance(this.outerMesh, index, particle.current, particle.currentSize, rotation, particleColor);
      this.setInstance(this.coreMesh, index, particle.current, particle.currentSize * 0.58, rotation, innerColor, particle.currentSize * 0.48, particle.currentSize * 0.76, particle.currentSize * 0.48);

      for (let segment = 0; segment < trailSegments; segment += 1) {
        const trailIndex = index * trailSegments + segment;
        const fade = 1 - (segment + 1) / (trailSegments + 1);
        const trailPoint = particle.history[segment + 1] ?? particle.history[segment];
        const trailScale = Math.max(0.02, particle.currentSize * (0.72 - segment * 0.1));
        const trailShellColor = shellColor.clone().multiplyScalar(0.42 + fade * 0.34);
        const trailParticleColor = particleColor.clone().multiplyScalar(0.36 + fade * 0.32);
        const trailCoreColor = innerColor.clone().multiplyScalar(0.3 + fade * 0.26);
        const trailRotation = new THREE.Euler(
          rotation.x * (1 - segment * 0.08),
          rotation.y * (1 - segment * 0.08),
          rotation.z * (1 - segment * 0.08),
        );

        this.setInstance(this.trailShellMesh, trailIndex, trailPoint, trailScale * 1.08, trailRotation, trailShellColor);
        this.setInstance(this.trailOuterMesh, trailIndex, trailPoint, trailScale, trailRotation, trailParticleColor);
        this.setInstance(this.trailCoreMesh, trailIndex, trailPoint, trailScale * 0.54, trailRotation, trailCoreColor, trailScale * 0.44, trailScale * 0.7, trailScale * 0.44);
      }
    }

    this.meshes.forEach((mesh) => {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
      }
    });
  }
}
