import * as THREE from "../../vendor/three/three.module.js";
import { PostPipeline } from "./PostPipeline.js";
import { ReflectionEnvironment } from "./ReflectionEnvironment.js";

function clamp01(value, fallback = 0.5) {
  const numeric = Number.isFinite(value) ? value : fallback * 100;
  return Math.max(0, Math.min(1, numeric / 100));
}

export class PremiumRenderer {
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
      powerPreference: "high-performance",
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x02040a, 1);

    this.environment = new ReflectionEnvironment(this.renderer);
    this.scene.environment = this.environment.create();

    this.postPipeline = new PostPipeline(this.renderer, scene, camera);
    this.resize();
  }

  resize() {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.postPipeline.setSize(width, height);
  }

  renderFrame(time, deltaTime, audioFrame, controls) {
    const exposure = clamp01(controls.global?.exposure, 0.55);
    const contrast = clamp01(controls.global?.contrast, 0.5);
    this.renderer.toneMappingExposure = 0.92 + exposure * 0.58 + contrast * 0.08 + audioFrame.overall * 0.08 + audioFrame.beat * 0.14;
    this.postPipeline.apply(audioFrame, controls, time);
    this.postPipeline.render(deltaTime);
  }

  dispose() {
    this.postPipeline?.dispose();
    this.environment?.dispose();
    this.renderer?.dispose();
  }
}
