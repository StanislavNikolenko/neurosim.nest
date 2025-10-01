import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClientsModule } from '@nestjs/microservices';
import { Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LocalStorageService } from './storage/local-storage.service';
import { S3StorageService } from './storage/s3-storage.service';
import { Logger } from '@nestjs/common';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
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
  providers: [
    AppService,
    LocalStorageService,
    S3StorageService,
    Logger,
    {
      provide: 'STORAGE_SERVICE',
      useFactory: (configService: ConfigService) => {
        const storageType = configService.get<string>('STORAGE_TYPE', 'local');

        if (storageType === 's3') {
          return new S3StorageService(configService);
        } else {
          return new LocalStorageService(configService);
        }
      },
      inject: [ConfigService],
    },
  ],
})
export class AppModule {}
