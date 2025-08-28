import { ClubType, CLUB_DATA } from '../../constants/clubData';
import { SWING_CONSTANTS, calculateSpinDecay } from '../../constants/swingConstants';

export interface SwingData {
  club: ClubType;
  power: number; // 50-100
  attackAngle: number; // -5 to +5 degrees
  faceAngle: number; // -10 to +10 degrees (open/closed)
  clubPath: number; // -10 to +10 degrees (in-to-out/out-to-in)
  strikeQuality: number; // 0.7 to 1.0
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface FlightResult {
  trajectory: Vector3[]; // Array of 3D positions
  carry: number; // Yards
  total: number; // Yards with roll
  apex: number; // Feet
  flightTime: number; // Seconds
  ballSpeed: number; // MPH
  launchAngle: number; // Degrees
  spinRate: number; // RPM
  spinAxis: number; // Degrees (tilt of spin)
  landingAngle: number; // Degrees
  success: boolean; // For compatibility with putting
  accuracy: number; // For compatibility with putting (0-100)
}

export class SwingPhysics {
  private swingData: SwingData;
  private clubSpec = CLUB_DATA.driver;

  constructor(swingData: SwingData) {
    this.swingData = swingData;
    this.clubSpec = CLUB_DATA[swingData.club];
  }

  /**
   * Main calculation method - returns full flight trajectory and stats
   */
  public calculateBallFlight(): FlightResult {
    // Calculate initial conditions
    const launchConditions = this.calculateLaunchConditions();

    // Simulate flight trajectory
    const trajectory = this.simulateTrajectory(launchConditions);

    // Calculate flight statistics
    const stats = this.calculateFlightStats(trajectory, launchConditions);

    return stats;
  }

  /**
   * Calculate initial launch conditions based on swing parameters
   */
  private calculateLaunchConditions() {
    const { power, attackAngle, faceAngle, clubPath, strikeQuality } = this.swingData;

    // Club head speed based on power
    // For realistic distances, ensure proper power scaling
    const powerFactor = power / 100;
    const clubSpeed = this.clubSpec.maxClubSpeed * powerFactor;

    // Smash factor - DON'T multiply by strike quality here, it reduces distance too much
    // Strike quality should mainly affect accuracy, not raw distance
    const smashFactor = this.clubSpec.smashFactor;

    // Ball speed in MPH
    const ballSpeedMPH = clubSpeed * smashFactor;

    // Convert to m/s for physics calculations
    const ballSpeed = ballSpeedMPH * SWING_CONSTANTS.MPH_TO_MS;

    console.log('🏌️ Launch conditions:', {
      club: this.swingData.club,
      power: power,
      clubSpeed: clubSpeed.toFixed(1),
      smashFactor: smashFactor.toFixed(2),
      ballSpeedMPH: ballSpeedMPH.toFixed(1),
      expectedDistance: this.clubSpec.typicalDistance * powerFactor,
    });

    // Dynamic loft = static loft + face angle effect + attack angle effect
    const dynamicLoft =
      this.clubSpec.loft +
      faceAngle * 0.3 + // Face angle adds/removes loft
      attackAngle * 0.2; // Attack angle slightly affects loft

    // Launch angle influenced by dynamic loft and attack angle
    const launchAngle = dynamicLoft * 0.85 + attackAngle * 0.75;

    // Spin loft determines spin rate
    const spinLoft = dynamicLoft - attackAngle;

    // Calculate spin rate (RPM)
    let spinRate = this.clubSpec.defaultSpinRate;
    spinRate *= 1 + spinLoft / 30; // Higher spin loft = more spin
    // Don't multiply by strikeQuality for spin - it's already affecting other things
    spinRate = Math.max(1500, Math.min(12000, spinRate)); // Clamp to realistic range

    // Face to path determines side spin / spin axis
    const facePath = faceAngle - clubPath;
    const spinAxis = facePath * 2; // Amplify for more noticeable curve

    // Initial direction influenced mostly by face angle
    const startDirection = faceAngle * 0.85 + clubPath * 0.15;

    return {
      ballSpeed,
      ballSpeedMPH,
      launchAngle,
      spinRate,
      spinAxis,
      startDirection,
    };
  }

