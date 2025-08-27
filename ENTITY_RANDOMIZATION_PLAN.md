# Entity Randomization Plan

## Current State
- Scene has 4 entities total:
  1. Robot (the main putter)
  2. 3 spectator entities standing by the hole
- All 3 spectators appear in the same fixed positions for every challenge
- No variation between different levels or attempts

## Goal
Create dynamic, varied scenes by:
1. Randomly showing 1-2 spectators instead of always 3
2. Randomizing spectator positions around the green
3. Different configurations for each challenge level

## Implementation Plan

### Phase 1: Analyze Current Implementation
- [ ] Locate where entities are defined and rendered in the 3D scene
- [ ] Understand current positioning logic
- [ ] Identify entity models and their properties

### Phase 2: Create Randomization System
- [ ] Define safe zones for spectator placement (avoid interfering with putt path)
- [ ] Create position generation algorithm:
  - Radius from hole (min/max distance)
  - Angular distribution around the hole
  - Height/elevation if applicable
- [ ] Implement spectator count randomization (1-2 spectators)

### Phase 3: Integration
- [ ] Add randomization trigger on:
  - Challenge level start
  - Level retry/restart
  - Practice mode putts
- [ ] Store configuration per attempt for consistency during a putt
- [ ] Add seed-based randomization for reproducibility if needed

### Phase 4: Visual Enhancements
- [ ] Vary spectator orientations (facing different directions)
- [ ] Add subtle animations or idle states
- [ ] Consider different spectator models or colors for variety

## Technical Considerations

### Position Constraints
- Keep spectators visible but not blocking the view
- Maintain minimum distance from:
  - Ball path
  - Hole (at least 2-3 feet)
  - Robot putter
  - Camera view frustum edges

### Performance
- Reuse existing models (no new assets needed)
- Update positions only on level load, not during putting animation
- Use lightweight randomization (no complex calculations)

### User Experience
- Ensure randomization doesn't distract from gameplay
- Maintain visual consistency within a single attempt
- Different but balanced scenes for each level

## File Structure Changes
```
src/
  components/
    PuttingCoach/
      ExpoGL3DView.tsx           # Main 3D scene - needs modification
      SceneRandomizer.ts         # New file for randomization logic
  utils/
    entityPositioning.ts         # New utility for position calculations
  constants/
    sceneConfig.ts              # New constants for position ranges
```

## Implementation Steps

1. **Search and understand current entity setup**
   - Find entity definitions in ExpoGL3DView.tsx
   - Locate position settings for spectators
   
2. **Create randomization utilities**
   - Position generator with constraints
   - Spectator count selector
   
3. **Modify scene initialization**
   - Apply randomization on scene load
   - Pass configuration to render loop
   
4. **Test scenarios**
   - Different challenge levels
   - Multiple attempts of same level
   - Practice vs challenge mode

## Success Criteria
- [ ] Only 1-2 spectators appear per scene (not always 3)
- [ ] Spectator positions vary between attempts
- [ ] No interference with gameplay
- [ ] Smooth performance maintained
- [ ] Visual variety adds interest without distraction