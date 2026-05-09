import { parseHevyCsv } from './hevy-csv-parser';

const VALID_HEADER = 'Date,Exercise Name,Set Order,Weight,Reps,RPE,Notes';

function buildCsv(...dataRows: string[]): string {
  return [VALID_HEADER, ...dataRows].join('\n');
}

describe('parseHevyCsv', () => {
  describe('nominal parsing', () => {
    it('parses a single row correctly', () => {
      const csv = buildCsv('2024-01-15,Bench Press,1,100,8,7,');
      const result = parseHevyCsv(csv);

      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.sessions).toHaveLength(1);

      const session = result.sessions[0];
      expect(session.date).toBe('2024-01-15');
      expect(session.exerciseName).toBe('Bench Press');
      expect(session.sets).toHaveLength(1);
      expect(session.sets[0]).toEqual({ setOrder: 1, weightKg: 100, reps: 8, rpe: 7, notes: null });
    });

    it('groups sets by date + exercise', () => {
      const csv = buildCsv(
        '2024-01-15,Squat,1,120,5,8,',
        '2024-01-15,Squat,2,120,5,8,',
        '2024-01-15,Bench Press,1,100,8,,',
      );
      const result = parseHevyCsv(csv);

      expect(result.errors).toHaveLength(0);
      expect(result.sessions).toHaveLength(2);

      const squat = result.sessions.find((s) => s.exerciseName === 'Squat');
      expect(squat?.sets).toHaveLength(2);
    });

    it('creates separate sessions for different dates', () => {
      const csv = buildCsv(
        '2024-01-15,Bench Press,1,100,8,,',
        '2024-01-16,Bench Press,1,102,8,,',
      );
      const result = parseHevyCsv(csv);

      expect(result.sessions).toHaveLength(2);
      expect(result.sessions[0].date).toBe('2024-01-15');
      expect(result.sessions[1].date).toBe('2024-01-16');
    });
  });

  describe('unit conversion lb → kg', () => {
    it('converts weight from lb to kg when unit option is lb', () => {
      const csv = buildCsv('2024-01-15,Bench Press,1,220.46,8,,');
      const result = parseHevyCsv(csv, { unit: 'lb' });

      expect(result.errors).toHaveLength(0);
      const weightKg = result.sessions[0].sets[0].weightKg;
      expect(weightKg).toBeCloseTo(100, 1);
    });

    it('does not convert when unit is kg (default)', () => {
      const csv = buildCsv('2024-01-15,Bench Press,1,100,8,,');
      const result = parseHevyCsv(csv);

      expect(result.sessions[0].sets[0].weightKg).toBe(100);
    });

    it('does not convert when unit option is explicitly kg', () => {
      const csv = buildCsv('2024-01-15,Bench Press,1,100,8,,');
      const result = parseHevyCsv(csv, { unit: 'kg' });

      expect(result.sessions[0].sets[0].weightKg).toBe(100);
    });
  });

  describe('RPE and Notes absent', () => {
    it('sets rpe to null when RPE column is empty', () => {
      const csv = buildCsv('2024-01-15,Bench Press,1,100,8,,');
      const result = parseHevyCsv(csv);

      expect(result.sessions[0].sets[0].rpe).toBeNull();
    });

    it('sets notes to null when Notes column is empty', () => {
      const csv = buildCsv('2024-01-15,Bench Press,1,100,8,,');
      const result = parseHevyCsv(csv);

      expect(result.sessions[0].sets[0].notes).toBeNull();
    });

    it('parses notes when present', () => {
      const csv = buildCsv('2024-01-15,Bench Press,1,100,8,7,felt strong');
      const result = parseHevyCsv(csv);

      expect(result.sessions[0].sets[0].notes).toBe('felt strong');
    });

    it('accepts notes containing commas (joined from remaining columns)', () => {
      const csv = buildCsv('2024-01-15,Bench Press,1,100,8,7,good set, felt strong');
      const result = parseHevyCsv(csv);

      expect(result.errors).toHaveLength(0);
      expect(result.sessions[0].sets[0].notes).toBe('good set, felt strong');
    });
  });

  describe('duplicate detection', () => {
    it('emits a warning for duplicate set (same date + exercise + set_order)', () => {
      const csv = buildCsv(
        '2024-01-15,Bench Press,1,100,8,,',
        '2024-01-15,Bench Press,1,100,8,,',
      );
      const result = parseHevyCsv(csv);

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('duplicate_set');
      expect(result.sessions[0].sets).toHaveLength(2);
    });

    it('does not warn for same set_order on different exercises', () => {
      const csv = buildCsv(
        '2024-01-15,Bench Press,1,100,8,,',
        '2024-01-15,Squat,1,120,5,,',
      );
      const result = parseHevyCsv(csv);

      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('malformed rows', () => {
    it('emits a ParseError for a row with too few columns', () => {
      const csv = buildCsv('2024-01-15,Bench Press,1,100');
      const result = parseHevyCsv(csv);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('malformed_row');
      expect(result.errors[0].line).toBe(2);
    });

    it('continues parsing valid rows after a malformed row', () => {
      const csv = buildCsv(
        '2024-01-15,Bench Press,1,100',
        '2024-01-16,Squat,1,120,5,,',
      );
      const result = parseHevyCsv(csv);

      expect(result.errors).toHaveLength(1);
      expect(result.sessions).toHaveLength(1);
      expect(result.sessions[0].exerciseName).toBe('Squat');
    });

    it('emits invalid_number error for non-numeric Weight', () => {
      const csv = buildCsv('2024-01-15,Bench Press,1,abc,8,,');
      const result = parseHevyCsv(csv);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('invalid_number');
    });

    it('emits invalid_number error for non-numeric Reps', () => {
      const csv = buildCsv('2024-01-15,Bench Press,1,100,abc,,');
      const result = parseHevyCsv(csv);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('invalid_number');
    });

    it('includes the 1-indexed line number in the error', () => {
      const csv = buildCsv(
        '2024-01-15,Squat,1,120,5,,',
        '2024-01-15,Bench Press,1,100',
      );
      const result = parseHevyCsv(csv);

      expect(result.errors[0].line).toBe(3);
    });
  });

  describe('invalid header', () => {
    it('returns a blocking ParseError and empty sessions for invalid header', () => {
      const csv = 'Wrong,Header,Format\n2024-01-15,Bench Press,1,100,8,,';
      const result = parseHevyCsv(csv);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('invalid_header');
      expect(result.sessions).toHaveLength(0);
    });

    it('returns a blocking ParseError for missing header (empty file)', () => {
      const result = parseHevyCsv('');

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('invalid_header');
      expect(result.sessions).toHaveLength(0);
    });
  });

  describe('empty file', () => {
    it('handles a completely empty string', () => {
      const result = parseHevyCsv('');

      expect(result.errors[0].code).toBe('invalid_header');
      expect(result.sessions).toHaveLength(0);
    });

    it('handles a file with only the header and no data rows', () => {
      const result = parseHevyCsv(VALID_HEADER);

      expect(result.errors).toHaveLength(0);
      expect(result.sessions).toHaveLength(0);
    });
  });

  describe('BOM handling', () => {
    it('strips UTF-8 BOM (0xFEFF) before parsing', () => {
      const bom = '\uFEFF';
      const csv = bom + buildCsv('2024-01-15,Bench Press,1,100,8,,');
      const result = parseHevyCsv(csv);

      expect(result.errors).toHaveLength(0);
      expect(result.sessions).toHaveLength(1);
    });

    it('does not produce invalid_header error when BOM is present', () => {
      const bom = '\uFEFF';
      const csv = bom + VALID_HEADER;
      const result = parseHevyCsv(csv);

      expect(result.errors).toHaveLength(0);
    });
  });
});
