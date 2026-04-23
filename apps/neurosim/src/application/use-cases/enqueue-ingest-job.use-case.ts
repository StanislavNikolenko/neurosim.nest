import { Inject, Injectable } from '@nestjs/common';
import { JOB_QUEUE_PORT, JobQueuePort } from '../ports/job-queue.port';
import type { EnqueueIngestJobResult } from '../types/enqueue-ingest-job-result';

@Injectable()
export class EnqueueIngestJobUseCase {
  constructor(
    @Inject(JOB_QUEUE_PORT) private readonly jobQueue: JobQueuePort,
  ) {}

  async execute(
    datasetId: string,
    correlationId: string,
  ): Promise<EnqueueIngestJobResult> {
    const jobId = await this.jobQueue.enqueueIngestJob({
      correlationId,
      datasetId,
    });
    return {
      datasetId,
      jobId,
      correlationId,
    };
  }
}
