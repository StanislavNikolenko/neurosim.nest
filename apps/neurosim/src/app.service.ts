import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Observable } from 'rxjs';

@Injectable()
export class AppService {
  constructor(@Inject('INGEST_SERVICE') private ingestClient: ClientProxy) {}

  getSpike(id: string): Observable<unknown> {
    const pattern = { cmd: 'getSpike' };
    const payload = { spikeId: id };
    return this.ingestClient.send(pattern, payload);
  }
}
