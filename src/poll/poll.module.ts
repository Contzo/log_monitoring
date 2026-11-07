import { Module } from '@nestjs/common';
import { PollService } from './poll.service.js';
import { LogFileModule } from '../log_file/log_file.module.js';

@Module({
  imports: [LogFileModule],
  providers: [PollService],
})
export class PollModule {}
