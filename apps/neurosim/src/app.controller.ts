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

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly storageService: LocalStorageService,
  ) {}

  @Post('ingest')
  ingest(): Observable<any> {
    return this.appService.ingest();
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<StorageResult> {
    return await this.storageService.uploadFile(file);
  }

  @Get('spike/:id')
  getSpike(@Param('id') id: string): Observable<any> {
    return this.appService.getSpike(id);
  }
}
