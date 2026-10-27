import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildTable } from './table.js';
import { buildGarden, SUN } from './garden.js';
import { createRipples, RippleShader } from './ripples.js';
import { env } from '../utils/env.js';
import { clamp } from '../utils/random.js';

/*
 * Hero: the table outdoors, shot like a photograph.
 * A low afternoon sun rakes across the split edge, the polished gabbro
 * mirrors the sky and the blurred garden, the gravel takes a soft shadow.
 * The pointer moves the *camera* a little (a few degrees), so the stone stays
 * planted and the garden slides behind it with real parallax. Over the whole
 * frame, the pointer leaves faint ripples, as if drawn through water.
 */

const STIFFNESS = 6;
const DAMPING = 4.2; // slightly under-damped: settles like a heavy tripod head

class Spring {
  constructor(v = 0) { this.x = v; this.v = 0; this.target = v; }
  step(dt) {
    const n = Math.ceil(dt / (1 / 120));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      this.v += (STIFFNESS * (this.target - this.x) - DAMPING * this.v) * h;
      this.x += this.v * h;
    }
    return this.x;
  }
}

const AZ = -0.42; // camera bearing around the table (radians)

export function createHero(canvas, { table: spec, backdrop = '', onFrame, ripples: wantRipples = true } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  const dpr = Math.min(window.devicePixelRatio, env.lowPower ? 1.5 : 2);
  renderer.setPixelRatio(dpr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.55;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 600);
  const facing = new THREE.Vector3(-Math.sin(AZ), 0, -Math.cos(AZ));

  // Optional real garden photo for the near backdrop layer.
  let photo = null;
  if (backdrop) {
    photo = new THREE.TextureLoader().load(backdrop, () => captureEnv());
    photo.colorSpace = THREE.SRGBColorSpace;
  }
  const garden = buildGarden(scene, { facing, lowPower: env.lowPower, backdrop: photo });

  const table = buildTable({ ...spec, detail: env.lowPower ? 0.8 : 1.3 });
  const pivot = new THREE.Group();
  pivot.add(table.group);
  pivot.rotation.y = 0.18;

  // Reflections: capture the sky, gravel and garden once (without the table)
  // from where the tabletop is, so the polish mirrors its actual surroundings.
  const pmrem = new THREE.PMREMGenerator(renderer);
  let envRT = null;
  function captureEnv() {
    envRT?.dispose();
    // For the reflection only, the hedge stands taller: the black polish should
    // mirror dark foliage, not a bright sky (which turns it glassy blue).
    const [near] = garden.layers;
    const y0 = near.position.y;
    near.scale.y = 1.6;
    near.position.y = y0 * 1.6 + 0.1;
    envRT = pmrem.fromScene(scene, 0.015, 0.1, 500, { size: 256, position: new THREE.Vector3(0, 0.95, 0) });
    near.scale.y = 1;
    near.position.y = y0;
    // Assigned per material on purpose: scene.environment would also flood the
    // gravel with sky light and wash out the sun's shadows.
    table.group.traverse((o) => {
      if (!o.isMesh) return;
      o.material.envMap = envRT.texture;
      o.material.envMapIntensity = o === table.slab ? 0.3 : 0.4;
      o.material.needsUpdate = true;
    });
  }
  // Outdoors the polish reads as stone first, mirror second: a thinner lacquer.
  table.slab.material.clearcoat = 0.35;
  captureEnv();
  scene.add(pivot);
  garden.contact.scale.set(spec.length * 1.15, spec.width * 1.5, 1);
  garden.contact.rotation.z = pivot.rotation.y;

  // ---- post: ripples + tone mapping ---------------------------------------
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const ripples = wantRipples && !env.reducedMotion ? createRipples(renderer, { width: env.lowPower ? 192 : 256 }) : null;
  let ripplePass = null;
  if (ripples) {
    ripplePass = new ShaderPass(RippleShader);
    composer.addPass(ripplePass);
  }
  composer.addPass(new OutputPass());

  // ---- framing ---------------------------------------------------------------
  const state = { intro: 0, scroll: 0, running: false, visible: true, auto: env.touch, portrait: false, dist: 7 };
  const look = new THREE.Vector3(0, 0.55, 0);

  function frame() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    composer.setPixelRatio(dpr);
    composer.setSize(w, h);
    ripples?.resize(w, h);
    camera.aspect = w / h;
    state.portrait = camera.aspect < 1;
    const hfov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect);
    const want = state.portrait ? 0.92 : 0.66;
    state.dist = (spec.length * 0.62) / Math.tan((hfov * want) / 2);
    camera.setViewOffset(w, h, state.portrait ? 0 : -w * 0.03, -h * (state.portrait ? 0.06 : 0.22), w, h);
    camera.updateProjectionMatrix();
  }

  const sx = new Spring(0);
  const sy = new Spring(0);

  function place(vx, vy) {
    const intro = state.intro;
    // A few degrees of camera, nothing more: the garden slides, the stone stays.
    const az = AZ + vx * 0.07 + (1 - intro) * 0.12;
    const el = 0.23 + vy * 0.03 + state.scroll * 0.1 + (1 - intro) * 0.04;
    const dist = state.dist * (1 + (1 - intro) * 0.1 - state.scroll * 0.05);
    camera.position.set(
      look.x + dist * Math.cos(el) * Math.sin(az),
      look.y + dist * Math.sin(el),
      look.z + dist * Math.cos(el) * Math.cos(az)
    );
    camera.lookAt(look);
    renderer.toneMappingExposure = 0.18 + 0.4 * intro; // the morning "opens"
  }

  // ---- annotations ------------------------------------------------------------
  const anchorKeys = Object.keys(table.anchors);
  const tmp = new THREE.Vector3();
  const points = {};
  function project() {
    if (!onFrame) return;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    pivot.updateMatrixWorld();
    for (const k of anchorKeys) {
      tmp.copy(table.anchors[k]).applyMatrix4(pivot.matrixWorld).project(camera);
      points[k] = { x: (tmp.x * 0.5 + 0.5) * w, y: (-tmp.y * 0.5 + 0.5) * h };
    }
    onFrame(points);
  }

  // ---- input --------------------------------------------------------------------
  function toCanvas(e) {
    const r = canvas.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height, r];
  }
  window.addEventListener('pointermove', (e) => {
    const [u, v] = toCanvas(e);
    const inside = u >= 0 && u <= 1 && v >= 0 && v <= 1;
    if (ripples) inside ? ripples.touch(u, v) : ripples.leave();
    if (e.pointerType === 'touch') return;
    sx.target = (e.clientX / window.innerWidth) * 2 - 1;
    sy.target = (e.clientY / window.innerHeight) * 2 - 1;
    state.auto = false;
  }, { passive: true });

  // ---- loop ------------------------------------------------------------------------
  let raf = 0, last = 0, t = 0;
  function render() {
    if (ripples) {
      ripples.step();
      ripplePass.uniforms.uHeight.value = ripples.texture;
      ripplePass.uniforms.uTexel.value.copy(ripples.texel);
    }
    composer.render();
  }
  function tick(now) {
    raf = requestAnimationFrame(tick);
    const dt = Math.min((now - last) / 1000 || 0, 0.1);
    last = now;
    t += dt;
    if (state.auto) {
      sx.target = Math.sin(t * 0.16) * 0.8;
      sy.target = Math.sin(t * 0.11 + 1) * 0.5;
    }
    place(sx.step(dt), sy.step(dt));
    render();
    project();
  }
  function start() {
    if (state.running || !state.visible) return;
    state.running = true;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }
  function stop() {
    state.running = false;
    cancelAnimationFrame(raf);
  }
  const io = new IntersectionObserver(([entry]) => {
    state.visible = entry.isIntersecting;
    state.visible && !document.hidden ? start() : stop();
  });
  io.observe(canvas);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

  function renderStatic() {
    state.intro = 1;
    place(0.2, 0.1);
    composer.render();
    project();
  }

  frame();
  window.addEventListener('resize', () => {
    frame();
    if (!state.running) renderStatic();
  });

  return {
    start,
    stop,
    renderStatic,
    dims: table.dims,
    sun: SUN,
    setIntro: (v) => { state.intro = clamp(v, 0, 1); },
    setScroll: (v) => { state.scroll = clamp(v, 0, 1); },
  };
}
