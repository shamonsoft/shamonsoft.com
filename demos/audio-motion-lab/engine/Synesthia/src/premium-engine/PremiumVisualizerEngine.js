import { MusicAnalysisBus } from "./audio/MusicAnalysisBus.js";
import { PremiumRenderer } from "./core/PremiumRenderer.js";
import { PremiumMaterialSystem } from "./materials/PremiumMaterialSystem.js";
import { BarsProofMode } from "./modes/BarsProofMode.js";
import { OrbitBloomMode } from "./modes/OrbitBloomMode.js";
import { RadialPulseMode } from "./modes/RadialPulseMode.js";
import { TunnelRunMode } from "./modes/TunnelRunMode.js";
import { WavelengthProofMode } from "./modes/WavelengthProofMode.js";
import { LatticeFieldMode } from "./modes/LatticeFieldMode.js";
import { PremiumStage } from "./scene/PremiumStage.js";
import { UiParameterMapper } from "./ui/UiParameterMapper.js";

const EFFECT_MODE_MAP = {
  bars: "bars",
  "equalizer wall": "bars",
  "grid wave": "bars",
  wavelength: "wavelength",
  waveform: "wavelength",
  ribbons: "wavelength",
  "liquid pulse": "wavelength",
  nebula: "wavelength",
  tunnel: "tunnelRun",
  spiral: "tunnelRun",
  "sonic runway": "tunnelRun",
  rings: "radialPulse",
  "spectrum ring": "radialPulse",
  kaleidoscope: "radialPulse",
  mandala: "radialPulse",
  vortex: "radialPulse",
  "radar sweep": "radialPulse",
  orbit: "orbitBloom",
  petals: "orbitBloom",
  starburst: "orbitBloom",
  constellation: "orbitBloom",
  lattice: "latticeField",
};

function resolveModeId(modeName) {
  const normalized = (modeName ?? "").trim().toLowerCase();
  return EFFECT_MODE_MAP[normalized] ?? "bars";
}

function makeFallbackControls() {
  return {
    modeId: "bars",
    global: {
      brightness: 70,
      bloom: 90,
      glow: 65,
      contrast: 50,
      depth: 60,
      cameraMove: 50,
      smoothing: 70,
      sensitivity: 70,
      saturation: 50,
      vibrance: 50,
      hueShift: 0,
      exposure: 55,
      sharpness: 45,
      beatResponse: 80,
    },
    background: {
      hue: 220,
      black: false,
      white: false,
    },
    materialName: "Glass Bubble",
    mode: {},
    randomize: {
      main: false,
    },
  };
}

export class PremiumVisualizerEngine {
  constructor({ container, root, getAnalyser, getAudioElement }) {
    this.container = container;
    this.root = root;

    this.controlMapper = new UiParameterMapper(root);
    this.audioBus = new MusicAnalysisBus({ getAnalyser, getAudioElement });
    this.materialSystem = new PremiumMaterialSystem();
    this.stage = new PremiumStage(this.materialSystem);
    this.renderer = new PremiumRenderer(container, this.stage.scene, this.stage.camera);
    this.debugBadge = this.createDebugBadge();

    this.modeFactories = {
      bars: () => new BarsProofMode(this.stage, this.materialSystem),
      wavelength: () => new WavelengthProofMode(this.stage, this.materialSystem),
      tunnelRun: () => new TunnelRunMode(this.stage, this.materialSystem),
      radialPulse: () => new RadialPulseMode(this.stage, this.materialSystem),
      orbitBloom: () => new OrbitBloomMode(this.stage, this.materialSystem),
      latticeField: () => new LatticeFieldMode(this.stage, this.materialSystem),
    };
    this.modes = {};
    this.activeMode = this.getOrCreateMode("bars");

    this.lastTime = performance.now();
    this.frameCount = 0;
    this.activeModeKey = "bars";

    this.resizeObserver = new ResizeObserver(() => this.renderer.resize());
    this.resizeObserver.observe(container);
    this.frameHandle = requestAnimationFrame((timestamp) => this.tick(timestamp));
  }

  createDebugBadge() {
    const badge = document.createElement("div");
    badge.style.position = "absolute";
    badge.style.left = "10px";
    badge.style.bottom = "10px";
    badge.style.zIndex = "20";
    badge.style.padding = "6px 8px";
    badge.style.borderRadius = "6px";
    badge.style.background = "rgba(3, 8, 18, 0.82)";
    badge.style.border = "1px solid rgba(88, 182, 255, 0.32)";
    badge.style.color = "#d8efff";
    badge.style.font = "600 11px 'Segoe UI', sans-serif";
    badge.style.letterSpacing = "0.03em";
    badge.style.pointerEvents = "none";
    badge.style.whiteSpace = "pre-line";
    this.container.appendChild(badge);
    return badge;
  }

  getOrCreateMode(modeKey) {
    if (!this.modes[modeKey]) {
      const factory = this.modeFactories[modeKey] ?? this.modeFactories.bars;
      this.modes[modeKey] = factory();
    }
    return this.modes[modeKey];
  }

  updateDebugBadge(selectedModeName, resolvedModeKey) {
    const stepErrors = window.__visualizerStepErrors ?? {};
    const stepErrorKeys = Object.keys(stepErrors);
    const errorLine = stepErrorKeys.length
      ? `ERR ${stepErrorKeys[stepErrorKeys.length - 1]}: ${String(stepErrors[stepErrorKeys[stepErrorKeys.length - 1]]).slice(0, 80)}`
      : "ERR none";
    this.debugBadge.textContent =
      `FX ${selectedModeName}\n` +
      `MAP ${resolvedModeKey}\n` +
      `RUN ${this.activeModeKey}\n` +
      `${errorLine}`;
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
    const deltaTime = Math.min(0.05, Math.max(0.001, (now - this.lastTime) / 1000));
    const time = now * 0.001;
    this.lastTime = now;

    const controls = this.safeStep("controls", () => this.controlMapper.readValues()) ?? makeFallbackControls();
    const resolvedModeKey = resolveModeId(controls.modeName);
    const requestedMode = this.safeStep("modeFactory", () => this.getOrCreateMode(resolvedModeKey)) ?? this.getOrCreateMode("bars");
    this.activeMode = requestedMode;
    this.activeModeKey = Object.entries(this.modes).find(([, mode]) => mode === this.activeMode)?.[0] ?? "bars";

    Object.values(this.modes).forEach((mode) => {
      mode.setActive(mode === this.activeMode);
    });

    const audioFrame = this.safeStep("audio", () => this.audioBus.sample({
      bandCount: this.activeMode.bandCount,
      sensitivity: controls.global.sensitivity,
      smoothing: controls.global.smoothing,
    })) ?? this.audioBus.makeIdleFrame(this.activeMode.bandCount);

    this.safeStep("stage", () => this.stage.update(time, audioFrame, controls));
    this.safeStep("mode", () => this.activeMode.update(time, deltaTime, audioFrame, controls));
    this.safeStep("renderer", () => this.renderer.renderFrame(time, deltaTime, audioFrame, controls));
    this.safeStep("debug", () => this.updateDebugBadge(controls.modeName, resolvedModeKey));

    this.frameCount += 1;
    document.documentElement.dataset.visualEngineFrames = String(this.frameCount);
    this.frameHandle = requestAnimationFrame((nextTimestamp) => this.tick(nextTimestamp));
  }

  dispose() {
    if (this.frameHandle) {
      cancelAnimationFrame(this.frameHandle);
    }
    this.resizeObserver?.disconnect();
    this.renderer?.dispose();
  }
}
