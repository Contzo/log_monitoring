import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PollModule } from './poll/poll.module.js';
import { CursorModule } from './cursor/cursor.module.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dataSourceOptions } from './data-source.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    // ── Dynamic modules ──────────────────────
    //
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com
    ObserveModule.forRoot({
      appKey: 'YOUR_APP_KEY',
      appSecret: 'YOUR_APP_SECRET',
      serviceId: 'log_monitoring',
    }),
    TypeOrmModule.forRoot(dataSourceOptions),

    // ── Own Modules ──────────────────────────
    PollModule,
    CursorModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
