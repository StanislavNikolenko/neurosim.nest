import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import type { SimulationParams } from './application/types/simulation-job-payload';

export interface CreateSimulationRunDto {
  datasetId: string;
  correlationId: string;
  params: SimulationParams;
}

export interface SimulationRunDto {
  id: number;
  datasetId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  params: SimulationParams;
  summary: Record<string, number | string | boolean> | null;
  resultKey: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class AppService {
  constructor(@Inject('INGEST_SERVICE') private ingestClient: ClientProxy) {}

  getSpike(id: string): Observable<unknown> {
    const pattern = { cmd: 'getSpike' };
    const payload = { spikeId: id };
    return this.ingestClient.send(pattern, payload);
  }

  createSimulationRun(
    payload: CreateSimulationRunDto,
  ): Promise<SimulationRunDto> {
    return firstValueFrom(
      this.ingestClient.send<SimulationRunDto>(
        { cmd: 'createSimulationRun' },
        payload,
      ),
    );
  }

  getSimulationRun(id: number): Promise<SimulationRunDto> {
    return firstValueFrom(
      this.ingestClient.send<SimulationRunDto>(
        { cmd: 'getSimulationRun' },
        { id },
      ),
    );
  }
}
