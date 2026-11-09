import { Module } from '@nestjs/common';
import { PollService } from './poll.service.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LogFile } from '../log_file/log_file.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([LogFile])],
  providers: [PollService],
  exports: [PollService],
})
export class PollModule {}
