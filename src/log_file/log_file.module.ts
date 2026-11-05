import { Module } from '@nestjs/common';
import { LogFileService } from './log_file.service.js';
import { LogFile } from './log_file.entity.js';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([LogFile])],
  providers: [LogFileService],
  exports: [LogFileService],
})
export class LogFileModule {}
