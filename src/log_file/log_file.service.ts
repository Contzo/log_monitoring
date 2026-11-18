import { Injectable, NotFoundException } from "@nestjs/common";
import { LogFile } from "./log_file.entity.js";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { CreateLogFileDto } from "./dtos/create-log-file.dto.js";
import { ServerService } from "../server/server.service.js";
import { handleDbError } from "../common/db-errors.js";
@Injectable()
export class LogFileService {
  constructor(
    @InjectRepository(LogFile) private logFileRepository: Repository<LogFile>,
    private readonly serverService: ServerService,
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
      handleDbError(error, `File ${fields.logPath} already monitored on server ${serverName}`);
    }
  }

  async findOne(id: number) {
    const logFile = await this.logFileRepository.findOne({
      where: { id },
      relations: { server: true },
    });
    if (logFile === null) throw new NotFoundException("Log file not found");
    return logFile;
  }

  findFiles() {
    return this.logFileRepository.find();
  }

  async update(id: number, attrs: Partial<LogFile>) {
    const logFile = await this.findOne(id);

    Object.assign(logFile, attrs);
    return this.logFileRepository.save(logFile);
  }
  async enableFileMonitoring(id: number) {
    return this.update(id, { isEnabled: true });
  }
  async disableFileMoniuoring(id: number) {
    return this.update(id, { isEnabled: false });
  }

  async finddAllEnabledLogFiles() {
    const enabledFiles = await this.logFileRepository.find({
      where: { isEnabled: true },
    });
    if (!enabledFiles) throw new NotFoundException("No enabled files yet");
    return enabledFiles;
  }

  async findOneWithServer(id: number) {
    const logFile = await this.logFileRepository.findOne({
      where: { id },
      relations: { server: true },
    });
    if (!logFile) throw new NotFoundException(`File with ${id} not found`);
    return logFile;
  }
}
