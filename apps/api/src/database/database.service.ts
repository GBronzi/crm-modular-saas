import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.DATABASE_POOL_SIZE ?? 10),
    idleTimeoutMillis: 30_000,
  });

  async ping(): Promise<void> {
    await this.pool.query('SELECT 1');
  }

  async inTenant<T>(companyId: string, operation: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.company_id', $1, true)", [companyId]);
      const result = await operation(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  query<T extends QueryResultRow>(sql: string, values: readonly unknown[] = []): Promise<QueryResult<T>> {
    return this.pool.query<T>(sql, values as unknown[]);
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}

