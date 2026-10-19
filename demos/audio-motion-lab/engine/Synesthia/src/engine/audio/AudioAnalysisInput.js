function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function averageRange(values, startRatio, endRatio) {
  if (!values.length) {
    return 0;
  }

  const start = Math.floor(values.length * startRatio);
  const end = Math.max(start + 1, Math.floor(values.length * endRatio));
  let sum = 0;
  let count = 0;

  for (let index = start; index < end && index < values.length; index += 1) {
    sum += values[index];
    count += 1;
  }

  return count > 0 ? sum / count : 0;
}

export class AudioAnalysisInput {
  constructor({ getAnalyser, getAudioElement }) {
    this.getAnalyser = getAnalyser;
    this.getAudioElement = getAudioElement;
    this.frequencyData = null;
    this.smoothedBands = [];
    this.lastOverall = 0;
  }

  createIdleFrame(bandCount) {
    if (this.smoothedBands.length !== bandCount) {
      this.smoothedBands = new Array(bandCount).fill(0);
    }

    for (let index = 0; index < this.smoothedBands.length; index += 1) {
      this.smoothedBands[index] *= 0.92;
    }

    const overall = averageRange(this.smoothedBands, 0, 1);
    return {
      active: false,
      overall,
      bass: averageRange(this.smoothedBands, 0, 0.2),
      mid: averageRange(this.smoothedBands, 0.2, 0.65),
      high: averageRange(this.smoothedBands, 0.65, 1),
      beat: Math.max(0, overall - this.lastOverall),
      bands: [...this.smoothedBands],
    };
  }

  sample({ bandCount, sensitivity = 1, smoothing = 0.72 }) {
    const analyser = this.getAnalyser?.();
    const audio = this.getAudioElement?.();

    if (!analyser || !audio || !audio.src || audio.paused) {
      const idleFrame = this.createIdleFrame(bandCount);
      this.lastOverall = idleFrame.overall;
      return idleFrame;
    }

    if (!this.frequencyData || this.frequencyData.length !== analyser.frequencyBinCount) {
      this.frequencyData = new Uint8Array(analyser.frequencyBinCount);
    }

    if (this.smoothedBands.length !== bandCount) {
      this.smoothedBands = new Array(bandCount).fill(0);
    }

    analyser.getByteFrequencyData(this.frequencyData);

    const bands = new Array(bandCount).fill(0);
    const minIndex = 2;
    const maxIndex = Math.min(this.frequencyData.length - 1, 960);

    for (let band = 0; band < bandCount; band += 1) {
      const startRatio = band / bandCount;
      const endRatio = (band + 1) / bandCount;
      const start = Math.floor(minIndex * ((maxIndex / minIndex) ** startRatio));
      const end = Math.max(start + 1, Math.floor(minIndex * ((maxIndex / minIndex) ** endRatio)));
      let weightedSum = 0;
      let totalWeight = 0;

      for (let sampleIndex = start; sampleIndex < end; sampleIndex += 1) {
        const position = (sampleIndex - start) / Math.max(1, end - start);
        const weight = 0.9 + position;
        weightedSum += this.frequencyData[sampleIndex] * weight;
        totalWeight += weight;
      }

      const average = totalWeight > 0 ? weightedSum / totalWeight : 0;
      const normalized = clamp((average / 255) * sensitivity, 0, 1);
      const eased = normalized ** 0.82;
      this.smoothedBands[band] += (eased - this.smoothedBands[band]) * (1 - smoothing);
      bands[band] = this.smoothedBands[band];
    }

    const overall = averageRange(bands, 0, 1);
    const frame = {
      active: true,
      overall,
      bass: averageRange(bands, 0, 0.18),
      mid: averageRange(bands, 0.18, 0.62),
      high: averageRange(bands, 0.62, 1),
      beat: Math.max(0, overall - this.lastOverall),
      bands,
    };

    this.lastOverall = overall;
    return frame;
  }
}
