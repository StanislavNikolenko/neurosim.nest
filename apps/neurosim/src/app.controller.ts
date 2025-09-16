import {
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Observable } from 'rxjs';
import { AppService } from './app.service';
import { LocalStorageService } from './storage/local-storage.service';
import { StorageResult } from './storage/storage.interface';
import { Logger } from '@nestjs/common';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly storageService: LocalStorageService,
    private readonly logger: Logger,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<StorageResult> {
    const result = await this.storageService.uploadFile(file);

    this.appService.ingest().subscribe({
      next: (response) => this.logger.log('Ingest completed:', response),
      error: (error) => this.logger.error('Ingest failed:', error),
    });

    return result;
  }

  @Get('spike/:id')
  getSpike(@Param('id') id: string): Observable<any> {
    return this.appService.getSpike(id);
  }
}
