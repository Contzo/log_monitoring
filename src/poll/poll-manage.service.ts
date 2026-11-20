import {
  Injectable,
  OnApplicationBootstrap,
  BeforeApplicationShutdown,
  Logger,
} from "@nestjs/common";
import { LogFileService } from "../log_file/log_file.service.js";
import { PollService } from "./poll.service.js";

@Injectable()
export class PollManageService implements OnApplicationBootstrap, BeforeApplicationShutdown {
  private logger = new Logger("PollManageService");
  constructor(
    private readonly logFileService: LogFileService,
    private readonly pollService: PollService,
  ) {}
  async onApplicationBootstrap() {
    const enabledFiles = await this.logFileService.finddAllEnabledLogFiles();
    enabledFiles.forEach((logFile) => this.pollService.startLoop(logFile.id));
  }

  async beforeApplicationShutdown() {
    this.logger.debug("----------App shutting down: La munca ortodocsilor--------------");
    const running = [...this.pollService.getLops().values()];
    running.forEach((loop) => loop.abortPollCycle.abort());
    await Promise.allSettled(running.map(({ donePollCycle }) => donePollCycle));
  }

  async enableFileMonitoring(id: number) {
    const logFile = await this.logFileService.enableFileMonitoring(id);
    this.pollService.startLoop(logFile.id);
    return logFile;
  }
  async disableFileMonitoring(id: number) {
    const logFile = await this.logFileService.disableFileMoniuoring(id);
    this.pollService.stopLoop(logFile.id);
    return logFile;
  }
}
