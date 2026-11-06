import { Injectable } from '@nestjs/common';
import { LogFile } from './log_file.entity.js';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateLogFileDto } from './dtos/create-log-file.dto.js';

@Injectable()
export class LogFileService {
  constructor(
    @InjectRepository(LogFile) private logFileRepository: Repository<LogFile>,
  ) {}

  create(newLogFile: CreateLogFileDto) {
    const entry = this.logFileRepository.create(newLogFile);

    return this.logFileRepository.save(entry);
  }
}
