import { initializeVisualizerEngine } from "./app.js";

const bootstrap = window.__visualizerBootstrap;

if (!bootstrap) {
  throw new Error("Visualizer bootstrap context was not found.");
}

initializeVisualizerEngine(bootstrap);
