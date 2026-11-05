import {
  Injectable,
  OnApplicationBootstrap,
  Inject,
  BeforeApplicationShutdown,
} from '@nestjs/common';
import { LogFileService } from '../log_file/log_file.service.js';
import { ServerConnectonInterface } from './poll.module.js';
import { setTimeout } from 'timers/promises';

@Injectable()
export class PollService
  implements OnApplicationBootstrap, BeforeApplicationShutdown
{
  constructor(
    private logFileService: LogFileService,
    @Inject('serverConnections')
    private readonly serverConnectionsMap: Map<
      string,
      ServerConnectonInterface
    >,
  ) {}

  onApplicationBootstrap() {
    this.serverConnectionsMap.forEach((_, key) =>
      this.loop(key).catch((e) => console.log(e)),
    );
  }

  beforeApplicationShutdown(_signal?: string) {
    this.serverConnectionsMap.forEach((connection, _) =>
      connection.abortController.abort(),
    );
  }

  async pollCycle() {}

  async loop(server_name: string) {
    // make a loop for each server
    while (true) {
      try {
        await this.pollCycle();
        await setTimeout(1000, undefined, {
          signal:
            this.serverConnectionsMap.get(server_name)?.abortController.signal,
        });
      } catch (error) {}
    }
  }
}
