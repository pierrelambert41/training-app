import type { SQLiteDatabase } from 'expo-sqlite';
import type {
  NewProgramInput,
  Program,
  UpdateProgramInput,
} from '@/types';
import { safeEnqueue } from './sync-helpers';

const TABLE = 'programs';

type ProgramRow = {
  id: string;
  user_id: string;
  title: string;
  goal: string;
  frequency: number | null;
  level: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
};

function rowToProgram(row: ProgramRow): Program {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    goal: row.goal as Program['goal'],
    frequency: row.frequency,
    level: row.level as Program['level'],
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toSupabasePayload(program: Program): Record<string, unknown> {
  return {
    id: program.id,
    user_id: program.userId,
    title: program.title,
    goal: program.goal,
    frequency: program.frequency,
    level: program.level,
    is_active: program.isActive,
    created_at: program.createdAt,
    updated_at: program.updatedAt,
  };
}

export async function insertProgram(
  db: SQLiteDatabase,
  input: NewProgramInput
): Promise<Program> {
  const now = new Date().toISOString();
  const program: Program = {
    id: input.id,
    userId: input.userId,
    title: input.title,
    goal: input.goal,
    frequency: input.frequency,
    level: input.level,
    isActive: input.isActive ?? false,
    createdAt: now,
    updatedAt: now,
  };

  await db.runAsync(
    `INSERT INTO programs (
      id, user_id, title, goal, frequency, level, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      program.id,
      program.userId,
      program.title,
      program.goal,
      program.frequency,
      program.level,
      program.isActive ? 1 : 0,
      program.createdAt,
      program.updatedAt,
    ]
  );

  await safeEnqueue(db, TABLE, program.id, 'insert', toSupabasePayload(program));
  return program;
}

export async function updateProgram(
  db: SQLiteDatabase,
  id: string,
  input: UpdateProgramInput
): Promise<Program | null> {
  const existing = await getProgramById(db, id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const updated: Program = {
    ...existing,
    title: input.title ?? existing.title,
    goal: input.goal ?? existing.goal,
    frequency: input.frequency !== undefined ? input.frequency : existing.frequency,
    level: input.level !== undefined ? input.level : existing.level,
    isActive: input.isActive ?? existing.isActive,
    updatedAt: now,
  };

  await db.runAsync(
    `UPDATE programs
       SET title = ?, goal = ?, frequency = ?, level = ?, is_active = ?, updated_at = ?
     WHERE id = ?`,
    [
      updated.title,
      updated.goal,
      updated.frequency,
      updated.level,
      updated.isActive ? 1 : 0,
      updated.updatedAt,
      updated.id,
    ]
  );

  await safeEnqueue(db, TABLE, updated.id, 'update', toSupabasePayload(updated));
  return updated;
}

export async function deleteProgram(
  db: SQLiteDatabase,
  id: string
): Promise<void> {
  await db.runAsync('DELETE FROM programs WHERE id = ?', [id]);
  await safeEnqueue(db, TABLE, id, 'delete', { id });
}

export async function getProgramById(
  db: SQLiteDatabase,
  id: string
): Promise<Program | null> {
  const row = await db.getFirstAsync<ProgramRow>(
    'SELECT * FROM programs WHERE id = ?',
    [id]
  );
  return row ? rowToProgram(row) : null;
}

export async function getProgramsByUserId(
  db: SQLiteDatabase,
  userId: string
): Promise<Program[]> {
  const rows = await db.getAllAsync<ProgramRow>(
    'SELECT * FROM programs WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );
  return rows.map(rowToProgram);
}

export async function getActiveProgramForUser(
  db: SQLiteDatabase,
  userId: string
): Promise<Program | null> {
  const row = await db.getFirstAsync<ProgramRow>(
    'SELECT * FROM programs WHERE user_id = ? AND is_active = 1 LIMIT 1',
    [userId]
  );
  return row ? rowToProgram(row) : null;
}
