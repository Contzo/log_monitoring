import { IsString, IsIP, IsOptional, IsInt, Min, Max } from "class-validator";
export class UpdateServerDto {
  @IsIP()
  @IsOptional()
  serverIp?: string;

  @IsString()
  @IsOptional()
  serverName?: string;

  @IsString()
  @IsOptional()
  sshUser?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  sshPort?: number;
}
