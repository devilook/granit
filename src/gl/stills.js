import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { buildTable, TABLE_HEIGHT } from './table.js';

/*
 * Collection stills. Until real photography exists, every table in the
 * collection is rendered from its own seed: one view of the polished top,
 * one from below into the split. One short-lived renderer, one table at a
 * time, yielding between renders so scrolling never stutters.
 */

const idle = () => new Promise((r) => (window.requestIdleCallback ? requestIdleCallback(r, { timeout: 400 }) : setTimeout(r, 60)));

export async function renderStills(items, { width = 760, height = 920, onItem } = {}) {
  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  pmrem.dispose();

  RectAreaLightUniformsLib.init();
  const sweep = new THREE.RectAreaLight(0xfff0dc, 7, 3.4, 0.34);
  sweep.position.set(-0.4, 2.4, 0.5);
  sweep.lookAt(0, TABLE_HEIGHT, 0);
  const sun = new THREE.DirectionalLight(0xffe6c8, 1.2);
  sun.position.set(2.2, 5, 2.6);
  sun.castShadow = true;
  sun.shadow.mapSize.setScalar(1024);
  sun.shadow.radius = 5;
  Object.assign(sun.shadow.camera, { left: -2.6, right: 2.6, top: 2, bottom: -2, near: 1, far: 12 });
  const rim = new THREE.DirectionalLight(0xa9bccf, 0.6);
  rim.position.set(-3, 1.4, -4);
  const bounce = new THREE.HemisphereLight(0x23231f, 0x8a7a64, 0.9);
  // Shadow-only floor: the card background shows through, the shadow stays.
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.ShadowMaterial({ opacity: 0.38 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(sweep, sun, rim, bounce, floor);

  const camera = new THREE.PerspectiveCamera(26, width / height, 0.05, 60);
  // lookX / lookZ are fractions of the table's half-length / half-width.
  const views = {
    top: { az: -1.05, el: 0.4, lookY: 0.5, fit: 0.8 },
    raw: { az: -0.7, el: -0.11, lookY: 0.7, fit: 0.56 },
    // Close-up running along the long edge: polish above, the split below.
    macro: { az: -1.2, el: 0.11, lookY: 0.68, fit: 0.17, lookX: -0.45, lookZ: 1 },
    // «Классика»: the rolled edge and the trestle, close.
    edge: { az: -0.35, el: 0.1, lookY: 0.62, fit: 0.42, lookX: 0.35, lookZ: 0.6 },
  };

  const shoot = (view, radius, item) => {
    const v = views[view];
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    const dist = (radius / Math.sin(Math.min(vfov, hfov) / 2)) * v.fit;
    const lx = ((v.lookX || 0) * item.length) / 2;
    const lz = ((v.lookZ || 0) * item.width) / 2;
    camera.position.set(lx + dist * Math.cos(v.el) * Math.sin(v.az), Math.max(0.12, v.lookY + dist * Math.sin(v.el)), lz + dist * Math.cos(v.el) * Math.cos(v.az));
    camera.lookAt(lx, v.lookY, lz);
    renderer.render(scene, camera);
    return new Promise((r) => canvas.toBlob((b) => r(URL.createObjectURL(b)), 'image/webp', 0.86));
  };

  for (const item of items) {
    await idle();
    const t = buildTable({ length: item.length, width: item.width, seed: item.seed, stone: item.stone, shape: item.shape, detail: item.detail || 0.85 });
    scene.add(t.group);
    const radius = Math.hypot(item.length / 2, item.width / 2, 0.4);
    const urls = {};
    for (const view of item.views || (item.shape === 'rect' ? ['top', 'edge'] : ['top', 'raw'])) {
      urls[view] = await shoot(view, radius, item);
      await idle();
    }
    scene.remove(t.group);
    t.dispose();
    onItem?.(item, urls);
  }

  renderer.dispose();
  renderer.forceContextLoss();
}
