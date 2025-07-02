import { PrismaClient } from '../../src/generated/prisma';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
//
// Learn more:
// https://pris.ly/d/help/next-js-best-practices

declare global {
  // Prevent multiple instances in dev/hot-reload
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Use test database client in test environment
let prisma: PrismaClient;

if (process.env.NODE_ENV === 'test') {
  // For tests, create a new Prisma client with test database configuration
  const testConfig = {
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5432'),
    database: process.env.TEST_DB_NAME || 'apiq_test',
    user: process.env.TEST_DB_USER || 'connorbowen',
    password: process.env.TEST_DB_PASSWORD || '',
  };

  const connectionString = `postgresql://${testConfig.user}:${testConfig.password}@${testConfig.host}:${testConfig.port}/${testConfig.database}`;

  prisma = new PrismaClient({
    datasources: {
      db: {
        url: connectionString,
      },
    },
    log: ['error'], // Only log errors in tests to reduce noise
  });
} else {
  prisma = global.prisma ?? new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
  global.prisma = prisma;
}

export { prisma };

// Test database connection
export const testDatabaseConnection = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
};

// Graceful shutdown
export const disconnectDatabase = async () => {
  await prisma.$disconnect();
  console.log('Database disconnected');
}; 