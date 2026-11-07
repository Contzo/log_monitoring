import { Controller, Post, Body, Get, Param, Patch } from '@nestjs/common';
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

  // ── GET log-file ─────────────────────────
  @Get()
  getFiles() {
    return this.logFileService.findFiles();
  }

  // ── Patch log-file/enable/:id ─────────────
  @Patch('/enable/:id')
  enableLogFileMonitor(@Param('id') id: string) {
    return this.logFileService.enableFileMonitoring(parseInt(id));
  }

  // ── Patch log-file/disable/:id ─────────────
  @Patch('/disable/:id')
  disableLogFileMonitor(@Param('id') id: string) {
    return this.logFileService.disableFileMonitoring(parseInt(id));
  }
}
