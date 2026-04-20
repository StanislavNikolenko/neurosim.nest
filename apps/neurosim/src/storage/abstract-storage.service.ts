import { Injectable } from '@nestjs/common';
import { IStorageService } from './storage.interface';
import { GetUploadUrlResult } from './s3-storage.service';

@Injectable()
export abstract class AbstractStorageService implements IStorageService {
  abstract getUploadUrl(key: string): Promise<GetUploadUrlResult>;
}
