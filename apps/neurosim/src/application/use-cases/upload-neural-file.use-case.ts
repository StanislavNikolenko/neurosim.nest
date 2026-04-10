import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { JOB_QUEUE_PORT, JobQueuePort } from '../ports/job-queue.port';
import type { IStorageService } from '../../storage/storage.interface';
import type { UploadNeuralFileResult } from '../../application/types/upload-neural-file-result';

@Injectable()
export class UploadNeuralFileUseCase {
  constructor(
    @Inject('STORAGE_SERVICE') private readonly storage: IStorageService,
    @Inject(JOB_QUEUE_PORT) private readonly jobQueue: JobQueuePort,
  ) {}

  async execute(file: Express.Multer.File): Promise<UploadNeuralFileResult> {
    const storageResult = await this.storage.uploadFile(file);
    const correlationId = randomUUID();
    const jobId = await this.jobQueue.enqueueIngestJob({
      correlationId,
      storageKey: storageResult.key,
      originalName: storageResult.originalName,
    });
    return {
      ...storageResult,
      jobId,
      correlationId,
    };
  }
}
