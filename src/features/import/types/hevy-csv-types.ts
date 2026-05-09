export type ParsedHevySet = {
  setOrder: number;
  weightKg: number;
  reps: number;
  rpe: number | null;
  notes: string | null;
};

export type ParsedHevySession = {
  date: string;
  exerciseName: string;
  sets: ParsedHevySet[];
};

export type ParseWarning = {
  line: number;
  code: 'duplicate_set' | string;
  message: string;
};

export type ParseError = {
  line: number;
  code: 'invalid_header' | 'malformed_row' | 'invalid_number' | string;
  message: string;
};

export type ParsedHevyData = {
  sessions: ParsedHevySession[];
  warnings: ParseWarning[];
  errors: ParseError[];
};
