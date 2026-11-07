import {
  Injectable,
  NotFoundException,
  OnApplicationBootstrap,
  BeforeApplicationShutdown,
} from '@nestjs/common';
import { LogFile } from './log_file.entity.js';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateLogFileDto } from './dtos/create-log-file.dto.js';
import { ServerService } from '../server/server.service.js';
import { handleDbError } from '../common/db-errors.js';
import { setTimeout } from 'timers/promises';

export type PollLoops = Map<
  number,
  { abortPollCycle: AbortController; donePollCycle: Promise<void> }
>;

@Injectable()
export class LogFileService
  implements OnApplicationBootstrap, BeforeApplicationShutdown
{
  loops: PollLoops;
  constructor(
    @InjectRepository(LogFile) private logFileRepository: Repository<LogFile>,
    private readonly serverService: ServerService,
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
    console.log(
      '----------App shutting down: La munca ortodocsilor--------------',
    );
    const running = [...this.loops.values()];
    running.forEach((loop) => loop.abortPollCycle.abort());
    await Promise.allSettled(running.map(({ donePollCycle }) => donePollCycle));
  }
  async create(newLogFile: CreateLogFileDto) {
    const { serverName, ...fields } = newLogFile;
    const relatedServer = await this.serverService.findOneOrFail(serverName);
    const entity = this.logFileRepository.create(fields);
    entity.server = relatedServer;
    try {
      const newLogFile = await this.logFileRepository.save(entity);
      return newLogFile;
    } catch (error) {
      handleDbError(
        error,
        `File ${fields.logPath} already monitored on server ${serverName}`,
      );
    }
  }

  async findOne(id: number) {
    const logFile = await this.logFileRepository.findOne({ where: { id } });
    if (logFile === null) throw new NotFoundException('Log file not found');
    return logFile;
  }

  findFiles() {
    return this.logFileRepository.find();
  }

  async enableFileMonitoring(id: number) {
    const logFile = await this.findOne(id);
    logFile.isEnabled = true;
    await this.logFileRepository.save(logFile);
    this.startLoop(logFile.id);
    return logFile;
  }

  async disableFileMonitoring(id: number) {
    const logFile = await this.findOne(id);
    logFile.isEnabled = false;
    this.stopLoop(logFile.id);
    await this.logFileRepository.save(logFile);
    return logFile;
  }

  poolCycle(id: number) {
    console.log(`Executed pool for file: ${id}`);
  }

  private startLoop(id: number) {
    if (this.loops.has(id)) return; // loop already running
    const abortPollCycle = new AbortController();
    const donePollCycle = this.runLoop(id, abortPollCycle).finally(() => {
      if (this.loops.get(id)?.abortPollCycle === abortPollCycle)
        this.loops.delete(id);
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
      if (error instanceof Error && error.name === 'AbortError') {
        console.log(`File monitoring for: ${id} aborted`);
      } else {
        console.log(`Poll loop for file ${id} failed`, error);
      }
    }
  }

  private stopLoop(id: number) {
    const controller = this.loops.get(id);
    if (!controller) return;
    controller.abortPollCycle.abort();
    this.loops.delete(id);
  }
}
