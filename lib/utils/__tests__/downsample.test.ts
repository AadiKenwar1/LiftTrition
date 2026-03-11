import { downsampleData } from '../downsample';

describe('downsampleData', () => {
  // Test data factory
  const createData = (count: number, startDay: number = 1): Array<{ day: string; value: number }> => {
    return Array.from({ length: count }, (_, i) => ({
      day: `2/${startDay + i}`,
      value: (i + 1) * 10
    }));
  };

  describe('Bucket Size 1 (No Downsampling)', () => {
    it('should return original data when bucket size is 1', () => {
      const data = createData(7);
      const result = downsampleData(data, 1);
      
      expect(result).toEqual(data);
      expect(result.length).toBe(7);
    });

    it('should handle empty array with bucket size 1', () => {
      const result = downsampleData([], 1);
      expect(result).toEqual([]);
    });
  });

  describe('Bucket Size 2 (14 Days)', () => {
    it('should group even number of points into pairs', () => {
      const data = createData(14);
      const result = downsampleData(data, 2);
      
      expect(result.length).toBe(7);
      expect(result[0]).toEqual({ day: '2/1-2/2', value: 20 }); // max of 10, 20
      expect(result[1]).toEqual({ day: '2/3-2/4', value: 40 }); // max of 30, 40
      expect(result[6]).toEqual({ day: '2/13-2/14', value: 140 }); // max of 130, 140
    });

    it('should include incomplete bucket with odd number of points', () => {
      const data = createData(11);
      const result = downsampleData(data, 2);
      
      expect(result.length).toBe(6); // 5 complete pairs + 1 leftover point
      expect(result[0]).toEqual({ day: '2/1-2/2', value: 20 });
      expect(result[4]).toEqual({ day: '2/9-2/10', value: 100 });
      expect(result[5]).toEqual({ day: '2/11', value: 110 }); // leftover point included
    });

    it('should return original data when single point (insufficient for bucket)', () => {
      const data = createData(1);
      const result = downsampleData(data, 2);
      
      expect(result).toEqual(data); // Returns original data when insufficient
      expect(result.length).toBe(1);
    });

    it('should correctly identify max value in each bucket', () => {
      const data = [
        { day: '2/1', value: 100 },
        { day: '2/2', value: 50 },
        { day: '2/3', value: 75 },
        { day: '2/4', value: 150 },
      ];
      const result = downsampleData(data, 2);
      
      expect(result.length).toBe(2);
      expect(result[0]).toEqual({ day: '2/1-2/2', value: 100 });
      expect(result[1]).toEqual({ day: '2/3-2/4', value: 150 });
    });
  });

  describe('Bucket Size 3 (21 Days)', () => {
    it('should group points into triplets', () => {
      const data = createData(21);
      const result = downsampleData(data, 3);
      
      expect(result.length).toBe(7);
      expect(result[0]).toEqual({ day: '2/1-2/3', value: 30 }); // max of 10, 20, 30
      expect(result[1]).toEqual({ day: '2/4-2/6', value: 60 }); // max of 40, 50, 60
      expect(result[6]).toEqual({ day: '2/19-2/21', value: 210 }); // max of 190, 200, 210
    });

    it('should include incomplete bucket when not divisible by 3', () => {
      const data = createData(20);
      const result = downsampleData(data, 3);
      
      expect(result.length).toBe(7); // 6 complete triplets + 1 incomplete bucket (2 points)
      expect(result[5]).toEqual({ day: '2/16-2/18', value: 180 });
      expect(result[6]).toEqual({ day: '2/19-2/20', value: 200 }); // leftover points included
    });

    it('should include two incomplete points', () => {
      const data = createData(8);
      const result = downsampleData(data, 3);
      
      expect(result.length).toBe(3); // 2 complete triplets + 1 incomplete bucket (2 points)
      expect(result[0]).toEqual({ day: '2/1-2/3', value: 30 });
      expect(result[1]).toEqual({ day: '2/4-2/6', value: 60 });
      expect(result[2]).toEqual({ day: '2/7-2/8', value: 80 }); // leftover points included
    });

    it('should include single leftover point with single date label', () => {
      const data = createData(7);
      const result = downsampleData(data, 3);
      
      expect(result.length).toBe(3); // 2 complete triplets + 1 single leftover point
      expect(result[0]).toEqual({ day: '2/1-2/3', value: 30 });
      expect(result[1]).toEqual({ day: '2/4-2/6', value: 60 });
      expect(result[2]).toEqual({ day: '2/7', value: 70 }); // single leftover point uses single date
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty array', () => {
      expect(downsampleData([], 2)).toEqual([]);
      expect(downsampleData([], 3)).toEqual([]);
    });

    it('should return original data when smaller than bucket size', () => {
      const data = createData(2);
      const result = downsampleData(data, 3);
      
      expect(result).toEqual(data); // Returns original data when insufficient
      expect(result.length).toBe(2);
    });

    it('should handle exactly one complete bucket', () => {
      const data = createData(2);
      const result = downsampleData(data, 2);
      
      expect(result.length).toBe(1);
      expect(result[0]).toEqual({ day: '2/1-2/2', value: 20 });
    });

    it('should handle all same values', () => {
      const data = Array.from({ length: 6 }, (_, i) => ({
        day: `2/${i + 1}`,
        value: 100
      }));
      const result = downsampleData(data, 2);
      
      expect(result.length).toBe(3);
      expect(result[0].value).toBe(100);
      expect(result[1].value).toBe(100);
      expect(result[2].value).toBe(100);
    });

    it('should handle negative values', () => {
      const data = [
        { day: '2/1', value: -10 },
        { day: '2/2', value: -5 },
        { day: '2/3', value: -20 },
        { day: '2/4', value: -15 },
      ];
      const result = downsampleData(data, 2);
      
      expect(result.length).toBe(2);
      expect(result[0]).toEqual({ day: '2/1-2/2', value: -5 }); // max of -10, -5
      expect(result[1]).toEqual({ day: '2/3-2/4', value: -15 }); // max of -20, -15
    });

    it('should handle zero values', () => {
      const data = Array.from({ length: 4 }, (_, i) => ({
        day: `2/${i + 1}`,
        value: 0
      }));
      const result = downsampleData(data, 2);
      
      expect(result.length).toBe(2);
      expect(result[0].value).toBe(0);
      expect(result[1].value).toBe(0);
    });
  });

  describe('Date Label Formatting', () => {
    it('should create proper date range labels', () => {
      const data = [
        { day: '1/31', value: 10 },
        { day: '2/1', value: 20 },
        { day: '2/2', value: 30 },
        { day: '2/3', value: 40 },
      ];
      const result = downsampleData(data, 2);
      
      expect(result[0].day).toBe('1/31-2/1');
      expect(result[1].day).toBe('2/2-2/3');
    });

    it('should handle month transitions correctly', () => {
      const data = [
        { day: '12/30', value: 10 },
        { day: '12/31', value: 20 },
        { day: '1/1', value: 30 },
        { day: '1/2', value: 40 },
      ];
      const result = downsampleData(data, 2);
      
      expect(result[0].day).toBe('12/30-12/31');
      expect(result[1].day).toBe('1/1-1/2');
    });
  });
});
