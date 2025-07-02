import { PrismaClient } from '@prisma/client';

export interface TestFixtures {
  users: {
    testUser1: { id: string; email: string; name: string };
    testUser2: { id: string; email: string; name: string };
  };
  apiConnections: {
    githubConnection: { id: string; userId: string; provider: string };
    slackConnection: { id: string; userId: string; provider: string };
  };
}

export async function loadFixtures(tx: PrismaClient): Promise<TestFixtures> {
  // Create test users
  const testUser1 = await tx.user.upsert({
    where: { email: 'test-user-1@example.com' },
    update: {},
    create: {
      id: 'test-user-1-id',
      email: 'test-user-1@example.com',
      name: 'Test User 1',
      role: 'USER',
      emailVerified: new Date(),
    },
  });

  const testUser2 = await tx.user.upsert({
    where: { email: 'test-user-2@example.com' },
    update: {},
    create: {
      id: 'test-user-2-id',
      email: 'test-user-2@example.com',
      name: 'Test User 2',
      role: 'USER',
      emailVerified: new Date(),
    },
  });

  // Create test API connections
  const githubConnection = await tx.apiConnection.upsert({
    where: { id: 'test-github-connection-id' },
    update: {},
    create: {
      id: 'test-github-connection-id',
      userId: testUser1.id,
      provider: 'github',
      name: 'Test GitHub Connection',
      status: 'CONNECTED',
      credentials: 'encrypted-test-credentials',
      metadata: { scope: 'repo,user' },
    },
  });

  const slackConnection = await tx.apiConnection.upsert({
    where: { id: 'test-slack-connection-id' },
    update: {},
    create: {
      id: 'test-slack-connection-id',
      userId: testUser1.id,
      provider: 'slack',
      name: 'Test Slack Connection',
      status: 'CONNECTED',
      credentials: 'encrypted-test-credentials',
      metadata: { scope: 'chat:write,channels:read' },
    },
  });

  return {
    users: {
      testUser1: { id: testUser1.id, email: testUser1.email, name: testUser1.name },
      testUser2: { id: testUser2.id, email: testUser2.email, name: testUser2.name },
    },
    apiConnections: {
      githubConnection: { id: githubConnection.id, userId: githubConnection.userId, provider: githubConnection.provider },
      slackConnection: { id: slackConnection.id, userId: slackConnection.userId, provider: slackConnection.provider },
    },
  };
} 