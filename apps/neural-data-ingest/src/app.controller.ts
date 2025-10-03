import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { Spike } from './spike.entity';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @MessagePattern({ cmd: 'ingest' })
  ingest(): Promise<string> {
    return this.appService.ingest();
  }

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
}
