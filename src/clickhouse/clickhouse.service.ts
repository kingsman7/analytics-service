import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { createClient, ClickHouseClient } from '@clickhouse/client';

@Injectable()
export class ClickHouseService implements OnModuleInit {
  private readonly logger = new Logger(ClickHouseService.name);
  public client!: ClickHouseClient;

  onModuleInit() {
    this.client = createClient({
      url: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
      username: process.env.CLICKHOUSE_USER || 'default',
      password: process.env.CLICKHOUSE_PASSWORD || '',
      database: process.env.CLICKHOUSE_DATABASE || 'default',
    });

    this.initDatabase();
  }

  private async initDatabase() {
    try {
      // Crear tabla OLAP para eventos de órdenes analíticas
      await this.client.command({
        query: `
          CREATE TABLE IF NOT EXISTS order_analytics (
            order_id String,
            user_id String,
            total_amount Float64,
            items_count UInt32,
            created_at DateTime DEFAULT now()
          ) ENGINE = MergeTree()
          ORDER BY (created_at, order_id);
        `,
      });
      this.logger.log('📊 Tabla [order_analytics] en ClickHouse lista e inicializada');
    } catch (error) {
      this.logger.error('❌ Error inicializando la tabla en ClickHouse', error);
    }
  }
}