function normalizeLabel(label) {
  return label.trim().toLowerCase().replace(/\s+/g, "");
}

function sliderValue(input, fallback = 50) {
  return input ? Number(input.value) : fallback;
}

function controlValue(input, fallback = 50) {
  if (!input) {
    return fallback;
  }
  if (input.tagName === "SELECT") {
    return input.value;
  }
  return Number(input.value);
}

function checkboxValue(input) {
  return Boolean(input?.checked);
}

export class ControlValueAdapter {
  constructor(root) {
    this.root = root;
    this.globalControls = new Map();
    this.animationCards = [];
    this.captureElements();
  }

  captureElements() {
    this.globalControls.clear();
    this.animationCards = [];

    this.root.querySelectorAll(".global-setting-card").forEach((card) => {
      const label = card.querySelector(".global-setting-label")?.textContent ?? "";
      const input = card.querySelector("input[type='range']");
      this.globalControls.set(normalizeLabel(label), input);
    });

    this.root.querySelectorAll(".anim-card").forEach((card) => {
      const select = card.querySelector(".anim-select");
      const toggle = card.querySelector("input[type='checkbox']");
      const randomize = card.querySelector(".randomize-btn");
      const sliders = new Map();

      card.querySelectorAll(".slider-cell").forEach((cell) => {
        const label = cell.querySelector(".slider-label-row span")?.textContent ?? "";
        const input = cell.querySelector("input[type='range'], select");
        sliders.set(normalizeLabel(label), input);
      });

      this.animationCards.push({ card, select, toggle, randomize, sliders });
    });

    this.backgroundHueSlider = this.root.getElementById("background-hue-slider");
    this.bgBlack = this.root.getElementById("bg-black");
    this.bgWhite = this.root.getElementById("bg-white");
  }

  readGlobalValue(name, fallback = 50) {
    return sliderValue(this.globalControls.get(normalizeLabel(name)), fallback);
  }

  readActiveMode() {
    const activeCard = this.animationCards.find((entry) => entry.card.dataset.effectId === "main") ?? this.animationCards[0];
    if (!activeCard) {
      return {
        name: "Bars",
        values: {},
      };
    }

    const values = {};
    for (const [label, input] of activeCard.sliders.entries()) {
      values[label] = controlValue(input);
    }

    return {
      name: activeCard.select?.value ?? "Bars",
      values,
    };
  }

  readEffects() {
    const effects = {
      main: true,
      particles: false,
      lightBeams: false,
      shockwave: false,
    };

    this.animationCards.forEach((entry) => {
      const effectId = entry.card.dataset.effectId;
      if (!effectId) {
        return;
      }
      effects[effectId] = checkboxValue(entry.toggle);
    });

    return effects;
  }

  readEffectValues() {
    const effectValues = {};

    this.animationCards.forEach((entry) => {
      const effectId = entry.card.dataset.effectId;
      if (!effectId || effectId === "main") {
        return;
      }

      const values = {};
      for (const [label, input] of entry.sliders.entries()) {
        values[label] = controlValue(input);
      }
      effectValues[effectId] = values;
    });

    return effectValues;
  }

  readRandomize() {
    const randomize = {
      main: false,
      particles: false,
      lightBeams: false,
      shockwave: false,
    };

    this.animationCards.forEach((entry) => {
      const effectId = entry.card.dataset.effectId;
      if (!effectId) {
        return;
      }
      randomize[effectId] = Boolean(entry.randomize?.classList.contains("active-toggle"));
    });

    return randomize;
  }

  readValues() {
    const activeMode = this.readActiveMode();

    return {
      modeName: activeMode.name,
      mode: activeMode.values,
      effects: this.readEffects(),
      randomize: this.readRandomize(),
      effectValues: this.readEffectValues(),
      global: {
        brightness: this.readGlobalValue("Brightness", 70),
        fov: this.readGlobalValue("FOV", 60),
        bloom: this.readGlobalValue("Bloom", 90),
        sensitivity: this.readGlobalValue("Sensitivity", 70),
        contrast: this.readGlobalValue("Contrast", 50),
        beatResponse: this.readGlobalValue("Beat Response", 80),
        saturation: this.readGlobalValue("Saturation", 50),
        smoothing: this.readGlobalValue("Smoothing", 70),
        vibrance: this.readGlobalValue("Vibrance", 50),
        particles: this.readGlobalValue("Particles", 30),
        hueShift: this.readGlobalValue("Hue Shift", 0),
        trails: this.readGlobalValue("Trails", 40),
        motionBlur: this.readGlobalValue("Motion Blur", 30),
        depth: this.readGlobalValue("Depth", 60),
        cameraMove: this.readGlobalValue("Camera Move", 50),
        glow: this.readGlobalValue("Glow", 65),
        exposure: this.readGlobalValue("Exposure", 55),
        sharpness: this.readGlobalValue("Sharpness", 45),
      },
      background: {
        hue: sliderValue(this.backgroundHueSlider, 220),
        black: checkboxValue(this.bgBlack),
        white: checkboxValue(this.bgWhite),
      },
    };
  }
}
