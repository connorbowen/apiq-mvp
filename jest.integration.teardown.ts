import { prisma } from './lib/database/client';

export default async function globalTeardown() {
  await prisma.$disconnect();
} 