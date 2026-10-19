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
    contrast: { value: 1.06 },
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
      float vignette = dot(centered, centered) * 1.45;
      color = mix(color, color * (1.0 - vignette * 0.55), vignetteMix);
      gl_FragColor = vec4(color, texel.a);
    }
  `,
};

export class PostProcessingStack {
  constructor(renderer, scene, camera) {
    this.composer = new EffectComposer(renderer);
    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);

    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.58, 0.5, 0.72);
    this.composer.addPass(this.bloomPass);

    this.gradePass = new ShaderPass(GradeShader);
    this.composer.addPass(this.gradePass);

    this.vignettePass = new ShaderPass(VignetteShader);
    this.vignettePass.uniforms.offset.value = 1.02;
    this.vignettePass.uniforms.darkness.value = 0.88;
    this.composer.addPass(this.vignettePass);
  }

  setSize(width, height) {
    this.composer.setSize(width, height);
    this.bloomPass.setSize(width, height);
  }

  apply({ bloom, glow, contrast, sharpness, saturation, vibrance, motionBlur, trails, audioFrame, time }) {
    this.bloomPass.strength =
      0.2
      + bloom * 0.55
      + glow * 0.3
      + audioFrame.overall * 0.18
      + audioFrame.beat * 0.32;
    this.bloomPass.radius = 0.18 + bloom * 0.18 + trails * 0.1 + motionBlur * 0.06;
    this.bloomPass.threshold = Math.max(0.16, 0.58 - sharpness * 0.14 - glow * 0.07);

    this.gradePass.uniforms.saturation.value = 0.94 + saturation * 0.3 + vibrance * 0.18;
    this.gradePass.uniforms.contrast.value = 0.98 + contrast * 0.25 + sharpness * 0.08;
    this.gradePass.uniforms.lift.value.set(
      0.005 + glow * 0.014,
      0.006 + glow * 0.016,
      0.01 + glow * 0.02,
    );
    this.gradePass.uniforms.gain.value.set(
      1.0 + sharpness * 0.03,
      1.01 + saturation * 0.04,
      1.03 + vibrance * 0.07 + audioFrame.high * 0.04,
    );
    this.gradePass.uniforms.vignetteMix.value = 0.06 + contrast * 0.06;

    this.vignettePass.uniforms.offset.value = 1.01 + contrast * 0.05;
    this.vignettePass.uniforms.darkness.value = 0.82 + Math.sin(time * 0.08) * 0.02;
  }

  render(deltaTime) {
    this.composer.render(deltaTime);
  }

  dispose() {
    this.composer?.dispose?.();
  }
}
