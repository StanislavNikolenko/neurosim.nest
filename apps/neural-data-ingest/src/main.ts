import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.TCP,
      options: {
        // host: process.env.NEURAL_INGEST_HOST || 'localhost',
        // port: parseInt(process.env.NEURAL_INGEST_PORT || '3001'),
        host: process.env.HOST || '0.0.0.0', // Use HOST instead of NEURAL_INGEST_HOST
        port: parseInt(process.env.PORT || '3002'), // Use PORT instead of NEURAL_INGEST_PORT
      },
    },
  );
  await app.listen();
}
void bootstrap();
