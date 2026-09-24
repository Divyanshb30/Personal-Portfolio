// Shared GLSL. Keep every multi-statement chunk newline-terminated: these strings are
// spliced into three's shader sources, and a trailing token would fuse with the next line.

/** Value noise and fbm, used for dissolves and flow fields. */
export const GLSL_FN = /* glsl */ `
float h3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
float fbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++){ s += a * vn(p); p *= 2.03; a *= 0.5; } return s; }
vec3 flow(vec3 p){ return vec3(vn(p) - 0.5, vn(p + 17.1) - 0.5, vn(p + 31.7) - 0.5) * 2.0; }
`;

/** The cursor as the dust feels it: grains part around it like water around a hand. */
export const STIR_GLSL = /* glsl */ `
uniform vec2 uMouse; uniform float uStir, uActive, uAspect;
float stir(inout vec4 mv, float depth, float sharp){
  vec4 cp = projectionMatrix * mv; vec2 dm = (cp.xy / cp.w - uMouse) * vec2(uAspect, 1.0); float r2 = dot(dm, dm);
  float f = exp(-r2 * sharp) * uActive; vec2 sw = vec2(-dm.y, dm.x);
  mv.xy += (dm * (1.0 + uStir * 1.4) + sw * uStir * 1.3) * f * depth * 0.09;
  return f;
}
`;

/**
 * On his figure the cursor presses a soft dent: grains under it sink away from the camera and part a
 * little, with a gaussian falloff, so the spot reads as a darker hollow. No ring, no trail. Returns how
 * deep the dent is at this grain (0..1), for the caller to darken it.
 */
export const DENT_GLSL = /* glsl */ `
uniform float uDentR, uDentAmt;
float dent(inout vec4 mv, float amt){
  float a = uDentAmt * amt; if (a < 0.001) return 0.0;
  vec4 cp = projectionMatrix * mv; vec2 q = (cp.xy / cp.w - uMouse) * vec2(uAspect, 1.0);
  float r2 = dot(q, q), w = exp(-r2 / (uDentR * uDentR)) * a;
  if (w < 0.002) return 0.0;
  vec2 dn = q / (sqrt(r2) + 1e-4) * uDentR * 0.45 * w / vec2(uAspect, 1.0);
  float depth = -mv.z;
  mv.x += dn.x * depth / projectionMatrix[0][0]; mv.y += dn.y * depth / projectionMatrix[1][1];
  mv.z -= w * 0.45;
  return w;
}
`;

/** His head turns toward the visitor as one rigid piece, pivoting at the neck. */
export const turnGLSL = (figX: number) => /* glsl */ `
uniform float uYaw, uPitch;
vec3 turnV(vec3 q, float w){ float a = uYaw * w, b = uPitch * w;
  q = vec3(q.x * cos(a) + q.z * sin(a), q.y, -q.x * sin(a) + q.z * cos(a));
  return vec3(q.x, q.y * cos(b) + q.z * sin(b), -q.y * sin(b) + q.z * cos(b)); }
float turnW(vec3 p){ return smoothstep(-0.62, -0.36, p.y); }
vec3 turnP(vec3 p){ vec3 o = vec3(${figX.toFixed(3)}, -0.48, -0.15); return turnV(p - o, turnW(p)) + o; }
`;

/** A soft grain, with an out-of-focus disc when far from the focal plane. */
export const DUST_FRAG = /* glsl */ `
varying vec3 vC; varying float vCoc;
void main(){
  float r = length(gl_PointCoord - 0.5); float sharp = smoothstep(0.5, 0.0, r); sharp *= sharp;
  float disc = smoothstep(0.5, 0.2, r) * 0.55;
  float a = mix(sharp, disc, smoothstep(0.15, 0.5, vCoc)); if (a < 0.003) discard;
  gl_FragColor = vec4(vC * a, a);
}
`;
