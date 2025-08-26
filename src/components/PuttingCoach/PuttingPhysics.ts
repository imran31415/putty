interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface PuttingParameters {
  distance: number; // feet
  power: number; // percentage (0-100)
  aimAngle: number; // degrees (-45 to 45)
  greenSlope: number; // percentage (-20 to 20)
  greenSpeed: number; // stimpmeter reading (6-14)
  ballPosition: Vector3;
  holePosition: Vector3;
  windSpeed: number; // mph
  windDirection: number; // degrees
  greenGrain: number; // grain direction in degrees
}

export interface PuttingResult {
  success: boolean;
  finalPosition: Vector3;
  trajectory: Vector3[];
  rollDistance: number;
  timeToHole: number;
  maxHeight: number;
  accuracy: number; // percentage
}

export class PuttingPhysics {
  private gravity = 9.81; // m/s²
  private ballRadius = 0.0214; // meters (golf ball radius)
  private frictionCoefficient = 0.15;
  private airDensity = 1.225; // kg/m³
  private ballMass = 0.0459; // kg (golf ball mass)
  private dragCoefficient = 0.47;

  calculatePutt(params: PuttingParameters): PuttingResult {
    // Convert feet to meters
    const distanceM = params.distance * 0.3048;
    const powerFactor = params.power / 100;

    // Initial velocity calculation based on power and distance
    const baseVelocity = Math.sqrt(2 * this.gravity * distanceM * this.frictionCoefficient);
    const initialVelocity = baseVelocity * powerFactor * this.getPowerMultiplier(params.greenSpeed);

    // Convert aim angle to radians
    const aimRadians = (params.aimAngle * Math.PI) / 180;

    // Initial velocity vector
    const velocity: Vector3 = {
      x: Math.sin(aimRadians) * initialVelocity,
      y: 0.1 * initialVelocity, // Small initial lift
      z: Math.cos(aimRadians) * initialVelocity,
    };

    // Simulate trajectory
    const trajectory = this.simulateTrajectory(
      { x: params.ballPosition.x, y: params.ballPosition.y, z: params.ballPosition.z },
      velocity,
      params
    );

    const finalPosition = trajectory[trajectory.length - 1];
    const distanceToHole = this.distanceBetween(finalPosition, params.holePosition);

    // Success if ball is within hole radius (2.125 inches = 0.054 meters)
    const holeRadius = 0.054;
    const success = distanceToHole <= holeRadius;

    return {
      success,
      finalPosition,
      trajectory,
      rollDistance: this.calculateRollDistance(trajectory),
      timeToHole: trajectory.length * 0.016, // 60fps simulation
      maxHeight: this.getMaxHeight(trajectory),
      accuracy: Math.max(0, 100 - (distanceToHole / holeRadius) * 100),
    };
  }

  private simulateTrajectory(
    position: Vector3,
    velocity: Vector3,
    params: PuttingParameters
  ): Vector3[] {
    const trajectory: Vector3[] = [];
    const deltaTime = 1 / 60; // 60fps
    const maxSteps = 600; // 10 seconds max

    const currentPos = { x: position.x, y: position.y, z: position.z };
    const currentVel = { x: velocity.x, y: velocity.y, z: velocity.z };

    for (let step = 0; step < maxSteps; step++) {
      trajectory.push({ x: currentPos.x, y: currentPos.y, z: currentPos.z });

      // Apply forces
      const forces = this.calculateForces(currentPos, currentVel, params);

      // Update velocity
      const forceScale = deltaTime / this.ballMass;
      currentVel.x += forces.x * forceScale;
      currentVel.y += forces.y * forceScale;
      currentVel.z += forces.z * forceScale;

      // Update position
      currentPos.x += currentVel.x * deltaTime;
      currentPos.y += currentVel.y * deltaTime;
      currentPos.z += currentVel.z * deltaTime;

      // Ground collision
      if (currentPos.y <= this.ballRadius) {
        currentPos.y = this.ballRadius;
        currentVel.y = Math.max(0, -currentVel.y * 0.3); // Bounce with energy loss
      }

      // Stop simulation if ball has stopped
      const velMagnitude = Math.sqrt(
        currentVel.x * currentVel.x + currentVel.y * currentVel.y + currentVel.z * currentVel.z
      );
      if (velMagnitude < 0.01 && currentPos.y <= this.ballRadius + 0.001) {
        trajectory.push({ x: currentPos.x, y: currentPos.y, z: currentPos.z });
        break;
      }

      // Stop if ball goes too far
      if (this.distanceBetween(currentPos, params.ballPosition) > params.distance * 0.3048 * 3) {
        break;
      }
    }

    return trajectory;
  }

