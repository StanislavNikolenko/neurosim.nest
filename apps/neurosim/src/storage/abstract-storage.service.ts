import { Injectable } from '@nestjs/common';
import { IStorageService, StorageResult } from './storage.interface';

@Injectable()
export abstract class AbstractStorageService implements IStorageService {
  abstract uploadFile(
    file: Express.Multer.File,
    key?: string,
  ): Promise<StorageResult>;

  protected generateKey(originalName: string, prefix?: string): string {
    const fileExtension = originalName.split('.').pop();
    const baseKey = `${prefix || 'uploads'}/${originalName}.${fileExtension}`;
    return baseKey;
  }

  protected createStorageResult(
    file: Express.Multer.File,
    key: string,
    url: string,
  ): StorageResult {
    return {
      url,
      key,
      originalName: file.originalname,
      size: file.size,
      type: file.mimetype,
    };
  }
}
