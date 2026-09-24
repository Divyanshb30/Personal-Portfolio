import * as THREE from "three";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import type { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

/** Photographs are drawn on this layer too, so a mask of where they are can be rendered on its own. */
export const PHOTO_LAYER = 2;
/** how far in from each edge a photo fades into the dark (in UV) */
export const FEATHER = 0.06;

/**
 * Where the photographs are on screen. Rendered each frame at half resolution (photo quads only, as
 * white, feathered like the photos themselves), it lets the photos skip the bloom and the filmic tone
 * mapping, so they stay exactly the photographs they are.
 */
export function photoMask(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
  const rt = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false });
  const mat = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uF: { value: FEATHER } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uF; varying vec2 vUv;
      void main(){
        float e = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
        float a = smoothstep(0.0, uF, e);
        gl_FragColor = vec4(vec3(a), 1.0);
      }`,
  });
  const clear = new THREE.Color();
  return {
    texture: rt.texture,
    setSize(w: number, h: number) {
      rt.setSize(Math.max(1, Math.round(w / 2)), Math.max(1, Math.round(h / 2)));
    },
    render() {
      const bg = scene.background, ov = scene.overrideMaterial, mask = camera.layers.mask, alpha = renderer.getClearAlpha();
      renderer.getClearColor(clear);
      camera.layers.set(PHOTO_LAYER);
      scene.background = null;
      scene.overrideMaterial = mat;
      renderer.setRenderTarget(rt);
      renderer.setClearColor(0x000000, 1);
      renderer.clear(true, false, false);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.setClearColor(clear, alpha);
      scene.overrideMaterial = ov;
      scene.background = bg;
      camera.layers.mask = mask;
    },
    dispose() {
      rt.dispose();
      mat.dispose();
    },
  };
}

/** Bloom rises only from what isn't a photograph. */
export function maskBloom(bloom: UnrealBloomPass, mask: THREE.Texture) {
  const hp = bloom.materialHighPassFilter;
  hp.uniforms.tMask = { value: mask };
  hp.fragmentShader = hp.fragmentShader
    .replace("uniform float luminosityThreshold;", "uniform float luminosityThreshold;\nuniform sampler2D tMask;")
    .replace("gl_FragColor = mix( outputColor, texel, alpha );", "gl_FragColor = mix( outputColor, texel, alpha ) * ( 1.0 - texture2D( tMask, vUv ).r );");
  hp.needsUpdate = true;
}

/**
 * The last pass: the filmic (ACES) tone mapping for everything the camera sees, except the
 * photographs, which pass through untouched; then linear → sRGB for the screen.
 */
export function finishPass(mask: THREE.Texture, exposure: number) {
  const pass = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, tMask: { value: mask }, uExposure: { value: exposure } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse, tMask; uniform float uExposure; varying vec2 vUv;
      vec3 filmFit(vec3 v){ vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
      vec3 filmic(vec3 c){
        const mat3 IN = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
        const mat3 OUT = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
        c *= uExposure / 0.6; c = IN * c; c = filmFit(c); c = OUT * c; return clamp(c, 0.0, 1.0);
      }
      vec3 toSRGB(vec3 c){ c = clamp(c, 0.0, 1.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
      void main(){
        vec3 c = texture2D(tDiffuse, vUv).rgb; float m = texture2D(tMask, vUv).r;
        gl_FragColor = vec4(toSRGB(mix(filmic(c), c, m)), 1.0);
      }`,
  });
  // ShaderPass clones its uniforms, and a render target's texture can't be cloned: hand it over after
  pass.uniforms.tMask.value = mask;
  return pass;
}
