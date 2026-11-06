import { IsString, IsNotEmpty } from 'class-validator';
export class CreateLogFileDto {
  @IsString()
  @IsNotEmpty()
  logPath: string;

  @IsNotEmpty()
  @IsString()
  serverName: string;
}
