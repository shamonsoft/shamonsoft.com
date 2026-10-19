import * as THREE from "../../vendor/three/three.module.js";
import { EnvironmentMapFactory } from "./EnvironmentMapFactory.js";
import { PostProcessingStack } from "./PostProcessingStack.js";

function clamp01(value, fallback = 0.5) {
  const numeric = Number.isFinite(value) ? value : fallback * 100;
  return Math.max(0, Math.min(1, numeric / 100));
}

export class RendererCore {
  constructor(container, scene, camera) {
    this.container = container;
    this.scene = scene;
    this.camera = camera;

    this.canvas = document.createElement("canvas");
    this.canvas.setAttribute("aria-hidden", "true");
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.display = "block";
    this.container.replaceChildren(this.canvas);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      depth: true,
      stencil: false,
      powerPreference: "high-performance",
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = false;
    this.renderer.setClearColor(0x03050a, 1);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    this.environmentFactory = new EnvironmentMapFactory(this.renderer);
    this.scene.environment = this.environmentFactory.create();

    this.postProcessing = new PostProcessingStack(this.renderer, this.scene, this.camera);
    this.resize();
  }

  resize() {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.postProcessing.setSize(width, height);
  }

  applyControls(controls, audioFrame, time) {
    const exposure = clamp01(controls.global?.exposure, 0.58);
    const bloom = clamp01(controls.global?.bloom, 0.78);
    const glow = clamp01(controls.global?.glow, 0.66);
    const contrast = clamp01(controls.global?.contrast, 0.5);
    const sharpness = clamp01(controls.global?.sharpness, 0.45);
    const saturation = clamp01(controls.global?.saturation, 0.5);
    const vibrance = clamp01(controls.global?.vibrance, 0.5);
    const motionBlur = clamp01(controls.global?.motionBlur, 0.3);
    const trails = clamp01(controls.global?.trails, 0.4);

    this.renderer.toneMappingExposure =
      0.88
      + exposure * 0.62
      + contrast * 0.08
      + audioFrame.overall * 0.08
      + audioFrame.beat * 0.12;

    this.postProcessing.apply({
      bloom,
      glow,
      contrast,
      sharpness,
      saturation,
      vibrance,
      motionBlur,
      trails,
      audioFrame,
      time,
    });
  }

  render(deltaTime) {
    this.postProcessing.render(deltaTime);
  }

  dispose() {
    this.postProcessing?.dispose();
    this.environmentFactory?.dispose();
    this.renderer?.dispose();
  }
}
