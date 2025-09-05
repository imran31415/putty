import { GolfCourse } from '../types/game';

// Course loader service
export class CourseLoader {
  private static courseCache: Map<string, GolfCourse> = new Map();

  /**
   * Load a course by ID
   */
  static async loadCourse(courseId: string): Promise<GolfCourse | null> {
    // Check cache first
    if (this.courseCache.has(courseId)) {
      return this.courseCache.get(courseId)!;
    }

    try {
      // Try to load from local data
      const course = await this.loadLocalCourse(courseId);
      if (course) {
        this.courseCache.set(courseId, course);
        return course;
      }

      console.warn(`Course not found: ${courseId}`);
      return null;
    } catch (error) {
      console.error(`Error loading course ${courseId}:`, error);
      return null;
    }
  }

  /**
   * Load course from local data files
   */
  private static async loadLocalCourse(courseId: string): Promise<GolfCourse | null> {
    try {
      // In a real app, this would be a dynamic import or API call
      switch (courseId) {
        case 'augusta-national':
          // Return mock data for now (JSON imports don't work well in tests)
          return this.getAugustaNationalMockData();
        
        case 'augusta-hole1-challenge':
          // Return Augusta Hole 1 challenge data
          return this.getAugustaHole1ChallengeData();
        
        default:
          return null;
      }
    } catch (error) {
      console.error(`Error loading local course ${courseId}:`, error);
      return null;
    }
  }

  /**
   * Mock Augusta National data for testing
   */
  private static getAugustaNationalMockData(): GolfCourse {
    return {
      id: 'augusta-national',
      name: 'Augusta National Golf Club',
      location: 'Augusta, Georgia',
      description: 'Home of The Masters Tournament',
      metadata: {
        designer: 'Alister MacKenzie & Bobby Jones',
        yearBuilt: 1933,
        par: 72,
        totalDistance: 7475,
        difficulty: 'expert',
        climate: 'subtropical',
        seasonality: ['spring', 'summer', 'fall']
      },
      holes: [
        {
          id: 'augusta-1',
          number: 1,
          par: 4,
          distance: 445,
          handicap: 18,
          tees: [
            {
              name: 'Masters',
              position: { x: 0, y: 0, z: 0 },
              distance: 445
            }
          ],
          fairway: {
            width: 35,
            length: 445,
            bends: [],
            elevationProfile: [
              { distance: 0, elevation: 0, slope: 0 },
              { distance: 445, elevation: 15, slope: 1.5 }
            ],
            landingZones: [
              {
                start: 200,
                end: 300,
                width: 35,
                difficulty: 'easy',
                hazards: []
              }
            ]
          },
          green: {
            surface: {
              width: 35,
              length: 25,
              elevation: 15,
              greenSpeed: 13
            },
            contours: [
              { x: 0, y: 0, elevation: 0, slopeX: 0, slopeY: 0 },
              { x: 10, y: 5, elevation: 2, slopeX: 5, slopeY: 3 }
            ],
            slopes: [
              {
                type: 'uphill',
                direction: 45,
                magnitude: 8,
                startPoint: { x: -15, y: -10 },
                endPoint: { x: 15, y: 10 }
              }
            ],
            fringe: {
              width: 3,
              height: 2,
              texture: 'fine'
            }
          },
          hazards: [],
          terrain: [],
          pinPositions: [
            {
              id: 'augusta-1-front',
              name: 'Front',
              position: { x: 0, y: -8, z: 0 },
              difficulty: 'medium'
            }
          ]
        }
      ]
    };
  }

