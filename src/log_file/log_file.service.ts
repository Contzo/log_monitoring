import { Injectable, NotFoundException } from "@nestjs/common";
import { LogFile } from "./log_file.entity.js";
import { EntityManager, Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { CreateLogFileDto } from "./dtos/create-log-file.dto.js";
import { ServerService } from "../server/server.service.js";
import { handleDbError } from "../common/db-errors.js";
export interface LogFileCursor {
  inode: string;
  byteOffset: number;
  generation: number;
}
@Injectable()
export class LogFileService {
  constructor(
    @InjectRepository(LogFile) private logFileRepository: Repository<LogFile>,
    private readonly serverService: ServerService,
  ) {}

  async create(newLogFile: CreateLogFileDto) {
    const { serverId, ...fields } = newLogFile;
    const relatedServer = await this.serverService.findOne(serverId);
    const entity = this.logFileRepository.create(fields);
    entity.server = relatedServer;
    try {
      const newLogFile = await this.logFileRepository.save(entity);
      return newLogFile;
    } catch (error) {
      handleDbError(
        error,
        `File ${fields.logPath} already monitored on server ${relatedServer.serverName}`,
      );
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

  async saveCursor(id: number, cursor: LogFileCursor, manager?: EntityManager): Promise<void> {
    const { inode, byteOffset, generation } = cursor;

    const result = await this.repository(manager).update({ id }, { inode, byteOffset, generation });

    if (result.affected === 0) {
      throw new Error(`Cannot save cursor: log file ${id} not found`);
    }
  }
  /*//////////////////////////////////////////////////////////////
                          Private functions
   //////////////////////////////////////////////////////////////*/
  private repository(manager?: EntityManager): Repository<LogFile> {
    return manager ? manager.getRepository(LogFile) : this.logFileRepository;
  }
}
