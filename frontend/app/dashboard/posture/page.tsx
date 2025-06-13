"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useRef } from "react";
import { useControls } from "leva";
import * as THREE from "three";

function Model() {
  const { scene, nodes } = useGLTF("/assets/scene.gltf") as any;
  const skeletonHelperRef = useRef<THREE.SkeletonHelper | null>(null);
  const headBoneRef = useRef<THREE.Bone | null>(null);

  // Log all nodes to find bone names
  useEffect(() => {
    console.log("GLTF nodes:", nodes);
    // Try to find and log all bones
    scene.traverse((obj: any) => {
      if (obj.isBone) {
        console.log("Bone:", obj.name);
      }
    });
  }, [nodes, scene]);

  // Find the head bone by name (replace "Head" with your bone's name)
  useEffect(() => {
    const found = scene.getObjectByName("Head");
    if (found && found.isBone) {
      headBoneRef.current = found as THREE.Bone;
    }
  }, [scene]);

  // Leva controls for interactive rotation
  const { headRotationY } = useControls({
    headRotationY: {
      value: 0,
      min: -Math.PI,
      max: Math.PI,
      step: 0.01,
      label: "Head Y Rotation",
    },
  });

  // Apply rotation to the head bone every frame
  useFrame(() => {
    if (headBoneRef.current) {
      headBoneRef.current.rotation.y = headRotationY;
    }
  });

  // Add a skeleton helper for visualization
  useEffect(() => {
    if (scene && !skeletonHelperRef.current) {
      const helper = new THREE.SkeletonHelper(scene);
      skeletonHelperRef.current = helper;
      scene.add(helper);
      return () => {
        scene.remove(helper);
      };
    }
  }, [scene]);

  // Rotate spine bone
  useEffect(() => {
    const spine = nodes.Spine;
    if (spine) {
      spine.rotation.x += THREE.MathUtils.degToRad(30); // Rotate 30 degrees around X axis
    }
  }, [nodes]);

  return <primitive object={scene} />;
}

export default function ModelViewer() {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Canvas camera={{ position: [2, 2, 4], fov: 50 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 10, 7]} intensity={0.5} />
        <Suspense fallback={null}>
          <Model />
          <OrbitControls />
        </Suspense>
      </Canvas>
    </div>
  );
}
