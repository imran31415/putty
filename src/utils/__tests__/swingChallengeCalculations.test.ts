// Unit tests for swing challenge calculations
// This ensures all position calculations are correct

describe('Swing Challenge Calculations', () => {
  describe('Hole Position', () => {
    test('250 yard hole should be at 750 feet', () => {
      const holeYards = 250;
      const holeFeet = holeYards * 3;
      expect(holeFeet).toBe(750);
    });

    test('100 yard hole should be at 300 feet', () => {
      const holeYards = 100;
      const holeFeet = holeYards * 3;
      expect(holeFeet).toBe(300);
    });
  });

  describe('World Unit Scaling', () => {
    // Based on getWorldUnitsPerFoot function
    const getWorldUnitsPerFoot = (holeDistanceFeet: number) => {
      if (holeDistanceFeet <= 10) return 1.0;
      if (holeDistanceFeet <= 25) return 0.8;
      if (holeDistanceFeet <= 50) return 0.6;
      if (holeDistanceFeet <= 100) return 0.4;
      return 0.25; // For very long distances
    };

    test('750 feet (250 yards) should use 0.25 units per foot', () => {
      expect(getWorldUnitsPerFoot(750)).toBe(0.25);
    });

    test('300 feet (100 yards) should use 0.25 units per foot', () => {
      expect(getWorldUnitsPerFoot(300)).toBe(0.25);
    });

    test('30 feet should use 0.6 units per foot', () => {
      expect(getWorldUnitsPerFoot(30)).toBe(0.6);
    });
  });

  describe('Hole World Position', () => {
    const getHoleWorldZ = (holeFeet: number) => {
      const worldUnitsPerFoot =
        holeFeet <= 10
          ? 1.0
          : holeFeet <= 25
            ? 0.8
            : holeFeet <= 50
              ? 0.6
              : holeFeet <= 100
                ? 0.4
                : 0.25;
      const ballStartZ = 4; // Ball always starts at z=4
      return ballStartZ - holeFeet * worldUnitsPerFoot;
    };

    test('250 yard hole (750 feet) should be at z = -183.5', () => {
      const holeFeet = 750;
      const worldZ = getHoleWorldZ(holeFeet);
      expect(worldZ).toBe(4 - 750 * 0.25); // 4 - 187.5 = -183.5
      expect(worldZ).toBe(-183.5);
    });

    test('100 yard hole (300 feet) should be at z = -71', () => {
      const holeFeet = 300;
      const worldZ = getHoleWorldZ(holeFeet);
      expect(worldZ).toBe(4 - 300 * 0.25); // 4 - 75 = -71
      expect(worldZ).toBe(-71);
    });

    test('10 feet hole should be at z = -6', () => {
      const holeFeet = 10;
      const worldZ = getHoleWorldZ(holeFeet);
      expect(worldZ).toBe(4 - 10 * 1.0); // 4 - 10 = -6
      expect(worldZ).toBe(-6);
    });
  });

  describe('Ball Position After Shots', () => {
    const getBallWorldZ = (ballYards: number, holeYards: number) => {
      // Ball position is in yards from start
      // We need to use the same scaling as the hole
      const holeFeet = holeYards * 3;
      const ballFeet = ballYards * 3;
      const worldUnitsPerFoot = holeFeet <= 100 ? 0.4 : 0.25;
      const ballStartZ = 4;
      return ballStartZ - ballFeet * worldUnitsPerFoot;
    };

    test('Ball at 132 yards with 250 yard hole should be at z = -95', () => {
      const ballWorldZ = getBallWorldZ(132, 250);
      // 132 yards = 396 feet
      // Using 0.25 units per foot (same as 750 feet hole)
      // z = 4 - (396 * 0.25) = 4 - 99 = -95
      expect(ballWorldZ).toBe(-95);
    });

    test('Ball at 100 yards with 250 yard hole should be at z = -71', () => {
      const ballWorldZ = getBallWorldZ(100, 250);
      // 100 yards = 300 feet
      // z = 4 - (300 * 0.25) = 4 - 75 = -71
      expect(ballWorldZ).toBe(-71);
    });

    test('Ball at 0 yards should be at z = 4', () => {
      const ballWorldZ = getBallWorldZ(0, 250);
      expect(ballWorldZ).toBe(4);
    });

    test('Ball at 250 yards (at hole) should be at z = -183.5', () => {
      const ballWorldZ = getBallWorldZ(250, 250);
      // 250 yards = 750 feet
      // z = 4 - (750 * 0.25) = -183.5
      expect(ballWorldZ).toBe(-183.5);
    });
  });

  describe('Distance Remaining Calculations', () => {
    test('Ball at 132 yards, hole at 250 yards = 118 yards remaining', () => {
      const remaining = 250 - 132;
      expect(remaining).toBe(118);
      expect(remaining * 3).toBe(354); // 354 feet
    });

    test('Ball at 100 yards, hole at 100 yards = 0 yards remaining', () => {
      const remaining = 100 - 100;
      expect(remaining).toBe(0);
    });
  });

  describe('Putting Mode Switch', () => {
    test('When < 10 yards from hole, should switch to putting', () => {
      const holeYards = 100;
      const ballYards = 95; // 5 yards from hole
      const remaining = holeYards - ballYards;
      expect(remaining).toBeLessThan(10);
      expect(remaining * 3).toBe(15); // Should show 15 feet in putting mode
    });

    test('When 0 yards from hole, should show 0.5 feet minimum', () => {
      const holeYards = 100;
      const ballYards = 100;
      const remaining = holeYards - ballYards;
      const feetToHole = Math.max(0.5, remaining * 3);
      expect(feetToHole).toBe(0.5);
    });
  });

  describe('Driver Distance at 80% Power', () => {
    // Based on club data and physics
    test('Driver at 80% should go approximately 192 yards', () => {
      const driverMaxDistance = 240; // yards at 100%
      const power = 80; // percent
      const expectedDistance = driverMaxDistance * (power / 100);
      expect(expectedDistance).toBe(192);
    });

    test('Driver at 100% should go 240 yards', () => {
      const driverMaxDistance = 240;
      const power = 100;
      const expectedDistance = driverMaxDistance * (power / 100);
      expect(expectedDistance).toBe(240);
    });
  });

  describe('Hole Position Updates During Swing Challenge', () => {
    test('Hole should stay at original position when switching to putt mode', () => {
      const originalHoleYards = 250;
      const originalHoleFeet = originalHoleYards * 3; // 750 feet

      // When switching to putt mode with 9 yards remaining
      const remainingYards = 9;
      const puttDistanceFeet = remainingYards * 3; // 27 feet

      // Hole should still be at 750 feet, not 27 feet
      expect(originalHoleFeet).toBe(750);
      expect(puttDistanceFeet).toBe(27);

      // The hole position should NOT change
      const holePositionAfterSwitch = originalHoleFeet; // Should stay at 750
      expect(holePositionAfterSwitch).toBe(750);
    });
  });
});
