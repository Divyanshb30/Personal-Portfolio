import * as THREE from "three";
import type { Ctx, Frame, U } from "../ctx";
import type { Key } from "../director";
import { block } from "../ctx";
import { blobGeometry, points, sprite } from "../helpers";
import { R, V, emberAt, gauss, smooth } from "../math";
import { JG } from "../layout";
import { END } from "./journey";

/**
 * NOW. The river pours into a light, and the light is a sun rising over the limb of a dark world
 * (the orb, grown vast). Over it: still building.
 */
export function buildHorizon(ctx: Ctx, riverGain: U<number>) {
  const HR = 14, HPc = END.clone().add(V(2, -14.4, -3)), SUN = END.clone().sub(HPc).normalize();
  let world: THREE.Mesh;
  {
    const mat = new THREE.MeshPhysicalMaterial({ color: 0x030304, metalness: 0, roughness: 0.85, envMapIntensity: 0.12 });
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uSun = { value: SUN };
      sh.vertexShader =
        "varying vec3 vWN;\n" +
        sh.vertexShader.replace("#include <beginnormal_vertex>", "#include <beginnormal_vertex>\nvWN = normalize(mat3(modelMatrix) * objectNormal);\n");
      sh.fragmentShader =
        "varying vec3 vWN; uniform vec3 uSun;\n" +
        sh.fragmentShader.replace(
          "#include <emissivemap_fragment>",
          `#include <emissivemap_fragment>
          vec3 vd = normalize(vViewPosition); float nv = abs(dot(normal, vd)); float side = smoothstep(0.2, 0.97, dot(normalize(vWN), uSun));
          totalEmissiveRadiance += vec3(1.0, 0.46, 0.16) * (pow(1.0 - nv, 7.0) * 2.2 + pow(1.0 - nv, 2.2) * 0.06) * side;
          `,
        );
    };
    world = new THREE.Mesh(blobGeometry(33, 0.02, 0.6, 64), mat);
    world.scale.setScalar(HR);
    world.position.copy(HPc);
    world.visible = false;
    ctx.scene.add(world);
  }
  // a thin atmosphere of dust on the lit edge
  const atmosphere = points(
    ctx,
    26000,
    () => {
      let d: THREE.Vector3;
      do d = V(gauss(), gauss(), gauss()).normalize();
      while (d.dot(SUN) < 0.9);
      return HPc.clone().addScaledVector(d, HR + Math.abs(gauss()) * 0.22);
    },
    () => emberAt(0.05 + R() * 0.4).map((v) => v * 0.16),
    () => 0.02 + R() * 0.05,
    0.2,
  );
  // a sun, not a wash
  const sunGlow = [sprite(ctx, 0xff9a50, 18, END, 0), sprite(ctx, 0xffe2c0, 5, END, 0)];

  const keys: Key[] = [
    { s: 0.835, name: "Out of the river, into the light", pos: END.clone().add(V(-3.5, 3.6, 21)), tgt: END.clone().add(V(-3, 0.2, 0)), fov: 44 },
    { s: 0.865, name: "Horizon", pos: END.clone().add(V(-4.6, 1.5, 15.5)), tgt: END.clone().add(V(-4.4, -0.3, 0)), fov: 36 },
    { s: 0.9, name: "Horizon · slow push", pos: END.clone().add(V(-4.4, 1.35, 14.2)), tgt: END.clone().add(V(-4.3, -0.3, 0)), fov: 36 },
  ];
  const now = block(ctx, "now");

  return {
    keys,
    update(f: Frame) {
      const { GG } = f;
      // the far set stays dark until the film gets near it (a wide phone lens would otherwise catch it early)
      world.visible = atmosphere.pts.visible = GG > 0.74;
      const sun = smooth(JG(0.86), JG(0.95), GG) * (1 - 0.55 * smooth(0.915, 0.95, GG));
      sunGlow[0].material.opacity = 0.3 * sun;
      sunGlow[1].material.opacity = 0.85 * sun;
      sunGlow[0].visible = sunGlow[1].visible = sun > 0.001;
      riverGain.value = smooth(0.3, 0.36, GG) * (1 - 0.85 * smooth(0.91, 0.94, GG));
      now.style.opacity = String(smooth(0.858, 0.872, GG) * (1 - smooth(0.905, 0.918, GG)));
    },
  };
}
