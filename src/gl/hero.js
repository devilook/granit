import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { buildTable, TABLE_HEIGHT } from './table.js';
import { env } from '../utils/env.js';
import { clamp, lerp } from '../utils/random.js';

/*
 * Hero: the table as an object on a plinth of darkness.
 * The pointer moves it only a little (≈ ±12° of turn, ±4° of tilt): enough to
 * feel the weight, never enough to become a 3D viewer. What travels further
 * is the light: a long softbox reflected in the polish slides across the stone.
 * Three anchors (polish, split, steel) are projected to screen every frame
 * so the annotations stay pinned to the real geometry.
 */

const STIFFNESS = 6;
const DAMPING = 4.2; // slightly under-damped: the stone overshoots by a hair, then settles

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

export function createHero(canvas, { table: spec, onFrame } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, env.lowPower ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.2;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 60);

  const table = buildTable({ ...spec, detail: env.lowPower ? 0.8 : 1.3 });
  const pivot = new THREE.Group(); // the table turns, the world stays
  pivot.add(table.group);
  scene.add(pivot);

  // Contact shadow only: the dark card is the floor.
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.ShadowMaterial({ opacity: 0.55 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // The softbox whose reflection we see in the polish (mirrored through the hit point).
  RectAreaLightUniformsLib.init();
  const sweep = new THREE.RectAreaLight(0xfff1df, 0, 2.6, 0.16);
  scene.add(sweep);
  const hit = new THREE.Vector3();

  // Top light: soft shadows under the slab, a warm graze over the split.
  const sun = new THREE.DirectionalLight(0xffe7cc, 0);
  sun.position.set(1.8, 5, 2.4);
  sun.castShadow = true;
  sun.shadow.mapSize.setScalar(env.lowPower ? 1024 : 2048);
  sun.shadow.radius = 8;
  sun.shadow.bias = -0.0004;
  Object.assign(sun.shadow.camera, { left: -2.6, right: 2.6, top: 2, bottom: -2, near: 1, far: 12 });
  scene.add(sun);
  // Low raking light from the side: this is what makes the chips read.
  const rake = new THREE.DirectionalLight(0xffd9b0, 0);
  rake.position.set(-4, 0.9, 2.2);
  scene.add(rake);
  const rim = new THREE.DirectionalLight(0x9fc0b0, 0);
  rim.position.set(2, 1.6, -4);
  scene.add(rim);
  const bounce = new THREE.HemisphereLight(0x2a302c, 0x6f6352, 0);
  scene.add(bounce);

  // ---- framing ---------------------------------------------------------------
  const state = { intro: 0, scroll: 0, running: false, visible: true, auto: env.touch, pointerAt: 0, portrait: false, dist: 6 };
  const look = new THREE.Vector3(0, 0.56, 0);

  function frame() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    state.portrait = camera.aspect < 1;
    // Fit the table's length to ~60% of the card width.
    const hfov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect);
    const want = state.portrait ? 0.95 : 0.74;
    state.dist = (spec.length * 0.62) / Math.tan((hfov * want) / 2);
    // Sit the table in the lower-middle of the card, under the headline.
    camera.setViewOffset(w, h, state.portrait ? 0 : -w * 0.035, -h * (state.portrait ? 0.02 : 0.13), w, h);
    camera.updateProjectionMatrix();
  }

  const sx = new Spring(0);
  const sy = new Spring(0);

  function place(vx, vy, t) {
    const intro = state.intro;
    // Small, heavy motion. The table turns; the camera barely moves.
    pivot.rotation.y = vx * 0.2 + Math.sin(t * 0.25) * 0.015 + (1 - intro) * -0.35;
    const el = 0.3 + vy * 0.07 + state.scroll * 0.16 + (1 - intro) * 0.08;
    const az = -0.42;
    const dist = state.dist * (1 + (1 - intro) * 0.12 - state.scroll * 0.06);
    camera.position.set(
      look.x + dist * Math.cos(el) * Math.sin(az),
      look.y + dist * Math.sin(el),
      look.z + dist * Math.cos(el) * Math.cos(az)
    );
    camera.lookAt(look);

    // The light travels further than the stone: that is the luxury.
    hit.set(vx * 0.9, TABLE_HEIGHT, 0);
    sweep.position.set(2 * hit.x - camera.position.x, camera.position.y + 0.3, 2 * hit.z - camera.position.z);
    sweep.lookAt(hit);
    scene.environmentRotation.y = vx * 0.6;

    sweep.intensity = 2.2 * intro;
    sun.intensity = 1.2 * intro;
    rake.intensity = (0.9 + vx * 0.35) * intro;
    rim.intensity = 0.6 * intro;
    bounce.intensity = 0.9 * intro;
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
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    sx.target = (e.clientX / window.innerWidth) * 2 - 1;
    sy.target = (e.clientY / window.innerHeight) * 2 - 1;
    state.pointerAt = performance.now();
    state.auto = false;
  }, { passive: true });

  // ---- loop ------------------------------------------------------------------------
  let raf = 0, last = 0, t = 0;
  function tick(now) {
    raf = requestAnimationFrame(tick);
    const dt = Math.min((now - last) / 1000 || 0, 0.1);
    last = now;
    t += dt;
    if (state.auto) {
      // Phones: the stone breathes on its own, slowly.
      sx.target = Math.sin(t * 0.18) * 0.8;
      sy.target = Math.sin(t * 0.13 + 1) * 0.5;
    }
    place(sx.step(dt), sy.step(dt), t);
    renderer.render(scene, camera);
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
    place(0.25, 0.1, 0);
    renderer.render(scene, camera);
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
    setIntro: (v) => { state.intro = clamp(v, 0, 1); },
    setScroll: (v) => { state.scroll = lerp(0, 1, v); },
  };
}
