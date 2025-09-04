import { CourseLoader } from '../courseLoader';
import { TerrainPhysics } from '../terrainPhysics';

describe('Augusta National Tea Olive Challenge Demo', () => {
  test('should demonstrate complete Augusta challenge workflow', async () => {
    // 1. Load the Augusta National Tea Olive challenge
    const course = await CourseLoader.loadCourse('augusta-hole1-challenge');
    expect(course).toBeDefined();
    expect(course?.name).toBe('Augusta National - Tea Olive');
    
    const hole = course?.holes[0];
    expect(hole?.par).toBe(4);
    expect(hole?.distance).toBe(445);
    
    console.log('🌿 Augusta National Hole 1 - Tea Olive');
    console.log(`   Par ${hole?.par}, ${hole?.distance} yards`);
    console.log('   Features:');
    console.log(`   - Dogleg right: ${hole?.fairway.bends[0]?.direction} turn`);
    console.log(`   - Elevation gain: ${hole?.green.surface.elevation}ft`);
    console.log(`   - Green speed: ${hole?.green.surface.greenSpeed}`);
    console.log(`   - Hazards: ${hole?.hazards.length} bunkers`);
    console.log(`   - Pin positions: ${hole?.pinPositions.length} options`);
    
    // 3. Test dogleg strategy calculation
    const ballPosition = { x: 0, y: 0, z: 0 }; // Tee position
    const strategy = TerrainPhysics.calculateDoglegStrategy(hole!, ballPosition, 300);
    
    console.log('\n🎯 Dogleg Strategy:');
    console.log(`   Carry required: ${strategy.carryRequired} yards`);
    console.log(`   Risk level: ${strategy.riskLevel}`);
    console.log(`   Recommendation: ${strategy.recommendation}`);
    
    expect(strategy.carryRequired).toBe(317); // Famous Augusta carry
    expect(strategy.recommendation).toContain('bunker');
    
    console.log('\n✅ Augusta National Tea Olive challenge ready!');
  });
});