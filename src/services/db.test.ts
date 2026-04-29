import { openDatabase, getDatabase, resetDatabaseInstance } from './db';

jest.mock('expo-sqlite', () => {
  const execHistory: string[] = [];
  let userVersion = 0;

  const db = {
    execAsync: jest.fn(async (sql: string) => {
      execHistory.push(sql);
      const match = sql.match(/PRAGMA user_version = (\d+)/);
      if (match) {
        userVersion = parseInt(match[1], 10);
      }
    }),
    getFirstAsync: jest.fn(async (sql: string) => {
      if (sql === 'PRAGMA user_version') {
        return { user_version: userVersion };
      }
      return null;
    }),
    runAsync: jest.fn(async () => ({ lastInsertRowId: 1, changes: 1 })),
    getAllAsync: jest.fn(async () => []),
    _execHistory: execHistory,
    _resetVersion: () => {
      userVersion = 0;
    },
  };

  return {
    openDatabaseAsync: jest.fn(async () => db),
    __db: db,
  };
});

const ExpoSQLite = jest.requireMock('expo-sqlite') as {
  openDatabaseAsync: jest.Mock;
  __db: {
    execAsync: jest.Mock;
    getFirstAsync: jest.Mock;
    runAsync: jest.Mock;
    getAllAsync: jest.Mock;
    _execHistory: string[];
    _resetVersion: () => void;
  };
};

beforeEach(() => {
  resetDatabaseInstance();
  ExpoSQLite.__db.execAsync.mockClear();
  ExpoSQLite.__db.getFirstAsync.mockClear();
  ExpoSQLite.__db.runAsync.mockClear();
  ExpoSQLite.__db.getAllAsync.mockClear();
  ExpoSQLite.__db._execHistory.length = 0;
  ExpoSQLite.__db._resetVersion();
  ExpoSQLite.openDatabaseAsync.mockClear();
});

describe('openDatabase', () => {
  it('opens the database and runs migrations on first call', async () => {
    const db = await openDatabase();
    expect(db).toBeDefined();
    expect(ExpoSQLite.openDatabaseAsync).toHaveBeenCalledWith('training.db');
    const execCalls = ExpoSQLite.__db.execAsync.mock.calls.map(
      (c: unknown[]) => c[0] as string
    );
    const hasMigration = execCalls.some(
      (sql) =>
        sql.includes('CREATE TABLE IF NOT EXISTS exercises') &&
        sql.includes('CREATE TABLE IF NOT EXISTS sessions')
    );
    expect(hasMigration).toBe(true);
    const versionSet = execCalls.some((sql) =>
      sql.includes('PRAGMA user_version = 1')
    );
    expect(versionSet).toBe(true);
  });

  it('returns the same instance on subsequent calls', async () => {
    const db1 = await openDatabase();
    const db2 = await openDatabase();
    expect(db1).toBe(db2);
    expect(ExpoSQLite.openDatabaseAsync).toHaveBeenCalledTimes(1);
  });

  it('enables foreign keys', async () => {
    await openDatabase();
    const execCalls = ExpoSQLite.__db.execAsync.mock.calls.map(
      (c: unknown[]) => c[0] as string
    );
    expect(execCalls).toContain('PRAGMA foreign_keys = ON');
  });
});

describe('migrations idempotency', () => {
  it('does not re-run migrations when user_version is already up to date', async () => {
    ExpoSQLite.__db.getFirstAsync.mockResolvedValueOnce({ user_version: 1 });

    await openDatabase();

    const execCalls = ExpoSQLite.__db.execAsync.mock.calls.map(
      (c: unknown[]) => c[0] as string
    );
    const migrationRan = execCalls.some((sql) =>
      sql.includes('CREATE TABLE IF NOT EXISTS exercises')
    );
    expect(migrationRan).toBe(false);
  });
});

describe('getDatabase', () => {
  it('throws if called before openDatabase', () => {
    expect(() => getDatabase()).toThrow(
      'Database not initialized. Call openDatabase() before getDatabase().'
    );
  });

  it('returns the db instance after openDatabase', async () => {
    const db = await openDatabase();
    expect(getDatabase()).toBe(db);
  });
});

describe('schema completeness', () => {
  it('creates all 9 required tables', async () => {
    await openDatabase();
    const execCalls = ExpoSQLite.__db.execAsync.mock.calls.map(
      (c: unknown[]) => c[0] as string
    );
    const fullSql = execCalls.join('\n');
    const expectedTables = [
      'exercises',
      'programs',
      'blocks',
      'workout_days',
      'planned_exercises',
      'sessions',
      'set_logs',
      'sync_queue',
      'recommendations',
    ];
    for (const table of expectedTables) {
      expect(fullSql).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
    }
  });

  // TA-19 : vérifie les indexes Phase 3 ajoutés en v4
  it('creates Phase 3 indexes (v4)', async () => {
    await openDatabase();
    const execCalls = ExpoSQLite.__db.execAsync.mock.calls.map(
      (c: unknown[]) => c[0] as string
    );
    const fullSql = execCalls.join('\n');
    const expectedIndexes = [
      'idx_programs_user_is_active',
      'idx_blocks_program_status',
      'idx_workout_days_block_day_order',
      'idx_planned_exercises_workout_day_order',
    ];
    for (const idx of expectedIndexes) {
      expect(fullSql).toContain(idx);
    }
    expect(fullSql).toContain('PRAGMA user_version = 4');
  });

  // TA-72 : vérifie les indexes Phase 4 + table app_meta en v5
  it('creates Phase 4 indexes and app_meta (v5)', async () => {
    await openDatabase();
    const execCalls = ExpoSQLite.__db.execAsync.mock.calls.map(
      (c: unknown[]) => c[0] as string
    );
    const fullSql = execCalls.join('\n');
    expect(fullSql).toContain('idx_sessions_workout_day');
    expect(fullSql).toContain('idx_set_logs_planned_exercise');
    expect(fullSql).toContain('CREATE TABLE IF NOT EXISTS app_meta');
    expect(fullSql).toContain('PRAGMA user_version = 5');
  });

  // TA-103 : vérifie la table recommendations + ses indexes en v8
  it('creates recommendations table and indexes (v8)', async () => {
    await openDatabase();
    const execCalls = ExpoSQLite.__db.execAsync.mock.calls.map(
      (c: unknown[]) => c[0] as string
    );
    const fullSql = execCalls.join('\n');
    expect(fullSql).toContain('CREATE TABLE IF NOT EXISTS recommendations');
    expect(fullSql).toContain('idx_recommendations_session');
    expect(fullSql).toContain('idx_recommendations_exercise');
    expect(fullSql).toContain('idx_recommendations_type');
    expect(fullSql).toContain('PRAGMA user_version = 8');
  });
});
