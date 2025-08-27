# Swing Mode Design Document

## Executive Summary
Swing Mode extends Putty's capabilities beyond putting to full golf shots with realistic ball flight physics. While maintaining the intuitive interface of Putt Mode, Swing Mode introduces arced trajectories, spin effects, and comprehensive shot shaping controls based on real golf physics.

## Core Concept
Just as Putt Mode simulates the physics of a rolling golf ball, Swing Mode will simulate the complete aerodynamic flight of a golf ball including:
- Initial launch conditions (speed, angle, spin)
- Magnus effect (lift from spin)
- Drag forces
- Gravity
- Wind effects (future enhancement)

## Physics Model

### Primary Input Variables

#### 1. **Club Selection**
Different clubs provide different characteristics:
- **Driver**: 8-12° loft, longest distance, lowest spin
- **3 Wood**: 15° loft, high distance, moderate spin
- **5 Iron**: 27° loft, medium distance, medium spin
- **7 Iron**: 34° loft, medium-short distance, higher spin
- **9 Iron**: 42° loft, short distance, high spin
- **Pitching Wedge**: 46° loft, very short distance, very high spin
- **Sand Wedge**: 56° loft, specialty shots, maximum spin

#### 2. **Swing Power** (0-100%)
- Determines club head speed
- Scales from 50% to 100% of maximum club speed
- Affects ball speed through smash factor

#### 3. **Attack Angle** (-5° to +5°)
- Positive = hitting up (optimal for driver)
- Negative = hitting down (optimal for irons)
- Zero = level strike
- Affects launch angle and spin rate

#### 4. **Club Face Angle** (-10° to +10°)
- Open face (+) = ball starts right, adds loft
- Closed face (-) = ball starts left, reduces loft
- Square (0) = straight at target

#### 5. **Club Path** (-10° to +10°)
- In-to-out (+) = draw bias
- Out-to-in (-) = fade bias
- Straight (0) = no curve tendency

#### 6. **Strike Quality** (0.0 to 1.0)
- Represents center-face contact
- 1.0 = perfect center strike
- Lower values reduce distance and add spin

### Calculated Physics Parameters

#### Ball Speed
```
ballSpeed = clubSpeed × smashFactor × strikeQuality
smashFactor = 1.50 (driver) to 1.30 (wedge)
```

#### Launch Angle
```
launchAngle = clubLoft + (attackAngle × 0.75) + dynamicLoftAdjustment
dynamicLoftAdjustment = based on shaft lean and face angle
```

#### Spin Rate (RPM)
```
baseSpinRate = 2500 (driver) to 9000 (wedge)
spinRate = baseSpinRate × (1 + spinLoft/30) × strikeQuality
spinLoft = dynamicLoft - attackAngle
```

#### Spin Axis (side spin)
```
spinAxis = (facePath × 0.5) degrees
where facePath = faceAngle - clubPath
Positive = fade/slice spin
Negative = draw/hook spin
```

### Ball Flight Trajectory Calculation

#### Forces Acting on Ball
1. **Gravity**: -9.81 m/s² downward
2. **Drag Force**: Fd = 0.5 × Cd × ρ × A × v²
   - Cd = 0.25 (dimpled golf ball)
   - ρ = air density (1.225 kg/m³)
   - A = cross-sectional area
   - v = velocity

3. **Magnus Force** (lift from spin): Fm = 0.5 × Cl × ρ × A × v²
   - Cl = lift coefficient (function of spin rate)

#### 3D Position Updates (per frame)
```javascript
// Initial velocities
vx = ballSpeed * cos(launchAngle) * cos(azimuth)
vy = ballSpeed * sin(launchAngle)
vz = ballSpeed * cos(launchAngle) * sin(azimuth)

// Per frame update
acceleration = calculateForces(velocity, spin) / mass
velocity += acceleration * deltaTime
position += velocity * deltaTime

// Apply spin-induced curve (Magnus effect)
lateralForce = calculateMagnusLateral(velocity, spinAxis)
position.x += lateralForce * deltaTime
```

## User Interface Design

### Control Panel Layout

#### Mode Toggle
```
[PUTT MODE] | [SWING MODE]
```

#### Club Selection (Swing Mode)
```
Club: [▼ Driver ▼]
      Driver
      3 Wood
      5 Iron
      7 Iron
      9 Iron
      PW
      SW
```

#### Primary Controls (Sliders)
1. **Distance/Power** (50-100%)
   - Replaces putting distance
   - Shows estimated carry distance
   
2. **Attack Angle** (-5° to +5°)
   - Visual indicator: ↗️ positive, ↘️ negative
   - Default: +2° for driver, -2° for irons

3. **Face Angle** (-10° to +10°)
   - Visual indicator: ← closed, → open
   - Shows predicted start direction

4. **Club Path** (-10° to +10°)
   - Visual indicator: ↙️ out-to-in, ↗️ in-to-out
   - Shows predicted curve

5. **Strike Quality** (70-100%)
   - Default: 90%
   - Simulates off-center hits

### Visual Feedback

