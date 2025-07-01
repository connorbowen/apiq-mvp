import PgBoss from 'pg-boss';

export interface QueueConfig {
  connectionString: string;
  schema?: string;
}

export interface QueueClient {
  initialize: () => Promise<void>;
  stop: () => Promise<void>;
  send: (queueName: string, data: any, options?: any) => Promise<string | null>;
  work: (queueName: string, handler: (job: any) => Promise<any>, options?: any) => Promise<string>;
  cancel: (queueName: string, jobId: string) => Promise<void>;
  getJobById: (queueName: string, jobId: string) => Promise<any>;
  on: (event: 'stopped', handler: () => void) => void;
  off: (event: 'stopped', handler: () => void) => void;
}

/**
 * Create and configure a pg-boss client
 * 
 * @param config - Configuration options for the queue service
 * @returns Configured queue client instance
 */
export const getQueueClient = (config: QueueConfig): QueueClient => {
  // Validate configuration
  if (!config.connectionString) {
    throw new Error('Database connection string is required for queue client');
  }

  // Create the pg-boss instance with basic options
  const boss = new PgBoss({
    connectionString: config.connectionString,
    schema: config.schema || 'pgboss',
  });

  // Return a typed interface
  return {
    initialize: async () => {
      await boss.start();
    },
    stop: async () => {
      await boss.stop();
    },
    send: async (queueName: string, data: any, options?: any) => {
      return await boss.send(queueName, data, options);
    },
    work: async (queueName: string, handler: (job: any) => Promise<any>, options?: any) => {
      return await boss.work(queueName, options, handler);
    },
    cancel: async (queueName: string, jobId: string) => {
      return await boss.cancel(queueName, jobId);
    },
    getJobById: async (queueName: string, jobId: string) => {
      return await boss.getJobById(queueName, jobId);
    },
    on: (event: 'stopped', handler: () => void) => {
      boss.on(event, handler);
    },
    off: (event: 'stopped', handler: () => void) => {
      boss.off(event, handler);
    },
  };
};

/**
 * Create a queue client with default configuration from environment variables
 * 
 * @returns Configured queue client instance
 */
export const getDefaultQueueClient = (): QueueClient => {
  const config: QueueConfig = {
    connectionString: process.env.DATABASE_URL || '',
    schema: process.env.PGBOSS_SCHEMA,
  };

  return getQueueClient(config);
};

/**
 * Validate queue configuration
 * 
 * @param config - Configuration to validate
 * @returns true if valid, false otherwise
 */
export const validateQueueConfig = (config: QueueConfig): boolean => {
  return !!(
    config.connectionString && 
    config.connectionString.length > 0
  );
};

// Export the default client for convenience
export default getDefaultQueueClient; 