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
    return this.ingestClient.send(pattern, {});
  }

  getSpike(id: string): Observable<any> {
    const pattern = { cmd: 'getSpike' };
    const payload = { spikeId:id };
    return this.ingestClient.send(pattern, payload);
  }
}
