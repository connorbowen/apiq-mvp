import { Pool } from 'pg';

export interface TestDatabase {
  connectionString: string;
  pool: Pool;
  cleanup: () => Promise<void>;
}

let testDbInstance: TestDatabase | null = null;

export async function getTestDatabase(): Promise<TestDatabase> {
  if (testDbInstance) {
    return testDbInstance;
  }

  // Use test database configuration
  const testConfig = {
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5432'),
    database: process.env.TEST_DB_NAME || 'apiq_test',
    user: process.env.TEST_DB_USER || 'postgres',
    password: process.env.TEST_DB_PASSWORD || 'postgres',
  };

  const connectionString = `postgresql://${testConfig.user}:${testConfig.password}@${testConfig.host}:${testConfig.port}/${testConfig.database}`;

  // Create connection pool
  const pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  // Test connection
  try {
    await pool.query('SELECT 1');
  } catch (error) {
    throw new Error(`Failed to connect to test database: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Create test database instance
  testDbInstance = {
    connectionString,
    pool,
    cleanup: async () => {
      if (pool) {
        await pool.end();
      }
      testDbInstance = null;
    },
  };

  return testDbInstance;
}

export async function resetTestDatabase(): Promise<void> {
  if (testDbInstance) {
    await testDbInstance.cleanup();
  }
}

export async function createTestSchema(schemaName: string): Promise<void> {
  const db = await getTestDatabase();
  
  try {
    // Drop schema if exists
    await db.pool.query(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`);
    
    // Create schema
    await db.pool.query(`CREATE SCHEMA ${schemaName}`);
  } catch (error) {
    throw new Error(`Failed to create test schema: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function dropTestSchema(schemaName: string): Promise<void> {
  const db = await getTestDatabase();
  
  try {
    await db.pool.query(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`);
  } catch (error) {
    // Ignore errors during cleanup
    console.warn(`Warning: Failed to drop test schema ${schemaName}:`, error);
  }
}

export async function executeTestQuery(query: string, params?: any[]): Promise<any> {
  const db = await getTestDatabase();
  return db.pool.query(query, params);
}

export async function cleanupTestData(schemaName: string): Promise<void> {
  const db = await getTestDatabase();
  
  try {
    // Get all tables in schema
    const tablesResult = await db.pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = $1
    `, [schemaName]);

    // Truncate all tables
    for (const table of tablesResult.rows) {
      await db.pool.query(`TRUNCATE TABLE ${schemaName}.${table.tablename} CASCADE`);
    }
  } catch (error) {
    console.warn(`Warning: Failed to cleanup test data:`, error);
  }
} 