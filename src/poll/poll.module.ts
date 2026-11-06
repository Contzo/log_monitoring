import { Module } from '@nestjs/common';
import { PollService } from './poll.service.js';
import { LogFileModule } from '../log_file/log_file.module.js';

export interface MonitoredLogFiledInterface {
  abortController: AbortController;
}

@Module({
  imports: [LogFileModule],
  providers: [
    PollService,
    // {
    //   provide: 'serverConnections',
    //   inject: [ServerService],
    //   useFactory: async (serverService: ServerService) => {
    //     const servers = await serverService.findServers();
    //     let serverConnectionMap = new Map<string, ServerConnectonInterface>();
    //     return servers.forEach((server) =>
    //       serverConnectionMap.set(server.server_name, {
    //         abortController: new AbortController(),
    //       }),
    //     );
    //   },
    // },
  ],
})
export class PollModule {}
