import { Controller, Post, Body } from '@nestjs/common';
import { LogFileService } from './log_file.service.js';
import { CreateLogFileDto } from './dtos/create-log-file.dto.js';
import { Serialize } from '../interceptors/serialize.interceptor.js';
import { LogFileDTO } from './dtos/log-file.dto.js';

@Controller('log-file')
@Serialize(LogFileDTO)
export class LogFileController {
  constructor(private readonly logFileService: LogFileService) {}
  // ── POST log-file ────────────────────────
  @Post()
  async create(@Body() newLogFile: CreateLogFileDto) {
    return this.logFileService.create(newLogFile);
  }
}
