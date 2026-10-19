import { AudioAnalysisInput } from "../audio/AudioAnalysisInput.js";
import { MaterialLibrary } from "../materials/MaterialLibrary.js";
import { SceneRig } from "../scene/SceneRig.js";
import { GlassBarsMode } from "../modes/GlassBarsMode.js";
import { GlassWavelengthMode } from "../modes/GlassWavelengthMode.js";
import { SonicRunwayMode } from "../modes/SonicRunwayMode.js";
import { ControlValueAdapter } from "../ui/ControlValueAdapter.js";
import { RendererCore } from "./RendererCore.js";

function modeIdFromName(name) {
  const normalized = (name ?? "").toLowerCase();
  if (normalized.includes("wavelength") || normalized.includes("wave")) {
    return "glassWavelength";
  }
  if (normalized.includes("runway")) {
    return "sonicRunway";
  }
  return "glassBars";
}

function fallbackControls() {
  return {
    modeName: "Bars",
    mode: {},
    effects: { main: true },
    effectValues: {},
    global: {
      brightness: 70,
      fov: 60,
      bloom: 90,
      sensitivity: 70,
      smoothing: 70,
      glow: 65,
      contrast: 50,
      beatResponse: 80,
      saturation: 50,
      vibrance: 50,
      depth: 60,
      cameraMove: 50,
      exposure: 55,
      sharpness: 45,
      motionBlur: 30,
      trails: 40,
      hueShift: 0,
    },
    background: {
      hue: 220,
      black: false,
      white: false,
    },
  };
}

export class VisualEngine {
  constructor({ container, root, getAnalyser, getAudioElement }) {
    this.container = container;
    this.root = root;
    this.materialLibrary = new MaterialLibrary();
    this.sceneRig = new SceneRig(this.materialLibrary);
    this.rendererCore = new RendererCore(container, this.sceneRig.scene, this.sceneRig.camera);
    this.audioInput = new AudioAnalysisInput({ getAnalyser, getAudioElement });
    this.controlInput = new ControlValueAdapter(root);
    this.modes = {
      glassBars: new GlassBarsMode(this.sceneRig, this.materialLibrary),
      glassWavelength: new GlassWavelengthMode(this.sceneRig, this.materialLibrary),
      sonicRunway: new SonicRunwayMode(this.sceneRig, this.materialLibrary),
    };
    this.activeMode = this.modes.glassBars;
    this.lastTime = performance.now();
    this.frameCount = 0;

    this.resizeObserver = new ResizeObserver(() => this.rendererCore.resize());
    this.resizeObserver.observe(container);
    this.frameHandle = requestAnimationFrame((timestamp) => this.tick(timestamp));
  }

  safeStep(key, fn) {
    try {
      return fn();
    } catch (error) {
      window.__visualizerStepErrors ??= {};
      window.__visualizerStepErrors[key] = error?.message ?? String(error);
      return null;
    }
  }

  tick(timestamp) {
    const now = timestamp || performance.now();
    const dt = Math.min(0.05, Math.max(0.001, (now - this.lastTime) / 1000));
    this.lastTime = now;
    const time = now * 0.001;

    const controls = this.safeStep("controls", () => this.controlInput.readValues()) ?? fallbackControls();
    this.activeMode = this.modes[modeIdFromName(controls.modeName)] ?? this.modes.glassBars;
    this.safeStep("modeVisibility", () => {
      Object.values(this.modes).forEach((mode) => {
        if (mode.group) {
          mode.group.visible = mode === this.activeMode;
        }
        if (mode.reflectionGroup) {
          mode.reflectionGroup.visible = mode === this.activeMode;
        }
      });
    });
    const audioFrame = this.safeStep("audio", () => this.audioInput.sample({
      bandCount: this.activeMode.barCount,
      sensitivity: 0.7 + ((controls.global?.sensitivity ?? 70) / 100) * 1.5,
      smoothing: 0.58 + ((controls.global?.smoothing ?? 70) / 100) * 0.36,
    })) ?? {
      active: false,
      overall: 0,
      bass: 0,
      mid: 0,
      high: 0,
      beat: 0,
      bands: new Array(this.activeMode.barCount).fill(0),
    };

    this.safeStep("scene", () => this.sceneRig.updateShared(audioFrame, controls, time));
    this.safeStep("mode", () => this.activeMode.update(audioFrame, controls, time, dt));
    this.safeStep("post", () => this.rendererCore.applyControls(controls, audioFrame, time));
    this.safeStep("render", () => this.rendererCore.render(dt));

    this.frameCount += 1;
    document.documentElement.dataset.visualEngineFrames = String(this.frameCount);
    this.frameHandle = requestAnimationFrame((nextTimestamp) => this.tick(nextTimestamp));
  }

  dispose() {
    if (this.frameHandle) {
      cancelAnimationFrame(this.frameHandle);
    }
    this.resizeObserver?.disconnect();
    this.rendererCore?.dispose();
  }
}
