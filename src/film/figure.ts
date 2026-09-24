import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { V } from "./math";

export type Figure = {
  geo: THREE.BufferGeometry;
  /** the mesh in its raw model space (no transform), for surface sampling */
  mesh: THREE.Mesh;
  center: THREE.Vector3;
  scale: number;
  /** place the figure, 2.9 units tall, centred on (x, y, z) */
  matrixAt: (x: number, y: number, z: number) => THREE.Matrix4;
};

/** Loads his model once; everything else samples its surface. */
export async function loadFigure(url = "/models/divyansh.glb"): Promise<Figure> {
  const loader = new GLTFLoader();
  const draco = new DRACOLoader();
  draco.setDecoderPath("/draco/");
  loader.setDRACOLoader(draco);
  const gltf = await loader.loadAsync(url);
  draco.dispose();
  let best: THREE.Mesh | null = null;
  let bc = 0;
  gltf.scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && m.geometry.attributes.position.count > bc) {
      bc = m.geometry.attributes.position.count;
      best = m;
    }
  });
  if (!best) throw new Error("figure: no mesh");
  const geo = (best as THREE.Mesh).geometry;
  if (!geo.attributes.normal) geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo);
  const box = new THREE.Box3().setFromObject(mesh);
  const center = box.getCenter(V());
  const scale = 2.9 / box.getSize(V()).y;
  const matrixAt = (x: number, y: number, z: number) =>
    new THREE.Matrix4().makeTranslation(x, y, z).multiply(new THREE.Matrix4().makeScale(scale, scale, scale)).multiply(new THREE.Matrix4().makeTranslation(-center.x, -center.y, -center.z));
  return { geo, mesh, center, scale, matrixAt };
}