  /**
   * Simulate the ball's trajectory through the air
   */
  private simulateTrajectory(launchConditions: any): Vector3[] {
    const { ballSpeed, launchAngle, spinRate, spinAxis, startDirection } = launchConditions;

    const trajectory: Vector3[] = [];

    // Convert angles to radians
    const launchRad = (launchAngle * Math.PI) / 180;
    const directionRad = (startDirection * Math.PI) / 180;
    const spinAxisRad = (spinAxis * Math.PI) / 180;

    // Initial velocity components
    let vx = ballSpeed * Math.cos(launchRad) * Math.sin(directionRad);
    let vy = ballSpeed * Math.sin(launchRad);
    let vz = ballSpeed * Math.cos(launchRad) * Math.cos(directionRad);

    console.log('🚀 Initial velocities:', {
      vx: vx.toFixed(2),
      vy: vy.toFixed(2),
      vz: vz.toFixed(2),
      totalSpeed: Math.sqrt(vx * vx + vy * vy + vz * vz).toFixed(2),
      ballSpeedMS: ballSpeed.toFixed(2),
    });

    // Initial position (0, 0, 0)
    let x = 0,
      y = 0,
      z = 0;

    // Convert spin to rad/s
    const spinRadPerSec = spinRate * SWING_CONSTANTS.RPM_TO_RADS;

    // Simulation loop
    let time = 0;
    const dt = SWING_CONSTANTS.TIME_STEP;
    const maxTime = SWING_CONSTANTS.MAX_FLIGHT_TIME;

    while (time < maxTime && y >= SWING_CONSTANTS.GROUND_LEVEL) {
      // Current velocity magnitude
      const v = Math.sqrt(vx * vx + vy * vy + vz * vz);

      // Drag force (opposes motion)
      const dragMagnitude =
        0.5 *
        SWING_CONSTANTS.DRAG_COEFFICIENT *
        SWING_CONSTANTS.AIR_DENSITY *
        SWING_CONSTANTS.BALL_AREA *
        v *
        v;

      const dragAccel = dragMagnitude / SWING_CONSTANTS.BALL_MASS;

      // Drag acceleration components (opposite to velocity)
      const ax_drag = -(vx / v) * dragAccel;
      const ay_drag = -(vy / v) * dragAccel;
      const az_drag = -(vz / v) * dragAccel;

      // Magnus force (creates lift and curve)
      const currentSpin = calculateSpinDecay(spinRadPerSec, time);

      // Vertical Magnus (backspin creates lift)
      const liftCoeff = SWING_CONSTANTS.LIFT_COEFFICIENT_BASE * (currentSpin / 500);
      const liftMagnitude =
        0.5 * liftCoeff * SWING_CONSTANTS.AIR_DENSITY * SWING_CONSTANTS.BALL_AREA * v * v;
      const ay_magnus = liftMagnitude / SWING_CONSTANTS.BALL_MASS;

      // Horizontal Magnus (side spin creates curve)
      const sideMagnus =
        SWING_CONSTANTS.MAGNUS_COEFFICIENT * currentSpin * v * Math.sin(spinAxisRad);
      const ax_magnus = sideMagnus * Math.cos(directionRad);
      const az_magnus = -sideMagnus * Math.sin(directionRad);

      // Total acceleration
      const ax = ax_drag + ax_magnus;
      const ay = -SWING_CONSTANTS.GRAVITY + ay_drag + ay_magnus;
      const az = az_drag + az_magnus;

      // Update velocity
      vx += ax * dt;
      vy += ay * dt;
      vz += az * dt;

      // Update position
      x += vx * dt;
      y += vy * dt;
      z += vz * dt;

      // Store trajectory point (convert to yards for display)
      trajectory.push({
        x: x * SWING_CONSTANTS.M_TO_YD,
        y: Math.max(0, y * SWING_CONSTANTS.M_TO_FT), // Convert to feet, don't go below ground
        z: z * SWING_CONSTANTS.M_TO_YD,
      });

      time += dt;
    }

    return trajectory;
  }

