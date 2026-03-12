export interface SqliteStatementLike {
  get(...params: unknown[]): unknown;
  run(...params: unknown[]): unknown;
}

export interface SqliteLike {
  exec(sql: string): unknown;
  prepare(sql: string): SqliteStatementLike;
}

export class SqliteStateAdapter {
  constructor(private readonly db: SqliteLike, private readonly table = "workflow_state") {
    this.db.exec(
      `CREATE TABLE IF NOT EXISTS ${this.table} (
         run_id TEXT PRIMARY KEY,
         state_json TEXT NOT NULL
       )`,
    );
  }

  load<T>(runId: string): T | null {
    const row = this.db.prepare(`SELECT state_json FROM ${this.table} WHERE run_id = ?`).get(runId) as
      | { state_json: string }
      | undefined;
    if (!row?.state_json) return null;
    return JSON.parse(row.state_json) as T;
  }

  save<T>(runId: string, state: T): void {
    this.db
      .prepare(`INSERT OR REPLACE INTO ${this.table} (run_id, state_json) VALUES (?, ?)`)
      .run(runId, JSON.stringify(state));
  }
}

