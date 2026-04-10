import type { IngestJobPayload } from '../../application/types/ingest-job-payload';

export const JOB_QUEUE_PORT = Symbol('JOB_QUEUE_PORT');

export interface JobQueuePort {
  enqueueIngestJob(payload: IngestJobPayload): Promise<string>;
}
