import { IsString, IsNotEmpty, IsIP, IsNumber } from "class-validator";

export class CreateServerDTO {
  @IsString()
  @IsNotEmpty()
  serverName: string;

  @IsIP()
  @IsNotEmpty()
  serverIp: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  sshUser: string;

  @IsNumber()
  @IsNotEmpty()
  sshPort: number;
}
