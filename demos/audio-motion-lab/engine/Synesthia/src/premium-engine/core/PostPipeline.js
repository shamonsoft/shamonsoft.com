import * as THREE from "../../vendor/three/three.module.js";
import { EffectComposer } from "../../vendor/three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "../../vendor/three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "../../vendor/three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "../../vendor/three/addons/postprocessing/UnrealBloomPass.js";
import { VignetteShader } from "../../vendor/three/addons/shaders/VignetteShader.js";

const GradeShader = {
  name: "PremiumGradeShader",
  uniforms: {
    tDiffuse: { value: null },
    saturation: { value: 1.08 },
    contrast: { value: 1.08 },
    lift: { value: new THREE.Vector3(0.01, 0.012, 0.016) },
    gain: { value: new THREE.Vector3(1.03, 1.04, 1.08) },
    vignetteMix: { value: 0.08 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float saturation;
    uniform float contrast;
    uniform vec3 lift;
    uniform vec3 gain;
    uniform float vignetteMix;
    varying vec2 vUv;

    vec3 saturateColor(vec3 color, float sat) {
      float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
      return mix(vec3(luma), color, sat);
    }

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec3 color = texel.rgb;
      color = (color + lift) * gain;
      color = saturateColor(color, saturation);
      color = (color - 0.5) * contrast + 0.5;
      vec2 centered = vUv - 0.5;
      float vignette = dot(centered, centered) * 1.4;
      color = mix(color, color * (1.0 - vignette * 0.52), vignetteMix);
      gl_FragColor = vec4(color, texel.a);
    }
  `,
};

export class PostPipeline {
  constructor(renderer, scene, camera) {
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));

    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.58, 0.44, 0.72);
    this.composer.addPass(this.bloomPass);

    this.gradePass = new ShaderPass(GradeShader);
    this.composer.addPass(this.gradePass);

    this.vignettePass = new ShaderPass(VignetteShader);
    this.vignettePass.uniforms.offset.value = 1.02;
    this.vignettePass.uniforms.darkness.value = 0.86;
    this.composer.addPass(this.vignettePass);
  }

  setSize(width, height) {
    this.composer.setSize(width, height);
    this.bloomPass.setSize(width, height);
  }

  render(deltaTime) {
    this.composer.render(deltaTime);
  }

  apply(audioFrame, controls, time) {
    const bloom = Math.max(0, Math.min(1, (controls.global?.bloom ?? 90) / 100));
    const glow = Math.max(0, Math.min(1, (controls.global?.glow ?? 65) / 100));
    const contrast = Math.max(0, Math.min(1, (controls.global?.contrast ?? 50) / 100));
    const sharpness = Math.max(0, Math.min(1, (controls.global?.sharpness ?? 45) / 100));
    const saturation = Math.max(0, Math.min(1, (controls.global?.saturation ?? 50) / 100));
    const vibrance = Math.max(0, Math.min(1, (controls.global?.vibrance ?? 50) / 100));

    this.bloomPass.strength = 0.16 + bloom * 0.64 + glow * 0.22 + audioFrame.overall * 0.18 + audioFrame.beat * 0.28;
    this.bloomPass.radius = 0.16 + bloom * 0.18;
    this.bloomPass.threshold = Math.max(0.14, 0.6 - sharpness * 0.16 - glow * 0.06);

    this.gradePass.uniforms.saturation.value = 0.96 + saturation * 0.24 + vibrance * 0.16;
    this.gradePass.uniforms.contrast.value = 1.0 + contrast * 0.22 + sharpness * 0.08;
    this.gradePass.uniforms.lift.value.set(
      0.006 + glow * 0.01,
      0.007 + glow * 0.012,
      0.011 + glow * 0.018,
    );
    this.gradePass.uniforms.gain.value.set(
      1.0 + sharpness * 0.03,
      1.01 + saturation * 0.04,
      1.03 + vibrance * 0.05 + audioFrame.treble * 0.05,
    );
    this.gradePass.uniforms.vignetteMix.value = 0.06 + contrast * 0.06;
    this.vignettePass.uniforms.offset.value = 1.01 + contrast * 0.06;
    this.vignettePass.uniforms.darkness.value = 0.82 + Math.sin(time * 0.1) * 0.015;
  }

  dispose() {
    this.composer?.dispose?.();
  }
}
