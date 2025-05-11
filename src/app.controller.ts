import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Observable } from 'rxjs';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/ingest')
  ingest(): Observable<any> {
    return this.appService.ingest();
  }
}
