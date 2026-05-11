import type { IngestJobPayload } from '../../application/types/ingest-job-payload';
import type { SimulationJobPayload } from '../types/simulation-job-payload';

export const JOB_QUEUE_PORT = Symbol('JOB_QUEUE_PORT');

export interface JobQueuePort {
  enqueueIngestJob(payload: IngestJobPayload): Promise<string>;
  enqueueSimulationJob(payload: SimulationJobPayload): Promise<string>;
}
