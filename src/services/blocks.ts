import type { SQLiteDatabase } from 'expo-sqlite';
import type {
  Block,
  BlockStatus,
  NewBlockInput,
  UpdateBlockInput,
} from '@/types';
import { safeEnqueue } from './sync-helpers';

const TABLE = 'blocks';

type BlockRow = {
  id: string;
  program_id: string;
  title: string;
  goal: string;
  duration_weeks: number;
  week_number: number;
  start_date: string | null;
  end_date: string | null;
  status: string;
  deload_strategy: string;
  created_at: string;
  updated_at: string;
};

function rowToBlock(row: BlockRow): Block {
  return {
    id: row.id,
    programId: row.program_id,
    title: row.title,
    goal: row.goal as Block['goal'],
    durationWeeks: row.duration_weeks,
    weekNumber: row.week_number,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status as BlockStatus,
    deloadStrategy: row.deload_strategy as Block['deloadStrategy'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toSupabasePayload(block: Block): Record<string, unknown> {
  return {
    id: block.id,
    program_id: block.programId,
    title: block.title,
    goal: block.goal,
    duration_weeks: block.durationWeeks,
    week_number: block.weekNumber,
    start_date: block.startDate,
    end_date: block.endDate,
    status: block.status,
    deload_strategy: block.deloadStrategy,
    created_at: block.createdAt,
    updated_at: block.updatedAt,
  };
}

export async function insertBlock(
  db: SQLiteDatabase,
  input: NewBlockInput
): Promise<Block> {
  const now = new Date().toISOString();
  const block: Block = {
    id: input.id,
    programId: input.programId,
    title: input.title,
    goal: input.goal,
    durationWeeks: input.durationWeeks,
    weekNumber: input.weekNumber ?? 1,
    startDate: input.startDate ?? null,
    endDate: input.endDate ?? null,
    status: input.status ?? 'planned',
    deloadStrategy: input.deloadStrategy ?? 'fatigue_triggered',
    createdAt: now,
    updatedAt: now,
  };

  await db.runAsync(
    `INSERT INTO blocks (
      id, program_id, title, goal, duration_weeks, week_number,
      start_date, end_date, status, deload_strategy,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      block.id,
      block.programId,
      block.title,
      block.goal,
      block.durationWeeks,
      block.weekNumber,
      block.startDate,
      block.endDate,
      block.status,
      block.deloadStrategy,
      block.createdAt,
      block.updatedAt,
    ]
  );

  await safeEnqueue(db, TABLE, block.id, 'insert', toSupabasePayload(block));
  return block;
}

export async function updateBlock(
  db: SQLiteDatabase,
  id: string,
  input: UpdateBlockInput
): Promise<Block | null> {
  const existing = await getBlockById(db, id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const updated: Block = {
    ...existing,
    title: input.title ?? existing.title,
    goal: input.goal ?? existing.goal,
    durationWeeks: input.durationWeeks ?? existing.durationWeeks,
    weekNumber: input.weekNumber ?? existing.weekNumber,
    startDate:
      input.startDate !== undefined ? input.startDate : existing.startDate,
    endDate: input.endDate !== undefined ? input.endDate : existing.endDate,
    status: input.status ?? existing.status,
    deloadStrategy: input.deloadStrategy ?? existing.deloadStrategy,
    updatedAt: now,
  };

  await db.runAsync(
    `UPDATE blocks
       SET title = ?, goal = ?, duration_weeks = ?, week_number = ?,
           start_date = ?, end_date = ?, status = ?, deload_strategy = ?,
           updated_at = ?
     WHERE id = ?`,
    [
      updated.title,
      updated.goal,
      updated.durationWeeks,
      updated.weekNumber,
      updated.startDate,
      updated.endDate,
      updated.status,
      updated.deloadStrategy,
      updated.updatedAt,
      updated.id,
    ]
  );

  await safeEnqueue(db, TABLE, updated.id, 'update', toSupabasePayload(updated));
  return updated;
}

export async function deleteBlock(
  db: SQLiteDatabase,
  id: string
): Promise<void> {
  await db.runAsync('DELETE FROM blocks WHERE id = ?', [id]);
  await safeEnqueue(db, TABLE, id, 'delete', { id });
}

export async function getBlockById(
  db: SQLiteDatabase,
  id: string
): Promise<Block | null> {
  const row = await db.getFirstAsync<BlockRow>(
    'SELECT * FROM blocks WHERE id = ?',
    [id]
  );
  return row ? rowToBlock(row) : null;
}

export async function getBlocksByProgramId(
  db: SQLiteDatabase,
  programId: string
): Promise<Block[]> {
  const rows = await db.getAllAsync<BlockRow>(
    'SELECT * FROM blocks WHERE program_id = ? ORDER BY created_at ASC',
    [programId]
  );
  return rows.map(rowToBlock);
}

export async function getBlocksByStatus(
  db: SQLiteDatabase,
  programId: string,
  status: BlockStatus
): Promise<Block[]> {
  const rows = await db.getAllAsync<BlockRow>(
    'SELECT * FROM blocks WHERE program_id = ? AND status = ? ORDER BY created_at ASC',
    [programId, status]
  );
  return rows.map(rowToBlock);
}
