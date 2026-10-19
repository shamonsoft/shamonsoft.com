(() => {
  const defaults = {
    "Saturation": 0.60, "Contrast": 0.84, "Symmetry": 5, "Speed": 0.20,
    "Turbulence": 0.14, "Drift": 0.10, "Pulse": 0.12, "Zoom": 0.03,
    "ScreenFill": 1.02, "Trail": 0.12, "Bloom": 0.44, "Glow": 0.62,
    "Grain": 0.008, "Vignette": 0.25, "ParticleCount": 24, "ParticleSize": 0.68,
    "RibbonWidth": 0.68, "WaveDensity": 0.86, "BackgroundLift": 0.08,
    "ReactiveBoost": 0.78, "OrbCount": 6, "LayerComplexity": 0.88, "Seed": 100
  };

  const scenes = [
    { "Name": "Aurora Silk", "GeometryStyle": "Aurora Silk", "BaseHue": 164, "HueSpread": 68, "Saturation": 0.56, "Contrast": 0.74, "Speed": 0.17, "Turbulence": 0.18, "Drift": 0.16, "Pulse": 0.06, "ScreenFill": 1.16, "Trail": 0.24, "Bloom": 0.52, "Glow": 0.68, "RibbonWidth": 0.86, "BackgroundLift": 0.09, "Seed": 211 },
    { "Name": "Nebula Bloom", "GeometryStyle": "Nebula Bloom", "BaseHue": 248, "HueSpread": 52, "Saturation": 0.52, "Contrast": 0.72, "Speed": 0.14, "Turbulence": 0.30, "Drift": 0.18, "Pulse": 0.08, "ScreenFill": 1.22, "Trail": 0.20, "Bloom": 0.56, "Glow": 0.58, "Grain": 0.014, "BackgroundLift": 0.11, "LayerComplexity": 1.14, "Seed": 409 },
    { "Name": "Crystal Lattice", "GeometryStyle": "Crystal Lattice", "BaseHue": 198, "HueSpread": 30, "Saturation": 0.46, "Contrast": 1.00, "Symmetry": 8, "Speed": 0.12, "Turbulence": 0.04, "Drift": 0.04, "Pulse": 0.14, "ScreenFill": 1.06, "Trail": 0.06, "Bloom": 0.36, "Glow": 0.76, "RibbonWidth": 0.54, "WaveDensity": 1.14, "Seed": 607 },
    { "Name": "Liquid Chrome", "GeometryStyle": "Liquid Chrome", "BaseHue": 210, "HueSpread": 18, "Saturation": 0.20, "Contrast": 1.08, "Speed": 0.17, "Turbulence": 0.25, "Drift": 0.16, "Pulse": 0.08, "ScreenFill": 1.18, "Trail": 0.18, "Bloom": 0.38, "Glow": 0.82, "Grain": 0.004, "BackgroundLift": 0.05, "LayerComplexity": 1.10, "Seed": 805 },
    { "Name": "Velvet Smoke", "GeometryStyle": "Velvet Smoke", "BaseHue": 302, "HueSpread": 40, "Saturation": 0.44, "Contrast": 0.68, "Speed": 0.13, "Turbulence": 0.34, "Drift": 0.22, "Pulse": 0.05, "ScreenFill": 1.26, "Trail": 0.28, "Bloom": 0.42, "Glow": 0.48, "Grain": 0.018, "Vignette": 0.31, "BackgroundLift": 0.12, "LayerComplexity": 1.18, "Seed": 1003 },
    { "Name": "Starlight Cathedral", "GeometryStyle": "Starlight Cathedral", "BaseHue": 226, "HueSpread": 28, "Saturation": 0.38, "Contrast": 0.96, "Symmetry": 7, "Speed": 0.10, "Turbulence": 0.03, "Drift": 0.04, "Pulse": 0.12, "ScreenFill": 1.02, "Trail": 0.08, "Bloom": 0.42, "Glow": 0.76, "ParticleCount": 36, "ParticleSize": 0.56, "BackgroundLift": 0.055, "Seed": 1201 },
    { "Name": "Ocean Caustics", "GeometryStyle": "Ocean Caustics", "BaseHue": 187, "HueSpread": 32, "Saturation": 0.56, "Contrast": 0.78, "Speed": 0.20, "Turbulence": 0.18, "Drift": 0.12, "Pulse": 0.07, "ScreenFill": 1.24, "Trail": 0.20, "Bloom": 0.48, "Glow": 0.66, "WaveDensity": 1.18, "BackgroundLift": 0.13, "Seed": 1399 },
    { "Name": "Roseglass Tunnel", "GeometryStyle": "Roseglass Tunnel", "BaseHue": 334, "HueSpread": 30, "Saturation": 0.48, "Contrast": 0.92, "Symmetry": 10, "Speed": 0.17, "Turbulence": 0.04, "Drift": 0.08, "Pulse": 0.18, "Zoom": 0.08, "ScreenFill": 1.00, "Trail": 0.20, "Bloom": 0.44, "Glow": 0.72, "Vignette": 0.34, "Seed": 1597 },
    { "Name": "Magnetic Ribbons", "GeometryStyle": "Magnetic Ribbons", "BaseHue": 278, "HueSpread": 48, "Saturation": 0.58, "Contrast": 0.82, "Speed": 0.18, "Turbulence": 0.12, "Drift": 0.14, "Pulse": 0.10, "ScreenFill": 1.18, "Trail": 0.30, "Bloom": 0.48, "Glow": 0.70, "RibbonWidth": 0.92, "BackgroundLift": 0.07, "Seed": 1795 },
    { "Name": "Celestial Orrery", "GeometryStyle": "Celestial Orrery", "BaseHue": 42, "HueSpread": 30, "Saturation": 0.52, "Contrast": 0.94, "Symmetry": 6, "Speed": 0.13, "Turbulence": 0.03, "Drift": 0.05, "Pulse": 0.16, "ScreenFill": 0.96, "Trail": 0.14, "Bloom": 0.44, "Glow": 0.74, "ParticleCount": 30, "OrbCount": 10, "BackgroundLift": 0.045, "Seed": 1993 },
    { "Name": "Biolume Forest", "GeometryStyle": "Biolume Forest", "BaseHue": 148, "HueSpread": 50, "Saturation": 0.60, "Contrast": 0.78, "Speed": 0.15, "Turbulence": 0.16, "Drift": 0.16, "Pulse": 0.13, "ScreenFill": 1.18, "Trail": 0.22, "Bloom": 0.58, "Glow": 0.70, "ParticleCount": 46, "ParticleSize": 0.58, "BackgroundLift": 0.08, "Seed": 2191 },
    { "Name": "Prism Rain", "GeometryStyle": "Prism Rain", "BaseHue": 208, "HueSpread": 48, "Saturation": 0.60, "Contrast": 0.86, "Speed": 0.24, "Turbulence": 0.08, "Drift": 0.12, "Pulse": 0.03, "ScreenFill": 1.28, "Trail": 0.38, "Bloom": 0.46, "Glow": 0.68, "ParticleCount": 64, "ParticleSize": 0.62, "BackgroundLift": 0.08, "Seed": 2389 },
    { "Name": "Topographic Tide", "GeometryStyle": "Topographic Tide", "BaseHue": 198, "HueSpread": 36, "Saturation": 0.46, "Contrast": 0.98, "Speed": 0.12, "Turbulence": 0.14, "Drift": 0.08, "Pulse": 0.04, "ScreenFill": 1.20, "Trail": 0.08, "Bloom": 0.28, "Glow": 0.66, "RibbonWidth": 0.46, "WaveDensity": 1.42, "BackgroundLift": 0.05, "Seed": 2587 },
    { "Name": "Solar Filaments", "GeometryStyle": "Solar Filaments", "BaseHue": 22, "HueSpread": 38, "Saturation": 0.66, "Contrast": 0.88, "Speed": 0.22, "Turbulence": 0.16, "Drift": 0.12, "Pulse": 0.18, "ScreenFill": 1.14, "Trail": 0.32, "Bloom": 0.58, "Glow": 0.78, "RibbonWidth": 0.74, "BackgroundLift": 0.075, "Seed": 2785 },
    { "Name": "Moonlit Dunes", "GeometryStyle": "Moonlit Dunes", "BaseHue": 218, "HueSpread": 22, "Saturation": 0.38, "Contrast": 0.82, "Speed": 0.10, "Turbulence": 0.06, "Drift": 0.05, "Pulse": 0.04, "ScreenFill": 1.20, "Trail": 0.10, "Bloom": 0.32, "Glow": 0.52, "Grain": 0.016, "Vignette": 0.34, "BackgroundLift": 0.10, "Seed": 2983 },
    { "Name": "Cloud Chamber", "GeometryStyle": "Cloud Chamber", "BaseHue": 210, "HueSpread": 28, "Saturation": 0.34, "Contrast": 0.92, "Speed": 0.12, "Turbulence": 0.05, "Drift": 0.10, "Pulse": 0.12, "ScreenFill": 1.08, "Trail": 0.34, "Bloom": 0.44, "Glow": 0.76, "ParticleCount": 34, "BackgroundLift": 0.04, "Seed": 3181 },
    { "Name": "Ink in Water", "GeometryStyle": "Ink in Water", "BaseHue": 264, "HueSpread": 36, "Saturation": 0.44, "Contrast": 0.70, "Speed": 0.13, "Turbulence": 0.28, "Drift": 0.20, "Pulse": 0.04, "ScreenFill": 1.26, "Trail": 0.30, "Bloom": 0.40, "Glow": 0.48, "Grain": 0.014, "BackgroundLift": 0.10, "LayerComplexity": 1.15, "Seed": 3379 },
    { "Name": "Sacred Geometry", "GeometryStyle": "Sacred Geometry", "BaseHue": 286, "HueSpread": 42, "Saturation": 0.54, "Contrast": 0.98, "Symmetry": 12, "Speed": 0.11, "Turbulence": 0.03, "Drift": 0.03, "Pulse": 0.17, "ScreenFill": 0.98, "Trail": 0.12, "Bloom": 0.42, "Glow": 0.76, "RibbonWidth": 0.50, "WaveDensity": 1.08, "Seed": 3577 },
    { "Name": "Electric Garden", "GeometryStyle": "Electric Garden", "BaseHue": 128, "HueSpread": 62, "Saturation": 0.64, "Contrast": 0.90, "Speed": 0.18, "Turbulence": 0.14, "Drift": 0.12, "Pulse": 0.18, "ScreenFill": 1.16, "Trail": 0.24, "Bloom": 0.56, "Glow": 0.78, "ParticleCount": 32, "BackgroundLift": 0.07, "Seed": 3775 },
    { "Name": "Frosted Glass", "GeometryStyle": "Frosted Glass", "BaseHue": 196, "HueSpread": 22, "Saturation": 0.28, "Contrast": 0.94, "Speed": 0.14, "Turbulence": 0.12, "Drift": 0.12, "Pulse": 0.06, "ScreenFill": 1.24, "Trail": 0.14, "Bloom": 0.40, "Glow": 0.72, "Grain": 0.012, "BackgroundLift": 0.09, "LayerComplexity": 1.04, "Seed": 3973 },
    { "Name": "Ember Veil", "GeometryStyle": "Ember Veil", "BaseHue": 18, "HueSpread": 44, "Saturation": 0.68, "Contrast": 0.80, "Speed": 0.20, "Turbulence": 0.18, "Drift": 0.16, "Pulse": 0.10, "ScreenFill": 1.22, "Trail": 0.28, "Bloom": 0.54, "Glow": 0.68, "ParticleCount": 62, "ParticleSize": 0.72, "BackgroundLift": 0.09, "Seed": 4171 },
    { "Name": "Quantum Lace", "GeometryStyle": "Quantum Lace", "BaseHue": 274, "HueSpread": 54, "Saturation": 0.56, "Contrast": 0.96, "Speed": 0.17, "Turbulence": 0.08, "Drift": 0.08, "Pulse": 0.10, "ScreenFill": 1.24, "Trail": 0.16, "Bloom": 0.42, "Glow": 0.74, "RibbonWidth": 0.48, "WaveDensity": 1.34, "BackgroundLift": 0.055, "Seed": 4369 },
    { "Name": "Cosmic Koi", "GeometryStyle": "Cosmic Koi", "BaseHue": 176, "HueSpread": 48, "Saturation": 0.58, "Contrast": 0.80, "Speed": 0.15, "Turbulence": 0.12, "Drift": 0.18, "Pulse": 0.08, "ScreenFill": 1.10, "Trail": 0.30, "Bloom": 0.48, "Glow": 0.66, "ParticleCount": 30, "OrbCount": 7, "BackgroundLift": 0.09, "Seed": 4567 },
    { "Name": "Infinite Windows", "GeometryStyle": "Infinite Windows", "BaseHue": 232, "HueSpread": 32, "Saturation": 0.46, "Contrast": 0.98, "Symmetry": 4, "Speed": 0.30, "Turbulence": 0.03, "Drift": 0.08, "Pulse": 0.16, "Zoom": 0.06, "ScreenFill": 0.98, "Trail": 0.20, "Bloom": 0.40, "Glow": 0.74, "Vignette": 0.34, "BackgroundLift": 0.04, "Seed": 4765 },
    { "Name": "Quiet Constellations", "GeometryStyle": "Quiet Constellations", "BaseHue": 224, "HueSpread": 28, "Saturation": 0.36, "Contrast": 0.92, "Speed": 0.09, "Turbulence": 0.03, "Drift": 0.08, "Pulse": 0.06, "ScreenFill": 1.18, "Trail": 0.12, "Bloom": 0.36, "Glow": 0.68, "ParticleCount": 44, "ParticleSize": 0.62, "OrbCount": 8, "BackgroundLift": 0.035, "ReactiveBoost": 0.66, "Seed": 4963 }
  ];

  // Architectural and fine-line presets start clean: their former spatial echo
  // softened edges and rendered a second full scene. Trails remain user-adjustable.
  const crispStyles = new Set([
    "Crystal Lattice", "Starlight Cathedral", "Roseglass Tunnel", "Celestial Orrery",
    "Topographic Tide", "Sacred Geometry", "Quantum Lace", "Infinite Windows",
    "Quiet Constellations"
  ]);

  window.SHAMONSOFT_VIDEO_LAB_PRESETS = scenes.map(scene => ({
    ...defaults, ...scene,
    Trail: crispStyles.has(scene.GeometryStyle) ? 0 : (scene.Trail ?? defaults.Trail)
  }));
})();
