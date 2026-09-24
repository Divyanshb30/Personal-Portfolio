import * as THREE from "three";

export const TAU = Math.PI * 2;
export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const UP = V(0, 1, 0);

/** Seeded PRNG, so the film builds the same world on every load. */
export function rng(seed: number) {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const R = rng(12);
export const gauss = (r: () => number = R) => {
  let u = 0,
    v = 0;
  while (!u) u = r();
  while (!v) v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
};

const perm = new Uint8Array(512);
{
  const p = [...Array(256).keys()];
  const r = rng(7);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
}
const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
function grad(h: number, x: number, y: number, z: number) {
  h &= 15;
  const u = h < 8 ? x : y,
    v = h < 4 ? y : h === 12 || h === 14 ? x : z;
  return (h & 1 ? -u : u) + (h & 2 ? -v : v);
}
/** Classic Perlin noise. */
export function noise(x: number, y: number, z: number) {
  const X = Math.floor(x) & 255,
    Y = Math.floor(y) & 255,
    Z = Math.floor(z) & 255;
  x -= Math.floor(x);
  y -= Math.floor(y);
  z -= Math.floor(z);
  const u = fade(x),
    v = fade(y),
    w = fade(z);
  const A = perm[X] + Y,
    AA = perm[A] + Z,
    AB = perm[A + 1] + Z,
    B = perm[X + 1] + Y,
    BA = perm[B] + Z,
    BB = perm[B + 1] + Z;
  return lerp(
    lerp(lerp(grad(perm[AA], x, y, z), grad(perm[BA], x - 1, y, z), u), lerp(grad(perm[AB], x, y - 1, z), grad(perm[BB], x - 1, y - 1, z), u), v),
    lerp(lerp(grad(perm[AA + 1], x, y, z - 1), grad(perm[BA + 1], x - 1, y, z - 1), u), lerp(grad(perm[AB + 1], x, y - 1, z - 1), grad(perm[BB + 1], x - 1, y - 1, z - 1), u), v),
    w
  );
}
export const fbm = (x: number, y: number, z: number, o = 2) => {
  let s = 0,
    a = 0.5,
    f = 1;
  for (let i = 0; i < o; i++) {
    s += a * noise(x * f, y * f, z * f);
    f *= 2.03;
    a *= 0.5;
  }
  return s;
};

export const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export const smoother = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
export const clamp = THREE.MathUtils.clamp;
/** Inverse of smoothstep on [0,1]: which input gives this eased output. */
export const invSmooth = (y: number) => {
  let lo = 0,
    hi = 1;
  for (let k = 0; k < 30; k++) {
    const m = (lo + hi) / 2;
    if (m * m * (3 - 2 * m) < y) lo = m;
    else hi = m;
  }
  return lo;
};

/** The ember palette: bright core to deep rust. */
const EMBER = [
  [1.0, 0.86, 0.66],
  [1.0, 0.62, 0.3],
  [0.86, 0.38, 0.15],
  [0.45, 0.17, 0.06],
];
export const emberAt = (t: number): [number, number, number] => {
  t = Math.max(0, Math.min(0.999, t));
  const f = t * 3,
    i = Math.floor(f),
    k = f - i;
  return EMBER[i].map((c, j) => c + (EMBER[i + 1][j] - c) * k) as [number, number, number];
};
export const COOL: [number, number, number] = [0.6, 0.66, 0.88];
