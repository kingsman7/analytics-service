import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClickHouseModule } from './clickhouse/clickhouse.module';
import { AnalyticsController } from './analytics/analytics.controller';
import { AnalyticsService } from './analytics/analytics.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ClickHouseModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AppModule {}