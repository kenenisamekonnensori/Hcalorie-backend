import { Queue } from 'bullmq';

import { env } from '@/infrastructure/config/env.js';

export const QUEUE_NAMES = {
  aiWorkflows: 'ai-workflows',
} as const;

type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

const queues = new Map<QueueName, Queue>();

const getOrCreateQueue = (name: QueueName) => {
  const existingQueue = queues.get(name);
  if (existingQueue) {
    return existingQueue;
  }

  const queue = new Queue(name, {
    connection: {
      url: env.REDIS_URL,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    },
    defaultJobOptions: {
      attempts: 3,
      removeOnComplete: 100,
      removeOnFail: 100,
    },
  });

  queues.set(name, queue);

  return queue;
};

export const getAiWorkflowsQueue = () => getOrCreateQueue(QUEUE_NAMES.aiWorkflows);

export const closeQueueInfrastructure = async () => {
  await Promise.all([...queues.values()].map(async (queue) => queue.close()));
  queues.clear();
};
