/*
Updated to use custom avatar: 68850824dd37b624245261ac.glb
Custom GLB avatar with mouse tracking functionality for hero section
*/

import { useGraph } from "@react-three/fiber";
import { useGLTF, useProgress } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

export function Boy(props) {
  const group = useRef();
  const { progress, total } = useProgress();
  const [isIntroAnimationDone, setIsIntroAnimationDone] = useState(false);
  const [isTouching, setIsTouching] = useState(false);

  const { scene } = useGLTF("/models/68850824dd37b624245261ac.glb");
  const clone = useMemo(() => {
    if (scene) {
      return SkeletonUtils.clone(scene);
    }
    return null;
  }, [scene]);
  
  // Only extract nodes/materials if clone exists
  const { nodes, materials } = clone ? useGraph(clone) : { nodes: {}, materials: {} };

  const mouse = useRef(new THREE.Vector2());

  useGSAP(() => {
    if (progress === 100) {
      gsap.from(group.current.rotation, {
        y: Math.PI,
        duration: 1.5,
        ease: "power1.inOut",
        onComplete: () => {
          setIsIntroAnimationDone(true);
        },
      });
    }
  }, [progress]);

  useEffect(() => {
    if (isIntroAnimationDone) {
      // Unified function to handle both mouse and touch input
      const updateAvatarTracking = (clientX, clientY) => {
        const { innerWidth, innerHeight } = window;
        mouse.current.x = (clientX / innerWidth) * 2 - 1; // Normalize between -1 and 1
        mouse.current.y = -(clientY / innerHeight) * 2 + 1; // Normalize between -1 and 1

        const target = new THREE.Vector3(mouse.current.x, mouse.current.y, 1);
        
        // Try to find head bone for tracking (generic approach)
        const head = group.current?.getObjectByName("Head") || 
                     group.current?.getObjectByName("head") ||
                     group.current?.getObjectByName("mixamorigHead") ||
                     group.current?.getObjectByName("Bip01_Head") ||
                     group.current?.getObjectByName("Wolf3D_Head");
        
        if (head) {
          head.lookAt(target);
        }
        
        // Rotate the whole group slightly based on input position
        if (group.current) {
          group.current.rotation.y = target.x * 0.5;
        }
      };

      // Mouse event handler
      const handleMouseMove = (event) => {
        updateAvatarTracking(event.clientX, event.clientY);
      };

      // Touch event handlers
      const handleTouchMove = (event) => {
        // Only prevent default for single touch to maintain pinch-zoom
        if (event.touches.length === 1) {
          event.preventDefault(); // Prevent scrolling while tracking
          const touch = event.touches[0];
          updateAvatarTracking(touch.clientX, touch.clientY);
        }
      };

      const handleTouchStart = (event) => {
        if (event.touches.length === 1) {
          setIsTouching(true);
          const touch = event.touches[0];
          updateAvatarTracking(touch.clientX, touch.clientY);
        }
      };

      const handleTouchEnd = () => {
        setIsTouching(false);
      };

      // Add event listeners for both mouse and touch
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("touchmove", handleTouchMove, { passive: false });
      window.addEventListener("touchstart", handleTouchStart, { passive: false });
      window.addEventListener("touchend", handleTouchEnd);
      
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("touchmove", handleTouchMove);
        window.removeEventListener("touchstart", handleTouchStart);
        window.removeEventListener("touchend", handleTouchEnd);
      };
    }
  }, [isIntroAnimationDone]);

  // Don't render anything if the model hasn't loaded yet
  if (!clone) {
    return null;
  }

  return (
    <group {...props} ref={group} dispose={null}>
      <primitive object={clone} />
    </group>
  );
}

useGLTF.preload("/models/68850824dd37b624245261ac.glb");
