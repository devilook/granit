import * as THREE from 'three';

/*
 * Water ripples under the cursor (the classic "ripples" effect, done on the GPU).
 *
 * A small height field (≈256 px wide) lives in two half-float render targets.
 * Every frame: a wave-equation step (each texel is pulled towards the average
 * of its neighbours, with damping), plus a soft "drop" wherever the pointer
 * moved. The scene is then refracted by the slope of that field and gets a
 * faint highlight on the wave crests. Strength is kept low on purpose:
 * the waves should be felt more than seen.
 */

const QUAD_VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

const UPDATE_FRAG = /* glsl */ `
varying vec2 vUv;
uniform sampler2D uState;
uniform vec2 uTexel;
uniform float uDamping;
void main(){
  vec4 s = texture2D(uState, vUv);
  float avg = (
    texture2D(uState, vUv + vec2(uTexel.x, 0.0)).r +
    texture2D(uState, vUv - vec2(uTexel.x, 0.0)).r +
    texture2D(uState, vUv + vec2(0.0, uTexel.y)).r +
    texture2D(uState, vUv - vec2(0.0, uTexel.y)).r) * 0.25;
  s.g += (avg - s.r) * 2.0;   // velocity
  s.g *= uDamping;
  s.r += s.g;                 // height
  s.r *= 0.999;               // let the surface settle back to flat
  gl_FragColor = s;
}`;

const DROP_FRAG = /* glsl */ `
varying vec2 vUv;
uniform sampler2D uState;
uniform vec2 uCenter;
uniform float uRadius;
uniform float uStrength;
uniform float uAspect;
void main(){
  vec4 s = texture2D(uState, vUv);
  vec2 d = (vUv - uCenter) * vec2(uAspect, 1.0);
  float drop = max(0.0, 1.0 - length(d) / uRadius);
  drop = 0.5 - cos(drop * 3.14159265) * 0.5;
  s.r += drop * uStrength;
  gl_FragColor = s;
}`;

// Applied to the rendered scene (tDiffuse is supplied by ShaderPass).
export const RippleShader = {
  uniforms: {
    tDiffuse: { value: null },
    uHeight: { value: null },
    uTexel: { value: new THREE.Vector2() },
    uRefract: { value: 0.45 },
    uShine: { value: 0.3 },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: /* glsl */ `
    varying vec2 vUv;
    uniform sampler2D tDiffuse;
    uniform sampler2D uHeight;
    uniform vec2 uTexel;
    uniform float uRefract;
    uniform float uShine;
    void main(){
      float hx = texture2D(uHeight, vUv + vec2(uTexel.x, 0.0)).r - texture2D(uHeight, vUv - vec2(uTexel.x, 0.0)).r;
      float hy = texture2D(uHeight, vUv + vec2(0.0, uTexel.y)).r - texture2D(uHeight, vUv - vec2(0.0, uTexel.y)).r;
      vec2 slope = vec2(hx, hy);
      vec4 col = texture2D(tDiffuse, vUv + slope * uRefract);
      // A thin glint where the water faces the light (upper-left).
      vec3 n = normalize(vec3(-hx * 6.0, -hy * 6.0, 1.0));
      float spec = pow(max(0.0, dot(n, normalize(vec3(-0.6, 0.8, 0.9)))), 48.0);
      col.rgb += spec * uShine * smoothstep(0.0005, 0.01, length(slope));
      gl_FragColor = col;
    }`,
};

export function createRipples(renderer, { width = 256 } = {}) {
  // Half-float targets are needed for the signed height field.
  const gl = renderer.getContext();
  const ok = renderer.capabilities.isWebGL2 !== false && (gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float'));
  if (!ok) return null;

  let aspect = 1;
  let w = width, h = width;
  const opts = { type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping };
  let read = new THREE.WebGLRenderTarget(w, h, opts);
  let write = read.clone();

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  const scene = new THREE.Scene();
  scene.add(quad);

  const update = new THREE.ShaderMaterial({
    vertexShader: QUAD_VERT,
    fragmentShader: UPDATE_FRAG,
    uniforms: { uState: { value: null }, uTexel: { value: new THREE.Vector2() }, uDamping: { value: 0.986 } },
  });
  const drop = new THREE.ShaderMaterial({
    vertexShader: QUAD_VERT,
    fragmentShader: DROP_FRAG,
    uniforms: { uState: { value: null }, uCenter: { value: new THREE.Vector2() }, uRadius: { value: 0.03 }, uStrength: { value: 0.03 }, uAspect: { value: 1 } },
  });

  const pass = (mat) => {
    mat.uniforms.uState.value = read.texture;
    quad.material = mat;
    renderer.setRenderTarget(write);
    renderer.render(scene, camera);
    [read, write] = [write, read];
  };

  const drops = [];
  const last = { x: -1, y: -1 };

  return {
    resize(cssW, cssH) {
      aspect = cssW / cssH;
      w = width;
      h = Math.max(64, Math.round(width / aspect));
      read.setSize(w, h);
      write.setSize(w, h);
      update.uniforms.uTexel.value.set(1 / w, 1 / h);
      drop.uniforms.uAspect.value = aspect;
    },
    /** u, v in 0..1 (v up). Called on pointer move; spaced drops along the path. */
    touch(u, v) {
      if (last.x >= 0) {
        const dist = Math.hypot((u - last.x) * aspect, v - last.y);
        if (dist < 0.012) return;
        const steps = Math.min(6, Math.floor(dist / 0.012));
        for (let i = 1; i <= steps; i++) drops.push([last.x + ((u - last.x) * i) / steps, last.y + ((v - last.y) * i) / steps]);
      } else drops.push([u, v]);
      last.x = u;
      last.y = v;
    },
    leave() { last.x = last.y = -1; },
    step() {
      const prev = renderer.getRenderTarget();
      while (drops.length) {
        const [u, v] = drops.shift();
        drop.uniforms.uCenter.value.set(u, v);
        pass(drop);
      }
      pass(update);
      renderer.setRenderTarget(prev);
    },
    get texture() { return read.texture; },
    get texel() { return update.uniforms.uTexel.value; },
  };
}
