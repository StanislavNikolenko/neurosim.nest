import { GetUploadUrlResult } from './s3-storage.service';

export interface IStorageService {
  getUploadUrl(key: string): Promise<GetUploadUrlResult>;
}
