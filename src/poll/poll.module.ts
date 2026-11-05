import { Module } from '@nestjs/common';
import { PollService } from './poll.service.js';
import { CursorModule } from '../cursor/cursor.module.js';

@Module({
  imports: [CursorModule],
  providers: [PollService],
})
export class PollModule {}
