import { Transform } from "class-transformer";
import { IsInt, Min, Max, IsOptional } from "class-validator";
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
  @Max(150)
  limit: number;

  @Transform(({ value }) => Number(value))
  @IsOptional()
  @IsInt()
  @Min(1)
  before: number;
}
