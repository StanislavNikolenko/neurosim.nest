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
import { UploadNeuralFileUseCase } from './application/use-cases/upload-neural-file.use-case';
import type { UploadNeuralFileResult } from './application/types/upload-neural-file-result';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly uploadNeuralFileUseCase: UploadNeuralFileUseCase,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadNeuralFileResult> {
    return this.uploadNeuralFileUseCase.execute(file);
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
