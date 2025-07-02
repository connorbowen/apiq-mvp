import { PrismaClient } from '../../src/generated/prisma';

export interface TestFixtures {
  users: {
    testUser1: { id: string; email: string; name: string };
    testUser2: { id: string; email: string; name: string };
  };
  apiConnections: {
    githubConnection: { id: string; userId: string; name: string };
    slackConnection: { id: string; userId: string; name: string };
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
      password: 'hashed-test-password-1',
      role: 'USER',
    },
  });

  const testUser2 = await tx.user.upsert({
    where: { email: 'test-user-2@example.com' },
    update: {},
    create: {
      id: 'test-user-2-id',
      email: 'test-user-2@example.com',
      name: 'Test User 2',
      password: 'hashed-test-password-2',
      role: 'USER',
    },
  });

  // Create test API connections
  const githubConnection = await tx.apiConnection.upsert({
    where: { id: 'test-github-connection-id' },
    update: {},
    create: {
      id: 'test-github-connection-id',
      userId: testUser1.id,
      name: 'Test GitHub Connection',
      baseUrl: 'https://api.github.com',
      authType: 'OAUTH2',
      authConfig: { scope: 'repo,user' },
      status: 'ACTIVE',
      connectionStatus: 'connected',
    },
  });

  const slackConnection = await tx.apiConnection.upsert({
    where: { id: 'test-slack-connection-id' },
    update: {},
    create: {
      id: 'test-slack-connection-id',
      userId: testUser1.id,
      name: 'Test Slack Connection',
      baseUrl: 'https://slack.com/api',
      authType: 'OAUTH2',
      authConfig: { scope: 'chat:write,channels:read' },
      status: 'ACTIVE',
      connectionStatus: 'connected',
    },
  });

  return {
    users: {
      testUser1: { id: testUser1.id, email: testUser1.email, name: testUser1.name },
      testUser2: { id: testUser2.id, email: testUser2.email, name: testUser2.name },
    },
    apiConnections: {
      githubConnection: { id: githubConnection.id, userId: githubConnection.userId, name: githubConnection.name },
      slackConnection: { id: slackConnection.id, userId: slackConnection.userId, name: slackConnection.name },
    },
  };
} 