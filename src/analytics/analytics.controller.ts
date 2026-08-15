import { Controller, Get } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // 1. Listener de eventos CDC emitidos por Debezium para la tabla 'products'
  @EventPattern('cdc_postgres.public.products')
  async handleProductCDC(@Payload() message: any) {
    const eventData = typeof message === 'string' ? JSON.parse(message) : message;
    if (eventData?.payload) {
      await this.analyticsService.recordProductCDC(eventData.payload);
    }
  }

  // 2. Listener tradicional de órdenes creadas por la aplicación
  @EventPattern('order.created')
  async handleOrderCreated(@Payload() message: any) {
    const eventData = typeof message === 'string' ? JSON.parse(message) : message;
    if (eventData?.payload) {
      await this.analyticsService.recordOrderEvent(eventData.payload);
    }
  }

  // 3. Endpoint HTTP para consultar el resumen analítico
  @Get('summary')
  async getSummary() {
    return this.analyticsService.getSalesSummary();
  }
}