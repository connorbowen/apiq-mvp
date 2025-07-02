import { boss } from './src/lib/singletons/boss';
import { prisma } from './src/lib/singletons/prisma';
import { loadFixtures } from './tests/fixtures/seed';
import { PrismaClient } from '@prisma/client';

export default async function globalSetup() {
  await prisma.$connect();
  await boss.start();

  // Load deterministic fixtures once per test run
  await prisma.$transaction(async (tx: PrismaClient) => {
    await loadFixtures(tx);
  });
} 