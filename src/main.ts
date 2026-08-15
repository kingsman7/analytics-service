import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'analytics-service',
        brokers: (process.env.KAFKA_BROKERS || process.env.KAFKA_BROKER || 'localhost:9092').split(','),
      },
      consumer: {
        groupId: 'analytics-consumer-group',
      },
    },
  });

  await app.startAllMicroservices();

  const port = process.env.PORT || 3004;
  await app.listen(port);
  console.log(`🚀 Analytics Service corriendo en HTTP: http://localhost:${port} y escuchando Kafka`);
}
bootstrap();