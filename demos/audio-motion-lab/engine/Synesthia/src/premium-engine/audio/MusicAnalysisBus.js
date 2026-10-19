function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function average(values, start, end) {
  if (!values.length) {
    return 0;
  }

  let sum = 0;
  let count = 0;
  const from = Math.max(0, Math.floor(values.length * start));
  const to = Math.min(values.length, Math.max(from + 1, Math.floor(values.length * end)));

  for (let index = from; index < to; index += 1) {
    sum += values[index];
    count += 1;
  }
  return count ? sum / count : 0;
}

export class MusicAnalysisBus {
  constructor({ getAnalyser, getAudioElement }) {
    this.getAnalyser = getAnalyser;
    this.getAudioElement = getAudioElement;
    this.frequencyData = null;
    this.smoothedBands = [];
    this.lastEnergy = 0;
  }

  makeIdleFrame(bandCount) {
    if (this.smoothedBands.length !== bandCount) {
      this.smoothedBands = new Array(bandCount).fill(0);
    }

    for (let index = 0; index < this.smoothedBands.length; index += 1) {
      this.smoothedBands[index] *= 0.92;
    }

    const overall = average(this.smoothedBands, 0, 1);
    return {
      active: false,
      overall,
      bass: average(this.smoothedBands, 0, 0.18),
      lowMid: average(this.smoothedBands, 0.18, 0.4),
      highMid: average(this.smoothedBands, 0.4, 0.72),
      treble: average(this.smoothedBands, 0.72, 1),
      beat: Math.max(0, overall - this.lastEnergy),
      bands: [...this.smoothedBands],
    };
  }

  sample({ bandCount, sensitivity = 70, smoothing = 70 }) {
    const analyser = this.getAnalyser?.();
    const audio = this.getAudioElement?.();
    if (!analyser || !audio || !audio.src || audio.paused) {
      const idle = this.makeIdleFrame(bandCount);
      this.lastEnergy = idle.overall;
      return idle;
    }

    if (!this.frequencyData || this.frequencyData.length !== analyser.frequencyBinCount) {
      this.frequencyData = new Uint8Array(analyser.frequencyBinCount);
    }
    if (this.smoothedBands.length !== bandCount) {
      this.smoothedBands = new Array(bandCount).fill(0);
    }

    analyser.getByteFrequencyData(this.frequencyData);

    const bands = new Array(bandCount).fill(0);
    const sensitivityScale = 0.7 + clamp(sensitivity / 100, 0, 1) * 1.8;
    const smoothingScale = 0.52 + clamp(smoothing / 100, 0, 1) * 0.42;

    const minIndex = 2;
    const maxIndex = Math.min(this.frequencyData.length - 1, 1024);

    for (let band = 0; band < bandCount; band += 1) {
      const bandStart = band / bandCount;
      const bandEnd = (band + 1) / bandCount;
      const start = Math.floor(minIndex * ((maxIndex / minIndex) ** bandStart));
      const end = Math.max(start + 1, Math.floor(minIndex * ((maxIndex / minIndex) ** bandEnd)));

      let weighted = 0;
      let weightSum = 0;
      for (let index = start; index < end; index += 1) {
        const pos = (index - start) / Math.max(1, end - start);
        const weight = 0.75 + pos * 1.4;
        weighted += this.frequencyData[index] * weight;
        weightSum += weight;
      }

      const value = weightSum > 0 ? weighted / weightSum : 0;
      const normalized = clamp((value / 255) * sensitivityScale, 0, 1);
      const curved = normalized ** 0.78;
      this.smoothedBands[band] += (curved - this.smoothedBands[band]) * (1 - smoothingScale);
      bands[band] = this.smoothedBands[band];
    }

    const overall = average(bands, 0, 1);
    const frame = {
      active: true,
      overall,
      bass: average(bands, 0, 0.18),
      lowMid: average(bands, 0.18, 0.4),
      highMid: average(bands, 0.4, 0.72),
      treble: average(bands, 0.72, 1),
      beat: Math.max(0, overall - this.lastEnergy),
      bands,
    };
    this.lastEnergy = overall;
    return frame;
  }
}
