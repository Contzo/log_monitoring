import { Expose } from 'class-transformer';
export class ServerDTO {
  @Expose()
  id: number;

  @Expose()
  serverName: string;

  @Expose()
  serverIp: string;

  @Expose()
  createdAt: Date;
}