  /**
   * Augusta Hole 1 Challenge Data - Tea Olive
   */
  private static getAugustaHole1ChallengeData(): GolfCourse {
    return {
      id: 'augusta-hole1-challenge',
      name: 'Augusta National - Tea Olive',
      location: 'Augusta, Georgia',
      description: 'The legendary opening hole at Augusta National Golf Club',
      metadata: {
        designer: 'Alister MacKenzie & Bobby Jones',
        yearBuilt: 1933,
        par: 4,
        totalDistance: 445,
        difficulty: 'expert',
        climate: 'subtropical',
        seasonality: ['spring']
      },
      holes: [
        {
          id: 'augusta-1-tea-olive',
          number: 1,
          par: 4,
          distance: 445,
          handicap: 18,
          tees: [
            {
              name: 'Masters Tee',
              position: { x: 0, y: 0, z: 0 },
              distance: 445
            },
            {
              name: 'Member Tee',
              position: { x: 0, y: 15, z: 0 },
              distance: 400
            }
          ],
          fairway: {
            width: 35,
            length: 445,
            bends: [
              {
                start: 250,
                end: 350,
                direction: 'right',
                angle: 8,
                severity: 'slight'
              }
            ],
            elevationProfile: [
              { distance: 0, elevation: 0, slope: 0 },
              { distance: 100, elevation: 5, slope: 2.5 },
              { distance: 200, elevation: 12, slope: 3.5 },
              { distance: 300, elevation: 18, slope: 2.0 },
              { distance: 400, elevation: 22, slope: 1.0 },
              { distance: 445, elevation: 25, slope: 0.5 }
            ],
            landingZones: [
              {
                start: 250,
                end: 290,
                width: 40,
                difficulty: 'easy',
                hazards: []
              },
              {
                start: 290,
                end: 330,
                width: 30,
                difficulty: 'medium',
                hazards: ['fairway_bunker_right']
              },
              {
                start: 330,
                end: 370,
                width: 25,
                difficulty: 'hard',
                hazards: ['fairway_bunker_right', 'trees_left']
              }
            ]
          },
          green: {
            surface: {
              width: 40,
              length: 30,
              elevation: 25,
              greenSpeed: 13
            },
            contours: [
              { x: 0, y: 0, elevation: 0, slopeX: 0, slopeY: 0 },
              { x: -15, y: -10, elevation: 2, slopeX: -3, slopeY: -2 },
              { x: 15, y: -10, elevation: 1, slopeX: 2, slopeY: -1 },
              { x: -15, y: 10, elevation: -1, slopeX: -2, slopeY: 3 },
              { x: 15, y: 10, elevation: -2, slopeX: 4, slopeY: 2 },
              { x: 0, y: -15, elevation: 3, slopeX: 0, slopeY: -4 },
              { x: 0, y: 15, elevation: -3, slopeX: 0, slopeY: 5 }
            ],
            slopes: [
              {
                type: 'uphill',
                direction: 0,
                magnitude: 6,
                startPoint: { x: -20, y: -15 },
                endPoint: { x: 20, y: 0 }
              },
              {
                type: 'right',
                direction: 90,
                magnitude: 4,
                startPoint: { x: 0, y: -15 },
                endPoint: { x: 20, y: 15 }
              },
              {
                type: 'downhill',
                direction: 180,
                magnitude: 8,
                startPoint: { x: -20, y: 5 },
                endPoint: { x: 20, y: 15 }
              }
            ],
            fringe: {
              width: 4,
              height: 3,
              texture: 'medium'
            }
          },
          hazards: [
            {
              type: 'bunker',
              position: { x: 25, y: -310, z: 18 },
              dimensions: { width: 15, length: 25, depth: 4 },
              penalty: 'stroke'
            },
            {
              type: 'bunker',
              position: { x: -25, y: -430, z: 22 },
              dimensions: { width: 12, length: 18, depth: 3 },
              penalty: 'stroke'
            },
            {
              type: 'rough',
              position: { x: -40, y: -200, z: 10 },
              dimensions: { width: 15, length: 200, depth: 0 },
              penalty: 'distance'
            }
          ],
          terrain: [
            {
              type: 'hill',
              position: { x: 0, y: -300, z: 0 },
              dimensions: { width: 80, length: 150, height: 25 },
              slope: 3.5,
              direction: 0
            },
            {
              type: 'ridge',
              position: { x: 30, y: -350, z: 15 },
              dimensions: { width: 20, length: 100, height: 8 },
              slope: 12,
              direction: 270
            }
          ],
          pinPositions: [
            {
              id: 'augusta-1-front-left',
              name: 'Front Left',
              position: { x: -8, y: -12, z: 1 },
              difficulty: 'medium',
              notes: 'Safe pin position away from bunkers'
            },
            {
              id: 'augusta-1-back-right',
              name: 'Back Right',
              position: { x: 12, y: 10, z: -1 },
              difficulty: 'hard',
              notes: 'Dangerous pin near fall-off, requires precise distance control'
            },
            {
              id: 'augusta-1-masters-sunday',
              name: 'Masters Sunday',
              position: { x: 5, y: 0, z: 0 },
              difficulty: 'expert',
              notes: 'Traditional Masters Sunday pin position, challenging approach angle'
            }
          ]
        }
      ]
    };
  }

