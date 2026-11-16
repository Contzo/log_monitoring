import { Injectable, OnApplicationBootstrap, BeforeApplicationShutdown } from "@nestjs/common";
import { setTimeout } from "timers/promises";
import { Repository } from "typeorm";
import { LogFile } from "../log_file/log_file.entity.js";
import { InjectRepository } from "@nestjs/typeorm";
import { SshService } from "../ssh/ssh.service.js";

export type PollLoops = Map<
  number,
  { abortPollCycle: AbortController; donePollCycle: Promise<void> }
>;

@Injectable()
export class PollService implements OnApplicationBootstrap, BeforeApplicationShutdown {
  loops: PollLoops;
  constructor(
    @InjectRepository(LogFile)
    private readonly logFileRepository: Repository<LogFile>,
    private readonly sshService: SshService,
  ) {
    this.loops = new Map();
  }
  async onApplicationBootstrap() {
    const enabledFiles = await this.logFileRepository.find({
      where: { isEnabled: true },
    });
    enabledFiles.forEach((logFile) => this.startLoop(logFile.id));
  }

  async beforeApplicationShutdown() {
    console.log("----------App shutting down: La munca ortodocsilor--------------");
    const running = [...this.loops.values()];
    running.forEach((loop) => loop.abortPollCycle.abort());
    await Promise.allSettled(running.map(({ donePollCycle }) => donePollCycle));
  }

  async poolCycle(id: number) {
    const logFile = await this.logFileRepository.findOne({ where: { id } });
    console.log("This is the monitored file: ", logFile);
  }

  startLoop(id: number) {
    if (this.loops.has(id)) return; // loop already running
    const abortPollCycle = new AbortController();
    const donePollCycle = this.runLoop(id, abortPollCycle).finally(() => {
      if (this.loops.get(id)?.abortPollCycle === abortPollCycle) this.loops.delete(id);
    });
    this.loops.set(id, { abortPollCycle, donePollCycle });
  }

  private async runLoop(id: number, abortController: AbortController) {
    const { signal } = abortController;
    try {
      while (!signal.aborted) {
        this.poolCycle(id);
        await setTimeout(1000, undefined, { signal });
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.log(`File monitoring for: ${id} aborted`);
      } else {
        console.log(`Poll loop for file ${id} failed`, error);
      }
    }
  }

  stopLoop(id: number) {
    const controller = this.loops.get(id);
    if (!controller) return;
    controller.abortPollCycle.abort();
    this.loops.delete(id);
  }
}
