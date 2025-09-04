import { CourseLoader } from '../courseLoader';

describe('CourseLoader', () => {
  beforeEach(() => {
    CourseLoader.clearCache();
  });

  describe('loadCourse', () => {
    test('should load Augusta National course', async () => {
      const course = await CourseLoader.loadCourse('augusta-national');
      
      expect(course).toBeDefined();
      expect(course?.id).toBe('augusta-national');
      expect(course?.name).toBe('Augusta National Golf Club');
      expect(course?.location).toBe('Augusta, Georgia');
      expect(course?.holes).toBeDefined();
      expect(course?.holes.length).toBeGreaterThan(0);
    });

    test('should return null for non-existent course', async () => {
      const course = await CourseLoader.loadCourse('non-existent-course');
      
      expect(course).toBeNull();
    });

    test('should cache loaded courses', async () => {
      // Load course first time
      const course1 = await CourseLoader.loadCourse('augusta-national');
      
      // Load course second time (should come from cache)
      const course2 = await CourseLoader.loadCourse('augusta-national');
      
      expect(course1).toBe(course2); // Same object reference = cached
    });
  });

  describe('getAvailableCourses', () => {
    test('should return list of available courses', () => {
      const courses = CourseLoader.getAvailableCourses();
      
      expect(Array.isArray(courses)).toBe(true);
      expect(courses.length).toBeGreaterThan(0);
      
      const augusta = courses.find(c => c.id === 'augusta-national');
      expect(augusta).toBeDefined();
      expect(augusta?.name).toBe('Augusta National Golf Club');
    });
  });

  describe('validateCourse', () => {
    test('should validate correct course structure', async () => {
      const course = await CourseLoader.loadCourse('augusta-national');
      
      expect(CourseLoader.validateCourse(course)).toBe(true);
    });

    test('should reject invalid course data', () => {
      const invalidCourse = { id: 'test' }; // Missing required fields
      
      expect(CourseLoader.validateCourse(invalidCourse)).toBe(false);
    });

    test('should reject null/undefined', () => {
      expect(CourseLoader.validateCourse(null)).toBe(false);
      expect(CourseLoader.validateCourse(undefined)).toBe(false);
    });

    test('should reject course without holes', () => {
      const courseWithoutHoles = {
        id: 'test',
        name: 'Test Course',
        holes: null
      };
      
      expect(CourseLoader.validateCourse(courseWithoutHoles)).toBe(false);
    });

    test('should reject course with invalid holes', () => {
      const courseWithInvalidHoles = {
        id: 'test',
        name: 'Test Course',
        holes: [
          { id: 'hole1' } // Missing required hole properties
        ]
      };
      
      expect(CourseLoader.validateCourse(courseWithInvalidHoles)).toBe(false);
    });
  });

  describe('convertLevelToCourse', () => {
    test('should convert putting level to course format', () => {
      const levelConfig = {
        id: 1,
        type: 'putting',
        name: 'Test Putt',
        description: 'Test putting challenge',
        holeDistance: 12,
        par: 3,
        slopeUpDown: 5,
        slopeLeftRight: -3,
        greenSpeed: 11
      };

      const course = CourseLoader.convertLevelToCourse(levelConfig);
      
      expect(course.id).toBe('challenge-1');
      expect(course.name).toBe('Test Putt');
      expect(course.holes).toHaveLength(1);
      
      const hole = course.holes[0];
      expect(hole.distance).toBe(12);
      expect(hole.par).toBe(3);
      expect(hole.green.surface.greenSpeed).toBe(11);
      expect(hole.green.contours[0].slopeX).toBe(-3);
      expect(hole.green.contours[0].slopeY).toBe(5);
    });

    test('should convert swing level to course format', () => {
      const levelConfig = {
        id: 101,
        type: 'swing',
        name: 'Test Swing',
        description: 'Test swing challenge',
        holeDistance: 150,
        par: 4,
        slopeUpDown: 0,
        slopeLeftRight: 2,
        greenSpeed: 10
      };

      const course = CourseLoader.convertLevelToCourse(levelConfig);
      
      expect(course.id).toBe('challenge-101');
      expect(course.name).toBe('Test Swing');
      expect(course.holes[0].distance).toBe(150);
      expect(course.holes[0].par).toBe(4);
    });
  });

  describe('clearCache', () => {
    test('should clear course cache', async () => {
      // Load a course to populate cache
      await CourseLoader.loadCourse('augusta-national');
      
      // Clear cache
      CourseLoader.clearCache();
      
      // Load course again - should not be from cache
      const course = await CourseLoader.loadCourse('augusta-national');
      expect(course).toBeDefined(); // Should still load, just not from cache
    });
  });
});
