// The particle entity's shaders. `position` = the FROM target, `aTo` = the TO
// target; the entity morphs between them, disperses via noise (disintegration),
// and is pushed by the pointer (the world reacts to the visitor).

export const entityVert = /* glsl */ `
  uniform float uTime;
  uniform float uMorph;        // 0..1 from->to
  uniform float uScatter;      // dispersal amount (humps during transitions)
  uniform float uEnergy;       // scroll energy
  uniform float uSize;
  uniform vec3  uPointer;      // world-ish pointer position
  uniform float uPointerForce;

  attribute vec3 aTo;
  attribute vec3 aRandom;

  varying float vScatter;
  varying float vRnd;

  // Ashima simplex noise
  vec4 permute(vec4 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
  vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v){
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + 2.0*C.xxx;
    vec3 x3 = x0 - 1.0 + 3.0*C.xxx;
    i = mod(i, 289.0);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 1.0/7.0;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m*m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }
  vec3 noise3(vec3 p){
    return vec3(snoise(p), snoise(p + 37.1), snoise(p + 59.7));
  }

  void main(){
    float m = smoothstep(0.0, 1.0, uMorph);
    vec3 base = mix(position, aTo, m);

    // organic dispersal — the disintegration/reform breath on every transition
    vec3 flow = noise3(base * 0.6 + uTime * 0.12 + aRandom * 8.0);
    float sc = uScatter * (0.55 + aRandom.y * 0.9);
    vec3 pos = base + flow * sc;

    // the world reacts to the visitor: gentle repulsion from the pointer
    vec2 toP = pos.xy - uPointer.xy;
    float d = length(toP) + 1e-4;
    pos.xy += (toP / d) * (0.6 / (1.0 + d * d)) * uPointerForce;

    vScatter = clamp(sc, 0.0, 1.5);
    vRnd = aRandom.x;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    // fine dust: ~2-4px points, not 30px blobs
    gl_PointSize = uSize * (0.4 + aRandom.x * 1.1) * (1.0 + uEnergy * 0.5) * (14.0 / -mv.z);
  }
`;

export const entityFrag = /* glsl */ `
  precision highp float;
  uniform vec3 uColor;
  uniform vec3 uColorHot;
  uniform float uOpacity;

  varying float vScatter;
  varying float vRnd;

  void main(){
    // soft round sprite
    vec2 uv = gl_PointCoord - 0.5;
    float r = length(uv);
    float alpha = smoothstep(0.5, 0.0, r);
    if (alpha < 0.01) discard;

    // dispersed points glow a touch hotter and fade — energy made visible
    vec3 col = mix(uColor, uColorHot, clamp(vScatter * 0.7 + vRnd * 0.2, 0.0, 1.0));
    // per-particle brightness variation -> granular dust, not a solid fill
    float grain = 0.3 + 0.7 * vRnd;
    float a = alpha * uOpacity * grain * (1.0 - clamp(vScatter * 0.35, 0.0, 0.6));

    gl_FragColor = vec4(col, a);
  }
`;
