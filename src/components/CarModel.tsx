import { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { MeshTransmissionMaterial, RoundedBox, Cylinder, Environment, ContactShadows, Float, CameraControls } from '@react-three/drei';
import * as THREE from 'three';

export function CarModel({ color }: { color: string }) {
  const [activePart, setActivePart] = useState<string | null>(null);
  const controlsRef = useRef<CameraControls>(null);

  useEffect(() => {
    if (!controlsRef.current) {
      return;
    }

    controlsRef.current.setLookAt(0, 2, 8, 0, 0.85, 0, false);
    controlsRef.current.saveState();
  }, []);

  const handlePointerDown = (e: any, partName: string) => {
    e.stopPropagation();
    if (activePart === partName) {
      // Deselect
      setActivePart(null);
      controlsRef.current?.reset(true);
    } else {
      // Select
      setActivePart(partName);
      controlsRef.current?.fitToBox(e.object, true, { paddingBottom: 1, paddingTop: 1, paddingLeft: 1, paddingRight: 1 });
    }
  };

  const isInactive = (partName: string) => activePart !== null && activePart !== partName;

  // Generic inactive material props
  const inactiveProps = {
    color: '#444444',
    transmission: 0.9,
    opacity: 0.4,
    transparent: true,
    roughness: 0.5,
    metalness: 0.1
  };

  return (
    <>
      <CameraControls ref={controlsRef} makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2} />
      
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5} floatingRange={[-0.05, 0.05]}>
        <group position={[0, 0, 0]}>
          {/* Main Body */}
          <RoundedBox 
            args={[4, 1.2, 2]} radius={0.4} smoothness={4} position={[0, 0.8, 0]}
            onPointerDown={(e) => handlePointerDown(e, 'body')}
          >
            {isInactive('body') ? (
              <MeshTransmissionMaterial {...inactiveProps} />
            ) : (
              <MeshTransmissionMaterial 
                backside backsideThickness={5} thickness={2} roughness={0.2} transmission={1} ior={1.5}
                chromaticAberration={0.04} anisotropy={0.1} clearcoat={1} clearcoatRoughness={0.1} color={color}
              />
            )}
          </RoundedBox>

          {/* Cabin / Roof */}
          <RoundedBox 
            args={[2, 0.8, 1.6]} radius={0.3} smoothness={4} position={[-0.2, 1.6, 0]}
            onPointerDown={(e) => handlePointerDown(e, 'roof')}
          >
            {isInactive('roof') ? (
              <MeshTransmissionMaterial {...inactiveProps} />
            ) : (
              <MeshTransmissionMaterial thickness={1} roughness={0.1} transmission={0.9} ior={1.2} color="#1a1a1a" />
            )}
          </RoundedBox>

          {/* Wheels */}
          {[-1.2, 1.3].map((x, i) => 
            [-1.1, 1.1].map((z, j) => {
              const wheelName = `wheel-${i}-${j}`;
              return (
                <Cylinder 
                  key={wheelName}
                  args={[0.5, 0.5, 0.4, 32]} rotation={[Math.PI / 2, 0, 0]} position={[x, 0.5, z]}
                  onPointerDown={(e) => handlePointerDown(e, wheelName)}
                >
                  {isInactive(wheelName) ? (
                    <meshStandardMaterial color="#444" transparent opacity={0.3} roughness={0.5} />
                  ) : (
                    <meshStandardMaterial color="#111" metalness={0.8} roughness={0.2} />
                  )}
                </Cylinder>
              );
            })
          )}

          {/* Accent Lights */}
          <pointLight position={[-2.1, 0.8, 0]} color="#ff2a2a" intensity={2} distance={5} />
          <pointLight position={[2.1, 0.8, 0]} color="#ffffff" intensity={5} distance={5} />
        </group>
      </Float>

      <Environment preset="city" />
      <ContactShadows position={[0, -0.2, 0]} opacity={0.7} scale={10} blur={2.5} far={4} />
    </>
  );
}
