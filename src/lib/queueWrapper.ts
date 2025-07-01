import PgBoss from 'pg-boss';

export interface QueueConfig {
  connectionString: string;
  schema?: string;
}

export interface QueueClient {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  createQueue: (queueName: string) => Promise<void>;
  send: (queueName: string, data: any, options?: any) => Promise<string | null>;
  work: (queueName: string, options: any, handler: (job: any) => Promise<any>) => Promise<any>;
  cancel: (queueName: string, jobId: string) => Promise<void>;
  getJobById: (queueName: string, jobId: string) => Promise<any>;
  on: (event: string, handler: (error?: Error) => void) => void;
  off: (event: string, handler: (error?: Error) => void) => void;
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
    start: async () => {
      await boss.start();
    },
    stop: async () => {
      await boss.stop();
    },
    createQueue: async (queueName: string) => {
      await boss.createQueue(queueName);
    },
    send: async (queueName: string, data: any, options?: any) => {
      return await boss.send(queueName, data, options);
    },
    work: async (queueName: string, options: any, handler: (job: any) => Promise<any>) => {
      return await boss.work(queueName, options, handler);
    },
    cancel: async (queueName: string, jobId: string) => {
      return await boss.cancel(queueName, jobId);
    },
    getJobById: async (queueName: string, jobId: string) => {
      return await boss.getJobById(queueName, jobId);
    },
    on: (event: string, handler: (error?: Error) => void) => {
      boss.on(event as any, handler);
    },
    off: (event: string, handler: (error?: Error) => void) => {
      boss.off(event as any, handler);
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