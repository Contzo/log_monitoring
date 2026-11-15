import { Module, ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PollModule } from './poll/poll.module.js';
import { LogFileModule } from './log_file/log_file.module.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dataSourceOptions } from './data-source.js';
import { ServerModule } from './server/server.module.js';
import { ConfigModule } from '@nestjs/config';
import { SshModule } from './ssh/ssh.module.js';

@Module({
  imports: [
    // ── Dynamic modules ──────────────────────
    TypeOrmModule.forRoot(dataSourceOptions),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV}`,
    }),

    // ── Own Modules ──────────────────────────
    PollModule,
    LogFileModule,
    ServerModule,
    SshModule,
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
