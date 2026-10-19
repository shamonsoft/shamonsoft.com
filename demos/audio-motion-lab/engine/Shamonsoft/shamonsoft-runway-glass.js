(() => {
  // Isolated GPU surface; the composed app canvas still owns capture/export.
  // Procedural material shading avoids per-frame image warps and texture uploads.
  const vertex = `
    precision highp float;
    attribute vec3 aPosition;
    attribute vec3 aUv;
    uniform vec2 uProjection;
    uniform vec4 uMotion;
    uniform vec4 uGeometry;
    uniform float uSize;
    varying vec3 vWorld;
    varying vec3 vUv;
    void main() {
      float t = aPosition.z / uGeometry.x;
      vec2 p = aPosition.xy * uSize;
      float turn = t * 3.14159265 * uMotion.z;
      p = mat2(cos(turn), sin(turn), -sin(turn), cos(turn)) * p;
      float z = aPosition.z;
      float nearPlane = .005;
      float farPlane = uGeometry.x + 1.0;
      float clipZ = (farPlane + nearPlane) / (farPlane - nearPlane) * z - 2.0 * farPlane * nearPlane / (farPlane - nearPlane);
      gl_Position = vec4(p.x * uProjection.x, -p.y * uProjection.y + .08 * z, clipZ, z);
      vWorld = vec3(aPosition.xy, z);
      vUv = aUv;
    }`;
  const fragment = `
    precision highp float;
    uniform vec4 uMotion;
    uniform vec4 uGeometry;
    uniform vec4 uPalette;
    uniform vec4 uSurface;
    uniform float uPixels;
    varying vec3 vWorld;
    varying vec3 vUv;
    vec3 hsv(float h, float s, float v) {
      vec3 p = abs(fract(vec3(h) + vec3(0.0, .6666667, .3333333)) * 6.0 - 3.0);
      return v * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), s);
    }
    void main() {
      float worldZ = vWorld.z + uMotion.x;
      float localZ = fract(worldZ / uGeometry.y);
      float aa = max(.001, vWorld.z / uPixels);
      float light = .25 + uPalette.y * 1.5;
      float fog = .35 + .65 * exp(-vWorld.z / (uGeometry.x * .45));
      vec3 color;
      float alpha;
      if (vUv.z > .5) {
        // Separate neutral floor: wall hue, lighting palette and wall alpha
        // must never tint it or make it disappear.
        float floorX = vUv.x * 2.0 - 1.0;
        float leftSheen = (floorX + .55) * 2.6;
        float rightSheen = (floorX - .55) * 2.6;
        float sheen = exp(-leftSheen * leftSheen) + exp(-rightSheen * rightSheen);
        color = vec3(.055 + (.04 + sheen * .075) * light);
        float seam = min(localZ, 1.0 - localZ) * uGeometry.y;
        // Recessed panel joints and a restrained metal lip, not glowing bars.
        float joint = 1.0 - smoothstep(.008 - aa, .008 + aa, seam);
        color = mix(color, vec3(.012), joint);
        color += vec3(.045 * light * exp(-abs(seam - .027) / max(.004, aa)));
        float edgeDistance = min(vUv.x, 1.0 - vUv.x) * vUv.y;
        color += vec3(.065 * light * exp(-edgeDistance / max(.008, aa)));
        if (uGeometry.w > .5 && uGeometry.w < 1.5) {
          float lane = fract(vUv.x * 4.0);
          float groove = min(lane, 1.0 - lane) * vUv.y * .25;
          color = mix(color, vec3(.018), (1.0 - smoothstep(.007 - aa, .007 + aa, groove)) * .7);
        } else if (uGeometry.w > 1.5 && uGeometry.w < 2.5) {
          // Seamless obsidian: broad neutral specular ribbons, no panel grid.
          float center = exp(-floorX * floorX * 9.0);
          color = vec3(.018 + light * (sheen * .09 + center * .025));
          color += vec3(.045 * light * exp(-edgeDistance / max(.012, aa)));
        } else if (uGeometry.w > 2.5 && uGeometry.w < 3.5) {
          // Staggered broad slabs with recessed grout, not a fine noisy texture.
          float row = floor(worldZ / uGeometry.y);
          float tileX = vUv.x * 4.0 + mod(row, 2.0) * .5;
          float tile = floor(tileX);
          float shade = mod(tile + row, 2.0);
          color = vec3((.085 + shade * .045) * light + sheen * .018);
          float gapX = min(fract(tileX), 1.0 - fract(tileX)) * vUv.y * .25;
          float grout = 1.0 - smoothstep(.012 - aa, .012 + aa, min(gapX, seam));
          color = mix(color, vec3(.014), grout);
          color += vec3(.024 * light * exp(-abs(min(gapX, seam) - .023) / max(.006, aa)));
        } else if (uGeometry.w > 3.5 && uGeometry.w < 4.5) {
          // Satin metal, bounded fine brushing fades naturally into the distance.
          float brush = .5 + .5 * cos(vUv.x * 180.0);
          float resolved = 1.0 - smoothstep(.003, .02, aa);
          color = vec3((.105 + sheen * .12 + brush * .012 * resolved) * light);
          color = mix(color, vec3(.025), joint * .7);
          color += vec3(.025 * light * exp(-abs(seam - .02) / max(.005, aa)));
        } else if (uGeometry.w > 4.5) {
          // Broad raised ribs with smooth lips; continuous world-space travel.
          float ribZ = fract(worldZ / uGeometry.y * 4.0);
          float ribDistance = min(ribZ, 1.0 - ribZ) * uGeometry.y * .25;
          float groove = 1.0 - smoothstep(.014 - aa, .014 + aa, ribDistance);
          color = vec3((.075 + sheen * .045) * light);
          color = mix(color, vec3(.014), groove);
          color += vec3(.075 * light * exp(-abs(ribDistance - .028) / max(.006, aa)));
        }
        alpha = 1.0;
      } else {
        // Only explicit RGB Flow introduces spatial color. Cycle remains one
        // uniform hue; RGB off stays exactly on the selected slider color.
        float hue = uPalette.x;
        if (uPalette.w > .5) {
          // A lengthwise traveling wave, not a fixed rainbow around the sides.
          // Color motion is separate from panel travel, so it cannot lock to
          // the passing frames. Circumferential tint is only a subtle accent.
          float sideAccent = vWorld.x / max(length(vWorld.xy), .001) * .06;
          hue += vWorld.z * .1 + uPalette.z + sideAccent;
        }
        vec3 tint = hsv(hue, .95, 1.0);
        float d = min(min(vUv.x, 1.0 - vUv.x) * vUv.y, min(localZ, 1.0 - localZ) * uGeometry.y);
        float frame = uSurface.y;
        float metal = 1.0 - smoothstep(frame * .28 - aa, frame * .28 + aa, d);
        float bevel = 1.0 - smoothstep(frame - aa, frame + aa, d);
        float rim = exp(-abs(d - frame * .88) / max(aa, frame * .032));
        float lip = exp(-abs(d - frame * .36) / max(aa, frame * .025));
        // Broad, smooth body shading, not a thin longitudinal reflection
        // stripe. The latter projected as an unwanted ray through every pane.
        float centeredUv = vUv.x * 2.0 - 1.0;
        float bodySheen = 1.0 - centeredUv * centeredUv;
        vec3 interior = tint * (.28 + .075 * bodySheen);
        // Smooth polished borders: no repeating facet/sawtooth bands.
        vec3 glass = tint * .25 + tint * rim * (.55 + uSurface.z * .45);
        glass += mix(tint, vec3(1.0), .65) * lip * .4;
        vec3 steel = vec3(.012) + vec3(.055) * clamp(d / max(frame * .28, .001), 0.0, 1.0);
        steel += mix(tint, vec3(1.0), .5) * exp(-abs(d - frame * .22) / max(aa, frame * .018)) * .22;
        color = mix(mix(interior * light, glass * light, bevel), steel, metal);
        // Opacity alone controls the center. Lighting/fog affect RGB,
        // never opacity: 100% is solid, 0% is clear, bevels stay intact.
        alpha = mix(clamp(uSurface.x, 0.0, 1.0), 1.0, bevel);
        // Glow hugs the physical bevel; it cannot refill a transparent center.
        if (uSurface.w > .5) {
          // Wireframe uses the same continuous perspective and camera clip.
          // No near-camera stroke-width clamps or fixed visible end section.
          float lineWidth = frame * .045;
          float core = 1.0 - smoothstep(lineWidth - aa, lineWidth + aa, d);
          float haloWidth = lineWidth * (1.0 + uSurface.z * 2.0);
          float halo = 1.0 - smoothstep(haloWidth - aa, haloWidth + aa, d);
          alpha = core + halo * (1.0 - core) * uSurface.z * .12;
          color = mix(tint, vec3(1.0), .12) * light;
        }
      }
      color *= fog;
      if (alpha < .002) discard;
      gl_FragColor = vec4(color * alpha, alpha);
    }`;

  class RunwayGlass {
    constructor() {
      this.canvas = document.createElement('canvas');
      const gl = this.gl = this.canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: true, preserveDrawingBuffer: true });
      if (!gl) throw new Error('Tunnel GPU rendering unavailable');
      const compile = (type, source) => {
        const shader = gl.createShader(type); gl.shaderSource(shader, source); gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { gl.deleteShader(shader); throw new Error('Tunnel material shader unavailable'); }
        return shader;
      };
      const vs = compile(gl.VERTEX_SHADER, vertex), fs = compile(gl.FRAGMENT_SHADER, fragment);
      const program = this.program = gl.createProgram(); gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
      gl.deleteShader(vs); gl.deleteShader(fs);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Tunnel material program unavailable');
      this.buffer = gl.createBuffer(); this.uniforms = {};
      for (const name of ['uProjection', 'uMotion', 'uGeometry', 'uSize', 'uPalette', 'uSurface', 'uPixels']) this.uniforms[name] = gl.getUniformLocation(program, name);
      this.position = gl.getAttribLocation(program, 'aPosition'); this.uv = gl.getAttribLocation(program, 'aUv');
      this.canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); this.lost = true; });
      this.canvas.addEventListener('webglcontextrestored', () => { this.lost = true; }); // parent safely falls back
    }
    draw(p) {
      const gl = this.gl;
      if (this.lost || gl.isContextLost()) return false;
      const key = JSON.stringify([p.cross, p.far, p.floor, p.floorGeometry]);
      if (key !== this.key) {
        const data = [], cross = p.cross, sides = cross.length;
        const put = (point, z, u, span, kind) => data.push(point.x, point.y, z, u, span, kind);
        const quad = (a, b, far, near, kind) => {
          const span = Math.hypot(b.x - a.x, b.y - a.y);
          put(a, far, 0, span, kind); put(b, far, 1, span, kind); put(b, near, 1, span, kind);
          put(a, far, 0, span, kind); put(b, near, 1, span, kind); put(a, near, 0, span, kind);
        };
        const slices = 32;
        for (let i = slices; i > 0; i--) {
          const far = .009 * Math.pow(p.far / .009, i / slices), near = .009 * Math.pow(p.far / .009, (i - 1) / slices);
          for (let j = 0; j < sides; j++) quad(cross[j], cross[(j + 1) % sides], far, near, 0);
        }
        if (p.floor !== 'None') {
          const a = { x: -p.floorGeometry[1], y: p.floorGeometry[0] }, b = { x: p.floorGeometry[1], y: p.floorGeometry[0] };
          for (let i = slices; i > 0; i--) quad(a, b, .009 * Math.pow(p.far / .009, i / slices), .009 * Math.pow(p.far / .009, (i - 1) / slices), 1);
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
        this.count = data.length / 6; this.key = key;
      }
      if (this.canvas.width !== p.width || this.canvas.height !== p.height) { this.canvas.width = p.width; this.canvas.height = p.height; }
      gl.viewport(0, 0, p.width, p.height); gl.clearColor(0, 0, 0, 0); gl.clearDepth(1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(this.program); gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      gl.enableVertexAttribArray(this.position); gl.vertexAttribPointer(this.position, 3, gl.FLOAT, false, 24, 0);
      gl.enableVertexAttribArray(this.uv); gl.vertexAttribPointer(this.uv, 3, gl.FLOAT, false, 24, 12);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.disable(gl.CULL_FACE);
      const u = this.uniforms, unit = Math.min(p.width, p.height);
      gl.uniform2f(u.uProjection, unit * .96 / p.width, unit * .96 / p.height);
      gl.uniform4f(u.uMotion, p.distance, 0, p.twist, 0);
      const floorStyle = ({ Grid: 1, Obsidian: 2, 'Stone tiles': 3, 'Brushed metal': 4, 'Ribbed deck': 5 })[p.floor] || 0;
      gl.uniform4f(u.uGeometry, p.far, p.spacing, 0, floorStyle);
      gl.uniform1f(u.uSize, p.size * (1 + p.audio * .025));
      gl.uniform4f(u.uPalette, p.hue / 360, p.brightness, p.flowPhase || 0, p.flow ? 1 : 0);
      const opacity = Number.isFinite(p.opacity) ? Math.max(0, Math.min(1, p.opacity)) : 1;
      gl.uniform4f(u.uSurface, opacity, .035 + p.thickness * .012, p.glow, p.wireframe ? 1 : 0);
      gl.uniform1f(u.uPixels, Math.max(1, unit * .48));
      gl.drawArrays(gl.TRIANGLES, 0, this.count);
      return true;
    }
    destroy() { this.gl.deleteBuffer(this.buffer); this.gl.deleteProgram(this.program); this.canvas.width = this.canvas.height = 1; }
  }
  window.__shamonsoftRunwayGlass = RunwayGlass;
})();
