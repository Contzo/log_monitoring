import { IsString, IsNotEmpty, IsIP } from 'class-validator';

export class CreateServerDTO {
  @IsString()
  @IsNotEmpty()
  server_name: string;

  @IsIP()
  @IsNotEmpty()
  server_ip: string;

  @IsString()
  @IsNotEmpty()
  sshKey_path: string;
}
