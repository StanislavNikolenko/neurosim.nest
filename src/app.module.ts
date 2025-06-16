import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClientsModule } from '@nestjs/microservices';
import { Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'INGEST_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.INGEST_SERVICE_HOST || 'localhost',
          port: parseInt(process.env.INGEST_SERVICE_PORT || '3001'),
        },
      },
    ]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
