// Per-project "signature" shader — each project has a distinct ALIVE motion:
//   kind 0 chain      — a pulse travels the chain (sequential activation)
//   kind 1 attention  — token points reorganize; brightness flickers
//   kind 2 streams    — points flow along x; the anomaly lane already offset in geometry
//   kind 3 field      — points near the orb respond/illuminate (retrieval)
//   kind 4 ecosystem  — nodes pulse (network communicating)
// uActivity (0..1) is proximity/hover intensity; uOrbLocal is the orb in local space.

export const sigVert = /* glsl */ `
  uniform float uTime;
  uniform float uActivity;
  uniform float uSize;
  uniform float uKind;
  uniform vec3  uOrbLocal;
  attribute vec3 aRandom;
  varying float vBright;

  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  void main(){
    vec3 p = position;
    float bright = 0.4;

    if (uKind < 0.5) {                 // chain — travelling pulse
      float ph = p.x * 2.2 - uTime * 1.6;
      float pulse = smoothstep(0.55, 1.0, sin(ph) * 0.5 + 0.5);
      bright = 0.3 + pulse * 0.7;
    } else if (uKind < 1.5) {          // attention — reorganize + flicker
      float g = floor(uTime * 1.3);
      p += (vec3(hash(p.xy + g), hash(p.yx + g + 3.0), hash(p.xz + g + 7.0)) - 0.5) * 0.14;
      bright = 0.35 + hash(p.xy + floor(uTime * 2.0)) * 0.55;
    } else if (uKind < 2.5) {          // streams — flow along x
      p.x = mod(p.x + uTime * 0.35 + 1.2, 2.4) - 1.2;
      bright = 0.5 + hash(p.yx) * 0.2;
    } else if (uKind < 3.5) {          // field — respond to the orb
      float d = distance(p, uOrbLocal);
      float resp = smoothstep(1.3, 0.0, d);
      p += normalize(p - uOrbLocal + 0.0001) * resp * 0.12;
      bright = 0.28 + resp * 0.72;
    } else {                           // ecosystem — node pulse
      float ph = length(p) * 3.2 - uTime * 1.1;
      bright = 0.32 + (sin(ph) * 0.5 + 0.5) * 0.5;
    }

    vBright = bright * (0.55 + uActivity * 0.45);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * (0.5 + aRandom.x * 0.8) * (1.0 + uActivity * 0.6) * (14.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

export const sigFrag = /* glsl */ `
  precision highp float;
  uniform vec3 uColor;
  uniform vec3 uColorHot;
  uniform float uOpacity;
  varying float vBright;
  void main(){
    vec2 uv = gl_PointCoord - 0.5;
    float a = smoothstep(0.5, 0.0, length(uv));
    if (a < 0.01) discard;
    vec3 col = mix(uColor, uColorHot, clamp(vBright, 0.0, 1.0));
    gl_FragColor = vec4(col, a * uOpacity * (0.4 + vBright * 0.6));
  }
`;
