import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: process.env.NEURAL_INGEST_HOST || '0.0.0.0',
      port: parseInt(process.env.NEURAL_INGEST_PORT || '3001', 10),
    },
  });

  await app.startAllMicroservices();

  const httpPort = parseInt(process.env.NEURAL_INGEST_HTTP_PORT || '3002', 10);
  await app.listen(httpPort);
}

void bootstrap();
