import { IsString, IsNotEmpty, IsIP } from 'class-validator';

export class CreateServerDTO {
  @IsString()
  @IsNotEmpty()
  serverName: string;

  @IsIP()
  @IsNotEmpty()
  serverIp: string;

  @IsString()
  @IsNotEmpty()
  sshKeyPath: string;
}
