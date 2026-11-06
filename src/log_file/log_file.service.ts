import { Injectable, NotFoundException } from '@nestjs/common';
import { LogFile } from './log_file.entity.js';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateLogFileDto } from './dtos/create-log-file.dto.js';
import { ServerService } from '../server/server.service.js';

@Injectable()
export class LogFileService {
  constructor(
    @InjectRepository(LogFile) private logFileRepository: Repository<LogFile>,
    private readonly serverService: ServerService,
  ) {}

  async create(newLogFile: CreateLogFileDto) {
    const { serverName, ...fields } = newLogFile;
    const relatedServer = await this.serverService.findOne(serverName, {
      files: true,
    });
    if (!relatedServer)
      throw new NotFoundException('Server not registered as monitor');
    if (relatedServer.files.find((file) => file.logPath === fields.logPath))
      throw new NotFoundException(
        `Log file: ${fields.logPath} on server ${relatedServer.serverName} is already monitored`,
      );
    const entity = this.logFileRepository.create(fields);
    entity.server = relatedServer;

    return this.logFileRepository.save(entity);
  }

  findOne(id: number) {
    return this.logFileRepository.findOne({ where: { id } });
  }

  find(object: Partial<LogFile>) {
    return this.logFileRepository.find({ where: object });
  }
}
