import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Observable } from 'rxjs';

@Injectable()
export class AppService {
  constructor(
    @Inject('INGEST_SERVICE') private ingestClient: ClientProxy
  ) {}

  ingest(): Observable<any> {
    const pattern = { cmd: 'ingest' };
    const payload = { timestamp: new Date(), data: 'test' };
    return this.ingestClient.send(pattern, payload);
  }
}
