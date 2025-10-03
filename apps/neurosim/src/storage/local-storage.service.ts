import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { AbstractStorageService } from './abstract-storage.service';
import { StorageResult } from './storage.interface';
import { Logger } from '@nestjs/common';
import * as fs from 'fs';

@Injectable()
export class LocalStorageService extends AbstractStorageService {
  private uploadDir: string;
  private readonly logger = new Logger(LocalStorageService.name);

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
    const dataUploadsDir = 'data/uploads';

    if (!fs.existsSync(dataUploadsDir)) {
      this.logger.log(`Creating directory: ${dataUploadsDir}`);
      fs.mkdirSync(dataUploadsDir, { recursive: true });
    }

    try {
      await writeFile(filePath, file.buffer);

      const url = `http://localhost:${this.configService.get('PORT', 3000)}/files/${fileKey}`;

      return this.createStorageResult(file, fileKey, url);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Local upload failed: ${errorMessage}`);
    }
  }
}
