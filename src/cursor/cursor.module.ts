import { Module } from '@nestjs/common';
import { CursorService } from './cursor.service.js';
import { Cursor } from './cursor.entity.js';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([Cursor])],
  providers: [CursorService],
  exports: [CursorService],
})
export class CursorModule {}
