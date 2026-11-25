import { IsString, IsNotEmpty, IsIP, IsInt, Min, Max } from "class-validator";

export class CreateServerDTO {
  @IsString()
  @IsNotEmpty()
  serverName: string;

  @IsIP()
  @IsNotEmpty()
  serverIp: string;

  @IsString()
  @IsNotEmpty()
  sshUser: string;

  @IsInt()
  @IsNotEmpty()
  @Min(1)
  @Max(65535)
  sshPort: number;
}