  private calculateForces(
    position: Vector3,
    velocity: Vector3,
    params: PuttingParameters
  ): Vector3 {
    const forces: Vector3 = { x: 0, y: 0, z: 0 };

    // Gravity
    forces.y += -this.gravity * this.ballMass;

    // Air resistance (drag)
    const velMagnitude = Math.sqrt(
      velocity.x * velocity.x + velocity.y * velocity.y + velocity.z * velocity.z
    );
    if (velMagnitude > 0) {
      const dragMagnitude =
        0.5 *
        this.airDensity *
        this.dragCoefficient *
        Math.PI *
        this.ballRadius *
        this.ballRadius *
        velMagnitude *
        velMagnitude;
      const dragScale = -dragMagnitude / velMagnitude;
      forces.x += velocity.x * dragScale;
      forces.y += velocity.y * dragScale;
      forces.z += velocity.z * dragScale;
    }

    // Ground friction (when ball is rolling)
    if (position.y <= this.ballRadius + 0.001 && velMagnitude > 0) {
      const frictionMagnitude = this.frictionCoefficient * this.ballMass * this.gravity;
      const frictionScale = -frictionMagnitude / velMagnitude;
      forces.x += velocity.x * frictionScale;
      forces.y += velocity.y * frictionScale;
      forces.z += velocity.z * frictionScale;

      // Green slope effect
      const slopeRadians = (params.greenSlope * Math.PI) / 180;
      forces.z += Math.sin(slopeRadians) * this.ballMass * this.gravity;

      // Green speed effect (faster greens = less friction)
      const speedFactor = Math.max(0.5, 1 - ((params.greenSpeed - 6) / 8) * 0.3);
      forces.x *= speedFactor;
      forces.y *= speedFactor;
      forces.z *= speedFactor;
    }

    // Wind effect (minimal for putting)
    if (params.windSpeed > 0) {
      const windRadians = (params.windDirection * Math.PI) / 180;
      forces.x += Math.sin(windRadians) * params.windSpeed * 0.01;
      forces.z += Math.cos(windRadians) * params.windSpeed * 0.01;
    }

    return forces;
  }

  private getPowerMultiplier(greenSpeed: number): number {
    // Faster greens need less power
    return Math.max(0.7, 1.3 - ((greenSpeed - 6) / 8) * 0.6);
  }

  private calculateRollDistance(trajectory: Vector3[]): number {
    if (trajectory.length < 2) return 0;

    let totalDistance = 0;
    for (let i = 1; i < trajectory.length; i++) {
      totalDistance += this.distanceBetween(trajectory[i], trajectory[i - 1]);
    }

    return totalDistance / 0.3048; // Convert back to feet
  }

  private getMaxHeight(trajectory: Vector3[]): number {
    let maxY = 0;
    for (const point of trajectory) {
      maxY = Math.max(maxY, point.y);
    }
    return maxY;
  }

  private distanceBetween(pos1: Vector3, pos2: Vector3): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = pos1.z - pos2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  // Calculate recommended aim point based on green conditions
  calculateRecommendedAim(params: PuttingParameters): {
    aimAngle: number;
    power: number;
    confidence: number;
  } {
    const baseDistance = params.distance;
    const holeVector = {
      x: params.holePosition.x - params.ballPosition.x,
      y: params.holePosition.y - params.ballPosition.y,
      z: params.holePosition.z - params.ballPosition.z,
    };
    const directDistance =
      Math.sqrt(
        holeVector.x * holeVector.x + holeVector.y * holeVector.y + holeVector.z * holeVector.z
      ) / 0.3048; // Convert to feet

    // Adjust for slope
    let slopeAdjustment = 0;
    if (params.greenSlope !== 0) {
      slopeAdjustment = params.greenSlope > 0 ? -directDistance * 0.1 : directDistance * 0.1;
    }

    // Calculate recommended power (percentage)
    const recommendedPower = Math.min(
      100,
      Math.max(
        10,
        ((directDistance + slopeAdjustment) / baseDistance) * 85 + (params.greenSpeed - 10) * 2
      )
    );

    // Calculate recommended aim angle
    let recommendedAim = 0;
    if (params.greenSlope !== 0) {
      recommendedAim =
        Math.sign(params.greenSlope) * Math.min(10, Math.abs(params.greenSlope) * 0.5);
    }

    // Confidence based on conditions
    const confidence = Math.max(
      30,
      100 -
        Math.abs(params.greenSlope) * 3 -
        Math.abs(params.windSpeed) * 2 -
        Math.abs(directDistance - 10) * 2
    );

    return {
      aimAngle: recommendedAim,
      power: recommendedPower,
      confidence: Math.round(confidence),
    };
  }
}
