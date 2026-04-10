import type { StorageResult } from '../../storage/storage.interface';

export interface UploadNeuralFileResult extends StorageResult {
  jobId: string;
  correlationId: string;
}
