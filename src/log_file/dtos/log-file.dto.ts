import { Expose, Transform } from 'class-transformer';
export class LogFileDTO {
  @Expose()
  id: number;
  @Expose()
  logPath: string;
  @Expose()
  inode: number;
  @Expose()
  cursor: number;
  @Expose()
  createdAt: Date;

  @Expose()
  @Transform(({ obj }) => obj.server.id)
  serveId: number;
}
