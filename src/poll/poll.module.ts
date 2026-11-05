import { Module } from '@nestjs/common';
import { PollService } from './poll.service.js';
import { LogFileModule } from '../log_file/log_file.module.js';
import { ServerService } from '../server/server.service.js';
import { ServerModule } from '../server/server.module.js';

export interface ServerConnectonInterface {
  abortController: AbortController;
}

@Module({
  imports: [LogFileModule, ServerModule],
  providers: [
    PollService,
    {
      provide: 'serverConnections',
      inject: [ServerService],
      useFactory: async (serverService: ServerService) => {
        const servers = await serverService.findServers();
        let serverConnectionMap = new Map<string, ServerConnectonInterface>();
        return servers.forEach((server) =>
          serverConnectionMap.set(server.server_name, {
            abortController: new AbortController(),
          }),
        );
      },
    },
  ],
})
export class PollModule {}
