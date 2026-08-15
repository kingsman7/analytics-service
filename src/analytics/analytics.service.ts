import { Injectable, Logger } from '@nestjs/common';
import { ClickHouseService } from '../clickhouse/clickhouse.service';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  
  constructor(private readonly clickhouse: ClickHouseService) {}

  // Helper para decodificar los bytes Decimal de Debezium (Base64) a número Float
  private parseDebeziumDecimal(base64Value: string, scale: number = 2): number {
    if (!base64Value) return 0;
    const buffer = Buffer.from(base64Value, 'base64');
    let integerVal = BigInt(0);
    for (let i = 0; i < buffer.length; i++) {
      integerVal = (integerVal << BigInt(8)) + BigInt(buffer[i]);
    }
    return Number(integerVal) / Math.pow(10, scale);
  }

  async recordProductCDC(payloadData: any) {
    try {
      const { after, op } = payloadData;

      if (after) {
        // Garantizar que la decodificación no falle si base_price no es un string estándar
        const basePrice = after.base_price;
        // Convertir 'Iyc=' o similares a valor flotante real (ej. 89.99)
        const numericPrice = typeof basePrice === 'string' && basePrice.length < 10
          ? this.parseDebeziumDecimal(after.base_price, 2)
          : parseFloat(after.base_price) || 0;

        const productEvent = {
          product_id: after.id,
          sku: after.sku,
          name: after.name,
          base_price: numericPrice,
          operation: op,
        };

        await this.clickhouse.client.insert({
          table: 'product_events',
          values: [productEvent],
          format: 'JSONEachRow',
        });

        this.logger.log(`[ClickHouse] Ingestado con éxito SKU: ${after.sku} ($${numericPrice})`);
      }
    } catch (error) {
      this.logger.error('Error insertando evento CDC en ClickHouse:', error);
    }
  }
  
  async recordOrderEvent(orderPayload: any) {
    const { id, userId, totalAmount, items } = orderPayload;
    const itemsCount = items ? items.reduce((acc: number, item: any) => acc + item.quantity, 0) : 0;

    this.logger.log(`📈 Registrando métrica en ClickHouse para la Orden ID: ${id}`);

    await this.clickhouse.client.insert({
      table: 'order_analytics',
      values: [
        {
          order_id: id,
          user_id: userId,
          total_amount: Number(totalAmount),
          items_count: itemsCount,
        },
      ],
      format: 'JSONEachRow',
    });
  }

  // Consulta analítica de total de ventas
  async getSalesSummary() {
    const resultSet = await this.clickhouse.client.query({
      query: `
        SELECT 
          count(order_id) as total_orders,
          sum(total_amount) as total_revenue,
          avg(total_amount) as avg_order_value,
          sum(items_count) as total_items_sold
        FROM order_analytics
      `,
      format: 'JSONEachRow',
    });

    return resultSet.json();
  }
}