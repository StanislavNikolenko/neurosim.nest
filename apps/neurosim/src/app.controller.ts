import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { AppService } from './app.service';
import {
  GetUploadUrlResult,
  S3StorageService,
} from './storage/s3-storage.service';
import { EnqueueIngestJobUseCase } from './application/use-cases/enqueue-ingest-job.use-case';
import { EnqueueIngestJobResult } from './application/types/enqueue-ingest-job-result';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly s3StorageService: S3StorageService,
    private readonly enqueueIngestJobUseCase: EnqueueIngestJobUseCase,
  ) {}

  @Post('upload-url')
  async uploadUrl(
    @Body() body: { fileName: string },
  ): Promise<GetUploadUrlResult> {
    if (!body?.fileName || typeof body.fileName !== 'string') {
      throw new BadRequestException('fileName is required');
    }
    return this.s3StorageService.getUploadUrl(body.fileName);
  }

  @Post('upload-complete')
  completeUpload(
    @Body() body: { datasetId: string; correlationId: string },
  ): Promise<EnqueueIngestJobResult> {
    return this.enqueueIngestJobUseCase.execute(
      body.datasetId,
      body.correlationId,
    );
  }

  @Get('spike/:id')
  getSpike(@Param('id') id: string): Observable<unknown> {
    return this.appService.getSpike(id);
  }

  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
