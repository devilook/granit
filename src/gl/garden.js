import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { mulberry32 } from '../utils/random.js';

/*
 * The garden around the hero table, built like a photograph:
 *  - a physical sky with a low afternoon sun and light clouds;
 *  - a sunlit gravel terrace (procedural texture, receives soft shadows);
 *  - the garden behind, rendered "out of focus": two backdrop layers of
 *    soft foliage masses, flowers and sun glints, as a long lens would see them.
 * The sharp stone in front of a blurred garden is what makes it read as real.
 * Everything here is static, so the polished top can reflect it via one PMREM.
 */

// Sun direction: afternoon from the front-left: it rakes across the split edge
// facing the viewer, and the table's shadow falls back into the garden.
export const SUN = { elevation: 30, azimuth: 292 };

export function sunVector() {
  const phi = THREE.MathUtils.degToRad(90 - SUN.elevation);
  const theta = THREE.MathUtils.degToRad(SUN.azimuth);
  return new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
}

// --- gravel ------------------------------------------------------------------
function gravelTexture(size = 1024, seed = 4) {
  const rand = mulberry32(seed);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = '#b4a991';
  g.fillRect(0, 0, size, size);
  // Pebbles: thousands of small rounded stones in warm beige-greys, each with a
  // lit top and a shadowed bottom so the ground has relief without a normal map.
  const tones = ['#d3c7b0', '#aea38e', '#ddd3c1', '#9c917d', '#c6bca8', '#8e8574', '#e6ddcd'];
  for (let i = 0; i < 14000; i++) {
    const x = rand() * size, y = rand() * size;
    const r = 1.5 + rand() * rand() * 6;
    const draw = (ox, oy) => {
      g.fillStyle = 'rgba(60,50,38,0.35)';
      g.beginPath(); g.ellipse(x + ox + 1, y + oy + 1.6, r, r * 0.8, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = tones[(rand() * tones.length) | 0];
      g.beginPath(); g.ellipse(x + ox, y + oy, r, r * (0.6 + rand() * 0.35), rand() * Math.PI, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,250,235,0.25)';
      g.beginPath(); g.ellipse(x + ox - r * 0.25, y + oy - r * 0.3, r * 0.45, r * 0.3, 0, 0, Math.PI * 2); g.fill();
    };
    draw(0, 0);
    // Wrap at the edges so the texture tiles seamlessly.
    if (x < r * 2) draw(size, 0);
    if (y < r * 2) draw(0, size);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// --- out-of-focus garden ----------------------------------------------------------
const GARDEN_FRAG = /* glsl */ `
varying vec2 vUv;
uniform float uSeed;
uniform float uTop;      // where the foliage line sits (0..1 up the plane)
uniform float uTopVar;   // how ragged the line is
uniform float uSoft;     // defocus: softness of every edge
uniform vec3 uDark, uMid, uLit;
uniform float uFlowers;
uniform float uScaleX;
uniform sampler2D uPhoto;
uniform float uHasPhoto;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1,0)), u.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }

// Soft discs on a jittered grid: flowers and glints, already out of focus.
vec4 bokeh(vec2 uv, float cells, float seed, float size){
  vec2 g = uv * vec2(cells * uScaleX, cells);
  vec2 id = floor(g);
  vec4 acc = vec4(0.0);
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++){
    vec2 c = id + vec2(x, y);
    float h = hash(c + seed);
    if (h > 0.13) continue;
    vec2 p = c + vec2(hash(c * 1.7 + seed), hash(c * 2.3 + seed));
    float r = size * (0.5 + hash(c * 3.1 + seed));
    float d = length(g - p);
    float a = smoothstep(r, r * 0.55, d);
    float t = hash(c * 5.7 + seed);
    vec3 col = t < 0.3 ? vec3(0.86, 0.42, 0.66) : t < 0.5 ? vec3(0.62, 0.46, 0.86) : t < 0.7 ? vec3(0.98, 0.94, 0.86) : t < 0.85 ? vec3(0.95, 0.55, 0.32) : vec3(0.96, 0.82, 0.38);
    acc = max(acc, vec4(col, a));
  }
  return acc;
}

void main(){
  vec2 uv = vUv;
  float line = uTop + (fbm(vec2(uv.x * 5.0 * uScaleX, uSeed)) - 0.5) * uTopVar;
  float alpha = smoothstep(line + uSoft, line - uSoft, uv.y);
  if (alpha < 0.002) discard;

  vec3 col;
  if (uHasPhoto > 0.5) {
    col = texture2D(uPhoto, uv, 3.0).rgb; // mip bias = optical blur
  } else {
    vec2 q = vec2(uv.x * uScaleX, uv.y);
    float masses = fbm(q * 3.2 + uSeed);
    col = mix(uDark, uMid, smoothstep(0.3, 0.75, masses));
    // Sunlit leaves: brighter clumps, more of them towards the top of the hedge.
    float lit = smoothstep(0.55, 0.85, fbm(q * 9.0 + uSeed * 2.0)) * smoothstep(0.0, 0.9, uv.y / max(line, 0.01));
    col = mix(col, uLit, lit * 0.8);
    // Darker hollows between plants.
    col *= 0.7 + 0.3 * smoothstep(0.2, 0.6, fbm(q * 6.0 - uSeed));
    col *= mix(0.35, 1.0, smoothstep(0.0, 0.35, uv.y)); // dark at the foot of the plants
    // Flowers and glints, defocused into discs.
    vec4 f = bokeh(uv, 7.0, uSeed, 0.2);
    col = mix(col, f.rgb * 0.85, f.a * 0.55 * uFlowers * smoothstep(0.05, 0.5, uv.y));
    vec4 s = bokeh(uv + 0.37, 4.0, uSeed + 9.0, 0.16);
    col += vec3(1.0, 0.95, 0.8) * s.a * 0.12 * smoothstep(0.4, 0.9, uv.y / max(line, 0.01));
  }
  gl_FragColor = vec4(col, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

function gardenLayer({ width, height, distance, seed, top, topVar, soft, dark, mid, lit, flowers, photo }) {
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: false,
    uniforms: {
      uSeed: { value: seed },
      uTop: { value: top },
      uTopVar: { value: topVar },
      uSoft: { value: soft },
      uDark: { value: new THREE.Color(dark) },
      uMid: { value: new THREE.Color(mid) },
      uLit: { value: new THREE.Color(lit) },
      uFlowers: { value: flowers },
      uScaleX: { value: width / height },
      uPhoto: { value: photo || null },
      uHasPhoto: { value: photo ? 1 : 0 },
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: GARDEN_FRAG,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
  mesh.userData.distance = distance;
  mesh.position.y = height / 2 - 0.25;
  return mesh;
}

/**
 * Adds sky, sun, ground and garden to `scene`. `facing` is the horizontal
 * direction the camera looks along (backdrops are placed across it).
 */
export function buildGarden(scene, { facing, lowPower = false, backdrop = null } = {}) {
  const sunDir = sunVector();

  const sky = new Sky();
  sky.scale.setScalar(450);
  const u = sky.material.uniforms;
  u.turbidity.value = 3.2;
  u.rayleigh.value = 1.4;
  u.mieCoefficient.value = 0.004;
  u.mieDirectionalG.value = 0.86;
  u.sunPosition.value.copy(sunDir);
  if (u.cloudCoverage) {
    u.cloudCoverage.value = 0.32;
    u.cloudDensity.value = 0.35;
  }
  scene.add(sky);

  // Sun: warm, strong, soft-edged shadows (late afternoon in the south).
  const sun = new THREE.DirectionalLight(0xfff0d8, 9);
  sun.position.copy(sunDir).multiplyScalar(12);
  sun.castShadow = true;
  sun.shadow.mapSize.setScalar(lowPower ? 1024 : 2048);
  sun.shadow.radius = 5;
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.02;
  Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 30 });
  scene.add(sun, sun.target);

  // Sky fill from above, warm bounce from the gravel below (lights the split underside).
  const hemi = new THREE.HemisphereLight(0xbcd3ec, 0xb39f80, 1.6);
  scene.add(hemi);

  // Gravel terrace.
  const tex = gravelTexture(lowPower ? 512 : 1024);
  tex.repeat.set(26, 26);
  tex.anisotropy = 8;
  const groundMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.97, color: 0xfff4e4 });
  // Depth of field on the ground: the further from the table (the focus), the
  // blurrier the gravel, sampled from coarser mip levels, as a lens would.
  groundMat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWorld;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWorld;')
      .replace('#include <map_fragment>', `
        float defocus = smoothstep(1.6, 6.5, length(vWorld.xz));
        vec4 sharp = texture2D(map, vMapUv);
        vec4 soft = texture2D(map, vMapUv, 4.5);
        diffuseColor *= mix(sharp, soft, defocus);
        // Where the gravel meets the hedge: a strip of lawn in the hedge's shade.
        float edge = smoothstep(5.2, 7.4, length(vWorld.xz));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.06, 0.09, 0.04), edge * 0.85);
      `);
  };
  const ground = new THREE.Mesh(new THREE.CircleGeometry(40, 64), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Contact shadow: the occluded gravel right under a 1.5-tonne slab.
  const ao = document.createElement('canvas');
  ao.width = ao.height = 128;
  const ag = ao.getContext('2d');
  const grd = ag.createRadialGradient(64, 64, 4, 64, 64, 64);
  grd.addColorStop(0, 'rgba(0,0,0,0.55)');
  grd.addColorStop(0.6, 'rgba(0,0,0,0.25)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  ag.fillStyle = grd;
  ag.fillRect(0, 0, 128, 128);
  const contact = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(ao), transparent: true, depthWrite: false, toneMapped: false })
  );
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = 0.004;
  scene.add(contact);

  // The garden, out of focus. Near hedge with flowers, far trees against the sky.
  const near = gardenLayer({ width: 30, height: 2.7, distance: 7.5, seed: 3.1, top: 0.8, topVar: 0.3, soft: 0.06,
    dark: '#1d2a17', mid: '#3d5a2a', lit: '#9cb455', flowers: 1, photo: backdrop });
  const far = gardenLayer({ width: 70, height: 7.5, distance: 17, seed: 8.7, top: 0.62, topVar: 0.5, soft: 0.035,
    dark: '#26341f', mid: '#4a6236', lit: '#a9b97a', flowers: 0.15 });
  const dir = new THREE.Vector3(facing.x, 0, facing.z).normalize();
  for (const layer of [far, near]) {
    layer.position.x = dir.x * layer.userData.distance;
    layer.position.z = dir.z * layer.userData.distance;
    layer.lookAt(0, layer.position.y, 0);
    scene.add(layer);
  }

  return { sky, sun, hemi, ground, contact, layers: [near, far], sunDir };
}
