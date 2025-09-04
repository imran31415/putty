import React, { useMemo } from 'react';
import { GolfCourse, GolfHole, PinPosition } from '../../../types/game';

interface CourseRendererProps {
  course: GolfCourse;
  currentHole: GolfHole;
  currentPin: PinPosition;
  onTerrainUpdate?: (terrainData: any) => void;
  onPhysicsUpdate?: (physicsData: any) => void;
}

export const CourseRenderer: React.FC<CourseRendererProps> = ({
  course,
  currentHole,
  currentPin,
  onTerrainUpdate,
  onPhysicsUpdate,
}) => {
  // Generate terrain mesh from contour data
  const terrainData = useMemo(() => {
    const terrain = generateTerrainFromContours(currentHole.green.contours);
    onTerrainUpdate?.(terrain);
    return terrain;
  }, [currentHole.green.contours, onTerrainUpdate]);

  // Calculate physics properties from terrain
  const physicsData = useMemo(() => {
    const physics = calculatePhysicsFromTerrain(
      currentHole.green.slopes,
      currentHole.green.surface.greenSpeed,
      currentPin.position
    );
    onPhysicsUpdate?.(physics);
    return physics;
  }, [currentHole.green.slopes, currentHole.green.surface.greenSpeed, currentPin.position, onPhysicsUpdate]);

  // Generate hazard meshes
  const hazardData = useMemo(() => {
    return currentHole.hazards.map(hazard => generateHazardMesh(hazard));
  }, [currentHole.hazards]);

  // For now, this component just calculates and passes data
  // The actual 3D rendering still happens in ExpoGL3DView
  return null;
};

// Terrain generation utilities
function generateTerrainFromContours(contours: any[]) {
  // Convert contour points to terrain mesh data
  const terrainMesh = {
    vertices: [] as number[][],
    faces: [] as number[][],
    normals: [] as number[][],
    uvs: [] as number[][]
  };

  // Generate terrain grid from contour points
  for (let i = 0; i < contours.length; i++) {
    const contour = contours[i];
    terrainMesh.vertices.push([contour.x, contour.elevation, contour.y]);
  }

  return {
    mesh: terrainMesh,
    bounds: {
      minX: Math.min(...contours.map(c => c.x)),
      maxX: Math.max(...contours.map(c => c.x)),
      minY: Math.min(...contours.map(c => c.y)),
      maxY: Math.max(...contours.map(c => c.y)),
      minZ: Math.min(...contours.map(c => c.elevation)),
      maxZ: Math.max(...contours.map(c => c.elevation))
    }
  };
}

function calculatePhysicsFromTerrain(slopes: any[], greenSpeed: number, pinPosition: any) {
  // Convert slope data to physics properties
  const physics = {
    greenSpeed,
    slopes: slopes.map(slope => ({
      direction: slope.direction,
      magnitude: slope.magnitude,
      type: slope.type,
      affectedArea: {
        start: slope.startPoint,
        end: slope.endPoint
      }
    })),
    pinPosition: {
      x: pinPosition.x,
      y: pinPosition.y,
      z: pinPosition.z
    },
    surfaceProperties: {
      friction: 0.1 + (greenSpeed / 100), // Faster greens = less friction
      bounce: 0.3,
      roll: 0.8 + (greenSpeed / 50) // Faster greens = more roll
    }
  };

  return physics;
}

function generateHazardMesh(hazard: any) {
  // Generate 3D mesh for hazards
  return {
    type: hazard.type,
    position: hazard.position,
    dimensions: hazard.dimensions,
    material: getHazardMaterial(hazard.type),
    penalty: hazard.penalty
  };
}

function getHazardMaterial(hazardType: string) {
  switch (hazardType) {
    case 'bunker':
      return { color: '#D2B48C', texture: 'sand' };
    case 'water':
      return { color: '#4169E1', texture: 'water' };
    case 'rough':
      return { color: '#228B22', texture: 'grass_rough' };
    case 'out_of_bounds':
      return { color: '#FFFFFF', texture: 'stakes' };
    default:
      return { color: '#808080', texture: 'default' };
  }
}

export default CourseRenderer;
