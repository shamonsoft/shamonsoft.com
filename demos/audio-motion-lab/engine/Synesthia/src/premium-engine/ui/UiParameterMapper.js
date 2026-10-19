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

export class UiParameterMapper {
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
      const sliders = new Map();
      card.querySelectorAll(".slider-cell").forEach((cell) => {
        const label = cell.querySelector(".slider-label-row span")?.textContent ?? "";
        const input = cell.querySelector("input[type='range'], select");
        sliders.set(normalizeLabel(label), input);
      });
      this.animationCards.push({ card, select, sliders });
    });

    this.backgroundHueSlider = this.root.getElementById("background-hue-slider");
    this.bgBlack = this.root.getElementById("bg-black");
    this.bgWhite = this.root.getElementById("bg-white");
    this.mainMaterialSelect = this.root.querySelector(".main-material-select");
  }

  readGlobal(name, fallback = 50) {
    return sliderValue(this.globalControls.get(normalizeLabel(name)), fallback);
  }

  readMode() {
    const mainCard = this.animationCards.find((entry) => entry.card.dataset.effectId === "main") ?? this.animationCards[0];
    if (!mainCard) {
      return { modeName: "Bars", mode: {}, randomizeMain: false };
    }

    const modeSelect = mainCard.card.querySelector(".main-effect-select, .anim-select");
    const values = {};
    mainCard.card.querySelectorAll(".slider-cell").forEach((cell) => {
      const label = cell.querySelector(".slider-label-row span")?.textContent ?? "";
      const input = cell.querySelector("input[type='range'], select");
      if (label && input) {
        values[normalizeLabel(label)] = controlValue(input);
      }
    });

    return {
      modeName: modeSelect?.value ?? "Bars",
      mode: values,
      randomizeMain: Boolean(mainCard.card.querySelector(".randomize-btn")?.classList.contains("active-toggle")),
      materialName: this.mainMaterialSelect?.value ?? "Glass Bubble",
    };
  }

  readValues() {
    const mode = this.readMode();
    return {
      modeName: mode.modeName,
      modeId: mode.modeName,
      mode: mode.mode,
      materialName: mode.materialName,
      randomize: {
        main: mode.randomizeMain,
      },
      global: {
        brightness: this.readGlobal("Brightness", 70),
        bloom: this.readGlobal("Bloom", 90),
        glow: this.readGlobal("Glow", 65),
        contrast: this.readGlobal("Contrast", 50),
        depth: this.readGlobal("Depth", 60),
        cameraMove: this.readGlobal("Camera Move", 50),
        sensitivity: this.readGlobal("Sensitivity", 70),
        smoothing: this.readGlobal("Smoothing", 70),
        saturation: this.readGlobal("Saturation", 50),
        vibrance: this.readGlobal("Vibrance", 50),
        hueShift: this.readGlobal("Hue Shift", 0),
        exposure: this.readGlobal("Exposure", 55),
        sharpness: this.readGlobal("Sharpness", 45),
        beatResponse: this.readGlobal("Beat Response", 80),
      },
      background: {
        hue: sliderValue(this.backgroundHueSlider, 220),
        black: checkboxValue(this.bgBlack),
        white: checkboxValue(this.bgWhite),
      },
    };
  }
}
