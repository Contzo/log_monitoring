import {
  Injectable,
  OnApplicationBootstrap,
  Inject,
  BeforeApplicationShutdown,
} from '@nestjs/common';
import { LogFileService } from '../log_file/log_file.service.js';
import { setTimeout } from 'timers/promises';

@Injectable()
export class PollService
  implements OnApplicationBootstrap, BeforeApplicationShutdown
{
  constructor(private logFileService: LogFileService) {}

  onApplicationBootstrap() {}

  beforeApplicationShutdown(_signal?: string) {}

  async pollCycle() {}

  async loop(server_name: string) {
    // make a loop for each server
    while (true) {
      try {
        await this.pollCycle();
        await setTimeout(1000, undefined);
      } catch (error) {}
    }
  }
}
