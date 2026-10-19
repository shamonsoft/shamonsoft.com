import { PremiumVisualizerEngine } from "./premium-engine/PremiumVisualizerEngine.js";

export function initializeVisualizerEngine(options) {
  try {
    const engine = new PremiumVisualizerEngine(options);
    document.documentElement.dataset.visualEngine = "ready";
    window.__visualEngine = engine;
    return engine;
  } catch (error) {
    document.documentElement.dataset.visualEngine = "error";
    window.__visualEngineError = error?.message ?? String(error);
    const marker = document.createElement("div");
    marker.textContent = "Renderer failed to start";
    marker.style.position = "absolute";
    marker.style.left = "50%";
    marker.style.top = "50%";
    marker.style.transform = "translate(-50%, -50%)";
    marker.style.padding = "10px 14px";
    marker.style.border = "1px solid rgba(112, 180, 255, 0.42)";
    marker.style.background = "rgba(4, 10, 20, 0.88)";
    marker.style.color = "#d7eeff";
    marker.style.font = "600 13px 'Segoe UI', sans-serif";
    marker.style.letterSpacing = "0.06em";
    marker.style.textTransform = "uppercase";
    options.container.appendChild(marker);
    throw error;
  }
}
