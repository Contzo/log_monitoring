import { Expose } from 'class-transformer';
export class LogFileDTO {
  @Expose()
  id: number;
  @Expose()
  logPath: string;
  @Expose()
  inode: number;
  @Expose()
  byteOffset: number;
  @Expose()
  createdAt: Date;

  @Expose()
  serverId: number;

  @Expose()
  isEnabled: boolean;

  @Expose()
  updatedAt: Date;
}
