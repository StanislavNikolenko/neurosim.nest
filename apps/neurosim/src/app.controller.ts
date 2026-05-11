import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import {
  AppService,
  CreateSimulationRunDto,
  SimulationRunDto,
} from './app.service';
import {
  GetUploadUrlResult,
  S3StorageService,
} from './infrastructure/storage/s3-storage.service';
import { EnqueueIngestJobUseCase } from './application/use-cases/enqueue-ingest-job.use-case';
import { EnqueueIngestJobResult } from './application/types/enqueue-ingest-job-result';
import {
  JOB_QUEUE_PORT,
  JobQueuePort,
} from './application/ports/job-queue.port';
import { SimulationJobPayload } from './application/types/simulation-job-payload';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly s3StorageService: S3StorageService,
    private readonly enqueueIngestJobUseCase: EnqueueIngestJobUseCase,
    @Inject(JOB_QUEUE_PORT)
    private readonly jobQueuePort: JobQueuePort,
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

  @Post('simulations')
  async createSimulation(
    @Body()
    body: {
      datasetId: string;
      correlationId: string;
      params: SimulationJobPayload['params'];
    },
  ): Promise<{ simulationRunId: number; queueJobId: string; status: string }> {
    if (!body?.datasetId || !body?.correlationId || !body?.params) {
      throw new BadRequestException(
        'datasetId, correlationId and params are required',
      );
    }

    const run = await this.appService.createSimulationRun(
      body as CreateSimulationRunDto,
    );
    const queueJobId = await this.jobQueuePort.enqueueSimulationJob({
      simulationRunId: run.id,
      datasetId: body.datasetId,
      correlationId: body.correlationId,
      params: body.params,
    });

    return {
      simulationRunId: run.id,
      queueJobId,
      status: run.status,
    };
  }

  @Get('simulations/:id')
  async getSimulation(@Param('id') id: string): Promise<SimulationRunDto> {
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      throw new BadRequestException('simulation id must be a positive integer');
    }
    return this.appService.getSimulationRun(numericId);
  }
}
