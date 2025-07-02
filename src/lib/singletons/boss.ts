import PgBoss from 'pg-boss';

let connectionString = process.env.DATABASE_URL || '';
if (process.env.NODE_ENV === 'test' && !connectionString.includes('max=')) {
  connectionString += (connectionString.includes('?') ? '&' : '?') + 'max=1';
}

export const boss = new PgBoss({
  connectionString,
  application_name: 'test-suite',
}); 