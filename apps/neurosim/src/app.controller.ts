import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AppService } from './app.service';
import { S3StorageService } from './storage/s3-storage.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly s3StorageService: S3StorageService,
  ) {}

  @Post('upload-url')
  async uploadUrl(@Body() body: { fileName: string }): Promise<string> {
    return this.s3StorageService.getUploadUrl(body.fileName);
  }

  @Get('spike/:id')
  getSpike(@Param('id') id: string): Observable<unknown> {
    return this.appService.getSpike(id);
  }

  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
