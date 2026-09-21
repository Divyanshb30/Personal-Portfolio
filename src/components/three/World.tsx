"use client";

import { Suspense } from "react";
import { Environment, Lightformer, AdaptiveDpr } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import Rig from "./Rig";
import Atmosphere from "./Atmosphere";
import WorldWords from "./WorldWords";
import Constellation from "./Constellation";
import Dtu from "./Dtu";
import PhotoPlane from "./PhotoPlane";
import Post from "./Post";
import ParticleEntity from "./ParticleEntity";
import GLBFigure from "./GLBFigure";
import { useHumanTarget } from "./useHumanTarget";
import { decayEnergy } from "@/lib/scroll";

function EnergyDriver() {
  useFrame((_, delta) => decayEnergy(delta));
  return null;
}

/** Samples the character GLB and feeds the entity (suspends until ready). */
function EntityRig({ count }: { count: number }) {
  const human = useHumanTarget(count);
  return <ParticleEntity human={human} count={count} />;
}

/**
 * The persistent World — one scene for the whole film. Near-total darkness;
 * the entity + light do the chromatic work (material-driven near-black).
 */
export default function World({ tier = 2, reduce = false }: { tier?: number; reduce?: boolean }) {
  const count = tier >= 2 ? 32000 : 12000;
  void reduce;

  return (
    <>
      <color attach="background" args={["#060608"]} />
      <fogExp2 attach="fog" args={["#060608", 0.04]} />

      <ambientLight intensity={0.1} />
      <Environment resolution={tier >= 2 ? 256 : 128}>
        <Lightformer form="rect" intensity={1.6} position={[-4, 3, 3]} scale={[6, 9, 1]} color="#c9d2e6" />
        <Lightformer form="rect" intensity={0.9} position={[4, 1, 2]} scale={[4, 6, 1]} color="#8f9bbb" />
        <Lightformer form="circle" intensity={0.8} position={[0, -3, 3]} scale={4} color="#dfe6f5" />
      </Environment>

      <Rig />
      <Atmosphere tier={tier} />
      <WorldWords tier={tier} />
      <Constellation />
      <Dtu tier={tier} />
      {/* reality breaks into the world during the DTU documentary (placeholder) */}
      <PhotoPlane from={0.61} to={0.645} position={[0.6, 0.1, 1.2]} size={[3.6, 2.4]} />

      <Suspense fallback={null}>
        <EntityRig count={count} />
        <GLBFigure />
      </Suspense>

      <EnergyDriver />
      {tier >= 1 && <AdaptiveDpr pixelated={false} />}
      <Post tier={tier} />
    </>
  );
}
