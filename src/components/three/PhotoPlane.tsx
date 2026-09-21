"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { film } from "@/lib/scroll";

/**
 * A photograph as a rare "memory fragment" — reality breaking into the 3D world.
 * Sits barely-visible in the dark, comes up over its narrative window, with a
 * vignette so it melts into the void (never a rounded card / gallery thumbnail).
 * Placeholder texture for now; drop a real image path in `src` later.
 *
 * Rule: 3D = imagination; photography = reality. Used sparingly, on real moments.
 */
function placeholderTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 340;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#14110e";
  ctx.fillRect(0, 0, 512, 340);
  // faint frame + label so it's clearly a placeholder
  ctx.strokeStyle = "rgba(236,236,238,0.18)";
  ctx.lineWidth = 1;
  ctx.strokeRect(8, 8, 496, 324);
  ctx.fillStyle = "rgba(236,236,238,0.28)";
  ctx.font = "500 20px monospace";
  ctx.textAlign = "center";
  ctx.fillText("MEMORY · PHOTO", 256, 170);
  return new THREE.CanvasTexture(c);
}

const vert = /* glsl */ `
  varying vec2 vUv;
  void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
`;
const frag = /* glsl */ `
  precision highp float;
  uniform sampler2D uTex; uniform float uTime; uniform float uOpacity;
  varying vec2 vUv;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
  void main(){
    vec3 col = texture2D(uTex, vUv).rgb;
    // subtle grain so it sits in the world
    col += (hash(vUv*vec2(640.0,420.0)+uTime)-0.5)*0.04;
    // vignette fade so the rectangle melts into the void
    float edge = smoothstep(0.5, 0.28, distance(vUv, vec2(0.5)));
    gl_FragColor = vec4(col, edge * uOpacity);
  }
`;

export default function PhotoPlane({
  from,
  to,
  position = [0, 0, 0],
  size = [3.4, 2.26],
  src,
}: {
  from: number;
  to: number;
  position?: [number, number, number];
  size?: [number, number];
  src?: string;
}) {
  const material = useMemo(() => {
    const tex = placeholderTexture(); // TODO: load real image when `src` provided
    tex.colorSpace = THREE.SRGBColorSpace;
    void src;
    return new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTex: { value: tex },
        uTime: { value: 0 },
        uOpacity: { value: 0 },
      },
    });
  }, [src]);

  const mesh = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const p = film.progress;
    const m = 0.015;
    const o = THREE.MathUtils.smoothstep(p, from, from + m) * (1 - THREE.MathUtils.smoothstep(p, to - m, to));
    material.uniforms.uTime.value = performance.now() / 1000;
    material.uniforms.uOpacity.value = o * 0.9;
    if (mesh.current) mesh.current.visible = o > 0.001;
  });

  return (
    <mesh ref={mesh} material={material} position={position} visible={false} raycast={() => null}>
      <planeGeometry args={size} />
    </mesh>
  );
}
