import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AppService } from '../../app.service';
import { NEURAL_INGEST_QUEUE_NAME } from './queue.constants';
import { IngestJobPayload } from './ingest-job-payload';

@Processor(NEURAL_INGEST_QUEUE_NAME)
export class IngestProcessor extends WorkerHost {
  private readonly logger = new Logger(IngestProcessor.name);

  constructor(private readonly appService: AppService) {
    super();
  }

  async process(job: Job<IngestJobPayload>): Promise<string> {
    this.logger.log(
      `Processing ingest job id=${job.id} correlationId=${job.data?.correlationId} dataset=${job.data?.datasetId}`,
    );
    return this.appService.ingest(job.data);
  }
}
