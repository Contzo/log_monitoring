import { Controller, Post, Body } from '@nestjs/common';
import { LogFileService } from './log_file.service.js';
import { CreateLogFileDto } from './dtos/create-log-file.dto.js';

@Controller('log-file')
export class LogFileController {
  constructor(private readonly logFileService: LogFileService) {}
  // ── POST log-file ────────────────────────
  @Post()
  create(@Body() newLogFile: CreateLogFileDto) {
    this.logFileService.create(newLogFile);
  }
}
