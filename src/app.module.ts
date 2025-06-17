import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClientsModule } from '@nestjs/microservices';
import { Transport } from '@nestjs/microservices';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: `./config/.${process.env.NODE_ENV}.env`,
    }),
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
