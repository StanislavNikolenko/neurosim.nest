import {
  Controller,
  Get,
  Inject,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Observable } from 'rxjs';
import { AppService } from './app.service';
import { IStorageService, StorageResult } from './storage/storage.interface';
import { Logger } from '@nestjs/common';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @Inject('STORAGE_SERVICE') private readonly storageService: IStorageService,
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

  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