  /**
   * Get list of available courses
   */
  static getAvailableCourses(): Array<{ id: string; name: string; location: string }> {
    return [
      {
        id: 'augusta-national',
        name: 'Augusta National Golf Club',
        location: 'Augusta, Georgia'
      },
      {
        id: 'augusta-hole1-challenge',
        name: 'Augusta National - Tea Olive',
        location: 'Augusta, Georgia'
      }
      // Add more courses here as they're created
    ];
  }

  /**
   * Validate course data structure
   */
  static validateCourse(course: any): course is GolfCourse {
    if (!course || typeof course !== 'object') return false;
    if (!course.id || !course.name || !course.holes) return false;
    if (!Array.isArray(course.holes)) return false;

    // Validate each hole has required properties
    for (const hole of course.holes) {
      if (!hole.id || !hole.number || !hole.par || !hole.distance) return false;
      if (!hole.green || !hole.green.surface) return false;
      if (!hole.pinPositions || !Array.isArray(hole.pinPositions)) return false;
    }

    return true;
  }

  /**
   * Convert legacy level config to course format
   */
  static convertLevelToCourse(levelConfig: any): GolfCourse {
    return {
      id: `challenge-${levelConfig.id}`,
      name: levelConfig.name,
      location: 'Practice Range',
      description: levelConfig.description,
      metadata: {
        designer: 'Putty Golf',
        yearBuilt: 2023,
        par: levelConfig.par || 3,
        totalDistance: levelConfig.holeDistance,
        difficulty: 'medium',
        climate: 'temperate',
        seasonality: ['all']
      },
      holes: [
        {
          id: `challenge-${levelConfig.id}-hole`,
          number: 1,
          par: levelConfig.par || 3,
          distance: levelConfig.holeDistance,
          handicap: 1,
          tees: [
            {
              name: 'Challenge',
              position: { x: 0, y: 0, z: 0 },
              distance: levelConfig.holeDistance
            }
          ],
          fairway: {
            width: 30,
            length: levelConfig.holeDistance,
            bends: [],
            elevationProfile: [
              { distance: 0, elevation: 0, slope: 0 },
              { distance: levelConfig.holeDistance, elevation: 0, slope: 0 }
            ],
            landingZones: [
              {
                start: 0,
                end: levelConfig.holeDistance,
                width: 30,
                difficulty: 'easy',
                hazards: []
              }
            ]
          },
          green: {
            surface: {
              width: 25,
              length: 20,
              elevation: 0,
              greenSpeed: levelConfig.greenSpeed
            },
            contours: [
              { x: 0, y: 0, elevation: 0, slopeX: levelConfig.slopeLeftRight, slopeY: levelConfig.slopeUpDown }
            ],
            slopes: [
              {
                type: levelConfig.slopeUpDown > 0 ? 'uphill' : 'downhill',
                direction: levelConfig.slopeUpDown > 0 ? 0 : 180,
                magnitude: Math.abs(levelConfig.slopeUpDown),
                startPoint: { x: -12, y: -10 },
                endPoint: { x: 12, y: 10 }
              },
              {
                type: levelConfig.slopeLeftRight > 0 ? 'right' : 'left',
                direction: levelConfig.slopeLeftRight > 0 ? 90 : 270,
                magnitude: Math.abs(levelConfig.slopeLeftRight),
                startPoint: { x: -12, y: -10 },
                endPoint: { x: 12, y: 10 }
              }
            ],
            fringe: {
              width: 3,
              height: 2,
              texture: 'fine'
            }
          },
          hazards: [],
          terrain: [],
          pinPositions: [
            {
              id: `challenge-${levelConfig.id}-pin`,
              name: 'Challenge Pin',
              position: { x: 0, y: 0, z: 0 },
              difficulty: 'medium'
            }
          ]
        }
      ]
    };
  }

  /**
   * Clear course cache
   */
  static clearCache(): void {
    this.courseCache.clear();
  }
}
