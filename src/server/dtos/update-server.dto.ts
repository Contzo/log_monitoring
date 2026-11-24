import { IsString, IsIP, IsOptional, IsNumber } from "class-validator";
export class UpdateServerDto {
  @IsIP()
  @IsOptional()
  ipAddress?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  user?: string;

  @IsNumber()
  @IsOptional()
  port?: number;
}
