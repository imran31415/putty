import React, { useMemo, useRef } from 'react';
import { InstancedMesh, Object3D, Color } from 'three';
import { useFrame } from '@react-three/fiber';

interface TreesProps {
  count?: number;
  spread?: number;
  detailLevel?: number;
  timeOfDay?: 'morning' | 'afternoon' | 'sunset';
}

interface TreeInstance {
  position: [number, number, number];
  scale: [number, number, number];
  rotation: [number, number, number];
  treeType: 'oak' | 'pine' | 'palm';
}

export const Trees: React.FC<TreesProps> = ({
  count = 50,
  spread = 80,
  detailLevel = 2,
  timeOfDay = 'afternoon',
}) => {
  const oakRef = useRef<InstancedMesh>(null);
  const pineRef = useRef<InstancedMesh>(null);
  
  const { oakInstances, pineInstances } = useMemo(() => {
    const oaks: TreeInstance[] = [];
    const pines: TreeInstance[] = [];
    const dummy = new Object3D();

    for (let i = 0; i < count; i++) {
      // Random position in distant background, avoiding putting green area
      const angle = Math.random() * Math.PI * 2;
      const distance = spread + Math.random() * spread;
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;
      
      // Trees should be on background terrain level, much lower than putting green
      const y = -3 + Math.random() * 2;
      
      // Random scale and rotation
      const scale = 0.8 + Math.random() * 0.4;
      const rotationY = Math.random() * Math.PI * 2;
      
      const instance: TreeInstance = {
        position: [x, y, z],
        scale: [scale, scale * (0.8 + Math.random() * 0.4), scale],
        rotation: [0, rotationY, 0],
        treeType: Math.random() > 0.6 ? 'pine' : 'oak',
      };

      if (instance.treeType === 'oak') {
        oaks.push(instance);
      } else {
        pines.push(instance);
      }
    }

    return { oakInstances: oaks, pineInstances: pines };
  }, [count, spread]);

  // Update instanced matrices
  const updateInstancedMesh = (
    mesh: InstancedMesh | null,
    instances: TreeInstance[]
  ) => {
    if (!mesh) return;
    
    const dummy = new Object3D();
    instances.forEach((instance, i) => {
      dummy.position.set(...instance.position);
      dummy.scale.set(...instance.scale);
      dummy.rotation.set(...instance.rotation);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  };

  React.useEffect(() => {
    updateInstancedMesh(oakRef.current, oakInstances);
    updateInstancedMesh(pineRef.current, pineInstances);
  }, [oakInstances, pineInstances]);

  // Get colors based on time of day
  const getTreeColors = () => {
    switch (timeOfDay) {
      case 'morning':
        return {
          oak: { trunk: '#4a3728', leaves: '#2d5016' },
          pine: { trunk: '#3d2e1f', leaves: '#1a3d0a' },
        };
      case 'sunset':
        return {
          oak: { trunk: '#5c4a3a', leaves: '#4a6b2a' },
          pine: { trunk: '#4a3a2b', leaves: '#2d4d1a' },
        };
      default: // afternoon
        return {
          oak: { trunk: '#4a3728', leaves: '#3d6b20' },
          pine: { trunk: '#3d2e1f', leaves: '#2d5016' },
        };
    }
  };

  const colors = getTreeColors();

  // Simple tree geometry based on detail level
  const renderTree = (type: 'oak' | 'pine', instances: TreeInstance[]) => {
    if (instances.length === 0) return null;

    const isOak = type === 'oak';
    const trunkColor = isOak ? colors.oak.trunk : colors.pine.trunk;
    const leavesColor = isOak ? colors.oak.leaves : colors.pine.leaves;

    return (
      <group>
        {/* Tree Trunks */}
        <instancedMesh
          ref={isOak ? oakRef : pineRef}
          args={[undefined, undefined, instances.length]}
          castShadow
        >
          <cylinderGeometry args={[0.3, 0.5, 4, detailLevel >= 2 ? 8 : 6]} />
          <meshLambertMaterial color={trunkColor} />
        </instancedMesh>

        {/* Tree Leaves */}
        <instancedMesh args={[undefined, undefined, instances.length]} castShadow>
          {isOak ? (
            <sphereGeometry args={[3, detailLevel >= 2 ? 8 : 6, detailLevel >= 2 ? 6 : 4]} />
          ) : (
            <coneGeometry args={[2.5, 5, detailLevel >= 2 ? 8 : 6]} />
          )}
          <meshLambertMaterial color={leavesColor} />
        </instancedMesh>
      </group>
    );
  };

  // Remove excessive swaying animation that was causing jumping
  // Trees should be more stable background elements

  return (
    <group name="trees">
      {renderTree('oak', oakInstances)}
      {renderTree('pine', pineInstances)}
    </group>
  );
};