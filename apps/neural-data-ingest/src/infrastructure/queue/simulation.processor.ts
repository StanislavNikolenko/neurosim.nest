import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AppService } from '../../app.service';
import { NEURAL_SIMULATION_QUEUE_NAME } from './queue.constants';
import { SimulationJobPayload } from './simulation-job-payload';

@Processor(NEURAL_SIMULATION_QUEUE_NAME)
export class SimulationProcessor extends WorkerHost {
  private readonly logger = new Logger(SimulationProcessor.name);

  constructor(private readonly appService: AppService) {
    super();
  }

  async process(job: Job<SimulationJobPayload>): Promise<void> {
    this.logger.log(
      `Processing simulation job id=${job.id} runId=${job.data?.simulationRunId} dataset=${job.data?.datasetId}`,
    );
    await this.appService.runSimulationJob(job.data);
  }
}
