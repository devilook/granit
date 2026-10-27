import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createStoneMaterial } from './stone.js';
import { facet } from './table.js';
import { createNoise } from '../utils/noise.js';
import { mulberry32 } from '../utils/random.js';

/*
 * Stone swatch: a 40 × 40 cm sample seen from above. Moving the pointer turns
 * the studio around it, so window reflections slide across the polish and the
 * raking light moves over the split. Two faces of the same stone:
 *  'polish' — flat mirror polish;
 *  'raw'    — the split face: granular, undulating, with the odd flat flake.
 * Renders on demand only (pointer moves, stone/mode changes), never in a loop.
 */

const SIZE = 0.4; // metres shown
const PLANE = 0.6; // geometry is larger than the view, so no edge is ever seen

function rawGeometry(seed = 5) {
  const { noise2 } = createNoise(mulberry32(seed));
  const geo = new THREE.PlaneGeometry(PLANE, PLANE, 260, 260);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  const fbm = (x, z) => noise2(x, z) * 0.5 + noise2(x * 2.1, z * 2.1) * 0.25 + noise2(x * 4.3, z * 4.3) * 0.125;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    // A split face is granular and gently undulating, with the odd flat
    // conchoidal flake, not a stack of plates.
    const swell = fbm(x * 9, z * 9) * 0.006;
    const ridge = (1 - Math.abs(noise2(x * 16 + 3, z * 16))) * 0.0025;
    const flakes = facet(x, z, 0.05, seed, 0.0005, 0.1);
    const grain = noise2(x * 140, z * 140) * 0.00045 + noise2(x * 300, z * 300) * 0.0002;
    p.setY(i, swell + ridge + flakes + grain - 0.004);
  }
  geo.computeVertexNormals();
  return geo;
}

export function createSwatch(canvas, { stone = 'gabbro', mode = 'polish' } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.setClearColor(0x111513);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.02).texture;
  scene.environmentIntensity = 0.3;
  pmrem.dispose();

  // Nearly top-down, a touch of tilt so the polish can catch the room's windows.
  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 10);
  const placeCamera = () => {
    const d = (SIZE / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / Math.min(1, camera.aspect);
    camera.position.set(0, d * Math.cos(0.32), d * Math.sin(0.32));
    camera.lookAt(0, 0, 0);
  };

  // A low raking key keeps the split legible; the pointer turns the room, so
  // the window reflections slide across the polish (no blown-out hotspot).
  const key = new THREE.DirectionalLight(0xfff4e6, 2.2);
  key.position.set(-1, 0.7, 0.4);
  scene.add(key, new THREE.HemisphereLight(0xdfe6ee, 0x3a3530, 0.9));

  const flat = new THREE.PlaneGeometry(PLANE, PLANE).rotateX(-Math.PI / 2);
  const chipped = rawGeometry();
  const mesh = new THREE.Mesh(flat);
  scene.add(mesh);

  const state = { stone, mode };
  const materials = {};
  function material(key, m) {
    const id = `${key}:${m}`;
    if (!materials[id]) {
      // band = 10 → everything polished; band = −10 → everything split (see stone.js).
      materials[id] = createStoneMaterial(key, { seed: 3, band: m === 'polish' ? 10 : -10 });
    }
    return materials[id];
  }

  function apply() {
    mesh.geometry = state.mode === 'polish' ? flat : chipped;
    mesh.material = material(state.stone, state.mode);
    render();
  }

  let pending = false;
  function render() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      renderer.render(scene, camera);
    });
  }

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    placeCamera();
    render();
  }
  new ResizeObserver(resize).observe(canvas);

  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    const u = (e.clientX - r.left) / r.width - 0.5;
    const v = (e.clientY - r.top) / r.height - 0.5;
    scene.environmentRotation.set(v * 0.5, u * 1.6, 0);
    key.position.set(-1 + u * 0.8, 0.7, 0.4 + v * 0.8);
    render();
  });

  apply();
  resize();

  return {
    setStone(k) { state.stone = k; apply(); },
    setMode(m) { state.mode = m; apply(); },
  };
}
