/**
 * Debug test to check if Augusta integration is working in the app
 */

import { LEVEL_CONFIGS } from '../constants/levels';
import { CourseLoader } from '../services/courseLoader';

describe('Debug Augusta App Integration', () => {
  test('should find Augusta challenge in level configs', () => {
    console.log('\n🔍 Checking if Augusta challenge exists in app...');
    
    // Check all swing challenges
    const swingChallenges = LEVEL_CONFIGS.filter(l => l.type === 'swing');
    console.log('Available swing challenges:');
    swingChallenges.forEach(challenge => {
      console.log(`   ID: ${challenge.id}, Name: "${challenge.name}"`);
    });
    
    // Find Augusta specifically
    const augusta = LEVEL_CONFIGS.find(l => l.id === 103);
    if (augusta) {
      console.log('\n✅ Augusta challenge found:');
      console.log(`   ID: ${augusta.id}`);
      console.log(`   Name: "${augusta.name}"`);
      console.log(`   Type: ${augusta.type}`);
      console.log(`   Distance: ${augusta.holeDistance} yards`);
      console.log(`   Par: ${augusta.par}`);
      console.log(`   Intro: "${augusta.introText}"`);
    } else {
      console.log('\n❌ Augusta challenge NOT found in level configs!');
    }
    
    expect(augusta).toBeDefined();
    expect(augusta?.name).toContain('Augusta');
  });

  test('should validate course loader has Augusta data', async () => {
    console.log('\n🔍 Checking if CourseLoader can load Augusta...');
    
    const availableCourses = CourseLoader.getAvailableCourses();
    console.log('Available courses:');
    availableCourses.forEach(course => {
      console.log(`   ID: "${course.id}", Name: "${course.name}"`);
    });
    
    const augustaCourse = availableCourses.find(c => c.id === 'augusta-hole1-challenge');
    if (augustaCourse) {
      console.log('\n✅ Augusta course found in available courses');
    } else {
      console.log('\n❌ Augusta course NOT found in available courses!');
    }
    
    // Try to load the course
    const course = await CourseLoader.loadCourse('augusta-hole1-challenge');
    if (course) {
      console.log('\n✅ Augusta course loaded successfully:');
      console.log(`   Course ID: ${course.id}`);
      console.log(`   Course Name: ${course.name}`);
      console.log(`   Holes: ${course.holes.length}`);
      
      const hole = course.holes[0];
      console.log(`   Hole ${hole.number}: Par ${hole.par}, ${hole.distance} yards`);
      console.log(`   Hazards: ${hole.hazards.length}`);
      console.log(`   Terrain features: ${hole.terrain.length}`);
      console.log(`   Landing zones: ${hole.fairway.landingZones.length}`);
      console.log(`   Pin positions: ${hole.pinPositions.length}`);
    } else {
      console.log('\n❌ Failed to load Augusta course!');
    }
    
    expect(course).toBeDefined();
  });

  test('should check if challenge ID 103 matches Augusta in app', () => {
    console.log('\n🔍 Checking challenge ID mapping...');
    
    // The app looks for level.id === 103 to trigger Augusta loading
    const level103 = LEVEL_CONFIGS.find(l => l.id === 103);
    
    if (level103) {
      console.log('✅ Level 103 found:');
      console.log(`   Name: "${level103.name}"`);
      console.log(`   Type: ${level103.type}`);
      
      if (level103.name.includes('Augusta')) {
        console.log('✅ Level 103 IS the Augusta challenge');
      } else {
        console.log('❌ Level 103 is NOT the Augusta challenge!');
        console.log('   This means the app won\'t load Augusta course data');
      }
    } else {
      console.log('❌ Level 103 NOT found in level configs!');
    }
    
    expect(level103).toBeDefined();
    expect(level103?.name).toContain('Augusta');
  });
});


