/*
Updated to use custom avatar: 68850824dd37b624245261ac.glb
Custom avatar with Capoeira animation for contact section
*/

import { useGraph } from "@react-three/fiber";
import { useAnimations, useFBX, useGLTF } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";
import { useEffect, useMemo, useRef } from "react";

export function ContactBoy(props) {
  const group = useRef();

  const { scene } = useGLTF("/models/68850824dd37b624245261ac.glb");
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { nodes, materials } = useGraph(clone);

  const { animations } = useFBX("/models/Capoeira.fbx");
  animations[0].name = "Capoeira";
  const action = useAnimations(animations, group);

  useEffect(() => {
    action.actions["Capoeira"]?.play();
  }, [action.actions]);

  return (
    <group {...props} ref={group} dispose={null}>
      <primitive object={clone} />
    </group>
  );
}

useGLTF.preload("/models/68850824dd37b624245261ac.glb");