#### 3D Visualization Updates
1. **Ball Flight Arc**: Full 3D parabolic trajectory
2. **Landing Indicator**: Shows predicted landing spot
3. **Apex Marker**: Highest point of flight
4. **Spin Visualization**: Rotating ball texture during flight
5. **Trail Effect**: Subtle trail showing ball path

#### Flight Stats Display
```
Carry: 245 yds
Total: 268 yds
Apex: 98 ft
Hang Time: 5.8s
Ball Speed: 158 mph
Launch: 12.5°
Spin: 2,450 rpm
```

## Implementation Phases

### Phase 1: Core Physics (Week 1)
- [ ] Create SwingPhysics.ts module
- [ ] Implement ballistic trajectory calculation
- [ ] Add basic Magnus effect
- [ ] Create ball flight animation

### Phase 2: UI Integration (Week 2)
- [ ] Add mode toggle to UI
- [ ] Create club selection dropdown
- [ ] Implement swing-specific sliders
- [ ] Update 3D scene for aerial shots

### Phase 3: Advanced Physics (Week 3)
- [ ] Refine spin calculations
- [ ] Add gear effect for off-center hits
- [ ] Implement bounce and roll physics
- [ ] Add trajectory predictor line

### Phase 4: Polish & Features (Week 4)
- [ ] Club-specific optimizations
- [ ] Shot shape presets (draw, fade, etc.)
- [ ] Practice challenges for different clubs
- [ ] Statistics tracking for swing mode

## Technical Architecture

### New Files Structure
```
src/
  components/
    PuttingCoach/
      SwingPhysics.ts         # Core physics engine
      SwingModeControls.tsx   # UI controls for swing
      BallFlightVisualizer.ts # 3D trajectory rendering
  constants/
    clubData.ts              # Club specifications
    swingConstants.ts        # Physics constants
  utils/
    ballFlightCalculator.ts  # Trajectory math
    spinCalculator.ts        # Spin physics
```

### Data Structures

```typescript
interface SwingData {
  club: ClubType;
  power: number;        // 50-100
  attackAngle: number;  // -5 to +5
  faceAngle: number;    // -10 to +10
  clubPath: number;     // -10 to +10
  strikeQuality: number; // 0.7 to 1.0
}

interface FlightResult {
  trajectory: Vector3[];  // Array of 3D positions
  carry: number;         // Yards
  total: number;         // Yards with roll
  apex: number;          // Feet
  flightTime: number;    // Seconds
  ballSpeed: number;     // MPH
  launchAngle: number;   // Degrees
  spinRate: number;      // RPM
  spinAxis: number;      // Degrees
  landingAngle: number;  // Degrees
}

interface ClubSpec {
  name: string;
  loft: number;         // Static loft in degrees
  typicalDistance: number; // Yards at 100% power
  maxClubSpeed: number; // MPH
  smashFactor: number;  // Ball speed / club speed ratio
  defaultSpinRate: number; // RPM
}
```

## Challenge Mode Integration

### Swing Challenges
1. **Distance Challenge**: Hit specific carry distances
2. **Accuracy Challenge**: Land in target zones
3. **Shot Shaping**: Draw/fade around obstacles
4. **Trajectory Control**: Hit under/over height limits
5. **Spin Master**: Achieve specific spin rates

### Scoring System
- Distance accuracy: ±5 yards = perfect
- Landing accuracy: Distance from target
- Shot shape: Curve amount vs. requirement
- Bonus points for strike quality >95%

## Future Enhancements

### Phase 2 Features
- Wind effects (headwind, tailwind, crosswind)
- Elevation changes (uphill/downhill targets)
- Different ball types (Pro V1, distance balls, etc.)
- Rough/sand lie effects
- Temperature and altitude effects

### Advanced Visualizations
- Slow-motion impact replay
- Multi-angle camera views
- Shot comparison overlays
- Dispersion patterns
- Shot tracer effects

## Success Metrics
- Realistic ball flight that matches real-world physics
- Intuitive controls that don't overwhelm users
- Smooth transition between Putt and Swing modes
- Educational value for understanding ball flight
- Engaging challenges that teach shot shaping

## Technical Considerations

### Performance
- Optimize trajectory calculation (use fixed time steps)
- LOD system for ball during flight
- Efficient trail rendering
- Smooth 60 FPS animation target

### Accuracy
- Validate physics against real launch monitor data
- Use PGA Tour averages for club defaults
- Account for air density at sea level
- Realistic spin decay over flight

### User Experience
- Progressive disclosure of advanced controls
- Presets for common shot shapes
- Visual aids for understanding cause/effect
- Tooltips explaining each parameter

## Testing Plan

### Physics Validation
1. Compare trajectories to TrackMan data
2. Verify spin effects match reality
3. Test edge cases (extreme angles/spins)
4. Validate club-specific behaviors

### User Testing
1. Intuitive control scheme
2. Visual clarity of ball flight
3. Performance on various devices
4. Learning curve assessment

## Conclusion
Swing Mode will transform Putty from a putting-only app into a comprehensive golf training tool. By maintaining the same intuitive design philosophy while adding realistic ball flight physics, users can practice and understand the full range of golf shots. The modular design allows for incremental development and future expansion while ensuring a polished experience at each phase.