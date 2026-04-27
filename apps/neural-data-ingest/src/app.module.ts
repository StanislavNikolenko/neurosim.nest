import { Logger, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Spike } from './spike.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { IngestProcessor } from './infrastructure/queue/ingest.processor';
import { NEURAL_INGEST_QUEUE_NAME } from './infrastructure/queue/queue.constants';
import { OBJECT_STORAGE_PORT } from './application/ports/object-storage.port';
import { S3StorageService } from './infrastructure/storage/s3-storage.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: parseInt(configService.get<string>('REDIS_PORT', '6379'), 10),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: NEURAL_INGEST_QUEUE_NAME,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: parseInt(configService.get('DB_PORT') || '5432'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        entities: [Spike],
        synchronize: configService.get('NODE_ENV') !== 'production',
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([Spike]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    Logger,
    IngestProcessor,
    {
      provide: OBJECT_STORAGE_PORT,
      useClass: S3StorageService,
    },
  ],
})
export class AppModule {}
