import { boss } from './src/lib/singletons/boss';
import { prisma } from './src/lib/singletons/prisma';

export default async function globalTeardown() {
  await boss.stop();
  await prisma.$disconnect();
} 