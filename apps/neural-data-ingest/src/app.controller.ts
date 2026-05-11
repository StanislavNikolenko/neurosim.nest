import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { Spike } from './spike.entity';
import { SimulationJobPayload } from './infrastructure/queue/simulation-job-payload';
import { SimulationRun } from './simulation-run.entity';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'neural-data-ingest',
      timestamp: new Date().toISOString(),
    };
  }

  @MessagePattern({ cmd: 'getSpike' })
  getSpike(@Payload('spikeId') spikeId: number): Promise<Spike> {
    return this.appService.getSpike(spikeId);
  }

  @MessagePattern({ cmd: 'createSimulationRun' })
  createSimulationRun(
    @Payload() payload: Omit<SimulationJobPayload, 'simulationRunId'>,
  ): Promise<SimulationRun> {
    return this.appService.createSimulationRun(payload);
  }

  @MessagePattern({ cmd: 'getSimulationRun' })
  getSimulationRun(@Payload('id') id: number): Promise<SimulationRun> {
    return this.appService.getSimulationRun(id);
  }
}
