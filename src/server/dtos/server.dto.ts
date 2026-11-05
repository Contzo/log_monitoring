import { Expose } from 'class-transformer';
export class ServerDTO {
  @Expose()
  id: number;

  @Expose()
  server_name: string;

  @Expose()
  server_ip: string;

  @Expose()
  created_at: Date;
}
