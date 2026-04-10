import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { JobQueuePort } from '../../application/ports/job-queue.port';
import type { IngestJobPayload } from '../../application/types/ingest-job-payload';
import {
  NEURAL_INGEST_JOB_NAME,
  NEURAL_INGEST_QUEUE_NAME,
} from './queue.constants';

@Injectable()
export class BullmqJobQueueService implements JobQueuePort {
  constructor(
    @InjectQueue(NEURAL_INGEST_QUEUE_NAME)
    private readonly queue: Queue,
  ) {}

  async enqueueIngestJob(payload: IngestJobPayload): Promise<string> {
    const job = await this.queue.add(NEURAL_INGEST_JOB_NAME, payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });
    return String(job.id ?? '');
  }
}