  /**
   * Calculate flight statistics from trajectory
   */
  private calculateFlightStats(trajectory: Vector3[], launchConditions: any): FlightResult {
    if (trajectory.length === 0) {
      return this.getEmptyResult();
    }

    // Find apex (highest point)
    let apex = 0;
    trajectory.forEach(point => {
      apex = Math.max(apex, point.y);
    });

    // Landing point (last point in trajectory)
    const landingPoint = trajectory[trajectory.length - 1];

    // Carry distance (straight line distance on ground)
    const carry = Math.sqrt(landingPoint.x * landingPoint.x + landingPoint.z * landingPoint.z);

    // Estimate roll based on landing angle and spin
    const landingVelocity = this.estimateLandingVelocity(trajectory);
    const landingAngle = this.calculateLandingAngle(landingVelocity);
    const rollDistance = this.estimateRoll(landingAngle, launchConditions.spinRate);

    // Total distance
    const total = carry + rollDistance;

    console.log('🎯 Flight result:', {
      carry: carry.toFixed(1),
      total: total.toFixed(1),
      targetDistance: this.clubSpec.typicalDistance * (this.swingData.power / 100),
      trajectoryPoints: trajectory.length,
      landingPoint: { x: landingPoint.x.toFixed(1), z: landingPoint.z.toFixed(1) },
    });

    // Flight time
    const flightTime = (trajectory.length - 1) * SWING_CONSTANTS.TIME_STEP;

    // Success and accuracy (for compatibility with putting system)
    // For swing mode, we're not aiming for the hole but for target distance
    // Success means hitting close to intended distance
    const targetDistance = this.clubSpec.typicalDistance * (this.swingData.power / 100);
    const distanceError = Math.abs(carry - targetDistance);
    const accuracy = Math.max(0, 100 - (distanceError / targetDistance) * 100);

    // For swing mode, "success" means hitting within 10% of target distance
    // This is different from putting where success means making it in the hole
    const success = distanceError < targetDistance * 0.1;

    return {
      trajectory,
      carry: Math.round(carry),
      total: Math.round(total),
      apex: Math.round(apex),
      flightTime: Math.round(flightTime * 10) / 10,
      ballSpeed: Math.round(launchConditions.ballSpeedMPH),
      launchAngle: Math.round(launchConditions.launchAngle * 10) / 10,
      spinRate: Math.round(launchConditions.spinRate),
      spinAxis: Math.round(launchConditions.spinAxis),
      landingAngle: Math.round(landingAngle),
      success,
      accuracy,
    };
  }

  /**
   * Estimate landing velocity from trajectory
   */
  private estimateLandingVelocity(trajectory: Vector3[]): Vector3 {
    if (trajectory.length < 2) {
      return { x: 0, y: 0, z: 0 };
    }

    const lastPoint = trajectory[trajectory.length - 1];
    const secondLastPoint = trajectory[trajectory.length - 2];

    return {
      x: (lastPoint.x - secondLastPoint.x) / SWING_CONSTANTS.TIME_STEP,
      y: (lastPoint.y - secondLastPoint.y) / SWING_CONSTANTS.TIME_STEP,
      z: (lastPoint.z - secondLastPoint.z) / SWING_CONSTANTS.TIME_STEP,
    };
  }

  /**
   * Calculate landing angle from velocity
   */
  private calculateLandingAngle(velocity: Vector3): number {
    const horizontalSpeed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
    const angle = Math.atan2(Math.abs(velocity.y), horizontalSpeed);
    return (angle * 180) / Math.PI;
  }

  /**
   * Estimate roll distance based on landing conditions
   */
  private estimateRoll(landingAngle: number, spinRate: number): number {
    // Shallower landing angle = more roll
    // Less spin = more roll
    const angleFactor = Math.max(0, 1 - landingAngle / 60);
    const spinFactor = Math.max(0, 1 - spinRate / 10000);

    // Base roll distance varies by club
    let baseRoll = 20; // yards
    if (this.swingData.club === 'driver') baseRoll = 30;
    else if (this.swingData.club === '3wood') baseRoll = 25;
    else if (this.swingData.club.includes('iron')) baseRoll = 10;
    else baseRoll = 5; // wedges

    return baseRoll * angleFactor * spinFactor * this.swingData.strikeQuality;
  }

  /**
   * Return empty result for error cases
   */
  private getEmptyResult(): FlightResult {
    return {
      trajectory: [],
      carry: 0,
      total: 0,
      apex: 0,
      flightTime: 0,
      ballSpeed: 0,
      launchAngle: 0,
      spinRate: 0,
      spinAxis: 0,
      landingAngle: 0,
      success: false,
      accuracy: 0,
    };
  }
}
