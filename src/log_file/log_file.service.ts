import { Injectable } from '@nestjs/common';
import { LogFile } from './log_file.entity.js';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class LogFileService {
  constructor(
    @InjectRepository(LogFile) private cursorRepository: Repository<LogFile>,
  ) {}

  getCursor(cursor: Partial<LogFile>) {}

  updateCursort(id: number) {}
}
