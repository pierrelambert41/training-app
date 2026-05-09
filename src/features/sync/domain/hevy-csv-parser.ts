const EXPECTED_HEADER = 'Date,Exercise Name,Set Order,Weight,Reps,RPE,Notes';
const MIN_COLUMN_COUNT = 6;

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

type ParseOptions = {
  unit?: 'kg' | 'lb';
};

function stripBom(content: string): string {
  if (content.charCodeAt(0) === 0xfeff) {
    return content.slice(1);
  }
  return content;
}

function parseNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  if (isNaN(n)) return null;
  return n;
}

function splitRow(row: string): string[] {
  const minCols = MIN_COLUMN_COUNT;
  const parts = row.split(',');
  if (parts.length <= minCols) {
    return parts;
  }
  const notesJoined = parts.slice(minCols).join(',');
  return [...parts.slice(0, minCols), notesJoined];
}

function sessionKey(date: string, exerciseName: string): string {
  return `${date}||${exerciseName}`;
}

export function parseHevyCsv(
  csvContent: string,
  options?: ParseOptions,
): ParsedHevyData {
  const unit = options?.unit ?? 'kg';
  const warnings: ParseWarning[] = [];
  const errors: ParseError[] = [];

  const content = stripBom(csvContent);
  const rawLines = content.split(/\r?\n/);
  const nonEmptyLines = rawLines.map((l, i) => ({ raw: l, lineNum: i + 1 })).filter(({ raw }) => raw.trim() !== '');

  if (nonEmptyLines.length === 0) {
    errors.push({ line: 1, code: 'invalid_header', message: 'Le fichier est vide.' });
    return { sessions: [], warnings, errors };
  }

  const headerLine = nonEmptyLines[0];
  const normalizedHeader = headerLine.raw.trim();
  if (normalizedHeader !== EXPECTED_HEADER) {
    errors.push({
      line: headerLine.lineNum,
      code: 'invalid_header',
      message: `En-tête invalide. Attendu : "${EXPECTED_HEADER}", reçu : "${normalizedHeader}".`,
    });
    return { sessions: [], warnings, errors };
  }

  const sessionMap = new Map<string, ParsedHevySession>();
  const seenSetKeys = new Set<string>();

  for (const { raw, lineNum } of nonEmptyLines.slice(1)) {
    const cols = splitRow(raw);

    if (cols.length < MIN_COLUMN_COUNT) {
      errors.push({
        line: lineNum,
        code: 'malformed_row',
        message: `Ligne ${lineNum} : nombre de colonnes insuffisant (${cols.length} < ${MIN_COLUMN_COUNT}).`,
      });
      continue;
    }

    const [rawDate, exerciseName, rawSetOrder, rawWeight, rawReps, rawRpe] = cols;
    const notesRaw = cols[6] ?? '';

    const date = rawDate.trim();
    const exercise = exerciseName.trim();

    const setOrder = parseNumber(rawSetOrder);
    if (setOrder === null) {
      errors.push({
        line: lineNum,
        code: 'invalid_number',
        message: `Ligne ${lineNum} : Set Order invalide ("${rawSetOrder.trim()}").`,
      });
      continue;
    }

    const weightRaw = parseNumber(rawWeight);
    if (weightRaw === null) {
      errors.push({
        line: lineNum,
        code: 'invalid_number',
        message: `Ligne ${lineNum} : Weight invalide ("${rawWeight.trim()}").`,
      });
      continue;
    }

    const reps = parseNumber(rawReps);
    if (reps === null) {
      errors.push({
        line: lineNum,
        code: 'invalid_number',
        message: `Ligne ${lineNum} : Reps invalide ("${rawReps.trim()}").`,
      });
      continue;
    }

    const rpe = parseNumber(rawRpe);
    const notesStr = notesRaw.trim();
    const notes = notesStr === '' ? null : notesStr;

    const weightKg = unit === 'lb' ? weightRaw / 2.2046 : weightRaw;

    const setKey = `${date}||${exercise}||${setOrder}`;
    if (seenSetKeys.has(setKey)) {
      warnings.push({
        line: lineNum,
        code: 'duplicate_set',
        message: `Ligne ${lineNum} : set dupliqué (date="${date}", exercice="${exercise}", set_order=${setOrder}).`,
      });
    }
    seenSetKeys.add(setKey);

    const key = sessionKey(date, exercise);
    if (!sessionMap.has(key)) {
      sessionMap.set(key, { date, exerciseName: exercise, sets: [] });
    }
    sessionMap.get(key)!.sets.push({ setOrder, weightKg, reps, rpe, notes });
  }

  return { sessions: Array.from(sessionMap.values()), warnings, errors };
}
