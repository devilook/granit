import * as THREE from 'three';

/*
 * Procedural granite.
 *
 * One material for the whole slab. The shader decides per pixel whether it is
 * looking at the polished top (y above the edge band) or the split underside:
 *  - polished: low roughness + clearcoat, crystals slightly glossier (mica);
 *  - split:    matte, lighter and desaturated (split granite always reads paler
 *              than polished, the polish "wets" the colour), flat-shaded
 *              facets from screen-space derivatives = chisel marks.
 * The pattern is sampled in object space, so it continues through the stone:
 * the veins you see on top run down into the broken edge.
 */

// Palettes: a = deep base, b = mid cloud, c = feldspar crystals, s = speckle.
// scale = grain size (smaller = coarser), lift = how much paler the split face reads,
// density in kg/m³ (used for the weight shown on the hero).
// Names, deposits and descriptions for the site live in src/config/content.js → STONE_INFO.
// REPLACE_ME: fine-tune the colours against photos of your actual slabs.
export const STONES = {
  // Карельский габбро-диабаз: near-black, very fine and even grain; polishes to a
  // deep black mirror, splits to an ash-grey face with tiny glints.
  gabbro: { a: '#08090a', b: '#0f1112', c: '#1a1d1e', s: '#4c5352', crystal: 0.4, dark: 0.15, speck: 0.22, scale: 16, lift: 4.6, density: 2950 },
  // Лезниковский: medium-grained red granite, pink-red feldspar, grey quartz, black biotite.
  leznikovsky: { a: '#3c1712', b: '#6a2a1f', c: '#93463a', s: '#121011', crystal: 0.7, dark: 0.7, speck: 0.5, scale: 14, lift: 1.25, density: 2650 },
  // Дымовский: warm red-brown granite with black inclusions, medium-coarse grain.
  dymovsky: { a: '#2a1913', b: '#4b2f24', c: '#6d4735', s: '#0d0b0a', crystal: 0.7, dark: 0.65, speck: 0.45, scale: 12, lift: 1.3, density: 2650 },
};

const NOISE_GLSL = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+10.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.5-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 105.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
`;

const GRANITE_GLSL = /* glsl */ `
uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; uniform vec3 uS;
uniform vec3 uAmt;    // x: crystal, y: dark mica, z: bright speckle
uniform float uSeed;
uniform float uScale;
uniform float uBand;  // polished edge band depth (m)
uniform float uLift;  // split face lightening
varying vec3 vStonePos;
float gRaw;
float gCrystal;

vec3 granite(vec3 pos, float raw){
  vec3 p = pos * uScale + uSeed;
  // Anti-alias the finest grain: fade it out where it gets sub-pixel.
  float aa = clamp(1.4 - fwidth(p.x * 30.0 + p.z * 30.0) * 0.9, 0.0, 1.0);

  float clouds = snoise(p * 0.55) * 0.6 + snoise(p * 1.3) * 0.3 + snoise(p * 2.9) * 0.1;
  float mid    = snoise(p * 6.5);
  float grain  = snoise(p * 26.0);
  float grain2 = snoise(p * 52.0 + 3.1);

  // Clouds stay gentle: granite reads even from afar, the life is in the grain.
  vec3 col = mix(uA, uB, 0.4 + 0.6 * smoothstep(-0.45, 0.65, clouds));
  float crystals = smoothstep(0.3, 0.6, mid * 0.6 + grain * 0.5);
  col = mix(col, uC, crystals * uAmt.x);
  float dark = smoothstep(0.5, 0.72, grain2) * aa;
  col = mix(col, uA * 0.4, dark * uAmt.y);
  float bright = smoothstep(0.58, 0.78, -grain2 * 0.7 + grain * 0.5) * aa;
  col = mix(col, uS, bright * uAmt.z);
  gCrystal = bright;

  // Split face: paler, drier, a touch of dust in the crevices.
  float luma = dot(col, vec3(0.333));
  vec3 rawCol = mix(col, vec3(luma), 0.4) * uLift + 0.012;
  return mix(col, rawCol, raw);
}
`;

export function createStoneMaterial(stoneKey, { seed = 1, band = 0.022 } = {}) {
  const st = STONES[stoneKey] || STONES.gabbro;
  const uniforms = {
    uA: { value: new THREE.Color(st.a) },
    uB: { value: new THREE.Color(st.b) },
    uC: { value: new THREE.Color(st.c) },
    uS: { value: new THREE.Color(st.s) },
    uAmt: { value: new THREE.Vector3(st.crystal, st.dark, st.speck) },
    uSeed: { value: (seed * 17.13) % 97 },
    uScale: { value: st.scale || 5 },
    uBand: { value: band },
    uLift: { value: st.lift || 1.3 },
  };

  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.16,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.035,
  });

  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vStonePos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvStonePos = position;');

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${NOISE_GLSL}\n${GRANITE_GLSL}`)
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        gRaw = 1.0 - smoothstep(-uBand - 0.004, -uBand + 0.002, vStonePos.y);
        diffuseColor.rgb = granite(vStonePos, gRaw);`
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor * (1.0 - 0.5 * gCrystal), 0.9, gRaw);`
      )
      .replace(
        '#include <normal_fragment_begin>',
        `#include <normal_fragment_begin>
        if (gRaw > 0.5) {
          // Chisel facets: true flat normals on the split stone only.
          normal = normalize(cross(dFdx(vViewPosition), dFdy(vViewPosition)));
        }`
      )
      .replace(
        '#include <lights_physical_fragment>',
        `#include <lights_physical_fragment>
        material.clearcoat *= (1.0 - gRaw);`
      );
  };
  mat.customProgramCacheKey = () => 'granite-v1';
  return mat;
}

export function createMetalMaterial() {
  // Powder-coated black steel: matte, but not dead: a soft sheen on edges.
  return new THREE.MeshStandardMaterial({ color: 0x0e0e0e, roughness: 0.58, metalness: 0.55 });
}
