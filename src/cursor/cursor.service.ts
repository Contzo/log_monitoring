import { Injectable } from '@nestjs/common';
import { Cursor } from './cursor.entity.js';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class CursorService {
  constructor(
    @InjectRepository(Cursor) private cursorRepository: Repository<Cursor>,
  ) {}

  getCursor(cursor: Partial<Cursor>) {}

  updateCursort(id: number) {}
}
