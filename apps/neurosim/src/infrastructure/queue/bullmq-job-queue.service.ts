import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { JobQueuePort } from '../../application/ports/job-queue.port';
import type { IngestJobPayload } from '../../application/types/ingest-job-payload';
import type { SimulationJobPayload } from '../../application/types/simulation-job-payload';
import {
  NEURAL_INGEST_JOB_NAME,
  NEURAL_INGEST_QUEUE_NAME,
  NEURAL_SIMULATION_JOB_NAME,
  NEURAL_SIMULATION_QUEUE_NAME,
} from './queue.constants';

@Injectable()
export class BullmqJobQueueService implements JobQueuePort {
  constructor(
    @InjectQueue(NEURAL_INGEST_QUEUE_NAME)
    private readonly ingestQueue: Queue,
    @InjectQueue(NEURAL_SIMULATION_QUEUE_NAME)
    private readonly simulationQueue: Queue,
  ) {}

  async enqueueIngestJob(payload: IngestJobPayload): Promise<string> {
    const job = await this.ingestQueue.add(NEURAL_INGEST_JOB_NAME, payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });
    return String(job.id ?? '');
  }

  async enqueueSimulationJob(payload: SimulationJobPayload): Promise<string> {
    const job = await this.simulationQueue.add(
      NEURAL_SIMULATION_JOB_NAME,
      payload,
      {
        attempts: 2,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    );
    return String(job.id ?? '');
  }
}
