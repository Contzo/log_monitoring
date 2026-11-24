import { IsString, IsNotEmpty, IsNumber } from "class-validator";
export class CreateLogFileDto {
  @IsString()
  @IsNotEmpty()
  logPath: string;

  @IsNotEmpty()
  @IsNumber()
  serverId: number;
}
