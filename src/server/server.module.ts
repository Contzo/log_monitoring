import { Module } from '@nestjs/common';
import { ServerController } from './server.controller.js';
import { ServerService } from './server.service.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Server } from './server.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Server])],
  controllers: [ServerController],
  providers: [ServerService],
  exports: [ServerService],
})
export class ServerModule {}
