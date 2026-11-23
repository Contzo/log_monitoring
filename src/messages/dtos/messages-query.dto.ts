import { Transform, Type } from "class-transformer";
import { IsInt, Min, Max, IsOptional, IsDate } from "class-validator";
export class MessagesQueryDTO {
  @Transform(({ value }) => Number(value))
  @IsOptional()
  @IsInt()
  @Min(1)
  logFileId?: number;

  @Transform(({ value }) => Number(value))
  @IsOptional()
  @IsInt()
  @Min(1)
  serverId?: number;

  @Transform(({ value }) => Number(value))
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(150)
  limit: number = 20;

  @Transform(({ value }) => Number(value))
  @IsOptional()
  @IsInt()
  @Min(1)
  before?: number;

  @Type(() => Date)
  @IsOptional()
  @IsDate()
  from?: Date;

  @Type(() => Date)
  @IsOptional()
  @IsDate()
  to?: Date;
}
