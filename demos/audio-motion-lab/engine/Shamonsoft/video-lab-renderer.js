(function () {
  const canvas = document.getElementById("glcanvas");
  if (!canvas) return;

  const gl = canvas.getContext("webgl", {
    antialias: false,
    alpha: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: true,
    powerPreference: "high-performance"
  });

  if (!gl) {
    document.body.innerHTML = "<div style='color:white;padding:20px;font-family:Segoe UI;background:#02040a'>WebGL is not available.</div>";
    return;
  }

  const sceneNames = [
    "Aurora Silk", "Nebula Bloom", "Crystal Lattice", "Liquid Chrome", "Velvet Smoke",
    "Starlight Cathedral", "Ocean Caustics", "Roseglass Tunnel", "Magnetic Ribbons", "Celestial Orrery",
    "Biolume Forest", "Prism Rain", "Topographic Tide", "Solar Filaments", "Moonlit Dunes",
    "Cloud Chamber", "Ink in Water", "Sacred Geometry", "Electric Garden", "Frosted Glass",
    "Ember Veil", "Quantum Lace", "Cosmic Koi", "Infinite Windows", "Quiet Constellations"
  ];

  const hasDerivatives = Boolean(gl.getExtension("OES_standard_derivatives"));

  const vertexSource = `
    attribute vec2 a_position;
    varying vec2 v_uv;
    void main() {
      v_uv = a_position * 0.5 + 0.5;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  const shaderPrelude = (hasDerivatives ? "#extension GL_OES_standard_derivatives : enable\n#define PIXEL_DERIVATIVES\n" : "") + `
    precision highp float;
    varying vec2 v_uv;

    uniform vec2 u_resolution;
    uniform float u_time;
    uniform float u_travelTime;
    uniform float u_energy;
    uniform float u_bass;
    uniform float u_mid;
    uniform float u_treble;
    uniform float u_baseHue;
    uniform float u_hueSpread;
    uniform float u_saturation;
    uniform float u_contrast;
    uniform float u_speed;
    uniform float u_turbulence;
    uniform float u_drift;
    uniform float u_pulse;
    uniform float u_zoom;
    uniform float u_screenFill;
    uniform float u_trail;
    uniform float u_bloom;
    uniform float u_glow;
    uniform float u_grain;
    uniform float u_vignette;
    uniform float u_particleCount;
    uniform float u_particleSize;
    uniform float u_ribbonWidth;
    uniform float u_waveDensity;
    uniform float u_backgroundLift;
    uniform float u_reactiveBoost;
    uniform float u_orbCount;
    uniform float u_layerComplexity;
    uniform float u_symmetry;
    uniform float u_seed;

    const float PI = 3.14159265359;
    const float TAU = 6.28318530718;

    mat2 rot(float a) {
      float s = sin(a); float c = cos(a);
      return mat2(c, -s, s, c);
    }

    float hash1(float n) {
      return fract(sin(n) * 43758.5453123);
    }

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    vec2 hash2(vec2 p) {
      return vec2(hash(p + vec2(17.3, 3.1)), hash(p + vec2(11.7, 29.3)));
    }

    float noise(vec2 p) {
      vec2 i = floor(p); vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                 mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0)), u.x), u.y);
    }

    float fbm(vec2 p) {
      float value = 0.0; float amplitude = 0.52;
      for (int i = 0; i < 5; i++) {
        value += noise(p) * amplitude;
        p = rot(0.37) * p * 2.03;
        amplitude *= 0.50;
      }
      return value;
    }

    float ridged(vec2 p) {
      float value = 0.0; float amplitude = 0.52;
      for (int i = 0; i < 4; i++) {
        float n = 1.0 - abs(noise(p) * 2.0 - 1.0);
        value += n * n * amplitude;
        p = rot(-0.31) * p * 2.11;
        amplitude *= 0.52;
      }
      return value;
    }

    float voronoi(vec2 x) {
      vec2 n = floor(x); vec2 f = fract(x); float distanceValue = 8.0;
      for (int j = -1; j <= 1; j++) {
        for (int i = -1; i <= 1; i++) {
          vec2 g = vec2(float(i), float(j));
          vec2 point = g + hash2(n + g) - f;
          distanceValue = min(distanceValue, dot(point, point));
        }
      }
      return sqrt(distanceValue);
    }

    float sdSegment(vec2 p, vec2 a, vec2 b) {
      vec2 pa = p - a; vec2 ba = b - a;
      float h = clamp(dot(pa, ba) / max(0.0001, dot(ba, ba)), 0.0, 1.0);
      return length(pa - ba * h);
    }

    float softLine(float distanceValue, float widthValue) {
      return exp(-distanceValue * max(2.0, widthValue));
    }

    // Preserve fine lines as they move between pixels, including reduced previews.
    float filament(float distanceValue, float sharpness) {
      float footprint = 1.25 / max(1.0, u_resolution.y);
      #ifdef PIXEL_DERIVATIVES
        footprint = max(footprint, fwidth(distanceValue));
      #endif
      return exp(-abs(distanceValue) * min(sharpness, 1.0 / max(footprint, 0.00001)));
    }

    float bassDrive() { return clamp(u_bass * u_reactiveBoost, 0.0, 1.25); }
    float midDrive() { return clamp(u_mid * u_reactiveBoost, 0.0, 1.25); }
    float highDrive() { return clamp(u_treble * u_reactiveBoost, 0.0, 1.25); }

    vec3 hsl2rgb(vec3 c) {
      vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
      return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
    }
  `;

  const sceneSources = new Map([
    ["Aurora Silk", `
      vec4 scene(vec2 p, float t) {
        float haze = fbm(vec2(p.x * 0.72 + t * 0.035, p.y * 0.46));
        float curtains = 0.0; float highlights = 0.0;
        for (int i = 0; i < 6; i++) {
          float fi = float(i);
          float wave = p.x + sin(p.y * (1.18 + fi * 0.09) + t * (0.19 + fi * 0.012) + fi * 1.43) * (0.20 + haze * 0.15 + midDrive() * 0.07);
          float ribbon = filament(sin(wave * (1.72 + fi * 0.16) + fi * 0.74), 6.8 + fi * 0.55);
          float verticalFade = 0.30 + 0.70 * (1.0 - smoothstep(-0.85, 1.20, p.y + fi * 0.025));
          ribbon *= 0.72 + 0.28 * sin(p.y * 7.0 + wave * 3.0 + fi + t * 0.12);
          curtains += ribbon * verticalFade * (0.24 - fi * 0.018);
          highlights += pow(ribbon, 3.0) * (0.12 + fi * 0.012);
        }
        return vec4(curtains, curtains * haze * 0.52, highlights, p.x * 0.13 + haze * 0.16);
      }
    `],
    ["Nebula Bloom", `
      vec4 scene(vec2 p, float t) {
        vec2 q = p * 0.72 + vec2(t * 0.018, -t * 0.011);
        float warpA = fbm(q * 1.22 + vec2(3.7, 8.1));
        float warpB = fbm(q * 1.38 + vec2(-6.2, 2.4));
        vec2 warped = q + vec2(warpA - 0.5, warpB - 0.5) * 0.72;
        float cloud = fbm(warped * 1.28) * 0.72 + ridged(warped * 0.74) * 0.28;
        float bloom = smoothstep(0.30, 0.82, cloud);
        float luminous = smoothstep(0.58, 0.93, cloud) + filament(cloud - 0.52, 15.0) * 0.24;
        float dust = smoothstep(0.36, 0.64, warpB) * (1.0 - smoothstep(0.42, 0.61, warpA));
        float heart = exp(-dot(p - vec2(0.22, 0.08), p - vec2(0.22, 0.08)) * 1.5);
        return vec4(bloom * (1.0 - dust * 0.48), luminous * (0.70 + heart * 0.50 + bassDrive() * 0.18), smoothstep(0.74, 0.98, cloud), cloud * 0.32 - 0.14);
      }
    `],
    ["Crystal Lattice", `
      vec4 scene(vec2 p, float t) {
        vec2 q = rot(0.19 + sin(t * 0.07) * 0.06) * p;
        vec2 a = abs(fract(q * vec2(2.15, 1.86) + 0.5) - 0.5);
        float diamond = max(a.x * 0.86 + a.y, a.x + a.y * 0.86);
        float lattice = filament(diamond - 0.34, 38.0);
        vec2 b = abs(fract(rot(PI * 0.25) * q * 1.18 + 0.5) - 0.5);
        float inner = filament(max(b.x, b.y) - 0.27, 30.0) * 0.54;
        float facets = pow(max(0.0, 1.0 - diamond * 1.52), 3.0) * 0.42;
        float sweep = pow(0.5 + 0.5 * sin(q.x * 2.4 + q.y * 1.7 - t * 0.28), 6.0);
        return vec4(lattice * 0.72 + inner + facets, facets + lattice * sweep * 0.30, lattice * (0.42 + sweep * 0.58 + highDrive() * 0.22) + inner * 0.45, q.y * 0.10 + diamond * 0.14);
      }
    `],
    ["Liquid Chrome", `
      vec4 scene(vec2 p, float t) {
        vec2 q = p * 1.08 + vec2(t * 0.021, -t * 0.014);
        float flow = fbm(q * 1.15 + fbm(q * 1.92 + 4.0) * 0.82);
        float metal = ridged(q * 1.34 + vec2(flow * 1.8, -flow * 1.3));
        float body = smoothstep(0.30, 0.80, metal);
        float chromeEdge = filament(metal - 0.58, 22.0);
        float liquidLight = smoothstep(0.68, 0.94, metal) * (0.62 + flow * 0.38);
        float reflection = pow(0.5 + 0.5 * sin(metal * 12.0 + flow * 3.0 + t * 0.08), 8.0);
        return vec4(body * (0.60 + reflection * 0.50), liquidLight + reflection * 0.32, chromeEdge * (0.60 + highDrive() * 0.18) + reflection * 0.35, metal * 0.16 - flow * 0.08);
      }
    `],
    ["Velvet Smoke", `
      vec4 scene(vec2 p, float t) {
        vec2 q = p * 0.78 + vec2(t * 0.012, t * 0.008);
        float first = fbm(q * 1.05);
        float second = fbm(q * 1.62 + vec2(first * 1.8, -first * 1.3) + 7.0);
        float smoke = fbm(q * 0.88 + vec2(second, first) * 0.82);
        float velvet = smoothstep(0.24, 0.78, smoke) * (0.72 + second * 0.28);
        float folds = filament(smoke - 0.53, 13.0) * smoothstep(0.30, 0.78, second);
        float volume = 0.54 + 0.46 * smoothstep(0.20, 0.78, first);
        return vec4(velvet * volume, folds * (0.42 + midDrive() * 0.14), smoothstep(0.66, 0.92, smoke) * 0.65, smoke * 0.22 - 0.10);
      }
    `],
    ["Starlight Cathedral", `
      vec4 scene(vec2 p, float t) {
        float architecture = 0.0; float windows = 0.0;
        for (int i = 0; i < 7; i++) {
          float fi = float(i); float x = -1.08 + fi * 0.36;
          vec2 local = p - vec2(x, -0.08);
          float archRadius = 0.17 + mod(fi, 2.0) * 0.045;
          float pillarMask = smoothstep(-1.02, -0.87, local.y) * (1.0 - smoothstep(0.27, 0.31, local.y));
          float vertical = filament(abs(local.x) - archRadius, 52.0) * pillarMask;
          float arch = filament(length(vec2(local.x, local.y - 0.28)) - archRadius, 48.0) * smoothstep(0.25, 0.29, local.y);
          architecture += (vertical + arch) * (0.32 + fi * 0.014);
          windows += exp(-(local.x * local.x * 52.0 + (local.y - 0.18) * (local.y - 0.18) * 11.0)) * (0.20 + midDrive() * 0.10);
        }
        vec2 starSpace = (p + vec2(t * 0.005, 0.0)) * 22.0;
        vec2 starId = floor(starSpace); vec2 starLocal = fract(starSpace) - 0.5;
        float starSeed = hash(starId + vec2(u_seed));
        vec2 starPoint = (hash2(starId + vec2(u_seed * 0.31)) - 0.5) * 0.56;
        float starDust = exp(-dot(starLocal - starPoint, starLocal - starPoint) * 150.0)
          * step(0.92, starSeed) * (0.38 + 0.22 * sin(t * 0.55 + starSeed * TAU));
        return vec4(architecture + windows + starDust, windows + starDust * 0.28, architecture + starDust, p.y * 0.09);
      }
    `],
    ["Ocean Caustics", `
      vec4 scene(vec2 p, float t) {
        vec2 q = p * 1.28;
        float a = sin(q.x * 4.3 + sin(q.y * 2.1 - t * 0.22) * 1.45);
        float b = sin(q.y * 4.8 + sin(q.x * 2.4 + t * 0.17) * 1.35);
        float c = sin((q.x + q.y) * 3.2 - t * 0.12 + fbm(q * 0.72) * 1.8);
        float interference = a * b * 0.72 + c * 0.28;
        float caustic = filament(interference, 11.0);
        float water = fbm(q * 0.58 + vec2(t * 0.016, 0.0));
        float depthLight = 0.56 + 0.44 * (1.0 - smoothstep(-0.8, 1.2, p.y));
        return vec4(caustic * depthLight + water * 0.12, caustic * (0.50 + bassDrive() * 0.18), pow(caustic, 2.0) * (0.62 + highDrive() * 0.20), water * 0.18);
      }
    `],
    ["Roseglass Tunnel", `
      vec4 scene(vec2 p, float t) {
        vec2 q = p + vec2(sin(t * 0.08), cos(t * 0.063)) * 0.05;
        float r = length(q); float a = atan(q.y, q.x);
        float depth = fract(-log(r + 0.045) * 3.15 + t * 0.085);
        float rings = filament(depth - 0.5, 26.0);
        float symmetry = max(3.0, floor(u_symmetry));
        float facets = 0.38 + 0.62 * pow(abs(cos(a * symmetry * 0.5 + t * 0.035)), 5.0);
        float depthFade = smoothstep(0.015, 0.12, r) * (1.0 - smoothstep(1.35, 1.90, r));
        float spokes = filament(sin(a * symmetry * 0.5 + t * 0.02), 32.0) * (1.0 - smoothstep(0.06, 1.25, r)) * 0.22;
        return vec4((rings * facets + spokes) * depthFade, rings * (0.22 + bassDrive() * 0.12) * depthFade, (rings * facets + spokes) * depthFade, sin(a * symmetry) * 0.12 + depth * 0.12);
      }
    `],
    ["Magnetic Ribbons", `
      vec4 scene(vec2 p, float t) {
        float ribbons = 0.0; float core = 0.0;
        for (int i = 0; i < 7; i++) {
          float fi = float(i);
          float y = -0.84 + fi * 0.28 + sin(p.x * (1.32 + fi * 0.09) + t * (0.18 + fi * 0.008) + fi * 1.16) * (0.12 + fi * 0.009 + midDrive() * 0.065);
          float distanceValue = abs(p.y - y);
          float ribbon = filament(distanceValue, (25.0 - fi * 1.1) / max(0.45, u_ribbonWidth));
          ribbons += ribbon * (0.34 + fi * 0.025);
          float flowingLight = 0.48 + 0.52 * pow(0.5 + 0.5 * sin(p.x * 2.2 - t * 0.45 + fi), 3.0);
          core += filament(distanceValue, 78.0) * flowingLight * (0.24 + highDrive() * 0.10);
        }
        return vec4(ribbons, core, core + ribbons * 0.14, p.y * 0.15 + sin(p.x + t * 0.04) * 0.05);
      }
    `],
    ["Celestial Orrery", `
      vec4 scene(vec2 p, float t) {
        vec2 q = p; float orbits = 0.0; float bodies = 0.0;
        float count = clamp(floor(u_orbCount + 0.5), 1.0, 24.0);
        for (int i = 0; i < 24; i++) {
          float fi = float(i);
          if (fi >= count) break;
          float radius = 0.24 + fi * (1.12 / max(1.0, count - 1.0));
          float flatten = 1.34 - fi / max(1.0, count - 1.0) * 0.24;
          vec2 elliptical = vec2(q.x, q.y * flatten);
          float orbit = filament(length(elliptical) - radius, 72.0);
          float angle = t * (0.22 / (1.0 + fi * 0.28)) + fi * 2.39996;
          vec2 body = vec2(cos(angle) * radius, sin(angle) * radius / flatten);
          bodies += exp(-dot(q - body, q - body) * (210.0 - min(fi, 11.0) * 9.0));
          orbits += orbit * (0.18 + min(fi, 11.0) * 0.009);
        }
        float sun = exp(-dot(q, q) * 22.0);
        return vec4(orbits + bodies + sun * 0.36, bodies + sun * (0.72 + bassDrive() * 0.18), orbits + bodies * 0.25, length(q) * 0.12);
      }
    `],
    ["Biolume Forest", `
      vec4 scene(vec2 p, float t) {
        float stems = 0.0; float crowns = 0.0; float spores = 0.0;
        for (int i = 0; i < 9; i++) {
          float fi = float(i); float x = -1.16 + fi * 0.29;
          float swayRate = 0.14 + fi * 0.004;
          float sway = sin(p.y * (1.55 + fi * 0.05) + t * swayRate + fi) * (0.075 + midDrive() * 0.02);
          float height = 0.08 + mod(fi, 4.0) * 0.22;
          float stemMask = smoothstep(-1.02, -0.82, p.y) * (1.0 - smoothstep(height, height + 0.08, p.y));
          stems += filament(p.x - x - sway, 52.0) * stemMask * 0.38;
          vec2 crown = p - vec2(x + sin(height * (1.55 + fi * 0.05) + t * swayRate + fi) * (0.075 + midDrive() * 0.02), height);
          float cap = exp(-(crown.x * crown.x * 25.0 + crown.y * crown.y * 85.0));
          crowns += cap * (0.40 + bassDrive() * 0.14) + filament(length(crown * vec2(0.8, 1.5)) - 0.14, 42.0) * smoothstep(-0.035, 0.025, crown.y) * 0.22;
        }
        vec2 sporeSpace = (p + vec2(t * 0.012, -t * 0.025)) * 13.0;
        vec2 sporeId = floor(sporeSpace); vec2 sporeLocal = fract(sporeSpace) - 0.5;
        float sporeSeed = hash(sporeId + vec2(u_seed));
        vec2 sporePoint = (hash2(sporeId + vec2(u_seed * 0.43)) - 0.5) * 0.60;
        spores = exp(-dot(sporeLocal - sporePoint, sporeLocal - sporePoint) * (68.0 + sporeSeed * 36.0))
          * step(0.78, sporeSeed) * (0.25 + 0.15 * sin(t * 0.7 + sporeSeed * TAU));
        return vec4(stems + crowns + spores, crowns, stems * 0.48 + spores, p.y * 0.13);
      }
    `],
    ["Prism Rain", `
      vec4 scene(vec2 p, float t) {
        vec2 q = rot(-0.22) * p;
        float column = floor(q.x * 9.0);
        float columnSeed = hash1(column + u_seed);
        vec2 grid = q * vec2(9.0, 2.2) + vec2(0.0, t * (0.42 + columnSeed * 0.30) + columnSeed * 5.0);
        vec2 id = floor(grid); vec2 local = fract(grid) - 0.5;
        float seedValue = hash(id + vec2(u_seed));
        local.x -= (columnSeed - 0.5) * 0.40;
        float lifespan = smoothstep(-0.5, -0.32, local.y) * (1.0 - smoothstep(0.25, 0.5, local.y));
        float streak = filament(local.x, 32.0 + seedValue * 18.0) * (1.0 - smoothstep(-0.32, 0.42, local.y)) * lifespan * step(0.38, seedValue);
        float drop = exp(-(local.x * local.x * 160.0 + (local.y + 0.22) * (local.y + 0.22) * 100.0)) * lifespan * step(0.58, seedValue);
        float mist = fbm(q * 0.72 + vec2(t * 0.018, 0.0)) * 0.15;
        return vec4(streak + drop + mist * 0.70, drop * (0.85 + highDrive() * 0.20), streak, columnSeed * 0.22 + q.y * 0.04);
      }
    `],
    ["Topographic Tide", `
      vec2 domainWarp(vec2 p, float t) {
        float a = fbm(p * 0.76 + vec2(t * 0.012, 0.0));
        float b = fbm(p * 0.83 + vec2(-2.4, 5.7) - vec2(0.0, t * 0.009));
        return p + vec2(a - 0.5, b - 0.5) * 0.42;
      }
      vec4 scene(vec2 p, float t) {
        vec2 q = domainWarp(p, t);
        float elevation = fbm(q * 0.92) * 0.74 + ridged(q * 0.53) * 0.26;
        float contourPhase = elevation * (8.0 + u_waveDensity * 3.5) + bassDrive() * 0.09;
        float contours = filament(fract(contourPhase) - 0.5, 34.0);
        float majors = filament(fract(contourPhase / 3.0) - 0.5, 26.0) * 0.48;
        float tide = smoothstep(0.62, 0.88, elevation) * 0.20;
        return vec4(contours * 0.68 + majors + tide, majors + tide, contours * 0.60, elevation * 0.18);
      }
    `],
    ["Solar Filaments", `
      vec4 scene(vec2 p, float t) {
        float filaments = 0.0; float flare = 0.0;
        for (int i = 0; i < 8; i++) {
          float fi = float(i);
          float y = sin(p.x * (1.55 + fi * 0.11) + t * (0.16 + fi * 0.007) + fi * 0.92) * (0.44 - fi * 0.018);
          y += sin(p.x * 3.1 - t * 0.19 + fi) * (0.055 + bassDrive() * 0.06);
          float distanceValue = abs(p.y - y + (fi - 3.5) * 0.14);
          filaments += filament(distanceValue, 30.0 - fi) * (0.31 + fi * 0.018);
          float travelingFlare = pow(0.5 + 0.5 * sin(p.x * 3.8 - t * 0.60 + fi * 0.8), 8.0);
          flare += filament(distanceValue, 85.0) * (0.11 + travelingFlare * (0.22 + highDrive() * 0.14));
        }
        float corona = fbm(p * 1.2 + vec2(t * 0.02, 0.0)) * filaments * 0.24;
        return vec4(filaments + corona, flare + corona, flare, p.x * 0.11 + p.y * 0.06);
      }
    `],
    ["Moonlit Dunes", `
      vec4 scene(vec2 p, float t) {
        float dunes = 0.0; float crests = 0.0; float shade = 0.0;
        for (int i = 0; i < 8; i++) {
          float fi = float(i);
          float y = -0.96 + fi * 0.25 + sin(p.x * (1.02 + fi * 0.10) + t * (0.027 + fi * 0.003) + fi * 0.84) * (0.08 + fi * 0.014);
          float line = filament(p.y - y, 42.0 - fi * 1.6);
          float fill = smoothstep(y - 0.20, y, p.y) * (1.0 - smoothstep(y, y + 0.16, p.y));
          float moonlight = 0.55 + 0.45 * (0.5 + 0.5 * sin(p.x * 1.8 + fi * 0.40));
          dunes += line * (0.24 + fi * 0.028) * moonlight; crests += line * 0.17; shade += fill * (0.075 + midDrive() * 0.01);
        }
        return vec4(dunes + shade, shade + crests * 0.24, crests, p.y * 0.08);
      }
    `],
    ["Cloud Chamber", `
      vec4 scene(vec2 p, float t) {
        float tracks = 0.0; float collisions = 0.0; float vapor = 0.0;
        float chamberFog = fbm(p * 1.18 + vec2(t * 0.010, -t * 0.007));
        for (int i = 0; i < 7; i++) {
          float fi = float(i);
          vec2 origin = vec2(sin(fi * 4.13 + u_seed * 0.01) * 0.92, cos(fi * 2.67 + u_seed * 0.02) * 0.62);
          float angle = fi * 1.73 + sin(t * 0.025 + fi) * 0.18;
          vec2 direction = vec2(cos(angle), sin(angle)); vec2 normal = vec2(-direction.y, direction.x);
          vec2 delta = p - origin; float along = dot(delta, direction); float across = dot(delta, normal);
          float bend = sin(along * 4.2 + fi * 1.4 + t * 0.10) * (0.018 + fi * 0.003);
          float span = smoothstep(-0.72, -0.26, along) * (1.0 - smoothstep(0.34, 0.78, along));
          float track = filament(across - bend, 62.0 - fi * 1.4) * span;
          float movingHead = sin(t * (0.36 + fi * 0.013) + fi * 1.71) * 0.58;
          float ionization = exp(-(along - movingHead) * (along - movingHead) * 32.0);
          tracks += track * (0.17 + fi * 0.016 + ionization * 0.28);
          collisions += track * ionization * (0.20 + highDrive() * 0.26);
          vapor += chamberFog * track * 0.16;
        }
        return vec4(tracks + vapor + collisions + chamberFog * 0.07, collisions + vapor * 0.36, tracks + vapor, p.x * 0.08 + p.y * 0.04);
      }
    `],
    ["Ink in Water", `
      vec4 scene(vec2 p, float t) {
        vec2 q = p * 0.76;
        float rise = t * 0.018;
        float tendrilA = fbm(vec2(q.x * 1.22 + sin(q.y * 1.4 + t * 0.09) * 0.28, q.y - rise));
        float tendrilB = fbm(vec2(q.x * 1.48 - sin(q.y * 1.1 - t * 0.07) * 0.32 + 4.0, q.y * 0.92 - rise * 0.74));
        float ink = smoothstep(0.31, 0.76, tendrilA * 0.62 + tendrilB * 0.48);
        float wisps = filament(tendrilA - tendrilB, 14.0) * smoothstep(0.36, 0.78, tendrilA);
        float translucentFold = 0.48 + 0.52 * smoothstep(0.28, 0.70, tendrilB);
        return vec4(ink * translucentFold, wisps * (0.34 + midDrive() * 0.12), wisps * 0.32, (tendrilA - tendrilB) * 0.24);
      }
    `],
    ["Sacred Geometry", `
      vec4 scene(vec2 p, float t) {
        float r = length(p); float angle = atan(p.y, p.x);
        float sectors = max(3.0, floor(u_symmetry));
        float folded = abs(mod(angle + PI / sectors, TAU / sectors) - PI / sectors);
        vec2 q = vec2(cos(folded), sin(folded)) * r;
        float envelope = (1.0 - smoothstep(0.90, 1.36, r)) * smoothstep(0.008, 0.06, r);
        float petals = filament(sin(folded * sectors * 0.5 + r * 5.2 - t * 0.11), 20.0) * envelope;
        float rings = filament(fract(r * (4.0 + u_waveDensity * 1.6) - t * 0.040 + bassDrive() * 0.06) - 0.5, 28.0) * envelope;
        float triangles = filament(max(abs(q.x) * 0.86 + q.y * 0.50, -q.y) - (0.18 + sin(r * 3.0) * 0.08), 26.0) * 0.28;
        return vec4(petals + rings * 0.44 + triangles, rings * 0.32, petals * 0.70 + triangles, cos(angle * sectors) * 0.12 + r * 0.07);
      }
    `],
    ["Electric Garden", `
      vec4 scene(vec2 p, float t) {
        float branches = 0.0; float blossoms = 0.0;
        for (int i = 0; i < 8; i++) {
          float fi = float(i); float x = -1.18 + fi * 0.33;
          float height = 0.34 + mod(fi, 4.0) * 0.15;
          float growth = smoothstep(-1.02, -0.82, p.y) * (1.0 - smoothstep(height, height + 0.08, p.y));
          float branchX = x + sin(p.y * (2.2 + fi * 0.08) + t * 0.11 + fi) * (0.08 + growth * 0.08);
          float branch = filament(p.x - branchX, 62.0) * growth;
          float sap = pow(0.5 + 0.5 * sin(p.y * 10.0 - t * 0.55 + fi), 8.0);
          branches += branch * (0.28 + sap * (0.18 + midDrive() * 0.14));
          vec2 flower = p - vec2(x + sin(height * (2.2 + fi * 0.08) + t * 0.11 + fi) * 0.16, height);
          float radius = length(flower); float a = atan(flower.y, flower.x);
          float petalRadius = 0.055 + pow(abs(cos(a * 4.0 + sin(t * 0.08 + fi) * 0.20)), 4.0) * (0.04 + bassDrive() * 0.018);
          blossoms += filament(radius - petalRadius, 70.0) * 0.38 + exp(-radius * radius * 600.0) * 0.20;
        }
        return vec4(branches + blossoms, blossoms, branches * 0.48 + blossoms, p.y * 0.12);
      }
    `],
    ["Frosted Glass", `
      vec4 scene(vec2 p, float t) {
        vec2 q = p * 1.24 + vec2(t * 0.012, -t * 0.008);
        float fogA = fbm(q * 1.18 + vec2(2.7, 0.6));
        float fogB = ridged(q * 2.35 + vec2(-1.4, t * 0.018));
        float softFrost = smoothstep(0.20, 0.88, fogA) * 0.34 + fogB * 0.18;
        float grain = fbm(q * 8.0 + vec2(t * 0.028, 4.2));
        float streakWave = sin(q.x * 4.6 + fogA * 2.4 + t * 0.050);
        float streaks = filament(streakWave, 18.0 + fogB * 12.0) * (0.08 + fogA * 0.10);
        float glint = smoothstep(0.76, 0.98, fogB + grain * 0.26) * (0.16 + streaks * 1.8);
        float travelingLight = pow(0.5 + 0.5 * sin(q.x * 1.8 - q.y * 0.6 - t * 0.16), 4.0);
        glint *= 0.45 + travelingLight * 0.70 + highDrive() * 0.15;
        return vec4(softFrost * 0.82 + streaks + glint, glint + softFrost * 0.12, streaks + glint * 0.78, fogA * 0.13 + grain * 0.05);
      }
    `],
    ["Ember Veil", `
      vec4 scene(vec2 p, float t) {
        float veil = fbm(vec2(p.x * 0.92 + sin(p.y * 1.4 + t * 0.08) * 0.18, p.y * 0.58 - t * 0.026));
        float fabric = filament(fract((p.x + veil * 0.32) * 4.2) - 0.5, 16.0) * (0.30 + bassDrive() * 0.10);
        vec2 emberSpace = (p + vec2(0.0, -t * 0.11)) * vec2(13.0, 10.0);
        vec2 emberId = floor(emberSpace); vec2 emberLocal = fract(emberSpace) - 0.5;
        float emberSeed = hash(emberId + vec2(u_seed));
        vec2 emberPoint = (hash2(emberId + vec2(u_seed)) - 0.5) * 0.44;
        vec2 emberDelta = emberLocal - emberPoint;
        float emberBreathe = 0.60 + 0.40 * sin(t * 0.8 + emberSeed * TAU);
        float embers = exp(-(emberDelta.x * emberDelta.x * 115.0 + emberDelta.y * emberDelta.y * 65.0)) * step(0.78, emberSeed) * emberBreathe;
        return vec4(fabric + veil * 0.18 + embers * 0.70, embers + fabric * 0.22, embers + fabric * 0.26, veil * 0.18);
      }
    `],
    ["Quantum Lace", `
      vec4 scene(vec2 p, float t) {
        vec2 q = rot(sin(t * 0.035) * 0.12) * p;
        float density = 0.74 + clamp(u_waveDensity, 0.1, 3.0) * 0.26;
        float a = sin(q.x * 8.0 * density + sin(q.y * 2.2 + t * 0.16) * (1.4 + midDrive() * 0.22));
        float b = sin(q.y * 7.2 * density - sin(q.x * 2.5 - t * 0.13) * 1.3);
        float c = sin((q.x + q.y) * 5.1 + t * 0.055);
        float interference = abs(a + b + c) / 3.0;
        float lace = filament(interference - 0.18, 32.0) + filament(interference - 0.54, 38.0) * 0.48;
        float nodes = pow(max(0.0, a * b * c), 6.0);
        return vec4(lace * 0.82 + nodes, nodes * (0.65 + highDrive() * 0.28), lace * 0.58, interference * 0.20);
      }
    `],
    ["Cosmic Koi", `
      vec4 scene(vec2 p, float t) {
        float koi = 0.0; float wakes = 0.0; float eyes = 0.0;
        float count = clamp(floor(u_orbCount + 0.5), 1.0, 24.0);
        for (int i = 0; i < 24; i++) {
          float fi = float(i); float angle = fi * 2.39996 + t * (0.095 + fi * 0.003);
          if (fi >= count) break;
          vec2 center = vec2(cos(angle * 0.82), sin(angle)) * vec2(1.16, 0.74);
          vec2 heading = normalize(vec2(-sin(angle * 0.82) * 1.16 * 0.82, cos(angle) * 0.74) + vec2(0.00001));
          vec2 delta = p - center;
          vec2 local = vec2(dot(delta, heading), dot(delta, vec2(-heading.y, heading.x)));
          float tailMask = smoothstep(-0.62, -0.30, local.x) * (1.0 - smoothstep(-0.15, 0.02, local.x));
          float flex = sin(local.x * 11.0 + t * 0.75 + fi) * 0.045 * tailMask;
          float body = exp(-(local.x * local.x * 34.0 + local.y * local.y * 115.0));
          float tail = filament(local.y - flex, 44.0) * tailMask;
          koi += body * 0.78; wakes += tail * (0.30 + midDrive() * 0.08);
          vec2 eyeDelta = local - vec2(0.12, 0.025);
          eyes += exp(-dot(eyeDelta, eyeDelta) * 1600.0) * 0.45;
        }
        float water = fbm(p * 0.78 + vec2(t * 0.012, 0.0)) * 0.12;
        return vec4(koi + wakes + water, eyes + koi * 0.12, wakes + eyes, p.x * 0.09 + p.y * 0.05);
      }
    `],
    ["Infinite Windows", `
      vec4 scene(vec2 p, float t) {
        // Speed drives forward travel; the remaining scene controls shape the flight.
        float audioPush = clamp(u_energy * u_reactiveBoost, 0.0, 1.35);
        // Integrate velocity on the CPU: changing audio or Speed never jumps phase.
        float travel = u_travelTime;
        vec2 q = p + vec2(sin(travel * 0.19), cos(travel * 0.15)) * u_drift * 0.11;
        q += vec2(sin(travel * 0.11 + p.y * 2.0), cos(travel * 0.09 + p.x * 1.6)) * u_turbulence * 0.030;
        float windows = 0.0; float glow = 0.0;
        for (int i = 0; i < 10; i++) {
          float fi = float(i); float depth = fract(fi / 10.0 + travel * 0.205);
          float scale = mix(0.075, 1.72, pow(depth, 1.32));
          vec2 box = abs(q) - vec2(scale * 1.18, scale * 0.72);
          float frameDistance = min(max(box.x, box.y), 0.0) + length(max(box, 0.0));
          float pulse = 1.0 + sin(travel * 1.85 + fi * 1.73) * u_pulse * (0.08 + audioPush * 0.15);
          float depthEnvelope = smoothstep(0.0, 0.09, depth) * (1.0 - smoothstep(0.86, 1.0, depth));
          float frame = filament(frameDistance, 64.0 - depth * 25.0) * pulse * depthEnvelope;
          windows += frame * (0.16 + depth * 0.46);
          glow += frame * depth * depth * (0.16 + audioPush * 0.11);
        }
        float vanishingGlow = exp(-length(q) * 13.0) * (0.05 + audioPush * 0.08);
        return vec4(windows + glow + vanishingGlow, glow + vanishingGlow * 0.55, windows * 0.72, length(q) * 0.08);
      }
    `],
    ["Quiet Constellations", `
      vec4 scene(vec2 p, float t) {
        vec2 q = p + vec2(t * 0.008, -t * 0.004);
        vec2 grid = q * 5.4; vec2 id = floor(grid); vec2 local = fract(grid) - 0.5;
        float stars = 0.0; float connection = 0.0;
        // Neighbor cells contribute both ends of each segment; no clipped tile seams.
        for (int y = -1; y <= 1; y++) {
          for (int x = -1; x <= 1; x++) {
            vec2 offset = vec2(float(x), float(y)); vec2 cell = id + offset;
            vec2 point = offset + (hash2(cell + vec2(u_seed)) - 0.5) * 0.62;
            float starSeed = hash(cell + vec2(u_seed * 0.37));
            float breathe = 0.72 + 0.20 * sin(t * 0.24 + starSeed * TAU);
            vec2 delta = local - point;
            stars += exp(-dot(delta, delta) * (160.0 - starSeed * 48.0)) * step(0.48, starSeed) * breathe;
            if (y == 0 && x <= 0) {
              vec2 rightCell = cell + vec2(1.0, 0.0);
              vec2 rightPoint = offset + vec2(1.0, 0.0) + (hash2(rightCell + vec2(u_seed)) - 0.5) * 0.62;
              float rightGate = step(0.66, min(starSeed, hash(rightCell + vec2(u_seed * 0.37))));
              connection += filament(sdSegment(local, point, rightPoint), 82.0) * rightGate * 0.18;
            }
            if (x == 0 && y <= 0) {
              vec2 upperCell = cell + vec2(0.0, 1.0);
              vec2 upperPoint = offset + vec2(0.0, 1.0) + (hash2(upperCell + vec2(u_seed)) - 0.5) * 0.62;
              float upperGate = step(0.66, min(starSeed, hash(upperCell + vec2(u_seed * 0.37))));
              connection += filament(sdSegment(local, point, upperPoint), 82.0) * upperGate * 0.16;
            }
          }
        }
        return vec4(stars + connection, stars * (0.60 + highDrive() * 0.16), connection + stars * 0.38, sin(q.x * 0.65 + q.y * 0.3) * 0.08);
      }
    `]
  ]);

  const shaderMain = `
    void main() {
      vec2 uv = v_uv;
      vec2 p = uv * 2.0 - 1.0;
      p.x *= u_resolution.x / max(1.0, u_resolution.y);

      float fill = clamp(u_screenFill, 0.2, 1.5);
      p *= 1.47 - fill * 0.48;
      p *= 1.0 - clamp(u_zoom, 0.0, 0.8) * 0.34;

      float reactive = clamp(u_reactiveBoost, 0.0, 2.5);
      float bass = clamp(u_bass * reactive, 0.0, 1.25);
      float mids = clamp(u_mid * reactive, 0.0, 1.25);
      float treble = clamp(u_treble * reactive, 0.0, 1.25);
      float t = u_time;

      float pulse = sin(t * 0.54 + length(p) * 1.4) * u_pulse * (0.012 + bass * 0.034);
      p *= 1.0 + pulse;
      p += vec2(sin(t * 0.26), cos(t * 0.22)) * u_drift * (0.020 + mids * 0.014);

      // Radial styles own their symmetry; folding every scene made a visible polar seam.

      float warpA = fbm(p * (0.76 + u_layerComplexity * 0.18) + vec2(t * 0.018, u_seed * 0.001));
      float warpB = fbm(p * (0.82 + u_layerComplexity * 0.16) + vec2(9.4, -t * 0.015));
      vec2 warped = p + vec2(warpA - 0.5, warpB - 0.5) * u_turbulence * (0.055 + mids * 0.026);

      vec4 value = scene(warped, t);
      float field = max(0.0, value.x);
      float accent = max(0.0, value.y);
      float edge = max(0.0, value.z);
      float hueOffset = value.w;

      if (u_trail > 0.012) {
        vec2 echoOffset = vec2(cos(t * 0.19), sin(t * 0.16)) * (0.004 + u_trail * 0.030);
        vec4 echoValue = scene(warped - echoOffset, t - 0.05 - u_trail * 0.10);
        field = max(field, echoValue.x * u_trail * 0.44);
        accent = max(accent, echoValue.y * u_trail * 0.34);
      }

      float widthControl = clamp((u_ribbonWidth - 0.05) / 1.95, 0.0, 1.0);
      // Soft response keeps faint filaments and cloud detail without clipping bright overlaps.
      field = pow(1.0 - exp(-field * (1.65 + widthControl * 0.60)), 1.12 - widthControl * 0.22);
      accent = 1.0 - exp(-accent * 1.65);
      edge = 1.0 - exp(-edge * 1.90);

      float hueSpan = clamp(u_hueSpread, 0.0, 180.0) / 360.0;
      // The selected Hue stays primary. Spread adds accents instead of replacing it.
      float hueA = fract(u_baseHue / 360.0);
      float hueB = fract(hueA + hueSpan * (0.48 + mids * 0.05) + clamp(hueOffset, -1.0, 1.0) * hueSpan * 0.10);
      float hueC = fract(hueA - hueSpan * (0.30 + treble * 0.04));
      float saturation = clamp(pow(max(u_saturation, 0.0), 0.55) * (0.90 + u_energy * 0.10), 0.0, 1.0);

      vec3 primary = hsl2rgb(vec3(hueA, saturation, 0.46 + field * 0.16));
      vec3 secondary = hsl2rgb(vec3(hueB, saturation * 0.82, 0.52 + accent * 0.17));
      vec3 highlightColor = hsl2rgb(vec3(hueC, saturation * 0.55, 0.72));
      vec3 deepColor = hsl2rgb(vec3(hueA, saturation * 0.34, 0.105));

      float radialLight = 1.0 - smoothstep(0.10, 1.52, length(p));
      float atmosphere = fbm(p * 0.38 + vec2(t * 0.004, -t * 0.003));
      vec3 color = deepColor * (0.24 + u_backgroundLift * 1.30 + radialLight * 0.10 + atmosphere * 0.08);
      color += primary * atmosphere * (0.012 + u_backgroundLift * 0.045);
      color += primary * field * (0.48 + u_contrast * 0.34 + bass * 0.05);
      color += secondary * accent * (0.12 + u_bloom * 0.20 + mids * 0.05);
      color += mix(highlightColor, vec3(1.0), 0.20) * edge * (0.05 + u_glow * 0.15 + treble * 0.05);

      float sparkleScale = 4.0 + u_waveDensity * 2.1 + u_orbCount * 0.11;
      vec2 sparkleSpace = (p + vec2(4.0)) * sparkleScale;
      vec2 sparkleId = floor(sparkleSpace);
      vec2 sparkleLocal = fract(sparkleSpace) - 0.5;
      vec2 sparklePoint = (hash2(sparkleId + vec2(u_seed)) - 0.5) * 0.58;
      float density = clamp(u_particleCount / 300.0, 0.0, 1.0);
      float sparkleSeed = hash(sparkleId + vec2(u_seed * 0.17));
      float sparkleGate = step(0.96 - density * 0.24, sparkleSeed) * clamp(u_particleCount, 0.0, 1.0);
      float sparkle = exp(-dot(sparkleLocal - sparklePoint, sparkleLocal - sparklePoint) * (110.0 / max(0.30, u_particleSize))) * sparkleGate;
      float twinkle = 0.65 + 0.35 * sin(t * 0.38 + sparkleSeed * TAU);
      color += highlightColor * sparkle * twinkle * (0.020 + treble * 0.10 + u_glow * 0.020);

      float vignette = 1.0 - smoothstep(0.42, 1.52, length(p)) * clamp(u_vignette, 0.0, 1.0) * 0.78;
      color *= vignette;
      color += (hash(uv * u_resolution + vec2(floor(t * 12.0))) - 0.5) * u_grain * 0.12;
      float brightest = max(color.r, max(color.g, color.b));
      color /= 1.0 + max(0.0, brightest) * 0.43;
      color = pow(max(color, vec3(0.0)), vec3(0.92));
      gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
    }
  `;

  const uniformNames = [
    "u_resolution", "u_time", "u_travelTime", "u_energy", "u_bass", "u_mid", "u_treble",
    "u_baseHue", "u_hueSpread", "u_saturation", "u_contrast", "u_speed",
    "u_turbulence", "u_drift", "u_pulse", "u_zoom", "u_screenFill", "u_trail",
    "u_bloom", "u_glow", "u_grain", "u_vignette", "u_particleCount",
    "u_particleSize", "u_ribbonWidth", "u_waveDensity", "u_backgroundLift",
    "u_reactiveBoost", "u_orbCount", "u_layerComplexity", "u_symmetry", "u_seed"
  ];

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1, 1, -1, -1, 1,
    -1, 1, 1, -1, 1, 1
  ]), gl.STATIC_DRAW);

  let program = null;
  let uniforms = {};
  let activeSceneName = "";
  let renderFailed = false;

  function showError(message) {
    document.body.innerHTML = `<div style="color:#fff;padding:20px;font-family:Segoe UI;background:#02040a;white-space:pre-wrap">${message}</div>`;
  }

  function compileShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader) || "Shader compilation failed";
      gl.deleteShader(shader);
      throw new Error(message);
    }
    return shader;
  }

  function bindScene(sceneName) {
    const safeName = sceneSources.has(sceneName) ? sceneName : sceneNames[0];
    if (program && activeSceneName === safeName) return;

    const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = compileShader(gl.FRAGMENT_SHADER, shaderPrelude + sceneSources.get(safeName) + shaderMain);
    const nextProgram = gl.createProgram();
    gl.attachShader(nextProgram, vertexShader);
    gl.attachShader(nextProgram, fragmentShader);
    gl.linkProgram(nextProgram);
    if (!gl.getProgramParameter(nextProgram, gl.LINK_STATUS)) {
      const message = gl.getProgramInfoLog(nextProgram) || "Shader link failed";
      gl.deleteProgram(nextProgram);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      throw new Error(message);
    }

    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    if (program) gl.deleteProgram(program);
    program = nextProgram;
    activeSceneName = safeName;
    uniforms = {};

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    uniformNames.forEach(name => { uniforms[name] = gl.getUniformLocation(program, name); });
  }

  const defaultSettings = {
    GeometryStyle: sceneNames[0], BaseHue: 176, HueSpread: 44, Saturation: 0.62,
    Contrast: 0.82, Symmetry: 5, Speed: 0.22, Turbulence: 0.18, Drift: 0.12,
    Pulse: 0.16, Zoom: 0.04, ScreenFill: 0.92, Trail: 0.14, Bloom: 0.46,
    Glow: 0.62, Grain: 0.01, Vignette: 0.28, ParticleCount: 34,
    ParticleSize: 0.72, RibbonWidth: 0.68, WaveDensity: 0.86,
    BackgroundLift: 0.07, ReactiveBoost: 0.82, OrbCount: 6,
    LayerComplexity: 0.86, Seed: 100
  };

  const state = {
    settings: { ...defaultSettings },
    timelineSeconds: 0,
    energy: 0,
    bands: { bass: 0, mid: 0, treble: 0 },
    audioSmoothed: false,
    isPlaying: true,
    shaderTime: 0,
    motionTime: 0,
    travelTime: 0,
    smooth: { energy: 0, bass: 0, mid: 0, treble: 0 },
    lastFrameAt: performance.now()
  };

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const cssWidth = Math.max(1, canvas.clientWidth);
    const cssHeight = Math.max(1, canvas.clientHeight);
    const scale = Math.min(2.25, Math.max(dpr, 640 / cssWidth, 360 / cssHeight));
    const width = Math.max(1, Math.floor(cssWidth * scale));
    const height = Math.max(1, Math.floor(cssHeight * scale));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
  }

  function number(value, fallback = 0) {
    const result = Number(value);
    return Number.isFinite(result) ? result : fallback;
  }

  function setUniform(name, value) {
    const location = uniforms[name];
    if (location !== null && location !== undefined) gl.uniform1f(location, value);
  }

  function resetMotionClock(timelineSeconds) {
    const settings = { ...defaultSettings, ...(state.settings || {}) };
    const speed = Math.min(1.5, Math.max(0.01, number(settings.Speed, defaultSettings.Speed)));
    state.shaderTime = timelineSeconds;
    state.motionTime = timelineSeconds * (0.18 + speed * 1.16);
    state.travelTime = state.motionTime * (1.10 + speed * 2.35);
  }

  function updateUniforms(now) {
    const delta = Math.max(0, Math.min(0.1, (now - state.lastFrameAt) / 1000));
    state.lastFrameAt = now;
    const settings = { ...defaultSettings, ...(state.settings || {}) };
    const speed = Math.min(1.5, Math.max(0.01, number(settings.Speed, defaultSettings.Speed)));
    const rate = 0.18 + speed * 1.16;
    const reactive = Math.min(2.5, Math.max(0, number(settings.ReactiveBoost, defaultSettings.ReactiveBoost)));
    for (const key of ["energy", "bass", "mid", "treble"]) {
      const target = Math.min(1.5, Math.max(0, number(key === "energy" ? state.energy : state.bands[key])));
      const previous = state.smooth[key];
      const tau = target > previous ? 0.045 : (key === "bass" ? 0.24 : 0.17);
      state.smooth[key] = state.audioSmoothed ? target : previous + (target - previous) * (1 - Math.exp(-delta / tau));
    }
    if (state.isPlaying) {
      state.shaderTime += delta;
      state.motionTime += delta * rate;
      state.travelTime += delta * rate * (1.10 + speed * 2.35 + Math.min(1.35, state.smooth.energy * reactive) * 0.78);
    }
    bindScene(settings.GeometryStyle);
    gl.useProgram(program);
    gl.uniform2f(uniforms.u_resolution, canvas.width, canvas.height);
    setUniform("u_time", state.motionTime);
    setUniform("u_travelTime", state.travelTime);
    setUniform("u_energy", state.smooth.energy);
    setUniform("u_bass", state.smooth.bass);
    setUniform("u_mid", state.smooth.mid);
    setUniform("u_treble", state.smooth.treble);
    setUniform("u_baseHue", number(settings.BaseHue));
    setUniform("u_hueSpread", number(settings.HueSpread));
    setUniform("u_saturation", number(settings.Saturation));
    setUniform("u_contrast", number(settings.Contrast));
    setUniform("u_speed", number(settings.Speed));
    setUniform("u_turbulence", number(settings.Turbulence));
    setUniform("u_drift", number(settings.Drift));
    setUniform("u_pulse", number(settings.Pulse));
    setUniform("u_zoom", number(settings.Zoom));
    setUniform("u_screenFill", number(settings.ScreenFill));
    setUniform("u_trail", number(settings.Trail));
    setUniform("u_bloom", number(settings.Bloom));
    setUniform("u_glow", number(settings.Glow));
    setUniform("u_grain", number(settings.Grain));
    setUniform("u_vignette", number(settings.Vignette));
    setUniform("u_particleCount", number(settings.ParticleCount));
    setUniform("u_particleSize", number(settings.ParticleSize));
    setUniform("u_ribbonWidth", number(settings.RibbonWidth));
    setUniform("u_waveDensity", number(settings.WaveDensity));
    setUniform("u_backgroundLift", number(settings.BackgroundLift));
    setUniform("u_reactiveBoost", number(settings.ReactiveBoost));
    setUniform("u_orbCount", number(settings.OrbCount));
    setUniform("u_layerComplexity", number(settings.LayerComplexity));
    setUniform("u_symmetry", number(settings.Symmetry));
    setUniform("u_seed", number(settings.Seed));
  }

  function drawFrame(now) {
    if (renderFailed) return;
    try {
      resize();
      updateUniforms(now);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    } catch (error) {
      renderFailed = true;
      showError(`Procedural renderer failed:\n\n${error?.message || String(error)}`);
      throw error;
    }
  }

  function render(now) {
    if (window.__shamonsoftCompositor?.isFrozen?.()) {
      state.lastFrameAt = now;
    } else if (canvas.dataset.active === "true" || window.__shamonsoftPerformance?.captureActive) {
      drawFrame(now);
    } else {
      state.lastFrameAt = now;
    }
    requestAnimationFrame(render);
  }

  window.videoLab = {
    sceneNames: [...sceneNames],
    applyState(payload = {}) {
      const now = performance.now();
      const nextTimeline = number(payload.timelineSeconds, 0);
      state.settings = payload.settings || state.settings;
      const timelineDelta = Math.abs(nextTimeline - state.timelineSeconds);
      if (timelineDelta > 0.75 || (!payload.isPlaying && timelineDelta > 0.0001)) {
        resetMotionClock(nextTimeline);
        state.lastFrameAt = now;
      }
      state.timelineSeconds = nextTimeline;
      state.energy = number(payload.energy, 0);
      state.bands = { ...state.bands, ...(payload.bands || {}) };
      state.audioSmoothed = Boolean(payload.audioSmoothed);
      state.isPlaying = Boolean(payload.isPlaying);
    },
    renderStill(payload = {}) {
      const now = performance.now();
      state.settings = payload.settings || state.settings;
      state.timelineSeconds = number(payload.timelineSeconds, 0);
      resetMotionClock(state.timelineSeconds);
      state.energy = number(payload.energy, 0);
      state.bands = { ...state.bands, ...(payload.bands || {}) };
      state.smooth = {
        energy: Math.min(1.5, Math.max(0, state.energy)),
        bass: Math.min(1.5, Math.max(0, number(state.bands.bass))),
        mid: Math.min(1.5, Math.max(0, number(state.bands.mid))),
        treble: Math.min(1.5, Math.max(0, number(state.bands.treble)))
      };
      state.isPlaying = false;
      state.lastFrameAt = now;
      drawFrame(now);
    }
  };

  try {
    bindScene(sceneNames[0]);
  } catch (error) {
    renderFailed = true;
    showError(`Procedural renderer could not start:\n\n${error?.message || String(error)}`);
    return;
  }

  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(render);
})();
