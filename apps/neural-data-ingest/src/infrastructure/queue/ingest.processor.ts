import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AppService } from '../../app.service';
import { NEURAL_INGEST_QUEUE_NAME } from './queue.constants';

export interface IngestJobPayload {
  correlationId: string;
  storageKey: string;
  originalName: string;
}

@Processor(NEURAL_INGEST_QUEUE_NAME)
export class IngestProcessor extends WorkerHost {
  private readonly logger = new Logger(IngestProcessor.name);

  constructor(private readonly appService: AppService) {
    super();
  }

  async process(job: Job<IngestJobPayload>): Promise<string> {
    this.logger.log(
      `Processing ingest job id=${job.id} correlationId=${job.data?.correlationId} key=${job.data?.storageKey}`,
    );
    return this.appService.ingest();
  }
}
