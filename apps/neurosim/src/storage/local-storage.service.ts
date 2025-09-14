import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { AbstractStorageService } from './abstract-storage.service';
import { StorageResult } from './storage.interface';

@Injectable()
export class LocalStorageService extends AbstractStorageService {
  private uploadDir: string;

  constructor(private configService: ConfigService) {
    super();
    this.uploadDir = this.configService.get('UPLOAD_DIR', './data');
  }

  async uploadFile(
    file: Express.Multer.File,
    key?: string,
  ): Promise<StorageResult> {
    const fileKey = key || this.generateKey(file.originalname, 'uploads');
    const filePath = join(this.uploadDir, fileKey);

    try {
      await writeFile(filePath, file.buffer);

      const url = `http://localhost:${this.configService.get('PORT', 3000)}/files/${fileKey}`;

      return this.createStorageResult(file, fileKey, url);
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      throw new Error(`Local storage upload failed: ${error.message}`);
    }
  }
}
