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
import { PollService } from '../poll/poll.service.js';

@Injectable()
export class LogFileService {
  constructor(
    @InjectRepository(LogFile) private logFileRepository: Repository<LogFile>,
    private readonly serverService: ServerService,
    private readonly pollService: PollService,
  ) {}

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
    this.pollService.startLoop(logFile.id);
    return logFile;
  }

  async disableFileMonitoring(id: number) {
    const logFile = await this.findOne(id);
    logFile.isEnabled = false;
    this.pollService.stopLoop(logFile.id);
    await this.logFileRepository.save(logFile);
    return logFile;
  }
}
