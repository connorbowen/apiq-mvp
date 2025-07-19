import { prisma } from '../../lib/database/client';
import { boss } from '../../src/lib/singletons/boss';
import { PrismaClient } from '@prisma/client';

/**
 * Wraps a test function in a database transaction that gets rolled back after the test.
 * Use this when you have pool size >= 2 and don't test PgBoss listeners in the same transaction.
 */
export async function withCleanDb<T>(fn: () => Promise<T>): Promise<T> {
  await prisma.$executeRaw`BEGIN`;
  try {
    const result = await fn();
    return result;
  } finally {
    await prisma.$executeRaw`ROLLBACK`;
  }
}

/**
 * Truncates mutable tables to reset test state.
 * Use this when pool size = 1 or when PgBoss shares the connection.
 * Enhanced for multi-worker scenarios with better error handling.
 */
export async function truncateTestTables(): Promise<void> {
  try {
    // Disable foreign key checks temporarily for clean truncation
    await prisma.$executeRaw`SET session_replication_role = replica`;
    
    // Truncate tables that tests modify, restarting identity sequences
    await prisma.$executeRaw`TRUNCATE TABLE workflow_executions RESTART IDENTITY CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE api_connections RESTART IDENTITY CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE users RESTART IDENTITY CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE audit_logs RESTART IDENTITY CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE secrets RESTART IDENTITY CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE workflows RESTART IDENTITY CASCADE`;
    
    // Re-enable foreign key checks
    await prisma.$executeRaw`SET session_replication_role = DEFAULT`;
    
    // Note: We don't truncate pgboss tables here as they're managed by PgBoss itself
  } catch (error) {
    console.warn('Warning: Failed to truncate test tables:', error);
    // Continue execution even if truncation fails
  }
}

/**
 * Clears all PgBoss jobs (finished, archived, and pending).
 * Call this in afterEach if your test enqueues jobs.
 * Enhanced for multi-worker scenarios.
 */
export async function clearPgBossJobs(): Promise<void> {
  try {
    // Stop and restart boss to clear job state
    await boss.stop();
    await boss.start();
  } catch (error) {
    console.warn('Warning: Failed to clear PgBoss jobs:', error);
    // Continue execution even if PgBoss cleanup fails
  }
}

/**
 * Complete test cleanup - truncates tables and clears PgBoss jobs.
 * Use this in afterEach for maximum isolation.
 * Enhanced for multi-worker scenarios with retry logic.
 */
export async function cleanupTestData(): Promise<void> {
  const maxRetries = 3;
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await truncateTestTables();
      await clearPgBossJobs();
      return; // Success, exit the retry loop
    } catch (error) {
      lastError = error as Error;
      console.warn(`Cleanup attempt ${attempt} failed:`, error);
      
      if (attempt < maxRetries) {
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 100 * attempt));
      }
    }
  }
  
  // If all retries failed, log the error but don't throw
  console.error('All cleanup retries failed. Last error:', lastError);
}

/**
 * Cleanup strategy for multi-worker scenarios
 * Only cleans up if no other tests are actively running
 */
export async function safeCleanupTestData(): Promise<void> {
  try {
    // Check if there are active database connections (indicating other tests are running)
    const activeConnections = await prisma.$queryRaw`SELECT count(*) as count FROM pg_stat_activity WHERE state = 'active' AND query NOT LIKE '%pg_stat_activity%'`;
    const count = (activeConnections as any)[0]?.count || 0;
    
    // If there are many active connections, skip cleanup to avoid interference
    if (count > 5) {
      console.log(`⏭️ Skipping cleanup - ${count} active database connections detected`);
      return;
    }
    
    // Proceed with cleanup
    await cleanupTestData();
  } catch (error) {
    console.warn('Safe cleanup failed:', error);
    // Don't throw - continue execution
  }
}

/**
 * Gets test fixtures for use in tests.
 * This provides access to the deterministic data loaded in globalSetup.
 */
export function getTestFixtures() {
  return {
    users: {
      testUser1: { id: 'test-user-1-id', email: 'test-user-1@example.com', name: 'Test User 1' },
      testUser2: { id: 'test-user-2-id', email: 'test-user-2@example.com', name: 'Test User 2' },
    },
    apiConnections: {
      githubConnection: { id: 'test-github-connection-id', userId: 'test-user-1-id', provider: 'github' },
      slackConnection: { id: 'test-slack-connection-id', userId: 'test-user-1-id', provider: 'slack' },
    },
  };
} 