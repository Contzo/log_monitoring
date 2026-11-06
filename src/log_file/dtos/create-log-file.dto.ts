import { IsString, IsNotEmpty, IsNumber } from 'class-validator';
export class CreateLogFileDto {
  @IsString()
  @IsNotEmpty()
  logPath: string;

  @IsNotEmpty()
  @IsString()
  inode: number;

  @IsNotEmpty()
  @IsString()
  offset: number;

  @IsNotEmpty()
  @IsNumber()
  serverId: number;
}
