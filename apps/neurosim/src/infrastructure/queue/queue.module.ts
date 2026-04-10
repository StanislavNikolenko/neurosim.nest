import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JOB_QUEUE_PORT } from '../../application/ports/job-queue.port';
import { BullmqJobQueueService } from './bullmq-job-queue.service';
import { NEURAL_INGEST_QUEUE_NAME } from './queue.constants';

@Module({
  imports: [
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
  ],
  providers: [
    BullmqJobQueueService,
    {
      provide: JOB_QUEUE_PORT,
      useExisting: BullmqJobQueueService,
    },
  ],
  exports: [BullModule, JOB_QUEUE_PORT],
})
export class QueueModule {}
