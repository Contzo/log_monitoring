import { Expose } from "class-transformer";
export class ServerDTO {
  @Expose()
  id: number;

  @Expose()
  serverName: string;

  @Expose()
  serverIp: string;

  @Expose()
  sshUser: string;

  @Expose()
  sshPort: number;

  @Expose()
  createdAt: Date;

  @Expose()
  lastSuccessAt: Date | null;
  @Expose()
  lastErrorAt: Date | null;

  @Expose()
  lastError: string | null;

  @Expose()
  updatedAt: Date;
}
