import { Module, ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PollModule } from './poll/poll.module.js';
import { LogFileModule } from './log_file/log_file.module.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dataSourceOptions } from './data-source.js';
import { ServerModule } from './server/server.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    // ── Dynamic modules ──────────────────────
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
    LogFileModule,
    ServerModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
      }),
    },
  ],
})
export class AppModule {}
