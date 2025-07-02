import { prisma } from '../../src/lib/singletons/prisma';
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
 */
export async function truncateTestTables(): Promise<void> {
  // Truncate tables that tests modify, restarting identity sequences
  await prisma.$executeRaw`TRUNCATE TABLE workflow_executions RESTART IDENTITY CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE api_connections RESTART IDENTITY CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE users RESTART IDENTITY CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE audit_logs RESTART IDENTITY CASCADE`;
  
  // Note: We don't truncate pgboss tables here as they're managed by PgBoss itself
}

/**
 * Clears all PgBoss jobs (finished, archived, and pending).
 * Call this in afterEach if your test enqueues jobs.
 */
export async function clearPgBossJobs(): Promise<void> {
  // Stop and restart boss to clear job state
  await boss.stop();
  await boss.start();
}

/**
 * Complete test cleanup - truncates tables and clears PgBoss jobs.
 * Use this in afterEach for maximum isolation.
 */
export async function cleanupTestData(): Promise<void> {
  await truncateTestTables();
  await clearPgBossJobs();
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